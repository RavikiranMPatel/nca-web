import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbCount, dbOne } from "../fixtures/db";

/**
 * BUG-50 — a player's phone and email are unique WITHIN an academy, never across
 * the platform.
 *
 * `createExternalPlayer` refused a phone or email that existed ANYWHERE, using
 * `findByPhone` / `findByEmailIgnoreCase` with no academy in the query. So
 * academy B could learn that a number is registered at academy A — 200 for a
 * number nobody has, 409 for one of A's — which is a cross-tenant existence
 * oracle. `/check-phone` and `/check-email` were the same thing with a purpose
 * built for it, and took no authentication at all.
 *
 * The product ruling: **a phone belongs to an academy, not to the platform.**
 * Siblings at two academies, or a shared family number, are registrable in both;
 * a duplicate inside one academy is still refused, which is the check that was
 * wanted.
 *
 * The assertions are in two halves, and the second is the one that matters:
 *
 *   1. B may now use A's number — 200, and the row really is B's.
 *   2. NOTHING B can see mentions A. Not the status, not the message, not the
 *      body. A 409 whose text says "already exists" is still an oracle if B can
 *      provoke it with A's number, so the test asserts on what came back rather
 *      than only on the status code.
 */

const RUN = String(Math.floor(Math.random() * 90000000) + 10000000);
const SHARED_PHONE = `9${String(Math.floor(Math.random() * 900000000) + 100000000)}`;
const SHARED_EMAIL = `shared.${RUN}@example.com`;

let A: Api;
let B: Api;
const created: { api: Api; publicId: string }[] = [];

async function createExternal(api: Api, name: string, phone: string, email: string) {
  return api.raw("post", "/api/admin/players/external", {
    displayName: name, phone, email,
    gender: "MALE", profession: "STUDENT", dob: "2010-05-05",
  });
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  A = await Api.login(config().a);
  B = await Api.login(config().b);
});

test.afterAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  for (const { api, publicId } of created) {
    await api.raw("delete", `/api/admin/players/${publicId}`, {}).catch(() => {});
  }
  // Whatever the API would not delete, by the run's own marker.
  const { dbExec } = await import("../fixtures/db");
  dbExec(`DELETE FROM player_batches WHERE player_id IN
            (SELECT id FROM players WHERE display_name LIKE 'BUG50 ${RUN}%')`);
  dbExec(`DELETE FROM audit_logs WHERE entity_id IN
            (SELECT id FROM players WHERE display_name LIKE 'BUG50 ${RUN}%')`);
  dbExec(`DELETE FROM players WHERE display_name LIKE 'BUG50 ${RUN}%'`);
  await A?.dispose();
  await B?.dispose();
});

test.describe("BUG-50 — contact uniqueness is per academy", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one token per academy per run");
  });

  test("academy A registers a player", async () => {
    const r = await createExternal(A, `BUG50 ${RUN} A`, SHARED_PHONE, SHARED_EMAIL);
    expect(r.status, "A creates its player").toBeLessThan(400);
    created.push({ api: A, publicId: (r.body as any).publicId });

    expect(dbCount(`SELECT COUNT(*) FROM players WHERE phone = '${SHARED_PHONE}'`),
      "exactly one row so far").toBe(1);
  });

  test("academy B may use the SAME phone and email, and the row is B's", async () => {
    const r = await createExternal(B, `BUG50 ${RUN} B`, SHARED_PHONE, SHARED_EMAIL);

    expect(r.status,
      `B must be allowed A's number — a phone belongs to an academy, not the platform ` +
      `(got ${r.status}: ${JSON.stringify(r.body)})`).toBeLessThan(400);
    created.push({ api: B, publicId: (r.body as any).publicId });

    expect(dbCount(`SELECT COUNT(*) FROM players WHERE phone = '${SHARED_PHONE}'`),
      "two players now share the number, one per academy").toBe(2);

    expect(dbCount(`SELECT COUNT(DISTINCT academy_id) FROM players
                    WHERE phone = '${SHARED_PHONE}'`),
      "and they are in DIFFERENT academies").toBe(2);

    // The row B created belongs to B, not to A.
    const owner = dbOne(`SELECT a.code FROM players p JOIN academies a ON a.id = p.academy_id
                         WHERE p.public_id = '${(r.body as any).publicId}'`);
    expect(owner, "B's player is owned by B").toBe("TESTACAD_B");
  });

  test("a duplicate WITHIN one academy is still refused", async () => {
    const r = await createExternal(A, `BUG50 ${RUN} A2`, SHARED_PHONE, `other.${RUN}@example.com`);
    expect(r.status, "A cannot register its own number twice").toBe(409);

    expect(dbCount(`SELECT COUNT(*) FROM players p JOIN academies a ON a.id = p.academy_id
                    WHERE p.phone = '${SHARED_PHONE}' AND a.code = 'TESTACAD_A'`),
      "and no second row was written for A").toBe(1);
  });

  test("nothing B can see reveals that the number exists at A", async () => {
    // A number only A holds.
    const aOnly = `9${String(Math.floor(Math.random() * 900000000) + 100000000)}`;
    const mk = await createExternal(A, `BUG50 ${RUN} AONLY`, aOnly, `aonly.${RUN}@example.com`);
    expect(mk.status).toBeLessThan(400);
    created.push({ api: A, publicId: (mk.body as any).publicId });

    // The two purpose-built oracles. Before the fix these answered for the whole
    // platform and took no authentication at all.
    const phoneCheck = await B.raw("get",
      `/api/admin/players/check-phone?phone=${aOnly}`);
    expect(phoneCheck.status, "check-phone answers B").toBe(200);
    expect((phoneCheck.body as any).exists,
      "B must NOT be told that A holds this number").toBe(false);

    const emailCheck = await B.raw("get",
      `/api/admin/players/check-email?email=aonly.${RUN}@example.com`);
    expect(emailCheck.status).toBe(200);
    expect((emailCheck.body as any).exists,
      "nor that A holds this address").toBe(false);

    // And the create path: B using A's number must succeed, not 409.
    const r = await createExternal(B, `BUG50 ${RUN} BONLY`, aOnly, `bonly.${RUN}@example.com`);
    expect(r.status,
      "B creating with a number only A holds must be allowed, not refused").toBeLessThan(400);
    created.push({ api: B, publicId: (r.body as any).publicId });

    // Nothing anywhere in what B received names A, A's academy, or A's player.
    const seen = JSON.stringify([phoneCheck.body, emailCheck.body, r.body]);
    for (const leak of ["TESTACAD_A", "AONLY", "aonly."]) {
      expect(seen, `B's responses must not mention ${leak}`).not.toContain(leak);
    }
  });

  test("A still sees its own number as taken — the check works, it is just scoped", async () => {
    const aOnlyRow = dbOne(`SELECT p.phone FROM players p JOIN academies a ON a.id = p.academy_id
                            WHERE p.display_name = 'BUG50 ${RUN} AONLY' AND a.code = 'TESTACAD_A'`);
    expect(aOnlyRow, "the row A created is there").toMatch(/^\d{10}$/);

    const check = await A.raw("get", `/api/admin/players/check-phone?phone=${aOnlyRow}`);
    expect(check.status).toBe(200);
    expect((check.body as any).exists,
      "A is correctly told its own number is taken").toBe(true);
  });
});
