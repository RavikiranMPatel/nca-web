import { test, expect } from "../fixtures/scoringMatch";

/**
 * BUG-01 regression — strike rotates on the parity of the runs physically RUN
 * between the wickets, not on the delivery's run total.
 *
 * Before the fix, the one-run penalty on a wide or a no ball was counted as if
 * someone had run it, so the strike outcome was wrong on every such delivery, in
 * both directions. Byes and leg-byes were always right and are kept here as the
 * control that isolates the penalty as the cause.
 */
test.describe("BUG-01 strike rotation", () => {
  const CASES: Array<[string, Record<string, unknown>, "Virat Kohli" | "KL Rahul", string]> = [
    ["plain wide",          { runsBatsman: 0, runsExtras: 1, extraType: "WIDE" },    "Virat Kohli", "nothing was run"],
    ["wide + 1 run",        { runsBatsman: 0, runsExtras: 2, extraType: "WIDE" },    "KL Rahul",    "one run completed"],
    ["wide + 2 runs",       { runsBatsman: 0, runsExtras: 3, extraType: "WIDE" },    "Virat Kohli", "two runs completed"],
    ["plain no ball",       { runsBatsman: 0, runsExtras: 1, extraType: "NO_BALL" }, "Virat Kohli", "nothing was run"],
    ["no ball + 1 off bat", { runsBatsman: 1, runsExtras: 1, extraType: "NO_BALL" }, "KL Rahul",    "one run completed"],
    ["no ball + 2 off bat", { runsBatsman: 2, runsExtras: 1, extraType: "NO_BALL" }, "Virat Kohli", "two runs completed"],
    ["no ball + 4 off bat", { runsBatsman: 4, runsExtras: 1, extraType: "NO_BALL" }, "Virat Kohli", "boundary, no running"],
    ["bye 1",               { runsBatsman: 0, runsExtras: 1, extraType: "BYE" },     "KL Rahul",    "control: one run run"],
    ["bye 2",               { runsBatsman: 0, runsExtras: 2, extraType: "BYE" },     "Virat Kohli", "control: two runs run"],
  ];

  for (const [label, ball, lawful, why] of CASES) {
    test(`${label} leaves ${lawful} on strike — ${why}`, async ({ scoringMatch }) => {
      const m = scoringMatch;
      const s = await m.api.state(m.matchPublicId);
      const resp = await m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s.currentBowlerPublicId!,
        batsmanPublicId: s.currentStrikerPublicId!,
        nonStrikerPublicId: s.currentNonStrikerPublicId!,
        ...(ball as any),
      });
      const name = m.batters.find((b) => b.mtpPublicId === resp.currentStrikerPublicId)?.displayName;
      expect(name, `${label}: ${why}`).toBe(lawful);
    });
  }

  test("replay preserves strike — undo after a mixed over restores the same batter", async ({ scoringMatch }) => {
    // The fix lives in applyBall, which is also what replayInnings re-runs for
    // every delivery. If the parity change did not hold there too, an undo would
    // silently reshuffle strike across the whole innings.
    const m = scoringMatch;
    const mixed = [
      { runsBatsman: 1 },
      { runsBatsman: 0, runsExtras: 1, extraType: "WIDE" },
      { runsBatsman: 2 },
      { runsBatsman: 0, runsExtras: 1, extraType: "NO_BALL" },
      { runsBatsman: 0, runsExtras: 2, extraType: "WIDE" },
      { runsBatsman: 3 },
      { runsBatsman: 0, runsExtras: 1, extraType: "BYE" },
      { runsBatsman: 4 },
    ];
    for (const ball of mixed) {
      const s = await m.api.state(m.matchPublicId);
      await m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s.currentBowlerPublicId!,
        batsmanPublicId: s.currentStrikerPublicId!,
        nonStrikerPublicId: s.currentNonStrikerPublicId!,
        ...(ball as any),
      });
    }

    const before = await m.api.state(m.matchPublicId);

    // Add one more delivery, then undo it. Replay rebuilds the innings from the
    // delivery stream, so the restored state must match exactly what it was.
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: before.currentBowlerPublicId!,
      batsmanPublicId: before.currentStrikerPublicId!,
      nonStrikerPublicId: before.currentNonStrikerPublicId!,
      runsBatsman: 1,
    });
    const after = await m.api.undo(m.matchPublicId);

    expect(after.currentStrikerPublicId, "striker after replay").toBe(before.currentStrikerPublicId);
    expect(after.currentNonStrikerPublicId, "non-striker after replay").toBe(before.currentNonStrikerPublicId);
    expect(after.inningsState.totalRuns).toBe(before.inningsState.totalRuns);
    expect(after.inningsState.totalBalls).toBe(before.inningsState.totalBalls);
    expect(after.inningsState.extrasWide).toBe(before.inningsState.extrasWide);
    expect(after.inningsState.extrasNoBall).toBe(before.inningsState.extrasNoBall);
    expect(after.inningsState.extrasBye).toBe(before.inningsState.extrasBye);
    expect(after.partnershipRuns).toBe(before.partnershipRuns);
    expect(after.partnershipBalls).toBe(before.partnershipBalls);
    expect(after.batterStats).toEqual(before.batterStats);
    expect(after.bowlerStats).toEqual(before.bowlerStats);
  });
});
