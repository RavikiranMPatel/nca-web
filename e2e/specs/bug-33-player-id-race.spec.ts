import { test, expect } from "@playwright/test";
import { newPhoneTrunk, fixturePhone } from "../fixtures/tag";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbOne, dbCount, dbExec } from "../fixtures/db";

/**
 * BUG-33 — two players could be handed the same publicId.
 *
 * `AcademySettingsService.generateNextPlayerId` read the per-academy counter,
 * added one, and wrote it back, on a method that was both `@Transactional` and
 * `synchronized`. Those do not compose: Spring's proxy commits *after* the
 * method returns, so the monitor is released while the new value is still
 * uncommitted and the next caller reads the old one. The second insert then
 * fails `players_public_id_key` and the API returns **409**.
 *
 * It was a real defect with a test-shaped symptom: it appeared only when two
 * Playwright workers created players at the same moment, passed in isolation
 * every time, and cost two full-suite runs — `kit-roles` in Slice 4b and
 * `json-boolean-keys` in Slice 5 — before Slice 5b replaced the read-modify-write
 * with a single `INSERT … ON CONFLICT … RETURNING`.
 *
 * This test forces the condition rather than waiting for it: twenty creates
 * issued together, on one academy, against one counter row. Under the old code
 * that is a near-certain collision; the shared `createPlayer()` fixture used to
 * retry past exactly this, and that retry is removed in the same commit so the
 * suite would fail if the race came back.
 *
 * Desktop only: an API and database contract with no viewport dimension.
 */

const PHONE_TRUNK = newPhoneTrunk();
const RUN = `${Date.now() % 1000000}`;
const LABEL = `BUG33 ${RUN}`;
const N = 20;

test.afterAll(() => {
  const ids = `(SELECT id FROM players WHERE display_name LIKE '${LABEL}%')`;
  dbExec(`DELETE FROM player_career_stats WHERE player_id IN ${ids}`);
  dbExec(`DELETE FROM player_batches WHERE player_id IN ${ids}`);
  // audit_logs has no FK to players, so a PLAYER_CREATED row outlives the
  // player it describes — 10,491 had accumulated before anything checked.
  // Deleted here, BEFORE the players, while the ids still resolve.
  dbExec(`DELETE FROM audit_logs WHERE entity_id IN ${ids}`);
  dbExec(`DELETE FROM players WHERE display_name LIKE '${LABEL}%'`);
  dbExec(`DELETE FROM batches WHERE name = '${LABEL} Batch'`);
});

test(`BUG-33 ${N} players created at once get ${N} distinct ids and no 409`,
  async ({ }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "API and DB contract, no viewport dimension");
  test.setTimeout(120_000);

  const api = await Api.login(config().a);

  const academyId = dbOne(
    `SELECT academy_id::text FROM users WHERE email = '${config().a.email}'`);
  expect(academyId, "the acting academy, read from the row").toBeTruthy();

  // Player creation requires at least one batch.
  const batch = await api.raw("post", "/api/admin/batches", {
    name: `${LABEL} Batch`, startTime: "06:00:00", endTime: "08:00:00", active: true,
  });
  expect(batch.status, "create the batch these players join").toBeLessThan(400);
  const batchId = (batch.body as any).id as string;

  const counterBefore = Number(dbOne(
    `SELECT setting_value FROM academy_settings
      WHERE setting_key = 'PLAYER_ID_COUNTER' AND academy_id = '${academyId}'`) || "0");

  // Posted directly rather than through the createPlayer fixture: this test has
  // to SEE a 409 if one happens, not have it retried away.
  const post = (i: number) => {
    const fd = new FormData();
    const player = {
      displayName: `${LABEL} P${String(i).padStart(2, "0")}`,
      gender: "MALE",
      profession: "STUDENT",
      dob: "2010-06-15",
      // Truncating the index away gave ten players one number; V105 makes a
      // player's phone unique within an academy, so that is now unsaveable.
      phone: fixturePhone(PHONE_TRUNK, i),
      joiningDate: "2026-01-15",
      batchIds: [batchId],
    };
    fd.append("player",
      new Blob([JSON.stringify(player)], { type: "application/json" }), "player.json");
    return api.ctx.post("/api/admin/players", { multipart: fd as never });
  };

  // All twenty in flight together. Promise.all, not a loop with awaits — a
  // sequential run cannot reproduce this and would prove nothing.
  const responses = await Promise.all(
    Array.from({ length: N }, (_, i) => post(i)));

  const statuses = responses.map((r) => r.status());
  const conflicts = statuses.filter((s) => s === 409).length;
  expect(conflicts, "409s: the exact symptom BUG-33 produced").toBe(0);
  expect(statuses.filter((s) => s < 400).length, `all ${N} creates succeeded`).toBe(N);

  const bodies = await Promise.all(responses.map((r) => r.json()));
  const publicIds = bodies.map((b) => b.publicId ?? b.player?.publicId);
  expect(publicIds.filter(Boolean).length, "every response carries a publicId").toBe(N);
  expect(new Set(publicIds).size, `${N} ids, all distinct`).toBe(N);

  // And the database agrees — the response could be right while the rows are not.
  expect(dbCount(`SELECT count(*) FROM players WHERE display_name LIKE '${LABEL}%'`),
    `${N} rows written`).toBe(N);
  expect(dbCount(`SELECT count(DISTINCT public_id) FROM players
                  WHERE display_name LIKE '${LABEL}%'`),
    `${N} distinct public_ids in the table`).toBe(N);

  // The counter advanced by exactly N: no value was claimed twice and none was
  // skipped. This is the assertion that would fail on a "just widen the lock"
  // fix that serialises but still loses an increment.
  const counterAfter = Number(dbOne(
    `SELECT setting_value FROM academy_settings
      WHERE setting_key = 'PLAYER_ID_COUNTER' AND academy_id = '${academyId}'`));
  expect(counterAfter - counterBefore, "the counter advanced by exactly one per player")
    .toBe(N);

  // The ids are the counter's own values, not a UUID fallback: BaseEntity's
  // @PrePersist generates a UUID publicId when none is set, which would satisfy
  // "all distinct" while proving nothing about the counter.
  const prefix = dbOne(`SELECT setting_value FROM academy_settings
                        WHERE setting_key = 'PLAYER_ID_PREFIX' AND academy_id = '${academyId}'`);
  const expected = new Set(
    Array.from({ length: N }, (_, k) => `${prefix}-${counterBefore + k + 1}`));
  expect(new Set(publicIds), "the ids are exactly the N counter values, in some order")
    .toEqual(expected);

  await api.dispose();
});
