import { test, expect } from "../fixtures/scoringMatch";
import { expectState } from "../fixtures/expectState";

/**
 * BUG-04 and BUG-17 regression — penalty runs.
 *
 * BUG-04: `extras_penalty` existed on the innings row and was counted in the
 * scorecard's extrasTotal, but was absent from `InningsStateDTO`, so the live
 * scorer never saw it. The scorer had no extras readout at all, so five runs
 * appeared in the team total with nothing anywhere to explain them.
 *
 * BUG-17: `awardPenalty` writes no delivery, and `replayInnings` zeroes every
 * aggregate and rebuilds from the delivery stream — so an undo silently erased the
 * penalty, and the five runs with it.
 */
test.describe("BUG-04/17 penalty extras", () => {

  test("a penalty awarded through the UI shows in the extras breakdown", async ({ scoringMatch, page }) => {
    const m = scoringMatch;
    await m.open(page);
    await page.getByTestId("run-4").click();
    await expectState(m, { runs: 4, extras: { penalty: 0 } }, page);
    await expect(page.getByTestId("ex-p")).toHaveText("0");

    await page.getByTestId("extra-penalty").click();
    await page.getByTestId("penalty-to-batting").click();

    // Workbook T20-149: "Penalty runs separately represented."
    await expectState(m, { runs: 9, extras: { penalty: 5 } }, page);
    await expect(page.getByTestId("ex-p"), "the penalty bucket is visible").toHaveText("5");
    await expect(page.getByTestId("extras-total"), "and counted in the extras total").toHaveText("5");
  });

  test("extras reconcile with a penalty in play", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const bowl = async (ball: Record<string, unknown>) => {
      const s = await m.api.state(m.matchPublicId);
      await m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s.currentBowlerPublicId!,
        batsmanPublicId: s.currentStrikerPublicId!,
        nonStrikerPublicId: s.currentNonStrikerPublicId!,
        ...(ball as any),
      });
    };
    await bowl({ runsBatsman: 4 });
    await bowl({ runsBatsman: 0, runsExtras: 1, extraType: "WIDE" });
    await bowl({ runsBatsman: 0, runsExtras: 2, extraType: "BYE" });
    await bowl({ runsBatsman: 0, runsExtras: 3, extraType: "NO_BALL", noBallRunsType: "LEG_BYE" });
    await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/scoring/penalty`,
      { awardedTo: "FIELDING" });

    const s = await m.api.state(m.matchPublicId);
    const st = s.inningsState;
    const batterRuns = Object.values(s.batterStats as Record<string, { runs: number }>)
      .reduce((n, b) => n + b.runs, 0);
    const buckets = st.extrasWide + st.extrasNoBall + st.extrasBye + st.extrasLegBye + st.extrasPenalty;

    expect(st.extrasPenalty, "the penalty is its own bucket").toBe(5);
    expect(batterRuns + buckets,
      "batters + wd + nb + b + lb + penalty must equal the team total").toBe(st.totalRuns);

    // The scorecard, which builds its own total, must agree bucket for bucket.
    const card = await m.api.raw("get", `/api/public/scorecard/${m.matchPublicId}`);
    const inn = card.body.innings[0];
    expect(inn.extrasPenalty, "the scorecard exposes the bucket too").toBe(st.extrasPenalty);
    expect(inn.extrasTotal, "and its total includes it").toBe(buckets);
    expect(inn.totalRuns).toBe(st.totalRuns);
  });

  test("BUG-17 undo preserves a penalty and the runs it contributed", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await m.advanceTo({ runs: [4] });
    await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/scoring/penalty`,
      { awardedTo: "FIELDING" });
    const afterPenalty = await m.api.state(m.matchPublicId);
    expect(afterPenalty.inningsState.totalRuns).toBe(9);
    expect(afterPenalty.inningsState.extrasPenalty).toBe(5);

    await m.advanceTo({ runs: [2] });
    const before = await m.api.state(m.matchPublicId);
    expect(before.inningsState.totalRuns).toBe(11);

    const after = await m.api.undo(m.matchPublicId);

    // The penalty is not a delivery, so a replay must carry it rather than drop it.
    expect(after.inningsState.totalRuns, "only the undone delivery is removed").toBe(9);
    expect(after.inningsState.extrasPenalty, "the penalty survives the replay").toBe(5);

    const batterRuns = Object.values(after.batterStats as Record<string, { runs: number }>)
      .reduce((n, b) => n + b.runs, 0);
    const st = after.inningsState;
    expect(batterRuns + st.extrasWide + st.extrasNoBall + st.extrasBye + st.extrasLegBye
      + st.extrasPenalty, "and the reconciliation still closes").toBe(st.totalRuns);
  });
});
