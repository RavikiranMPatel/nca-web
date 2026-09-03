import { test, expect } from "../fixtures/scoringMatch";
import { expectState } from "../fixtures/expectState";

/**
 * Workbook section 3 — Extras: Wide / No Ball / Bye / Leg Bye (T20-020 … T20-039).
 *
 * This section is where the app and the workbook disagree most. Three logged
 * bugs bite here:
 *   BUG-01  a plain wide rotates strike
 *   BUG-02  byes and leg-byes are charged to the bowler
 *   BUG-03  NB+bye and NB+leg-bye post an identical payload
 *
 * Pattern, per the slice instructions:
 *   - Where a logged bug makes the workbook's expectation fail, the test asserts
 *     what the WORKBOOK says and is marked test.fail() with the bug id. It must
 *     flip to "expected to fail but passed" when the bug is fixed. The assertion
 *     is never weakened to make it green.
 *   - A companion @ambiguous test pins what the app actually does today, so the
 *     current behaviour is visible and reviewable alongside the failing one.
 */
test.describe("§3 Extras — Wide / No Ball / Bye / Leg Bye", () => {

  // ── Wides ────────────────────────────────────────────────────────────────
  test("T20-020 wide — +1, no legal ball, striker unchanged", async ({ scoringMatch, page }) => {
    test.fail(true, "BUG-01: a plain wide rotates strike");
    await scoringMatch.open(page);
    await page.getByTestId("extra-wide").click();
    await page.getByTestId("wide-plus-0").click();

    // Workbook: "Team +1; batter +0; bowler +1; legal ball unchanged."
    // A wide with no runs run is not a completed run, so the batters do not
    // cross and Virat keeps strike.
    await expectState(scoringMatch, {
      runs: 1, wickets: 0, balls: 0, over: 1, ballInOver: 0,
      striker: "Virat Kohli", nonStriker: "KL Rahul",
      extras: { wide: 1 },
      batters: { "Virat Kohli": { runs: 0, balls: 0 } },
      bowlers: { Bumrah: { legalBalls: 0, runsConceded: 1, wides: 1 } },
    }, page);
  });

  test("T20-020 @ambiguous wide — what the app does today (BUG-01)", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-wide").click();
    await page.getByTestId("wide-plus-0").click();

    // Pinned current behaviour: everything matches the workbook EXCEPT strike,
    // which rotates because applyBall:1103 keys off (runsBatsman + runsExtras)
    // being odd and the wide penalty run counts toward that total.
    await expectState(scoringMatch, {
      runs: 1, balls: 0, extras: { wide: 1 },
      striker: "KL Rahul", nonStriker: "Virat Kohli",
      bowlers: { Bumrah: { legalBalls: 0, runsConceded: 1, wides: 1 } },
    }, page);
  });

  test("T20-021 wide + 1 run — team +2, wides +2, illegal delivery", async ({ scoringMatch, page }) => {
    test.fail(true, "BUG-01: strike is inverted on every wide");
    await scoringMatch.open(page);
    await page.getByTestId("extra-wide").click();
    await page.getByTestId("wide-plus-1").click();

    // Workbook: "Team +2; wide +2; batter 0; bowler +2; illegal delivery."
    // This scenario's Verify line is "extras • strike", so strike is asserted:
    // one run was completed off the wide, so the batters crossed and KL is on
    // strike.
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
    test.fail(true, "BUG-01: strike is inverted on every no ball too");
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
    test.fail(true, "BUG-03/BUG-02: NB byes are folded into the no-ball bucket and fully charged to the bowler");
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
    test.fail(true, "BUG-03/BUG-02: NB leg-byes are indistinguishable from NB byes and fully charged");
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

  test("T20-031/T20-032 @ambiguous NB+bye and NB+leg-bye are the same delivery (BUG-03)", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-no-ball").click();
    await page.getByTestId("nb-plus-2").click();
    await page.getByTestId("nb-source-bye").click();

    // Pinned: everything lands in extras_no_ball, the byes bucket stays empty,
    // and the bowler is charged all three runs.
    await expectState(scoringMatch, {
      runs: 3, balls: 0,
      extras: { noBall: 3, bye: 0, legBye: 0 },
      bowlers: { Bumrah: { runsConceded: 3, noBalls: 1 } },
    }, page);

    // And the Leg Bye button produces a byte-identical delivery — the two
    // controls differ only in their label (LiveScorerPage.tsx:1947 vs :1959).
    await page.getByTestId("extra-no-ball").click();
    await page.getByTestId("nb-plus-2").click();
    await page.getByTestId("nb-source-leg-bye").click();

    await expectState(scoringMatch, {
      runs: 6, balls: 0,
      extras: { noBall: 6, bye: 0, legBye: 0 },
    }, page);
  });

  test("@ambiguous BUG-01 strike is inverted on every wide and no ball", async ({ scoringMatch }) => {
    // Pins the full shape of BUG-01, measured against what the Laws require.
    // applyBall:1103 rotates strike when (runsBatsman + runsExtras) is odd. For a
    // wide or a no ball, runsExtras includes the one-run PENALTY, which nobody
    // ran — so the parity is flipped on every such delivery. Byes and leg-byes
    // are unaffected, because there every extra run is a run actually completed.
    const m = scoringMatch;

    // Score one dot first so the innings always has a delivery to replay back to.
    // Undoing to ZERO deliveries nulls striker/non-striker/bowler (BUG-12), which
    // would break the loop; a dot is parity-neutral so it does not disturb strike.
    {
      const s0 = await m.api.state(m.matchPublicId);
      await m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s0.currentBowlerPublicId!,
        batsmanPublicId: s0.currentStrikerPublicId!,
        nonStrikerPublicId: s0.currentNonStrikerPublicId!,
        runsBatsman: 0,
      });
    }

    const cases: Array<[string, any, "Virat Kohli" | "KL Rahul"]> = [
      ["plain wide",          { runsBatsman: 0, runsExtras: 1, extraType: "WIDE" },    "Virat Kohli"],
      ["wide + 1 run",        { runsBatsman: 0, runsExtras: 2, extraType: "WIDE" },    "KL Rahul"],
      ["wide + 2 runs",       { runsBatsman: 0, runsExtras: 3, extraType: "WIDE" },    "Virat Kohli"],
      ["plain no ball",       { runsBatsman: 0, runsExtras: 1, extraType: "NO_BALL" }, "Virat Kohli"],
      ["no ball + 1 off bat", { runsBatsman: 1, runsExtras: 1, extraType: "NO_BALL" }, "KL Rahul"],
      ["no ball + 2 off bat", { runsBatsman: 2, runsExtras: 1, extraType: "NO_BALL" }, "Virat Kohli"],
      ["no ball + 4 off bat", { runsBatsman: 4, runsExtras: 1, extraType: "NO_BALL" }, "Virat Kohli"],
    ];
    const inverted: string[] = [];
    for (const [label, ball, lawful] of cases) {
      const s0 = await m.api.state(m.matchPublicId);
      const before = s0.currentStrikerPublicId;
      const resp = await m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s0.currentBowlerPublicId!,
        batsmanPublicId: s0.currentStrikerPublicId!,
        nonStrikerPublicId: s0.currentNonStrikerPublicId!,
        ...ball,
      });
      const rotated = resp.currentStrikerPublicId !== before;
      const lawSaysRotate = lawful === "KL Rahul";
      if (rotated !== lawSaysRotate) inverted.push(label);
      await m.api.undo(m.matchPublicId);   // replay-based undo restores strike
    }
    // Every one of the seven is wrong, in both directions.
    expect(inverted, "wide/no-ball deliveries whose strike outcome is wrong")
      .toEqual(cases.map(([l]) => l));

    // Control: byes rotate correctly, so this is specific to the penalty run.
    const s1 = await m.api.state(m.matchPublicId);
    const b1 = s1.currentStrikerPublicId;
    const r1 = await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s1.currentBowlerPublicId!,
      batsmanPublicId: s1.currentStrikerPublicId!,
      nonStrikerPublicId: s1.currentNonStrikerPublicId!,
      runsBatsman: 0, runsExtras: 1, extraType: "BYE",
    });
    expect(r1.currentStrikerPublicId, "a single bye must rotate strike").not.toBe(b1);
  });

  // ── Byes and leg byes ────────────────────────────────────────────────────
  test("T20-033 bye — team +N, batter 0, bowler 0, legal ball +1", async ({ scoringMatch, page }) => {
    test.fail(true, "BUG-02: byes are charged to the bowler");
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
    test.fail(true, "BUG-02: leg-byes are charged to the bowler");
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

  test("T20-033/T20-034 @ambiguous byes and leg-byes charged to the bowler (BUG-02)", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-bye").click();
    await page.getByTestId("bye-4").click();

    // Pinned: the extras buckets are right, the legal-ball count is right, the
    // batter is correctly untouched — but applyBall:1092 adds every extra to the
    // bowler's runsConceded regardless of type.
    await expectState(scoringMatch, {
      runs: 4, balls: 1, extras: { bye: 4 },
      batters: { "Virat Kohli": { runs: 0, balls: 1 } },
      bowlers: { Bumrah: { legalBalls: 1, runsConceded: 4 } },
    }, page);

    await page.getByTestId("extra-leg-bye").click();
    await page.getByTestId("leg-bye-2").click();
    await expectState(scoringMatch, {
      runs: 6, balls: 2, extras: { bye: 4, legBye: 2 },
      bowlers: { Bumrah: { legalBalls: 2, runsConceded: 6 } },
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
    test.fail(true, "BUG-02: the bowler is charged for the byes");
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
    test.fail(true, "BUG-02: the bowler is charged for the leg-byes");
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
    test.fail(true, "BUG-02/BUG-03: NB byes are charged to the bowler and bucketed as no-ball");
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
