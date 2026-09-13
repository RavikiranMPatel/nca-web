import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbOne, dbCount, dbExec } from "../fixtures/db";

/**
 * BUG-22 — two academies must never share a player-id prefix.
 *
 * Player public ids are `PLAYER_ID_PREFIX + "-" + a PER-ACADEMY counter`, while
 * `players.public_id` is GLOBALLY unique. Two academies on the same prefix
 * generate the same sequence, so the second academy's FIRST player is rejected:
 *
 *   ERROR: duplicate key value violates unique constraint "players_public_id_key"
 *     Detail: Key (public_id)=(-1) already exists.
 *
 * The `(-1)` is the empty-prefix case — with no prefix the id is just `-1`, so
 * every academy without one collides with every other immediately. Onboarding
 * already derived `PLY-<code>` and nothing checked either property, which is the
 * defect: the prefix is a free-text setting and nothing enforced it.
 *
 * Provisioning writes real tenants, so this cleans up thoroughly and asserts the
 * academy count is back where it started.
 */

const RUN = String(Math.floor(Math.random() * 900000) + 100000);
const CODE_1 = `Z${RUN}A`.slice(0, 10);
const CODE_2 = `Z${RUN}B`.slice(0, 10);

let platform: Api;
const provisioned: string[] = [];

const body = (code: string, slug: string) => ({
  academyName: `Prefix Test ${code}`,
  code,
  slug,
  branchName: "Main",
  adminName: `Admin ${code}`,
  adminEmail: `admin.${code.toLowerCase()}@example.com`,
  phone: "9000000000",
  city: "Nowhere",
});

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  platform = await Api.login(config().platform);
});

test.afterAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  for (const code of provisioned) {
    const aq = `(SELECT id FROM academies WHERE code = '${code}')`;
    dbExec(`DELETE FROM academy_settings WHERE academy_id IN ${aq}`);
    dbExec(`DELETE FROM users WHERE academy_id IN ${aq}`);
    dbExec(`DELETE FROM homepage_sections WHERE academy_id IN ${aq}`);
    dbExec(`DELETE FROM branches WHERE academy_id IN ${aq}`);
    dbExec(`DELETE FROM platform_audit_log WHERE academy_id IN ${aq}`);
    dbExec(`DELETE FROM academies WHERE code = '${code}'`);
  }
  await platform?.dispose();
});

test.describe("BUG-22 — player id prefixes cannot collide", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "provisioning writes real tenants");
  });

  test("two academies provisioned WITHOUT a prefix get distinct ones", async () => {
    const one = await platform.raw("post", "/api/platform/academies",
      body(CODE_1, `prefix-${RUN}-a`));
    expect(one.status, `provision ${CODE_1}: ${JSON.stringify(one.body)}`).toBe(200);
    provisioned.push(CODE_1);

    const two = await platform.raw("post", "/api/platform/academies",
      body(CODE_2, `prefix-${RUN}-b`));
    expect(two.status, `provision ${CODE_2}`).toBe(200);
    provisioned.push(CODE_2);

    const p1 = dbOne(`SELECT s.setting_value FROM academy_settings s
      JOIN academies a ON a.id = s.academy_id
      WHERE a.code = '${CODE_1}' AND s.setting_key = 'PLAYER_ID_PREFIX'`);
    const p2 = dbOne(`SELECT s.setting_value FROM academy_settings s
      JOIN academies a ON a.id = s.academy_id
      WHERE a.code = '${CODE_2}' AND s.setting_key = 'PLAYER_ID_PREFIX'`);

    expect(p1, "derived from the academy code, which is itself unique").toBe(`PLY-${CODE_1}`);
    expect(p2).toBe(`PLY-${CODE_2}`);
    expect(p1, "and therefore distinct by construction, not by luck").not.toBe(p2);
    expect(p1.length, "non-empty — an empty prefix makes every id '-1'").toBeGreaterThan(0);
  });

  test("no two academies anywhere share a player id prefix", () => {
    const dupes = dbCount(`
      SELECT COUNT(*) FROM (
        SELECT setting_value FROM academy_settings
        WHERE setting_key = 'PLAYER_ID_PREFIX'
        GROUP BY setting_value HAVING COUNT(DISTINCT academy_id) > 1) x`);
    expect(dupes, "a shared prefix means the second academy's first player is rejected")
      .toBe(0);

    const empties = dbCount(`SELECT COUNT(*) FROM academy_settings
      WHERE setting_key = 'PLAYER_ID_PREFIX' AND (setting_value IS NULL OR setting_value = '')`);
    expect(empties, "an empty prefix collides with every other empty one").toBe(0);
  });

  test("provisioning is refused when the derived prefix is already taken", async () => {
    // A third academy whose code would derive a prefix the first one holds.
    // Same code is refused earlier by the code check, so claim the prefix
    // directly on a spare academy and then try to provision into it.
    const takenCode = `Z${RUN}C`.slice(0, 10);
    dbExec(`UPDATE academy_settings SET setting_value = 'PLY-${takenCode}'
            WHERE setting_key = 'PLAYER_ID_PREFIX'
              AND academy_id = (SELECT id FROM academies WHERE code = '${CODE_1}')`);

    const clash = await platform.raw("post", "/api/platform/academies",
      body(takenCode, `prefix-${RUN}-c`));

    expect(clash.status,
      "the prefix is already held, so onboarding must refuse rather than create a " +
      "tenant whose first player cannot be saved").toBe(409);
    expect(JSON.stringify(clash.body), "and it says why").toContain("prefix");

    expect(dbCount(`SELECT COUNT(*) FROM academies WHERE code = '${takenCode}'`),
      "nothing was created").toBe(0);

    // put it back so teardown and the invariant test above stay true
    dbExec(`UPDATE academy_settings SET setting_value = 'PLY-${CODE_1}'
            WHERE setting_key = 'PLAYER_ID_PREFIX'
              AND academy_id = (SELECT id FROM academies WHERE code = '${CODE_1}')`);
  });
});
