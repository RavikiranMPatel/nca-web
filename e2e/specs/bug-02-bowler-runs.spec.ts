import { test, expect } from "../fixtures/scoringMatch";

/**
 * BUG-02 regression — the bowler concedes batsman runs, the whole extras amount on
 * a wide, and only the one-run penalty on a no ball. Byes and leg-byes are never
 * charged, whether run off a legal ball or off a no ball.
 *
 * Before the fix every path charged `runsBatsman + runsExtras` for every delivery
 * type. The live path (innings_bowling_stats) and the recomputing paths (scorecard,
 * career and tournament aggregation) agreed with each other only because they
 * shared that same wrong rule, so all of them had to move together.
 */
test.describe("BUG-02 bowler runs conceded", () => {
  const CASES: Array<[string, Record<string, unknown>, number, string]> = [
    ["dot",                 { runsBatsman: 0 }, 0, "nothing conceded"],
    ["single off the bat",  { runsBatsman: 1 }, 1, "runs off the bat count"],
    ["four off the bat",    { runsBatsman: 4 }, 4, "runs off the bat count"],
    ["bye 4",               { runsBatsman: 0, runsExtras: 4, extraType: "BYE" },     0, "byes are never the bowler's"],
    ["leg bye 2",           { runsBatsman: 0, runsExtras: 2, extraType: "LEG_BYE" }, 0, "leg-byes are never the bowler's"],
    ["plain wide",          { runsBatsman: 0, runsExtras: 1, extraType: "WIDE" },    1, "the wide penalty is charged"],
    ["wide to the boundary",{ runsBatsman: 0, runsExtras: 5, extraType: "WIDE" },    5, "penalty and every run off a wide"],
    ["plain no ball",       { runsBatsman: 0, runsExtras: 1, extraType: "NO_BALL" }, 1, "the no-ball penalty is charged"],
    ["no ball + 4 off bat", { runsBatsman: 4, runsExtras: 1, extraType: "NO_BALL" }, 5, "penalty plus the runs off the bat"],
    ["no ball + 2 byes",    { runsBatsman: 0, runsExtras: 3, extraType: "NO_BALL" }, 1, "penalty only — the byes are not charged"],
  ];

  for (const [label, ball, charged, why] of CASES) {
    test(`${label} charges the bowler ${charged} — ${why}`, async ({ scoringMatch }) => {
      const m = scoringMatch;
      const s = await m.api.state(m.matchPublicId);
      const resp = await m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s.currentBowlerPublicId!,
        batsmanPublicId: s.currentStrikerPublicId!,
        nonStrikerPublicId: s.currentNonStrikerPublicId!,
        ...(ball as any),
      });
      const bowler = resp.bowlerStats[m.bowler.mtpPublicId];
      expect(bowler.runsConceded, `${label}: ${why}`).toBe(charged);
    });
  }

  test("a maiden survives byes but not a wide", async ({ scoringMatch }) => {
    // A maiden is an over with no runs off the bat and no extras charged to the
    // bowler, so byes and leg-byes do not spoil one — but a wide does. The maiden
    // test shares the attribution rule, so the two can never disagree.
    const m = scoringMatch;
    const bowl = async (ball: Record<string, unknown>) => {
      const s = await m.api.state(m.matchPublicId);
      return m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s.currentBowlerPublicId!,
        batsmanPublicId: s.currentStrikerPublicId!,
        nonStrikerPublicId: s.currentNonStrikerPublicId!,
        ...(ball as any),
      });
    };
    let resp: any;
    for (let i = 0; i < 6; i++) resp = await bowl({ runsBatsman: 0, runsExtras: 1, extraType: "BYE" });
    expect(resp.bowlerStats[m.bowler.mtpPublicId].runsConceded, "six byes cost the bowler nothing").toBe(0);
    expect(resp.bowlerStats[m.bowler.mtpPublicId].maidens, "an over of byes is still a maiden").toBe(1);
  });

  test("the scorecard endpoint and the live state report the same figures", async ({ scoringMatch }) => {
    // These are two independent implementations: the live path reads
    // innings_bowling_stats written by applyBall, the scorecard recomputes from the
    // deliveries table in SQL. Both had to be changed together, so assert directly
    // that they still agree rather than assuming it.
    const m = scoringMatch;
    for (const ball of [
      { runsBatsman: 1 },
      { runsBatsman: 0, runsExtras: 4, extraType: "BYE" },
      { runsBatsman: 0, runsExtras: 2, extraType: "LEG_BYE" },
      { runsBatsman: 0, runsExtras: 5, extraType: "WIDE" },
      { runsBatsman: 0, runsExtras: 3, extraType: "NO_BALL" },
      { runsBatsman: 4 },
      { runsBatsman: 6 },
    ]) {
      const s = await m.api.state(m.matchPublicId);
      await m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s.currentBowlerPublicId!,
        batsmanPublicId: s.currentStrikerPublicId!,
        nonStrikerPublicId: s.currentNonStrikerPublicId!,
        ...(ball as any),
      });
    }

    const live = await m.api.state(m.matchPublicId);
    const liveRuns = live.bowlerStats[m.bowler.mtpPublicId].runsConceded;
    // 1 (single) + 0 (byes) + 0 (leg-byes) + 5 (wide+4) + 1 (NB penalty) + 4 + 6
    expect(liveRuns, "live bowler runs").toBe(17);

    const card = await m.api.raw("get", `/api/public/scorecard/${m.matchPublicId}`);
    expect(card.status).toBe(200);
    const line = card.body.innings[0].bowlingCard.find(
      (b: any) => b.playerName === "Bumrah",
    );
    expect(line, "Bumrah must appear on the scorecard").toBeTruthy();
    expect(line.runs, "scorecard bowler runs must match the live state").toBe(liveRuns);

    const legalBalls = live.bowlerStats[m.bowler.mtpPublicId].legalBalls;
    expect(line.economy, "scorecard economy must follow the same runs")
      .toBeCloseTo((liveRuns * 6) / legalBalls, 2);
  });

  test("replay preserves bowler runs — undo after a mixed over", async ({ scoringMatch }) => {
    // applyBall is what replayInnings re-runs per delivery, so the attribution has
    // to survive an undo as well as the live path.
    const m = scoringMatch;
    for (const ball of [
      { runsBatsman: 2 },
      { runsBatsman: 0, runsExtras: 3, extraType: "BYE" },
      { runsBatsman: 0, runsExtras: 1, extraType: "WIDE" },
      { runsBatsman: 0, runsExtras: 2, extraType: "NO_BALL" },
      { runsBatsman: 0, runsExtras: 1, extraType: "LEG_BYE" },
      { runsBatsman: 4 },
    ]) {
      const s = await m.api.state(m.matchPublicId);
      await m.api.postBall(m.matchPublicId, {
        bowlerPublicId: s.currentBowlerPublicId!,
        batsmanPublicId: s.currentStrikerPublicId!,
        nonStrikerPublicId: s.currentNonStrikerPublicId!,
        ...(ball as any),
      });
    }
    const before = await m.api.state(m.matchPublicId);

    const s = await m.api.state(m.matchPublicId);
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 3,
    });
    const after = await m.api.undo(m.matchPublicId);

    expect(after.bowlerStats, "bowler stats after replay").toEqual(before.bowlerStats);
    expect(after.batterStats, "batter stats after replay").toEqual(before.batterStats);
    expect(after.inningsState.totalRuns).toBe(before.inningsState.totalRuns);
    expect(after.inningsState.extrasBye).toBe(before.inningsState.extrasBye);
    expect(after.currentStrikerPublicId).toBe(before.currentStrikerPublicId);
  });
});
