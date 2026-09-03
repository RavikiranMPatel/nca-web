import { test, expect } from "../fixtures/scoringMatch";
import { expectState } from "../fixtures/expectState";

/**
 * Workbook section 2 — Basic Legal Deliveries (T20-010 … T20-016).
 *
 * Baseline for every test: 0/0, 0.0, Virat Kohli striker, KL Rahul non-striker,
 * Bumrah bowling. The fixture asserts that at construction.
 *
 * Every scenario in this section is classified TESTABLE — the run buttons are
 * reachable and the rules are unambiguous, so each is driven through the UI and
 * verified against both the UI and the authoritative server state.
 */
test.describe("§2 Basic Legal Deliveries", () => {
  test("T20-010 dot ball — 0/0, 0.1, Virat still on strike", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("run-0").click();

    // Workbook: "0/0; 0.1; Virat faces; batter/bowler legal ball +1."
    await expectState(scoringMatch, {
      runs: 0, wickets: 0, balls: 1, over: 1, ballInOver: 1,
      striker: "Virat Kohli", nonStriker: "KL Rahul",
      batters: { "Virat Kohli": { runs: 0, balls: 1 } },
      bowlers: { Bumrah: { legalBalls: 1, runsConceded: 0, dots: 1 } },
    }, page);
  });

  test("T20-011 one run — Virat +1, KL faces next", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("run-1").click();

    // Workbook: "1/0; Virat +1; KL faces next."
    await expectState(scoringMatch, {
      runs: 1, wickets: 0, balls: 1,
      striker: "KL Rahul", nonStriker: "Virat Kohli",
      batters: { "Virat Kohli": { runs: 1, balls: 1 } },
      bowlers: { Bumrah: { legalBalls: 1, runsConceded: 1 } },
    }, page);
  });

  test("T20-012 two runs — Virat +2, Virat remains striker", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("run-2").click();

    // Workbook: "2/0; Virat +2; Virat remains striker."
    await expectState(scoringMatch, {
      runs: 2, wickets: 0, balls: 1,
      striker: "Virat Kohli", nonStriker: "KL Rahul",
      batters: { "Virat Kohli": { runs: 2, balls: 1 } },
      bowlers: { Bumrah: { legalBalls: 1, runsConceded: 2 } },
    }, page);
  });

  test("T20-013 three runs — Virat +3, KL faces", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("run-3").click();

    // Workbook: "3/0; Virat +3; KL faces."
    await expectState(scoringMatch, {
      runs: 3, wickets: 0, balls: 1,
      striker: "KL Rahul", nonStriker: "Virat Kohli",
      batters: { "Virat Kohli": { runs: 3, balls: 1 } },
      bowlers: { Bumrah: { legalBalls: 1, runsConceded: 3 } },
    }, page);
  });

  test("T20-014 four — Virat +4 and the 4s counter increments", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("run-4").click();

    // Workbook: "4/0; Virat +4; 4 counter +1."
    await expectState(scoringMatch, {
      runs: 4, wickets: 0, balls: 1,
      striker: "Virat Kohli", nonStriker: "KL Rahul",
      batters: { "Virat Kohli": { runs: 4, balls: 1, fours: 1, sixes: 0 } },
      bowlers: { Bumrah: { legalBalls: 1, runsConceded: 4 } },
    }, page);
  });

  test("T20-015 six — Virat +6 and the 6s counter increments", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("run-6").click();

    // Workbook: "6/0; Virat +6; 6 counter +1."
    await expectState(scoringMatch, {
      runs: 6, wickets: 0, balls: 1,
      striker: "Virat Kohli", nonStriker: "KL Rahul",
      batters: { "Virat Kohli": { runs: 6, balls: 1, fours: 0, sixes: 1 } },
      bowlers: { Bumrah: { legalBalls: 1, runsConceded: 6 } },
    }, page);
  });

  test("T20-016 balls faced increments on legal deliveries, not on a wide", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);

    // Workbook: "Legal 1/2/4/6 → batter ball faced increments; illegal extras
    // handled separately." Use 2/4/6 first so strike does not rotate, then the
    // single, so all four legal balls are faced by Virat.
    for (const r of [2, 4, 6, 1]) await page.getByTestId(`run-${r}`).click();

    await expectState(scoringMatch, {
      runs: 13, balls: 4,
      striker: "KL Rahul", nonStriker: "Virat Kohli",
      batters: { "Virat Kohli": { runs: 13, balls: 4, fours: 1, sixes: 1 } },
    }, page);

    // The illegal-extra half of the scenario: a wide must not add a ball faced.
    // Posted through the API — the wide picker has no testids yet (§3 adds them).
    const s = await scoringMatch.api.state(scoringMatch.matchPublicId);
    await scoringMatch.api.postBall(scoringMatch.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 0, runsExtras: 1, extraType: "WIDE",
    });

    const after = await scoringMatch.api.state(scoringMatch.matchPublicId);
    expect(after.inningsState.totalBalls, "a wide must not advance the legal-ball count").toBe(4);
    const virat = scoringMatch.batters.find((b) => b.displayName === "Virat Kohli")!;
    expect(after.batterStats[virat.mtpPublicId].balls, "Virat's balls faced after a wide").toBe(4);
  });
});
