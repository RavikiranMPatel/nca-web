import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { isPublicIdCollision } from "../fixtures/playFixture";
import { dbExec, dbOne } from "../fixtures/db";

/**
 * BUG-11 — concurrent match creation no longer collides.
 *
 * `MatchService.generateMatchPublicId()` was
 * `"MCH-NCA-" + System.currentTimeMillis()` while both of its siblings already
 * drew from a UUID, and `cricket_matches.public_id` is globally unique. So two
 * matches created in the same millisecond — any two academies, any two admins —
 * produced the same id and the second create came back:
 *
 * ```
 * POST /api/admin/cricket/matches -> 400 {"message":"A record with these details already exists."}
 * ```
 *
 * Reproduced by the closing end-to-end run (two collisions), and again while
 * writing this slice's Points Table spec, where two Playwright projects happened
 * to create a match in the same millisecond and one of them died.
 *
 * This is the "parallel run, zero collisions" assertion. It fires a burst of
 * creates concurrently from one process AND runs on two browser projects at
 * once, so the ids have to be unique within a process and across two. The
 * arithmetic half — a hundred thousand ids, and why the suffix is twelve
 * characters rather than eight — is `MatchPublicIdTest`.
 */

const RUN = `${Date.now() % 1000000}`;
const BURST = 24;

test.describe("BUG-11 — match public ids under concurrent creation", () => {

  test("a burst of concurrent creates produces no collision and no duplicate id",
    async ({ }, testInfo) => {
    const api = await Api.login(config().a);
    const tag = `B11-${RUN}-${testInfo.project.name}`;

    try {
      // All at once, not in sequence: the defect needed two creates inside one
      // millisecond, so a loop that awaits each one would not have found it.
      const results = await Promise.allSettled(
        Array.from({ length: BURST }, (_, i) =>
          api.createMatch({
            title: `${tag} ${i}`,
            matchDate: "2026-07-01",
            matchType: "INTERNAL",
            totalOvers: 20,
            venue: "BUG11 Ground",
          })));

      const failures = results.flatMap((r) =>
        r.status === "rejected" ? [r.reason] : []);
      const collisions = failures.filter(isPublicIdCollision);

      expect(collisions.length,
        `public-id collisions in ${BURST} concurrent creates — the generator is `
        + `expected to be a random UUID: ${collisions.map(String).join(" | ")}`)
        .toBe(0);
      expect(failures.length,
        `every create succeeded: ${failures.map(String).join(" | ")}`).toBe(0);

      const ids = results.flatMap((r) =>
        r.status === "fulfilled" ? [(r.value as any).publicId as string] : []);
      expect(ids.length, "all of them came back").toBe(BURST);
      expect(new Set(ids).size, "and every id is distinct").toBe(BURST);

      // The shape, from the wire rather than from the source: prefix kept so
      // ids already minted stay addressable, twelve hex characters of a UUID.
      for (const id of ids) {
        expect(id, `${id} keeps the MCH- prefix`).toMatch(/^MCH-NCA-[0-9A-F]{12}$/);
      }

      // And the database agrees it stored that many distinct rows.
      expect(dbOne(`SELECT count(DISTINCT public_id)::text || '/' || count(*)::text
                    FROM cricket_matches WHERE title LIKE '${tag} %'`),
        "distinct ids / rows").toBe(`${BURST}/${BURST}`);
    } finally {
      dbExec(`DELETE FROM cricket_matches WHERE title LIKE '${tag} %'`);
      await api.dispose();
    }
  });
});
