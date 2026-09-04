import { test, expect } from "../fixtures/scoringMatch";
import { expectState } from "../fixtures/expectState";
import { captureState, rawSql } from "../fixtures/captureState";
import { config } from "../fixtures/env";
import { Api } from "../fixtures/api";

/**
 * Workbook section 16 — Critical Combination / Edge-Case Matrix (EDGE-01 … EDGE-36).
 *
 * Most of this matrix is the same behaviour the numbered sections already assert,
 * from a different angle. Rather than duplicate those, each already-covered case
 * names the test that asserts it — the reference is the coverage. Only the
 * genuinely uncovered combinations get new tests here.
 */

/** EDGE cases already asserted elsewhere. The mapping is the coverage claim. */
const COVERED_ELSEWHERE: Array<[string, string, string]> = [
  ["EDGE-01", "wide + run out", "section-03 T20-026"],
  ["EDGE-02", "wide + stumping", "section-03 T20-025"],
  ["EDGE-03", "wide to boundary", "section-03 T20-024"],
  ["EDGE-05", "no ball + catch", "section-04 T20-062 (free hit) and section-06 T20-111"],
  ["EDGE-06", "no ball + run out", "section-04 T20-064"],
  ["EDGE-07", "no ball + stumping", "section-04 T20-063"],
  ["EDGE-08", "no ball + 4 byes", "bug-03-no-ball-extras 'no ball + 4 byes'"],
  ["EDGE-09", "free hit + bowled", "section-04 T20-060"],
  ["EDGE-10", "free hit + run out", "section-04 T20-064"],
  ["EDGE-11", "last ball wide + run", "section-05 T20-089"],
  ["EDGE-12", "last ball NB + four", "section-05 T20-090"],
  ["EDGE-13", "last ball bye", "section-05 T20-091"],
  ["EDGE-14", "last ball + wicket", "section-05 T20-082 and section-06 T20-110"],
  ["EDGE-16", "retired hurt + partnership", "section-09 T20-195"],
  ["EDGE-17", "retired hurt + return + wicket", "section-06 T20-121 and section-09 T20-198"],
  ["EDGE-18", "bowler injured + over completion", "section-08 T20-160"],
  ["EDGE-19", "rain + incomplete over", "section-08 T20-164"],
  ["EDGE-22", "wrong bowler + completed over", "section-13 T20-316"],
  ["EDGE-23", "undo after wicket", "section-06 EDGE-23"],
  ["EDGE-26", "offline + wicket", "section-14 T20-346 (skipped, deferred by design)"],
  ["EDGE-27", "duplicate event", "section-14 T20-348 (test.fail, BUG-18)"],
  ["EDGE-28", "concurrent scorers", "section-14 T20-349"],
  ["EDGE-30", "obstruction during a run", "section-06 T20-123 and section-04 T20-065"],
  ["EDGE-33", "Super Over after tie", "section-12 T20-280"],
  ["EDGE-34", "multiple Super Over tie", "section-12 T20-285/T20-286"],
];

test.describe("§16 Edge-Case Matrix", () => {

  for (const [id, what, where] of COVERED_ELSEWHERE) {
    test(`${id} ${what} — asserted by ${where}`, async () => {
      test.skip(true,
        `COVERED ELSEWHERE by ${where}. Referenced rather than duplicated: the same ` +
        "behaviour asserted twice is not more coverage, and a second copy drifts.");
    });
  }

  // ── Genuinely uncovered combinations ─────────────────────────────────────
  test("EDGE-04 / EDGE-36 a delivery cannot be both a wide and a bye", async ({ scoringMatch }) => {
    const m = scoringMatch;
    // Workbook EDGE-04: "UI/backend prevents invalid double classification."
    // EDGE-36: "Validation prevents impossible combined classification."
    // The prevention is structural rather than a validation message: extra_type is a
    // single column, so a delivery carries exactly one classification and there is
    // no shape in which both can be expressed.
    const s = await m.api.state(m.matchPublicId);
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 0, runsExtras: 3, extraType: "WIDE",
    });
    const row = rawSql(
      `SELECT d.extra_type FROM deliveries d JOIN innings i ON d.innings_id=i.id
       JOIN cricket_matches mm ON i.match_id=mm.id WHERE mm.public_id='${m.matchPublicId}'`);
    expect(row, "exactly one classification is stored").toBe("WIDE");

    const after = await m.api.state(m.matchPublicId);
    expect(after.inningsState.extrasWide, "all of it lands in wides").toBe(3);
    expect(after.inningsState.extrasBye, "and none of it in byes").toBe(0);

  });

  test("EDGE-04 / EDGE-36 an invented combined extra type is rejected", async ({ scoringMatch }) => {
    test.fail(true, "BUG-19: extra_type is unvalidated, so an unknown value is stored and its runs vanish");
    // The structural argument above only holds for the five known types. Nothing
    // validates the string, so a caller can invent one — which is exactly the
    // "impossible combined classification" the workbook asks to be prevented.
    const m = scoringMatch;
    const s = await m.api.state(m.matchPublicId);
    const bad = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/ball`, {
        bowlerPublicId: s.currentBowlerPublicId,
        batsmanPublicId: s.currentStrikerPublicId,
        nonStrikerPublicId: s.currentNonStrikerPublicId,
        runsBatsman: 0, runsExtras: 3, extraType: "WIDE_BYE",
      });
    expect(bad.status, "an invented combined type must not be accepted").toBeGreaterThanOrEqual(400);
  });

  test("EDGE-21 correcting the striker then scoring on", async ({ scoringMatch }) => {
    const m = scoringMatch;
    // Workbook: "Wrong batter + downstream ball — replay restores correct downstream
    // state." editDelivery refuses batter identity changes by design (T20-315), so
    // the sanctioned route is swap-batters before the ball, or undo and re-score.
    // This asserts the swap route and that later deliveries follow the corrected end.
    await m.advanceTo({ runs: [2] });
    const before = await m.api.state(m.matchPublicId);
    const wrongWay = before.currentStrikerPublicId!;

    const swap = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/swap-batters`);
    expect(swap.status).toBe(200);
    const swapped = await m.api.state(m.matchPublicId);
    expect(swapped.currentStrikerPublicId, "the ends are corrected").not.toBe(wrongWay);
    expect(swapped.currentNonStrikerPublicId).toBe(wrongWay);

    // The next delivery is credited to the corrected striker.
    const nowOnStrike = swapped.currentStrikerPublicId!;
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: swapped.currentBowlerPublicId!,
      batsmanPublicId: nowOnStrike,
      nonStrikerPublicId: swapped.currentNonStrikerPublicId!,
      runsBatsman: 4,
    });
    const after = await m.api.state(m.matchPublicId);
    expect(after.batterStats[nowOnStrike].runs, "the four goes to the corrected striker").toBe(4);
    expect(after.batterStats[wrongWay].runs, "and not to the other batter").toBe(2);
  });

  test("EDGE-24 undo after a resume keeps the interruption history", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await m.advanceTo({ runs: [4, 2] });
    await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/pause`, { reason: "Rain" });
    await new Promise((r) => setTimeout(r, 1100));
    await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/resume`);

    const breakBefore = Number(rawSql(
      `SELECT total_break_seconds FROM cricket_matches WHERE public_id='${m.matchPublicId}'`));
    expect(breakBefore).toBeGreaterThanOrEqual(1);
    const auditsBefore = Number(rawSql(
      `SELECT count(*) FROM audit_logs WHERE entity_public_id='${m.matchPublicId}'
         AND action IN ('MATCH_PAUSED','MATCH_RESUMED')`));
    expect(auditsBefore).toBe(2);

    await m.advanceTo({ runs: [1] });
    await m.api.undo(m.matchPublicId);

    // Workbook: "Interruption history remains; only scoring event reverted."
    expect(Number(rawSql(
      `SELECT total_break_seconds FROM cricket_matches WHERE public_id='${m.matchPublicId}'`)),
      "the accumulated break survives a replay").toBe(breakBefore);
    expect(Number(rawSql(
      `SELECT count(*) FROM audit_logs WHERE entity_public_id='${m.matchPublicId}'
         AND action IN ('MATCH_PAUSED','MATCH_RESUMED')`)),
      "and so does the pause/resume audit trail").toBe(auditsBefore);
    const s = await m.api.state(m.matchPublicId);
    expect(s.inningsState.totalRuns, "only the delivery is reverted").toBe(6);
  });

  test("EDGE-25 a crash after an edit restores the edited version", async ({ scoringMatch, browser }) => {
    const m = scoringMatch;
    await m.advanceTo({ runs: [4] });
    const deliveries = (await m.api.raw("get",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/deliveries`)).body;
    const edit = await m.api.raw("patch",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/deliveries/${deliveries[0].publicId}`,
      { runsBatsman: 6 });
    expect(edit.status).toBe(200);
    const edited = captureState(m.matchPublicId);
    expect((await m.api.state(m.matchPublicId)).inningsState.totalRuns).toBe(6);

    // Reopen in a brand-new client, the way a crash-and-restart would.
    const ctx = await browser.newContext();
    await ctx.addInitScript((seed) => {
      for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, v as string);
      window.localStorage.setItem("nca_ww_enabled", "false");
    }, m.api.storageSeed());
    const page = await ctx.newPage();
    try {
      await page.goto(`${config().webBase}/admin/cricket/matches/${m.matchPublicId}/score`);
      await expect(page.getByTestId("scoring-pad")).toBeVisible();
      // Workbook: "Correct version restored."
      await expect(page.getByTestId("team-score"), "the edited value, not the original")
        .toHaveText("6/0");
      expect(captureState(m.matchPublicId), "and nothing changed on reopening").toEqual(edited);
    } finally {
      await ctx.close();
    }
  });

  test("EDGE-29 a helmet penalty and a wicket on the same ball reconcile separately", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await m.advanceTo({ runs: [4] });
    // The penalty is awarded as its own event, not attached to a delivery.
    await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/scoring/penalty`,
      { awardedTo: "FIELDING" });
    const s = await m.api.state(m.matchPublicId);
    const victim = s.currentStrikerPublicId!;
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: victim, nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 0, isWicket: true, dismissalType: "BOWLED", dismissedPlayerPublicId: victim,
    });

    // Workbook: "Penalty and wicket separately reconciled."
    const after = await m.api.state(m.matchPublicId);
    const st = after.inningsState;
    expect(st.extrasPenalty, "the penalty stands on its own").toBe(5);
    expect(st.totalWickets, "and the wicket is recorded").toBe(1);
    expect(after.bowlerStats[m.bowler.mtpPublicId].wickets).toBe(1);

    const batterRuns = Object.values(after.batterStats as Record<string, { runs: number }>)
      .reduce((n, b) => n + b.runs, 0);
    expect(batterRuns + st.extrasWide + st.extrasNoBall + st.extrasBye + st.extrasLegBye
      + st.extrasPenalty, "and both reconcile into the total").toBe(st.totalRuns);
  });

  test("EDGE-35 @ambiguous caught with runs attached — needs a product ruling", async ({ scoringMatch }) => {
    const m = scoringMatch;
    // Workbook: "Current applicable law/rule outcome used; do not use obsolete
    // crossing logic." Under the current Law the batters do not cross on a catch and
    // the incoming batter takes strike, regardless of whether they crossed.
    //
    // The app has no crossing concept at all: the wicket modal lets a scorer attach
    // 0-4 runs to a Caught, and applyBall then rotates strike on the parity of those
    // runs like any other delivery. This pins what it does; which behaviour is
    // wanted is a product decision, so nothing is asserted as wrong.
    const s = await m.api.state(m.matchPublicId);
    const victim = s.currentStrikerPublicId!;
    const survivor = s.currentNonStrikerPublicId!;
    const fielder = m.bowlers.find((b) => b.displayName === "Glenn Maxwell")!;

    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: victim, nonStrikerPublicId: survivor,
      runsBatsman: 1, isWicket: true, dismissalType: "CAUGHT",
      dismissedPlayerPublicId: victim, fielderPublicId: fielder.mtpPublicId,
    });

    const after = await m.api.state(m.matchPublicId);
    // Pinned behaviour: the single is counted, the batter is out and credited with
    // the run, and the odd total rotated the ends so the survivor is at the
    // striker's end with the dismissed end vacated.
    expect(after.inningsState.totalRuns, "runs attached to a catch are counted").toBe(1);
    expect(after.inningsState.totalWickets).toBe(1);
    expect(after.batterStats[victim].runs, "and credited to the dismissed batter").toBe(1);
    expect(after.currentStrikerPublicId, "the survivor ends up on strike").toBe(survivor);
    expect(after.currentNonStrikerPublicId, "and the dismissed end is empty").toBeNull();
  });

  test("EDGE-15 short run + wicket", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED: there is no short-run concept. A delivery records the runs " +
      "the scorer enters; nothing can mark a run as not completed, so 'completed " +
      "runs and out batter correct' has no short run to disallow.");
  });

  test("EDGE-20 rain + batter timing", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED: no wall-vs-active timing exists. Interruption time is " +
      "accumulated only as cricket_matches.total_break_seconds and is never " +
      "subtracted from any batter or partnership duration — see section 9 T20-199.");
  });

  test("EDGE-31 timed out after a wicket", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED: TIMED_OUT is not in the app's dismissal list and no arrival " +
      "timer exists. Since BUG-15 the string would at least not be credited to the " +
      "bowler if one were stored, but nothing raises or records it.");
  });

  test("EDGE-32 concussion / impact substitute", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED: no concussion or impact-substitute eligibility. Generic " +
      "substitution exists (section 13 T20-319) but enforces no like-for-like rule, " +
      "and is_impact_player is hardcoded false at every frontend call site.");
  });
});
