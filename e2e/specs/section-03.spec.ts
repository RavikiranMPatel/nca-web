import { test, expect } from "../fixtures/scoringMatch";
import { expectState } from "../fixtures/expectState";

/**
 * Workbook section 3 — Extras: Wide / No Ball / Bye / Leg Bye (T20-020 … T20-039).
 *
 * Every scenario in this section now asserts the Laws directly, with no
 * annotations and no @ambiguous companions left: BUG-01 (strike inverted on every
 * wide and no ball), BUG-02 (byes and leg-byes charged to the bowler) and BUG-03
 * (NB+bye and NB+leg-bye posting an identical payload) are all fixed. Dedicated
 * regressions live in e2e/specs/bug-0{1,2,3}-*.spec.ts.
 *
 * This section carried all three of those bugs while they were open, using
 * test.fail() on the workbook's own assertion plus an @ambiguous companion
 * pinning current behaviour. Both are gone now that the assertions pass on their
 * own; the pattern is documented in TEST-PLAN.md for the next one.
 */
test.describe("§3 Extras — Wide / No Ball / Bye / Leg Bye", () => {

  // ── Wides ────────────────────────────────────────────────────────────────
  test("T20-020 wide — +1, no legal ball, striker unchanged", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-wide").click();
    await page.getByTestId("wide-plus-0").click();

    // Workbook: "Team +1; batter +0; bowler +1; legal ball unchanged."
    // Nothing was run off the wide, so the batters do not cross: Virat keeps
    // strike. (Was BUG-01, fixed.)
    await expectState(scoringMatch, {
      runs: 1, wickets: 0, balls: 0, over: 1, ballInOver: 0,
      striker: "Virat Kohli", nonStriker: "KL Rahul",
      extras: { wide: 1 },
      batters: { "Virat Kohli": { runs: 0, balls: 0 } },
      bowlers: { Bumrah: { legalBalls: 0, runsConceded: 1, wides: 1 } },
    }, page);
  });

  test("T20-021 wide + 1 run — team +2, wides +2, illegal delivery", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-wide").click();
    await page.getByTestId("wide-plus-1").click();

    // Workbook: "Team +2; wide +2; batter 0; bowler +2; illegal delivery."
    // This scenario's Verify line is "extras • strike": one run was completed off
    // the wide, so the batters crossed and KL is on strike. (Was BUG-01, fixed.)
    await expectState(scoringMatch, {
      runs: 2, balls: 0, extras: { wide: 2 },
      striker: "KL Rahul", nonStriker: "Virat Kohli",
      batters: { "Virat Kohli": { runs: 0, balls: 0 } },
      bowlers: { Bumrah: { legalBalls: 0, runsConceded: 2, wides: 1 } },
    }, page);
  });

  test("T20-022 wide + 2 runs — team +3, illegal delivery", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-wide").click();
    await page.getByTestId("wide-plus-2").click();

    // Workbook: "Team +3; batter 0; bowler +3; illegal delivery."
    await expectState(scoringMatch, {
      runs: 3, balls: 0, extras: { wide: 3 },
      batters: { "Virat Kohli": { runs: 0, balls: 0 } },
      bowlers: { Bumrah: { legalBalls: 0, runsConceded: 3 } },
    }, page);
  });

  test("T20-023 wide + 3 runs — team +4", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-wide").click();
    await page.getByTestId("wide-plus-3").click();

    // Workbook: "Team +4; batter 0; bowler +4."
    await expectState(scoringMatch, {
      runs: 4, balls: 0, extras: { wide: 4 },
      bowlers: { Bumrah: { legalBalls: 0, runsConceded: 4 } },
    }, page);
  });

  test("T20-024 wide to boundary — +5 wides, bowler +5, illegal", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-wide").click();
    await page.getByTestId("wide-plus-4").click();

    // Workbook: "Scenario total +5 wides; bowler +5; illegal delivery."
    await expectState(scoringMatch, {
      runs: 5, balls: 0, extras: { wide: 5 },
      batters: { "Virat Kohli": { runs: 0, balls: 0, fours: 0 } },
      bowlers: { Bumrah: { legalBalls: 0, runsConceded: 5, wides: 1 } },
    }, page);
  });

  test("T20-025 wide + stumping — wide recorded, no legal ball, batter out", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);

    // The only UI path that combines a wide with a dismissal: the wicket modal
    // exposes its "Wide ball (stumped off wide)" toggle for Stumped only
    // (LiveScorerPage.tsx:2641). Posted via the API here because the wicket modal
    // has no testids yet — §6 adds them.
    const s = await scoringMatch.api.state(scoringMatch.matchPublicId);
    const keeper = scoringMatch.bowlers.find((b) => b.displayName === "Matthew Wade")!;
    await scoringMatch.api.postBall(scoringMatch.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 0, runsExtras: 1, extraType: "WIDE",
      isWicket: true, dismissalType: "STUMPED",
      dismissedPlayerPublicId: s.currentStrikerPublicId!,
      fielderPublicId: keeper.mtpPublicId,
    });

    // Workbook: "Wide recorded; stumping only if legally valid; no legal ball."
    await expectState(scoringMatch, {
      runs: 1, wickets: 1, balls: 0,
      extras: { wide: 1 },
    });
  });

  test("T20-026 wide + run out — recorded via API (UI gap)", async ({ scoringMatch }) => {
    // TESTABLE-BACKEND-ONLY. The wicket modal only offers the wide toggle for
    // Stumped, so a wide + run out cannot be entered through the UI at all.
    const s = await scoringMatch.api.state(scoringMatch.matchPublicId);
    const fielder = scoringMatch.bowlers.find((b) => b.displayName === "Glenn Maxwell")!;
    await scoringMatch.api.postBall(scoringMatch.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 0, runsExtras: 1, extraType: "WIDE",
      isWicket: true, dismissalType: "RUN_OUT",
      dismissedPlayerPublicId: s.currentNonStrikerPublicId!,
      fielderPublicId: fielder.mtpPublicId,
    });

    // Workbook: "Wide extras + run out; correct batter out; no legal ball."
    await expectState(scoringMatch, {
      runs: 1, wickets: 1, balls: 0, extras: { wide: 1 },
      bowlers: { Bumrah: { wickets: 0 } },   // a run out is not the bowler's wicket
    });
  });

  // ── No balls ─────────────────────────────────────────────────────────────
  test("T20-027 no ball — +1, no legal ball, free hit armed", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-no-ball").click();
    await page.getByTestId("nb-plus-0").click();

    // Workbook: "Team +1; batter 0; bowler +1; legal ball unchanged; free-hit state."
    await expectState(scoringMatch, {
      runs: 1, balls: 0, extras: { noBall: 1 },
      striker: "Virat Kohli", nonStriker: "KL Rahul",
      batters: { "Virat Kohli": { runs: 0, balls: 1 } },   // a no-ball IS a ball faced
      bowlers: { Bumrah: { legalBalls: 0, runsConceded: 1, noBalls: 1 } },
      freeHit: true,
    }, page);
  });

  test("T20-028 no ball + 1 off the bat — team +2, batter +1", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-no-ball").click();
    await page.getByTestId("nb-plus-1").click();
    await page.getByTestId("nb-source-batsman").click();

    // Workbook: "Team +2; batter +1; bowler +2."
    await expectState(scoringMatch, {
      runs: 2, balls: 0, extras: { noBall: 1 },
      batters: { "Virat Kohli": { runs: 1, balls: 1 } },
      bowlers: { Bumrah: { legalBalls: 0, runsConceded: 2, noBalls: 1 } },
      freeHit: true,
    }, page);
  });

  test("T20-029 no ball + four — team +5, Virat +4", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-no-ball").click();
    await page.getByTestId("nb-plus-4").click();
    await page.getByTestId("nb-source-batsman").click();

    // Workbook: "Team +5; Virat +4; bowler +5; illegal delivery."
    await expectState(scoringMatch, {
      runs: 5, balls: 0, extras: { noBall: 1 },
      batters: { "Virat Kohli": { runs: 4, balls: 1, fours: 1 } },
      bowlers: { Bumrah: { legalBalls: 0, runsConceded: 5, noBalls: 1 } },
      freeHit: true,
    }, page);
  });

  test("T20-030 no ball + six — team +7, Virat +6", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-no-ball").click();
    await page.getByTestId("nb-plus-6").click();
    await page.getByTestId("nb-source-batsman").click();

    // Workbook: "Team +7; Virat +6; bowler +7."
    await expectState(scoringMatch, {
      runs: 7, balls: 0, extras: { noBall: 1 },
      batters: { "Virat Kohli": { runs: 6, balls: 1, sixes: 1 } },
      bowlers: { Bumrah: { legalBalls: 0, runsConceded: 7, noBalls: 1 } },
      freeHit: true,
    }, page);
  });

  test("T20-031 no ball + 2 byes — bowler +1 only, byes +2", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-no-ball").click();
    await page.getByTestId("nb-plus-2").click();
    await page.getByTestId("nb-source-bye").click();

    // Workbook: "Team +3; batter 0; bowler +1 only; byes +2; illegal."
    await expectState(scoringMatch, {
      runs: 3, balls: 0,
      extras: { noBall: 1, bye: 2 },
      batters: { "Virat Kohli": { runs: 0 } },
      bowlers: { Bumrah: { runsConceded: 1, noBalls: 1 } },
    }, page);
  });

  test("T20-032 no ball + leg byes — bowler gets the NB penalty only", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-no-ball").click();
    await page.getByTestId("nb-plus-2").click();
    await page.getByTestId("nb-source-leg-bye").click();

    // Workbook: "Team = NB + leg byes; batter 0; bowler gets NB penalty only."
    await expectState(scoringMatch, {
      runs: 3, balls: 0,
      extras: { noBall: 1, legBye: 2 },
      bowlers: { Bumrah: { runsConceded: 1, noBalls: 1 } },
    }, page);
  });

  // ── Byes and leg byes ────────────────────────────────────────────────────
  test("T20-033 bye — team +N, batter 0, bowler 0, legal ball +1", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-bye").click();
    await page.getByTestId("bye-4").click();

    // Workbook: "Team +N; batter 0; bowler 0; legal ball +1."
    await expectState(scoringMatch, {
      runs: 4, balls: 1,
      extras: { bye: 4 },
      batters: { "Virat Kohli": { runs: 0, balls: 1 } },
      bowlers: { Bumrah: { legalBalls: 1, runsConceded: 0 } },
    }, page);
  });

  test("T20-034 leg bye — team +N, batter 0, bowler 0, legal ball +1", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-leg-bye").click();
    await page.getByTestId("leg-bye-2").click();

    // Workbook: "Team +N; batter 0; bowler 0; legal ball +1."
    await expectState(scoringMatch, {
      runs: 2, balls: 1,
      extras: { legBye: 2 },
      bowlers: { Bumrah: { legalBalls: 1, runsConceded: 0 } },
    }, page);
  });

  // ── Overthrows ───────────────────────────────────────────────────────────
  test("T20-035 overthrow on the bat — 5 credited to the batter", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-five-seven").click();
    await page.getByTestId("overthrow-5").click();

    // Workbook: "Team/batter/bowler attribution and final ends correct."
    // The 5/7 picker records the total as batsman runs; 5 is odd, so strike rotates.
    await expectState(scoringMatch, {
      runs: 5, balls: 1,
      striker: "KL Rahul", nonStriker: "Virat Kohli",
      batters: { "Virat Kohli": { runs: 5, balls: 1, fours: 0, sixes: 0 } },
      bowlers: { Bumrah: { legalBalls: 1, runsConceded: 5 } },
    }, page);
  });

  test("T20-036 overthrow on a bye — all credited as byes, batter 0", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-bye").click();
    await page.getByTestId("bye-5").click();

    // Workbook: "All credited as byes; batter/bowler 0."
    await expectState(scoringMatch, {
      runs: 5, balls: 1, extras: { bye: 5 },
      batters: { "Virat Kohli": { runs: 0 } },
      bowlers: { Bumrah: { runsConceded: 0 } },
    }, page);
  });

  test("T20-037 overthrow on a leg bye — all credited as leg byes, batter 0", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-leg-bye").click();
    await page.getByTestId("leg-bye-5").click();

    // Workbook: "All credited as leg byes; batter/bowler 0."
    await expectState(scoringMatch, {
      runs: 5, balls: 1, extras: { legBye: 5 },
      batters: { "Virat Kohli": { runs: 0 } },
      bowlers: { Bumrah: { runsConceded: 0 } },
    }, page);
  });

  test("T20-038 overthrow on a wide — all credited to wides, illegal ball", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-wide").click();
    await page.getByTestId("wide-plus-6").click();

    // Workbook: "All applicable runs credited to wides; illegal ball."
    await expectState(scoringMatch, {
      runs: 7, balls: 0, extras: { wide: 7, bye: 0, legBye: 0 },
      batters: { "Virat Kohli": { runs: 0, balls: 0 } },
      bowlers: { Bumrah: { legalBalls: 0, runsConceded: 7, wides: 1 } },
    }, page);
  });

  test("T20-039 overthrow on a no ball — byes and leg-byes excluded from the bowler", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-no-ball").click();
    await page.getByTestId("nb-plus-4").click();
    await page.getByTestId("nb-source-bye").click();

    // Workbook: "NB penalty + applicable chargeable runs; byes/leg-byes excluded
    // from bowler."
    await expectState(scoringMatch, {
      runs: 5, balls: 0,
      extras: { noBall: 1, bye: 4 },
      bowlers: { Bumrah: { runsConceded: 1 } },
    }, page);
  });
});
