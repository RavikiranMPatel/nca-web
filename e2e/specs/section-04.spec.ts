import { test, expect } from "../fixtures/scoringMatch";
import { expectState } from "../fixtures/expectState";

/**
 * Workbook section 4 — No-Ball / Wide Types & Free Hit (T20-050 … T20-066).
 *
 * Mostly skips, by design. T20-050 to T20-055 all ask for the *reason* a no ball
 * was called to be stored, and there is no such field anywhere: `Delivery` carries
 * only `extra_type = 'NO_BALL'`. Those are recorded as NOT-IMPLEMENTED rather than
 * quietly dropped.
 */
test.describe("§4 No-Ball / Wide Types & Free Hit", () => {

  // ── No-ball reason classification: none of it exists ─────────────────────
  const NB_REASONS: Array<[string, string]> = [
    ["T20-050", "front-foot no ball — 'No-ball reason saved'"],
    ["T20-051", "back-foot no ball — 'No-ball event saved'"],
    ["T20-052", "high full toss — 'No-ball classification stored'"],
    ["T20-053", "dangerous bowling — 'NB + applicable sanction metadata'"],
    ["T20-054", "multiple bounce — 'NB classification stored'"],
    ["T20-055", "illegal action/throwing — 'NB classification stored'"],
  ];
  for (const [id, what] of NB_REASONS) {
    test(`${id} ${what}`, async () => {
      test.skip(true,
        "NOT-IMPLEMENTED: no no-ball reason or classification field exists. " +
        "Delivery stores only extra_type='NO_BALL' (V22); nothing records why it " +
        "was called. See COVERAGE-MATRIX.md.");
    });
  }

  // ── Wide types: the sub-type is not stored, but the outcome is testable ──
  // All three have the same workbook Expected — "Wide; illegal delivery" — which
  // is exactly what is asserted. The off-side / leg-side / above-head distinction
  // itself has no field, noted in the matrix.
  for (const [id, label] of [
    ["T20-056", "off-side wide"],
    ["T20-057", "leg-side wide"],
    ["T20-058", "above-head wide"],
  ] as const) {
    test(`${id} ${label} — wide recorded, illegal delivery`, async ({ scoringMatch, page }) => {
      await scoringMatch.open(page);
      await page.getByTestId("extra-wide").click();
      await page.getByTestId("wide-plus-0").click();
      await expectState(scoringMatch, {
        runs: 1, balls: 0, over: 1, ballInOver: 0,
        extras: { wide: 1 },
        bowlers: { Bumrah: { legalBalls: 0, wides: 1 } },
      }, page);
    });
  }

  // ── Free hit ─────────────────────────────────────────────────────────────
  test("T20-059 a no ball arms the free hit and the UI shows it", async ({ scoringMatch, page }) => {
    await scoringMatch.open(page);
    await page.getByTestId("extra-no-ball").click();
    await page.getByTestId("nb-plus-0").click();

    // Workbook: "Free-hit indicator shown for next eligible delivery."
    await expectState(scoringMatch, { freeHit: true }, page);
    await expect(page.getByTestId("free-hit-indicator")).toBeVisible();

    // And it clears once a legal delivery is bowled.
    await page.getByTestId("run-1").click();
    await expectState(scoringMatch, { runs: 2, balls: 1, freeHit: false }, page);
    await expect(page.getByTestId("free-hit-indicator")).toHaveCount(0);
  });

  // T20-060..063 — the four dismissals that must not stand on a free hit.
  const FORBIDDEN: Array<[string, string, string]> = [
    ["T20-060", "BOWLED",  "Bowled not awarded under configured free-hit rules"],
    ["T20-061", "LBW",     "LBW not awarded under configured free-hit rules"],
    ["T20-062", "CAUGHT",  "Caught not awarded under configured free-hit rules"],
    ["T20-063", "STUMPED", "Stumping not awarded under configured free-hit rules"],
  ];
  for (const [id, dismissal, expectation] of FORBIDDEN) {
    test(`${id} free hit + ${dismissal.toLowerCase()} — ${expectation}`, async ({ scoringMatch }) => {
      const m = scoringMatch;
      // Arm the free hit.
      let s = await m.api.state(m.matchPublicId);
      await m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s.currentBowlerPublicId!,
        batsmanPublicId: s.currentStrikerPublicId!,
        nonStrikerPublicId: s.currentNonStrikerPublicId!,
        runsBatsman: 0, runsExtras: 1, extraType: "NO_BALL", noBallRunsType: "BAT",
      } as any);
      const armed = await m.api.state(m.matchPublicId);
      expect(armed.isFreeHit, "free hit must be armed").toBe(true);

      const res = await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/scoring/ball`, {
        bowlerPublicId: armed.currentBowlerPublicId,
        batsmanPublicId: armed.currentStrikerPublicId,
        nonStrikerPublicId: armed.currentNonStrikerPublicId,
        runsBatsman: 0, isWicket: true, dismissalType: dismissal,
        dismissedPlayerPublicId: armed.currentStrikerPublicId,
        isFreeHit: true,
      });

      // The app refuses the delivery outright rather than recording it without
      // the dismissal. Either way the batter is not out, which is what the
      // workbook requires.
      expect(res.status, `${dismissal} on a free hit must be rejected`).toBe(400);
      expect(String(res.body?.message)).toContain("run-out");

      const after = await m.api.state(m.matchPublicId);
      expect(after.inningsState.totalWickets, "no wicket may be recorded").toBe(0);
      expect(after.isFreeHit, "the free hit is still live").toBe(true);
    });
  }

  test("T20-064 free hit + run out — allowed, correct batter out", async ({ scoringMatch }) => {
    const m = scoringMatch;
    let s = await m.api.state(m.matchPublicId);
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 0, runsExtras: 1, extraType: "NO_BALL", noBallRunsType: "BAT",
    } as any);
    const armed = await m.api.state(m.matchPublicId);
    const victim = armed.currentStrikerPublicId;

    const res = await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/scoring/ball`, {
      bowlerPublicId: armed.currentBowlerPublicId,
      batsmanPublicId: armed.currentStrikerPublicId,
      nonStrikerPublicId: armed.currentNonStrikerPublicId,
      runsBatsman: 0, isWicket: true, dismissalType: "RUN_OUT",
      dismissedPlayerPublicId: victim, isFreeHit: true,
    });

    // Workbook: "Run out allowed; correct batter out."
    expect(res.status, "a run out is the one dismissal allowed on a free hit").toBe(200);
    const after = await m.api.state(m.matchPublicId);
    expect(after.inningsState.totalWickets).toBe(1);
    expect(after.dismissedMtpPublicIds).toContain(victim);
    expect(after.bowlerStats[m.bowler.mtpPublicId].wickets, "a run out is not the bowler's").toBe(0);
  });

  test("T20-065 @ambiguous free hit + obstructing the field", async ({ scoringMatch }) => {
    // Workbook: "Configured obstruction outcome; no accidental forbidden dismissal."
    // Under the Laws obstructing the field IS available off a free hit. The app
    // allows only RUN_OUT (ScoringService.postBall), so it rejects this too.
    // Pinned rather than asserted as a bug: which dismissals a free hit permits is
    // a product ruling, and the workbook says "configured", not "all".
    const m = scoringMatch;
    let s = await m.api.state(m.matchPublicId);
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 0, runsExtras: 1, extraType: "NO_BALL", noBallRunsType: "BAT",
    } as any);
    const armed = await m.api.state(m.matchPublicId);
    const res = await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/scoring/ball`, {
      bowlerPublicId: armed.currentBowlerPublicId,
      batsmanPublicId: armed.currentStrikerPublicId,
      nonStrikerPublicId: armed.currentNonStrikerPublicId,
      runsBatsman: 0, isWicket: true, dismissalType: "OBSTRUCTING_FIELD",
      dismissedPlayerPublicId: armed.currentStrikerPublicId, isFreeHit: true,
    });
    expect(res.status, "the app currently permits only RUN_OUT on a free hit").toBe(400);
    const after = await m.api.state(m.matchPublicId);
    expect(after.inningsState.totalWickets).toBe(0);
  });

  test("T20-066 free hit + hit ball twice", async () => {
    test.skip(true,
      "NOT-IMPLEMENTED: 'Hit ball twice' is not in the app's dismissal list " +
      "(LiveScorerPage DISMISSALS) and has no handling. Named in the V22 comment " +
      "but never built.");
  });

  test("a wide between the no ball and the next legal delivery must not clear the free hit", async ({ scoringMatch }) => {
    test.fail(true, "BUG-05: any non-no-ball delivery clears the free hit, including a wide");
    const m = scoringMatch;
    let s = await m.api.state(m.matchPublicId);
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 0, runsExtras: 1, extraType: "NO_BALL", noBallRunsType: "BAT",
    } as any);
    expect((await m.api.state(m.matchPublicId)).isFreeHit).toBe(true);

    // A wide is not a legal ball, so it does not consume the free hit.
    s = await m.api.state(m.matchPublicId);
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 0, runsExtras: 1, extraType: "WIDE",
    });
    const after = await m.api.state(m.matchPublicId);
    expect(after.isFreeHit, "the free hit survives a wide and applies to the next legal ball").toBe(true);
  });
});
