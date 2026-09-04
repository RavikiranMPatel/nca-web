import { test, expect } from "../fixtures/scoringMatch";
import { expectState } from "../fixtures/expectState";
import { config } from "../fixtures/env";
import { execFileSync } from "node:child_process";

/**
 * Workbook section 10 — Match Timing / Pause / Rain (T20-220 … T20-232).
 *
 * The app models an interruption as a free-text `pause_reason` plus `paused_at` on
 * the match, with a single cumulative `total_break_seconds`. It has no DELAYED or
 * SUSPENDED status — the match stays IN_PROGRESS throughout — and no per-interruption
 * records. What exists is asserted; what does not is skipped or pinned @ambiguous
 * with the workbook's own wording quoted.
 */

const sql = (q: string) => {
  const { db } = config();
  return execFileSync("psql", ["-h", db.host, "-p", db.port, "-U", db.user,
    "-d", db.name, "-tAc", q], { encoding: "utf8" }).trim();
};

const matchRow = (publicId: string) =>
  sql(`SELECT status, coalesce(pause_reason,'-'), (paused_at IS NOT NULL),
              coalesce(total_break_seconds,0)
       FROM cricket_matches WHERE public_id='${publicId}'`).split("|");

test.describe("§10 Match Timing / Pause / Rain", () => {

  const pause = async (m: any, reason: string) =>
    m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/pause`, { reason });
  const resume = async (m: any) =>
    m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/resume`);

  test("T20-220 @ambiguous T20 timing configuration", async ({ scoringMatch }) => {
    // Workbook: "Scheduled innings duration, interval and over-rate values stored;
    // no hardcoded timing."
    // Two of the three are per-match columns; the session length is not stored at
    // all — LiveScorerPage derives it as overs x 4.25 minutes — and there is no
    // over-rate rule anywhere. Pinned rather than asserted as a bug: what a
    // "timing profile" should contain is a product decision.
    const m = scoringMatch;
    const cols = sql(
      `SELECT (scheduled_start_time IS NOT NULL), coalesce(innings_interval_minutes::text,'-')
       FROM cricket_matches WHERE public_id='${m.matchPublicId}'`).split("|");
    expect(cols.length, "scheduled_start_time and innings_interval_minutes exist as columns").toBe(2);

    const overRate = sql(
      `SELECT count(*) FROM information_schema.columns
       WHERE table_name='cricket_matches' AND column_name LIKE '%over_rate%'`);
    expect(Number(overRate), "no over-rate column exists").toBe(0);
  });

  test("T20-221 @ambiguous rain pause — reason and start recorded, status unchanged", async ({ scoringMatch, page }) => {
    const m = scoringMatch;
    await m.advanceTo({ runs: [4, 2] });
    const before = await m.api.state(m.matchPublicId);

    await m.open(page);
    await page.getByTestId("btn-pause").click();
    await page.getByTestId("pause-reason-rain").click();
    await page.getByTestId("confirm-pause").click();
    await expect(page.getByTestId("pause-banner")).toBeVisible();

    const [status, reason, pausedAt] = matchRow(m.matchPublicId);
    // Workbook: "DELAYED; score/over/players unchanged; interruption start saved."
    // The reason and the start time are saved, and nothing about the innings moves.
    expect(reason, "the reason is recorded").toBe("Rain");
    expect(pausedAt, "and the interruption start").toBe("t");
    // But there is no DELAYED status — the match stays IN_PROGRESS with a reason set.
    expect(status, "the app has no DELAYED status").toBe("IN_PROGRESS");

    const after = await m.api.state(m.matchPublicId);
    expect(after.inningsState.totalRuns).toBe(before.inningsState.totalRuns);
    expect(after.inningsState.totalBalls).toBe(before.inningsState.totalBalls);
    expect(after.currentStrikerPublicId).toBe(before.currentStrikerPublicId);
    expect(after.currentBowlerPublicId).toBe(before.currentBowlerPublicId);
  });

  test("T20-222 rain resume — duration calculated, state unchanged", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await m.advanceTo({ runs: [4] });
    const before = await m.api.state(m.matchPublicId);

    expect((await pause(m, "Rain")).status).toBe(200);
    await new Promise((r) => setTimeout(r, 1100));      // so the break is measurable
    expect((await resume(m)).status).toBe(200);

    const [status, reason, pausedAt, breakSecs] = matchRow(m.matchPublicId);
    // Workbook: "LIVE; same score/over; interruption duration calculated."
    expect(status).toBe("IN_PROGRESS");
    expect(reason, "the reason is cleared on resume").toBe("-");
    expect(pausedAt, "and so is paused_at").toBe("f");
    expect(Number(breakSecs), "the break duration is accumulated").toBeGreaterThanOrEqual(1);

    const after = await m.api.state(m.matchPublicId);
    expect(after.inningsState.totalRuns).toBe(before.inningsState.totalRuns);
    expect(after.inningsState.totalBalls).toBe(before.inningsState.totalBalls);
  });

  // T20-223 … T20-229 — the reason is free text with presets; each is stored as given.
  for (const [id, reason, note] of [
    ["T20-223", "Bad Light", "Reason/status saved"],
    ["T20-226", "Medical Emergency", "Status/reason saved"],
    ["T20-227", "Equipment Failure", "Status/reason saved"],
    ["T20-228", "Crowd", "Status/reason saved"],
    ["T20-229", "Power failure", "No scoring while suspended"],
  ] as const) {
    test(`${id} ${reason.toLowerCase()} — ${note}`, async ({ scoringMatch }) => {
      const m = scoringMatch;
      expect((await pause(m, reason)).status).toBe(200);
      const [, stored] = matchRow(m.matchPublicId);
      expect(stored, "the reason is stored verbatim, preset or typed").toBe(reason);

      // Scoring is refused for every reason, which is the "no scoring while
      // suspended" half of T20-229.
      const s = await m.api.state(m.matchPublicId);
      const blocked = await m.api.raw("post",
        `/api/admin/cricket/matches/${m.matchPublicId}/scoring/ball`, {
          bowlerPublicId: s.currentBowlerPublicId,
          batsmanPublicId: s.currentStrikerPublicId,
          nonStrikerPublicId: s.currentNonStrikerPublicId,
          runsBatsman: 1,
        });
      expect(blocked.status).toBe(409);
      expect((await resume(m)).status).toBe(200);
    });
  }

  test("T20-224 wet outfield — scoring disabled while paused, in the API and the UI", async ({ scoringMatch, page }) => {
    const m = scoringMatch;
    await m.open(page);
    await page.getByTestId("btn-pause").click();
    await page.getByTestId("pause-reason-wet-outfield").click();
    await page.getByTestId("confirm-pause").click();
    await expect(page.getByTestId("pause-banner")).toBeVisible();

    // Workbook: "Scoring disabled while paused."
    const s = await m.api.state(m.matchPublicId);
    const blocked = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/ball`, {
        bowlerPublicId: s.currentBowlerPublicId,
        batsmanPublicId: s.currentStrikerPublicId,
        nonStrikerPublicId: s.currentNonStrikerPublicId,
        runsBatsman: 1,
      });
    expect(blocked.status, "the server refuses a ball while paused").toBe(409);

    // And the pad is inert in the UI — it carries pointer-events-none while paused.
    const pointerEvents = await page.getByTestId("scoring-pad")
      .evaluate((el) => getComputedStyle(el).pointerEvents);
    expect(pointerEvents, "the scoring pad is not clickable while paused").toBe("none");
  });

  test("T20-225 @ambiguous lightning — resume is authorised but there is no SUSPENDED status", async ({ scoringMatch }) => {
    // Workbook: "SUSPENDED; authorized resume."
    const m = scoringMatch;
    expect((await pause(m, "Lightning")).status).toBe(200);
    const [status, reason] = matchRow(m.matchPublicId);
    expect(reason).toBe("Lightning");
    expect(status, "no SUSPENDED status exists — the match stays IN_PROGRESS").toBe("IN_PROGRESS");

    // The authorisation half does hold: pause and resume are ADMIN/SUPER_ADMIN only
    // (MatchService.validateAdminOrSuperAdmin), and the suite runs as ADMIN.
    expect((await resume(m)).status).toBe(200);
  });

  test("T20-230 @ambiguous drinks break", async ({ scoringMatch }) => {
    // Workbook: "Timer starts; scoring disabled; duration captured."
    // Two of the three hold through the generic pause; there is no drinks-break
    // type, no timer, and nothing distinguishes it from any other interruption.
    const m = scoringMatch;
    expect((await pause(m, "Drinks")).status).toBe(200);
    await new Promise((r) => setTimeout(r, 1100));
    expect((await resume(m)).status).toBe(200);
    const [, , , breakSecs] = matchRow(m.matchPublicId);
    expect(Number(breakSecs), "the duration is captured, as for any pause").toBeGreaterThanOrEqual(1);
  });

  test("T20-231 over-rate warning", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED as a warning: LiveScorerPage renders an 'Xm behind' clock " +
      "hint derived from a hardcoded overs x 4.25 session estimate, but there is no " +
      "over-rate rule stored and no warning raised or recorded anywhere. See " +
      "T20-220 — the timing profile the workbook assumes does not exist.");
  });

  test("T20-232 @ambiguous multiple interruptions accumulate into one total", async ({ scoringMatch }) => {
    const m = scoringMatch;
    // Workbook: "Each interruption separately stored with type/start/end/duration/user."
    expect((await pause(m, "Rain")).status).toBe(200);
    await new Promise((r) => setTimeout(r, 1100));
    expect((await resume(m)).status).toBe(200);
    const afterFirst = Number(matchRow(m.matchPublicId)[3]);
    expect(afterFirst).toBeGreaterThanOrEqual(1);

    expect((await pause(m, "Bad Light")).status).toBe(200);
    await new Promise((r) => setTimeout(r, 1100));
    expect((await resume(m)).status).toBe(200);
    const afterSecond = Number(matchRow(m.matchPublicId)[3]);
    expect(afterSecond, "the second break adds to the same running total")
      .toBeGreaterThan(afterFirst);

    // But there is no per-interruption record: one cumulative column, and the only
    // per-event trace is the audit log.
    const interruptionTables = sql(
      `SELECT count(*) FROM information_schema.tables
       WHERE table_schema='public' AND table_name LIKE '%interruption%'`);
    expect(Number(interruptionTables), "no interruption table exists").toBe(0);

    const audits = sql(
      `SELECT count(*) FROM audit_logs WHERE action IN ('MATCH_PAUSED','MATCH_RESUMED')
       AND entity_public_id='${m.matchPublicId}'`);
    expect(Number(audits), "each pause and resume is at least audited").toBe(4);
  });
});
