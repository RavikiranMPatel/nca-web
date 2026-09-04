import { test, expect } from "../fixtures/scoringMatch";
import { expectState } from "../fixtures/expectState";

/**
 * Workbook section 7 — Dead Ball / Special Events (T20-140 … T20-149).
 *
 * Almost entirely skips. There is no dead-ball concept anywhere in this codebase —
 * a grep for dead_ball / deadBall across the backend and frontend returns nothing —
 * so the umpire calling one cannot be recorded at all, let alone with a reason.
 * Recorded scenario by scenario so the gap is visible in the report rather than
 * absent from it.
 */
test.describe("§7 Dead Ball / Special Events", () => {

  const DEAD_BALL: Array<[string, string]> = [
    ["T20-140", "distracted batter — 'No accidental legal ball/score'"],
    ["T20-141", "animal on the field — 'Status and event saved'"],
    ["T20-142", "ball bursts — 'Correct dead-ball/replacement flow'"],
    ["T20-143", "sight-screen issue — 'Delivery not accidentally counted'"],
    ["T20-144", "crowd interference — 'Status and audit correct'"],
    ["T20-145", "ball slips before delivery — 'No legal ball'"],
  ];
  for (const [id, what] of DEAD_BALL) {
    test(`${id} dead ball — ${what}`, async () => {
      test.skip(true,
        "NOT-IMPLEMENTED: no dead-ball concept exists. There is no way to record a " +
        "delivery that was called dead, so none of these can be scored. See " +
        "COVERAGE-MATRIX.md § 7.");
    });
  }

  test("T20-146 a delivered ball that hits the stumps is a valid wicket", async ({ scoringMatch, page }) => {
    // The one testable scenario in this section: it asserts the app does NOT
    // wrongly cancel a legitimate dismissal. Workbook: "Valid wicket; do not
    // cancel incorrectly."
    const m = scoringMatch;
    await m.open(page);
    await page.getByTestId("btn-wicket").click();
    await expect(page.getByTestId("wicket-modal")).toBeVisible();
    await page.getByTestId("dismissal-bowled").click();
    await page.getByTestId(`batter-out-${m.striker.mtpPublicId}`).click();
    await page.getByTestId("confirm-wicket").click();

    await expectState(m, {
      wickets: 1, balls: 1, runs: 0,
      bowlers: { Bumrah: { wickets: 1, legalBalls: 1 } },
    }, page);
    const s = await m.api.state(m.matchPublicId);
    expect(s.dismissedMtpPublicIds).toContain(m.striker.mtpPublicId);
  });

  test("T20-147 ball lodged in equipment", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED: no special-event model. Nothing can record the event or " +
      "any award arising from it.");
  });

  test("T20-148 lost ball", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED: no lost-ball or replacement-ball handling.");
  });

  test("T20-149 helmet on the ground — penalty runs separately represented", async ({ scoringMatch }) => {
    test.fail(true, "BUG-04: extras_penalty is not exposed in InningsStateDTO");
    // Workbook: "Penalty runs separately represented."
    // awardPenalty adds 5 to the team total and to innings.extras_penalty, which
    // is the right model for a helmet penalty. But the live state DTO stops at
    // extrasLegBye, so the runs are invisible in the extras breakdown and no
    // client-side reconciliation can close.
    const m = scoringMatch;
    const before = await m.api.state(m.matchPublicId);
    const res = await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/scoring/penalty`,
      { awardedTo: "FIELDING" });
    expect(res.status).toBe(200);

    const after = await m.api.state(m.matchPublicId);
    expect(after.inningsState.totalRuns, "the 5 penalty runs reach the team total")
      .toBe(before.inningsState.totalRuns + 5);

    // The buckets must account for every run in the total.
    const st = after.inningsState;
    const buckets = st.extrasWide + st.extrasNoBall + st.extrasBye + st.extrasLegBye
      + ((st as unknown as { extrasPenalty?: number }).extrasPenalty ?? 0);
    const batterRuns = Object.values(after.batterStats as Record<string, { runs: number }>)
      .reduce((sum, b) => sum + b.runs, 0);
    expect(batterRuns + buckets, "penalty runs must be visible in the extras breakdown")
      .toBe(st.totalRuns);
  });
});
