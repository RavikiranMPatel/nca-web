import { test, expect } from "../fixtures/scoringMatch";
import { createScoringMatch, destroyScoringMatch } from "../fixtures/scoringMatch";

/**
 * Workbook section 11 — Innings End / Target / Rain / Results (T20-250 … T20-264).
 *
 * The two deep states are built through the API rather than the UI, and timed:
 * ten wickets for T20-250, a full 120 legal balls for T20-251.
 */

/** Bowl one delivery, filling any empty end and bowler first. */
async function bowl(m: any, ball: Record<string, unknown>, nextBatter: () => string | null) {
  let s = await m.api.state(m.matchPublicId);
  for (const [key, pos] of [
    ["currentStrikerPublicId", "striker"], ["currentNonStrikerPublicId", "nonstriker"],
  ] as const) {
    if (!s[key]) {
      const next = nextBatter();
      if (!next) return { s, resp: null };
      await m.api.selectBatter(m.matchPublicId, next, pos);
      s = await m.api.state(m.matchPublicId);
    }
  }
  if (!s.currentBowlerPublicId) {
    // Pick the least-used eligible bowler. Simply alternating two bowlers runs both
    // into the per-bowler quota (totalOvers / 5) part-way through a full innings —
    // twenty overs needs at least five bowlers.
    const oversBowled = (id: string) =>
      Math.floor(((s.bowlerStats?.[id]?.legalBalls as number) ?? 0) / 6);
    const eligible = m.bowlers
      .filter((b: any) => b.mtpPublicId !== s.lastBowlerPublicId)
      .sort((a: any, b: any) => oversBowled(a.mtpPublicId) - oversBowled(b.mtpPublicId))[0];
    await m.api.correctBowler(m.matchPublicId, eligible.mtpPublicId);
    s = await m.api.state(m.matchPublicId);
  }
  const resp = await m.api.postBall(m.matchPublicId, {
    bowlerPublicId: s.currentBowlerPublicId!,
    batsmanPublicId: s.currentStrikerPublicId!,
    nonStrikerPublicId: s.currentNonStrikerPublicId!,
    ...(ball as any),
  });
  return { s, resp };
}

test.describe("§11 Innings End / Target / Results", () => {

  test("T20-250 all out — the innings ends on the tenth wicket", async ({ scoringMatch }) => {
    test.slow();
    const m = scoringMatch;
    const started = Date.now();
    let idx = 2;
    const nextBatter = () => (idx < m.batters.length ? m.batters[idx++].mtpPublicId : null);

    let last: any = null;
    for (let w = 0; w < 10; w++) {
      const s = await m.api.state(m.matchPublicId);
      const victim = s.currentStrikerPublicId!;
      const { resp } = await bowl(m, {
        runsBatsman: 0, isWicket: true, dismissalType: "BOWLED",
        dismissedPlayerPublicId: victim,
      }, nextBatter);
      last = resp ?? last;
      if (w < 9) {
        const mid = await m.api.state(m.matchPublicId);
        expect(mid.inningsState.totalWickets, `after wicket ${w + 1}`).toBe(w + 1);
      }
    }
    const elapsed = Date.now() - started;
    console.log(`[T20-250] ten wickets built via API in ${elapsed}ms`);

    const s = await m.api.state(m.matchPublicId);
    // Workbook: "Innings ends immediately."
    expect(s.inningsState.totalWickets, "eleven batters, so all out at ten").toBe(10);
    expect(last?.inningsComplete, "the response flags the innings complete").toBe(true);
  });

  test("T20-251 twenty overs completed — the innings ends at 20.0", async ({ scoringMatch }) => {
    test.slow();
    const m = scoringMatch;
    const started = Date.now();

    // 120 legal balls. Dots, so nobody is dismissed and no batter runs out.
    let last: any = null;
    for (let i = 0; i < 120; i++) {
      const { resp } = await bowl(m, { runsBatsman: 0 }, () => null);
      last = resp ?? last;
    }
    const elapsed = Date.now() - started;
    console.log(`[T20-251] 120 legal balls built via API in ${elapsed}ms`);

    const s = await m.api.state(m.matchPublicId);
    // Workbook: "Innings ends at 20.0."
    expect(s.inningsState.totalBalls).toBe(120);
    expect(s.inningsState.overNumber, "20 overs bowled").toBe(21);
    expect(s.inningsState.ballInOver).toBe(0);
    expect(last?.inningsComplete, "the response flags the innings complete").toBe(true);
  });

  // ── Chases ───────────────────────────────────────────────────────────────
  /** Close innings 1 on a small total and return the target. */
  async function openChase(m: any, firstInningsRuns: number[]) {
    await m.advanceTo({ runs: firstInningsRuns });
    const close = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/innings/close`, { reason: "OVERS_COMPLETE" });
    expect(close.status).toBe(200);

    // Second innings: the other team bats. Select openers and a bowler.
    const teams = await m.api.getTeams(m.matchPublicId);
    const battingXI = await m.api.getXI(m.matchPublicId, teams[1].publicId);
    const bowlingXI = await m.api.getXI(m.matchPublicId, teams[0].publicId);
    await m.api.selectBatter(m.matchPublicId, battingXI[0].mtpPublicId, "striker");
    await m.api.selectBatter(m.matchPublicId, battingXI[1].mtpPublicId, "nonstriker");
    await m.api.correctBowler(m.matchPublicId, bowlingXI[7].mtpPublicId);
    const s = await m.api.state(m.matchPublicId);
    expect(s.inningsState.inningsNumber).toBe(2);
    return { target: s.inningsState.target as number, battingXI, bowlingXI };
  }

  const chaseBall = async (m: any, ball: Record<string, unknown>) => {
    const s = await m.api.state(m.matchPublicId);
    return m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      ...(ball as any),
    });
  };

  test("T20-252 target reached mid-over ends the innings immediately", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const { target } = await openChase(m, [2, 2, 2]);   // target 7
    expect(target).toBe(7);

    let resp: any = null;
    for (const r of [2, 2, 2]) resp = await chaseBall(m, { runsBatsman: r });
    expect((await m.api.state(m.matchPublicId)).inningsState.totalRuns).toBe(6);
    expect(resp.inningsComplete, "still one short").toBe(false);

    resp = await chaseBall(m, { runsBatsman: 1 });
    // Workbook: "Innings ends immediately; win by wickets."
    expect(resp.inningsComplete, "reaching the target ends the innings").toBe(true);
    const s = await m.api.state(m.matchPublicId);
    expect(s.inningsState.totalRuns).toBe(target);
    expect(s.inningsState.totalBalls, "mid-over, not at an over boundary").toBe(4);
  });

  test("T20-253 target reached by a boundary", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const { target } = await openChase(m, [2, 2, 2]);   // target 7
    for (const r of [2, 2]) await chaseBall(m, { runsBatsman: r });
    const resp = await chaseBall(m, { runsBatsman: 4 });   // 4 + 4 = 8 >= 7
    // Workbook: "Innings ends on boundary."
    expect(resp.inningsComplete).toBe(true);
    const s = await m.api.state(m.matchPublicId);
    expect(s.inningsState.totalRuns, "the boundary can overshoot the target").toBeGreaterThanOrEqual(target);
  });

  for (const [id, ball, label] of [
    ["T20-254 (wide)", { runsBatsman: 0, runsExtras: 1, extraType: "WIDE" }, "a wide"],
    ["T20-254 (no ball)", { runsBatsman: 0, runsExtras: 1, extraType: "NO_BALL", noBallRunsType: "BAT" }, "a no ball"],
  ] as const) {
    test(`${id} target reached by ${label} ends the innings`, async ({ scoringMatch }) => {
      const m = scoringMatch;
      const { target } = await openChase(m, [2, 2, 2]);   // target 7
      for (const r of [2, 2, 2]) await chaseBall(m, { runsBatsman: r });   // 6, one short
      // Workbook: "Innings ends when target reached." An extra that takes the score
      // to the target must end it just as a run off the bat does.
      const resp = await chaseBall(m, ball as any);
      expect(resp.inningsComplete, `${label} reaching the target ends the innings`).toBe(true);
      const s = await m.api.state(m.matchPublicId);
      expect(s.inningsState.totalRuns).toBeGreaterThanOrEqual(target);
    });
  }

  test("T20-255 target not achieved — win by runs", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const { target } = await openChase(m, [4, 4, 4]);   // target 13
    for (const r of [2, 2]) await chaseBall(m, { runsBatsman: r });
    const before = await m.api.state(m.matchPublicId);
    expect(before.inningsState.totalRuns).toBeLessThan(target);

    const close = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/innings/close`, { reason: "OVERS_COMPLETE" });
    expect(close.status).toBe(200);

    const margin = target - 1 - before.inningsState.totalRuns;
    const res = await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/result`, {
      resultType: "WON_BY_RUNS", resultMargin: margin,
      resultDescription: `Won by ${margin} runs`,
    });
    expect(res.status).toBe(200);
    // Workbook: "Win by runs."
    expect(res.body.resultType).toBe("WON_BY_RUNS");
    expect(res.body.resultMargin).toBe(margin);
    expect(res.body.status).toBe("COMPLETED");
  });

  test("T20-256 a tie opens a Super Over", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const { target } = await openChase(m, [2, 2, 2]);   // target 7, so a tie is 6
    for (const r of [2, 2, 2]) await chaseBall(m, { runsBatsman: r });
    const s = await m.api.state(m.matchPublicId);
    expect(s.inningsState.totalRuns, "level with one to get").toBe(target - 1);

    const close = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/innings/close`, { reason: "OVERS_COMPLETE" });
    expect(close.status).toBe(200);

    // Workbook: "Result = tie; Super Over if required."
    const match = await m.api.raw("get", `/api/admin/cricket/matches/${m.matchPublicId}`);
    expect(match.body.status, "a tie moves the match to SUPER_OVER").toBe("SUPER_OVER");

    const so = await m.api.state(m.matchPublicId);
    expect(so.inningsState.inningsNumber, "a third innings is opened").toBe(3);
    expect(so.inningsState.totalRuns).toBe(0);
  });

  test("T20-257 / T20-258 no result and abandoned are recordable", async ({ scoringMatch }) => {
    const m = scoringMatch;
    for (const resultType of ["NO_RESULT", "ABANDONED"]) {
      const res = await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/result`,
        { resultType, resultDescription: `${resultType} for the test` });
      expect(res.status, `${resultType} is a recordable result`).toBe(200);
      expect(res.body.resultType).toBe(resultType);
      expect(res.body.status).toBe("COMPLETED");
    }
  });

  for (const [id, what] of [
    ["T20-259", "forfeit"],
    ["T20-260", "conceded"],
  ] as const) {
    test(`${id} ${what} result`, async () => {
      test.skip(true,
        `NOT-IMPLEMENTED: there is no ${what.toUpperCase()} result type. The ResultType ` +
        "union is WON_BY_RUNS | WON_BY_WICKETS | TIE | SUPER_OVER | COIN_FLIP | DRAW | " +
        "NO_RESULT | ABANDONED. recordResult does not validate the string, so one " +
        "could be stored, but nothing would interpret it and no UI offers it.");
    });
  }

  for (const [id, what] of [
    ["T20-261", "revised target"],
    ["T20-262", "DLS"],
    ["T20-263", "VJD / custom target"],
    ["T20-264", "multiple rain recalculation"],
  ] as const) {
    test(`${id} ${what}`, async () => {
      test.skip(true,
        "NOT-IMPLEMENTED: no rain-revision model. Innings.target is computed once as " +
        "first-innings runs + 1 and never revised; there is no method, version or " +
        "audit of a recalculation. The only DLS/VJD code in the repo is " +
        "UmpireAssistPage.tsx, which has no route and is unrelated to scoring.");
    });
  }
});
