import { test, expect } from "../fixtures/scoringMatch";
import { expectState } from "../fixtures/expectState";

/**
 * Workbook section 8 — Bowler Change / Incomplete Over (T20-160 … T20-165).
 */
test.describe("§8 Bowler Change / Incomplete Over", () => {

  test("T20-160 bowler injured mid-over — replacement finishes, figures split to the ball", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const cummins = m.bowlers.find((b) => b.displayName === "Pat Cummins")!;

    // Workbook: "3 legal balls completed; bowler injured."
    await m.advanceTo({ runs: [1, 2, 1] });
    const mid = await m.api.state(m.matchPublicId);
    expect(mid.inningsState.totalBalls).toBe(3);
    expect(mid.bowlerStats[m.bowler.mtpPublicId].legalBalls, "Bumrah's three balls").toBe(3);
    const bumrahRuns = mid.bowlerStats[m.bowler.mtpPublicId].runsConceded;

    const res = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/bowler-injury-replace`,
      { replacementBowlerPublicId: cummins.mtpPublicId });
    expect(res.status, "mid-over replacement is allowed once a ball has been bowled").toBe(200);

    // Replacement bowls the remaining three.
    await m.advanceTo({ runs: [4, 0, 2] });
    const end = await m.api.state(m.matchPublicId);

    // Workbook: "Replacement finishes over; figures split correctly."
    expect(end.inningsState.totalBalls, "the over completes at six legal balls").toBe(6);
    expect(end.bowlerStats[m.bowler.mtpPublicId].legalBalls, "Bumrah keeps exactly his three").toBe(3);
    expect(end.bowlerStats[m.bowler.mtpPublicId].runsConceded).toBe(bumrahRuns);
    expect(end.bowlerStats[cummins.mtpPublicId].legalBalls, "Cummins bowled the other three").toBe(3);
    expect(end.bowlerStats[cummins.mtpPublicId].runsConceded, "and conceded only his own runs").toBe(6);
    expect(end.inningsState.totalRuns).toBe(bumrahRuns + 6);

  });

  test("T20-160 eligibility — the bowler who finished the over cannot bowl the next", async ({ scoringMatch }) => {
    test.fail(true, "BUG-14: the consecutive-over rule is enforced only in the UI picker");
    // Workbook T20-160 also requires "eligibility enforced", and T20-094 requires
    // "previous bowler not consecutive". The scorer UI does block it — the picker
    // hard-disables the last bowler — but the API does not, so the rule is a UI
    // convention rather than a rule of the game as far as the server is concerned.
    const m = scoringMatch;
    await m.advanceTo({ legalBalls: 6 });
    const s = await m.api.state(m.matchPublicId);
    expect(s.lastBowlerPublicId, "Bumrah bowled the completed over").toBe(m.bowler.mtpPublicId);
    expect(s.currentBowlerPublicId, "the over ended, so no bowler is set").toBeNull();

    const again = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/correct-bowler`,
      { bowlerPublicId: m.bowler.mtpPublicId });
    expect(again.status, "the same bowler must not be allowed two overs in a row")
      .toBeGreaterThanOrEqual(400);
  });

  test("T20-161 bowler unavailable mid-over — replacement allowed, reason not captured", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const zampa = m.bowlers.find((b) => b.displayName === "Adam Zampa")!;
    await m.advanceTo({ legalBalls: 2 });

    const res = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/bowler-injury-replace`,
      { replacementBowlerPublicId: zampa.mtpPublicId });
    expect(res.status, "the remaining balls can be completed by an eligible bowler").toBe(200);

    await m.advanceTo({ legalBalls: 4 });
    const end = await m.api.state(m.matchPublicId);
    expect(end.inningsState.totalBalls).toBe(6);
    expect(end.bowlerStats[zampa.mtpPublicId].legalBalls).toBe(4);

    // Workbook also asks for "audit saved". BowlerInjuryReplaceRequest carries no
    // reason field, so "injured" and "suspended" are indistinguishable — noted in
    // COVERAGE-MATRIX.md rather than asserted.
  });

  test("T20-162 wrong bowler corrected before the first ball of the over", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const cummins = m.bowlers.find((b) => b.displayName === "Pat Cummins")!;
    const s0 = await m.api.state(m.matchPublicId);
    expect(s0.currentBowlerPublicId).toBe(m.bowler.mtpPublicId);

    // Workbook: "Correct bowler used; audit correction."
    const res = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/correct-bowler`,
      { bowlerPublicId: cummins.mtpPublicId });
    expect(res.status).toBe(200);
    const s1 = await m.api.state(m.matchPublicId);
    expect(s1.currentBowlerPublicId).toBe(cummins.mtpPublicId);

    // And it is refused once a ball has been bowled — the app directs the scorer
    // to edit the delivery instead.
    await m.advanceTo({ legalBalls: 1 });
    const late = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/correct-bowler`,
      { bowlerPublicId: m.bowler.mtpPublicId });
    expect(late.status).toBe(400);
    expect(String(late.body?.message)).toContain("already bowled");
  });

  test("T20-163 wrong bowler after a ball — figures corrected, score unchanged", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const cummins = m.bowlers.find((b) => b.displayName === "Pat Cummins")!;
    await m.advanceTo({ runs: [4] });

    const before = await m.api.state(m.matchPublicId);
    expect(before.bowlerStats[m.bowler.mtpPublicId].runsConceded).toBe(4);

    const deliveries = await m.api.raw("get",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/deliveries`);
    const last = deliveries.body[deliveries.body.length - 1];

    const res = await m.api.raw("patch",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/deliveries/${last.publicId}`,
      { bowlerPublicId: cummins.mtpPublicId });
    expect(res.status, "the delivery's bowler can be corrected after the fact").toBe(200);

    const after = await m.api.state(m.matchPublicId);
    // Workbook: "Bowling figures corrected; score unchanged."
    expect(after.inningsState.totalRuns, "the team total is untouched").toBe(before.inningsState.totalRuns);
    expect(after.inningsState.totalBalls).toBe(before.inningsState.totalBalls);
    expect(after.bowlerStats[cummins.mtpPublicId].runsConceded, "the runs move to the real bowler").toBe(4);
    expect(after.bowlerStats[cummins.mtpPublicId].legalBalls).toBe(1);
    expect(after.bowlerStats[m.bowler.mtpPublicId], "the wrongly-credited bowler is cleared")
      .toBeUndefined();
  });

  test("T20-164 incomplete over interrupted — the next ball is exactly the next one", async ({ scoringMatch, page }) => {
    const m = scoringMatch;
    // Workbook uses 12.3; the same property holds at 0.3 and needs no long setup.
    await m.advanceTo({ runs: [1, 2, 1] });
    const before = await m.api.state(m.matchPublicId);
    expect(before.inningsState.ballInOver, "three balls gone").toBe(3);

    await m.open(page);
    await page.getByTestId("btn-pause").click();
    await page.getByTestId("pause-reason-rain").click();
    await page.getByTestId("confirm-pause").click();
    await expect(page.getByTestId("pause-banner")).toBeVisible();

    // Scoring is refused while paused.
    const blocked = await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/scoring/ball`, {
      bowlerPublicId: before.currentBowlerPublicId,
      batsmanPublicId: before.currentStrikerPublicId,
      nonStrikerPublicId: before.currentNonStrikerPublicId,
      runsBatsman: 1,
    });
    expect(blocked.status, "no ball may be scored during a pause").toBe(409);

    await page.getByTestId("btn-resume").click();
    await expect(page.getByTestId("pause-banner")).toHaveCount(0);

    // Workbook: "Next ball = 12.4; no skipped/duplicated ball."
    await page.getByTestId("run-0").click();
    await expectState(m, {
      balls: 4, over: 1, ballInOver: 4,
      runs: before.inningsState.totalRuns,
    }, page);
  });

  test("T20-165 resume after interruption — same score, over, batters and bowler", async ({ scoringMatch, page }) => {
    const m = scoringMatch;
    await m.advanceTo({ runs: [4, 1, 2] });
    const before = await m.api.state(m.matchPublicId);

    await m.open(page);
    await page.getByTestId("btn-pause").click();
    await page.getByTestId("pause-reason-bad-light").click();
    await page.getByTestId("confirm-pause").click();
    await expect(page.getByTestId("pause-banner")).toBeVisible();
    await page.getByTestId("btn-resume").click();
    await expect(page.getByTestId("pause-banner")).toHaveCount(0);

    const after = await m.api.state(m.matchPublicId);
    // Workbook: "Same score, over, striker, non-striker, bowler."
    expect(after.inningsState.totalRuns).toBe(before.inningsState.totalRuns);
    expect(after.inningsState.totalBalls).toBe(before.inningsState.totalBalls);
    expect(after.inningsState.overNumber).toBe(before.inningsState.overNumber);
    expect(after.inningsState.ballInOver).toBe(before.inningsState.ballInOver);
    expect(after.currentStrikerPublicId).toBe(before.currentStrikerPublicId);
    expect(after.currentNonStrikerPublicId).toBe(before.currentNonStrikerPublicId);
    expect(after.currentBowlerPublicId).toBe(before.currentBowlerPublicId);
    expect(after.batterStats).toEqual(before.batterStats);
    expect(after.bowlerStats).toEqual(before.bowlerStats);

    // And scoring resumes normally.
    await page.getByTestId("run-1").click();
    await expectState(m, { balls: 4, runs: before.inningsState.totalRuns + 1 }, page);
  });
});
