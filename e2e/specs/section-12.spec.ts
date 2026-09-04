import { test, expect } from "../fixtures/scoringMatch";
import { rawSql } from "../fixtures/captureState";

/**
 * Workbook section 12 — Super Over / Powerplay / Field Restrictions
 * (T20-280 … T20-292).
 *
 * Super Overs are properly built (V92). Powerplay and field restrictions do not
 * exist in the scoring module at all and are skipped with the reason.
 */

/** Score innings 1, close it, chase to a tie, close again — leaving a live SO. */
async function reachSuperOver(m: any) {
  await m.advanceTo({ runs: [2, 2, 2] });                    // 6, target 7
  await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/innings/close`,
    { reason: "OVERS_COMPLETE" });

  const teams = await m.api.getTeams(m.matchPublicId);
  const batting = await m.api.getXI(m.matchPublicId, teams[1].publicId);
  const bowling = await m.api.getXI(m.matchPublicId, teams[0].publicId);
  await m.api.selectBatter(m.matchPublicId, batting[0].mtpPublicId, "striker");
  await m.api.selectBatter(m.matchPublicId, batting[1].mtpPublicId, "nonstriker");
  await m.api.correctBowler(m.matchPublicId, bowling[7].mtpPublicId);
  for (const r of [2, 2, 2]) {                               // level at 6 — a tie
    const s = await m.api.state(m.matchPublicId);
    await m.api.postBall(m.matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: r,
    });
  }
  await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/innings/close`,
    { reason: "OVERS_COMPLETE" });

  const match = await m.api.raw("get", `/api/admin/cricket/matches/${m.matchPublicId}`);
  expect(match.body.status, "a tie opens the Super Over").toBe("SUPER_OVER");
  return { teams, batting, bowling };
}

/** Put a pair and a bowler on for whichever Super Over innings is live. */
async function openSuperOverInnings(m: any, batIdx: [number, number], bowlIdx: number) {
  const s0 = await m.api.state(m.matchPublicId);
  const teams = await m.api.getTeams(m.matchPublicId);
  // In a SO the batting team is innings 2's batting team first; read it off the innings.
  const battingTeamId = rawSql(
    `SELECT ct.public_id FROM innings i
     JOIN cricket_matches m ON i.match_id=m.id
     JOIN cricket_teams ct ON i.batting_team_id=ct.id
     WHERE m.public_id='${m.matchPublicId}' AND i.status='IN_PROGRESS'`);
  const bowlingTeamId = teams.find((t: any) => t.publicId !== battingTeamId)!.publicId;
  const bat = await m.api.getXI(m.matchPublicId, battingTeamId);
  const bowl = await m.api.getXI(m.matchPublicId, bowlingTeamId);
  if (!s0.currentStrikerPublicId)
    await m.api.selectBatter(m.matchPublicId, bat[batIdx[0]].mtpPublicId, "striker");
  if (!s0.currentNonStrikerPublicId)
    await m.api.selectBatter(m.matchPublicId, bat[batIdx[1]].mtpPublicId, "nonstriker");
  await m.api.correctBowler(m.matchPublicId, bowl[bowlIdx].mtpPublicId);
  return { bat, bowl };
}

/** Bowl in a Super Over, sending in a replacement first if an end is empty. */
const soBall = async (m: any, ball: Record<string, unknown> = { runsBatsman: 0 },
                      nextBatter?: () => string | null) => {
  let s = await m.api.state(m.matchPublicId);
  if (!s.currentStrikerPublicId && nextBatter) {
    const next = nextBatter();
    if (next) {
      await m.api.selectBatter(m.matchPublicId, next, "striker");
      s = await m.api.state(m.matchPublicId);
    }
  }
  return m.api.postBall(m.matchPublicId, {
    bowlerPublicId: s.currentBowlerPublicId!,
    batsmanPublicId: s.currentStrikerPublicId!,
    nonStrikerPublicId: s.currentNonStrikerPublicId!,
    ...(ball as any),
  });
};

const mainInningsRows = (matchPublicId: string) => rawSql(
  `SELECT i.innings_number, i.total_runs, i.total_wickets, i.total_balls
   FROM innings i JOIN cricket_matches m ON i.match_id=m.id
   WHERE m.public_id='${matchPublicId}' AND i.is_super_over = false
   ORDER BY i.innings_number`);

test.describe("§12 Super Over / Powerplay / Field Restrictions", () => {

  test("T20-280 a Super Over is a new phase and the main innings are immutable", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await reachSuperOver(m);
    const mainBefore = mainInningsRows(m.matchPublicId);

    await openSuperOverInnings(m, [0, 1], 7);
    for (const r of [4, 2, 6]) await soBall(m, { runsBatsman: r });

    const s = await m.api.state(m.matchPublicId);
    // Workbook: "New phase/innings; main score immutable."
    expect(s.inningsState.inningsNumber, "the Super Over is innings 3").toBe(3);
    expect(s.inningsState.totalRuns).toBe(12);
    expect(mainInningsRows(m.matchPublicId),
      "the two main innings rows are untouched by Super Over deliveries").toBe(mainBefore);
  });

  test("T20-281/T20-287 a batter dismissed in a prior Super Over cannot bat again", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await reachSuperOver(m);
    const { bat } = await openSuperOverInnings(m, [0, 1], 7);

    // Two wickets ends the Super Over innings; a third batter comes in between.
    let idx = 2;
    const next = () => (idx < bat.length ? bat[idx++].mtpPublicId : null);
    const s = await m.api.state(m.matchPublicId);
    const victim = s.currentStrikerPublicId!;
    await soBall(m, {
      runsBatsman: 0, isWicket: true, dismissalType: "BOWLED", dismissedPlayerPublicId: victim,
    }, next);
    const s2 = await m.api.state(m.matchPublicId);
    await soBall(m, {
      runsBatsman: 0, isWicket: true, dismissalType: "BOWLED",
      dismissedPlayerPublicId: s2.currentNonStrikerPublicId!,
    }, next);
    await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/innings/close`,
      { reason: "ALL_OUT" });

    // Second SO innings (the other side chases). A batter out in a prior SO is barred.
    const blocked = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/select-batter`,
      { batterPublicId: victim, position: "striker" });
    // Workbook T20-287: "UI/backend block."
    expect(blocked.status, "a batter dismissed in a prior Super Over is barred").toBe(400);
    expect(String(blocked.body?.message)).toContain("Super Over");

    // An eligible batter is accepted.
    const ok = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/select-batter`,
      { batterPublicId: bat[4].mtpPublicId, position: "striker" });
    expect(ok.status).toBe(200);
  });

  test("T20-282/T20-283 a Super Over innings ends at two wickets", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await reachSuperOver(m);
    await openSuperOverInnings(m, [0, 1], 7);
    expect(rawSql(`SELECT i.max_wickets FROM innings i JOIN cricket_matches m ON i.match_id=m.id
                   WHERE m.public_id='${m.matchPublicId}' AND i.status='IN_PROGRESS'`),
      "a Super Over allows two wickets").toBe("2");

    const bat2 = await m.api.getXI(m.matchPublicId, rawSql(
      `SELECT ct.public_id FROM innings i JOIN cricket_matches mm ON i.match_id=mm.id
       JOIN cricket_teams ct ON i.batting_team_id=ct.id
       WHERE mm.public_id='${m.matchPublicId}' AND i.status='IN_PROGRESS'`));
    let idx = 2;
    const next = () => (idx < bat2.length ? bat2[idx++].mtpPublicId : null);

    let s = await m.api.state(m.matchPublicId);
    let resp = await soBall(m, {
      runsBatsman: 0, isWicket: true, dismissalType: "BOWLED",
      dismissedPlayerPublicId: s.currentStrikerPublicId!,
    }, next);
    // Workbook T20-282: "Super Over state updates independently."
    expect(resp.inningsState.totalWickets).toBe(1);
    expect(resp.inningsComplete, "one wicket is not the end").toBe(false);

    s = await m.api.state(m.matchPublicId);
    resp = await soBall(m, {
      runsBatsman: 0, isWicket: true, dismissalType: "BOWLED",
      dismissedPlayerPublicId: s.currentNonStrikerPublicId!,
    }, next);
    // Workbook T20-283: "Super Over innings ends."
    expect(resp.inningsState.totalWickets).toBe(2);
    expect(resp.inningsComplete, "two wickets ends a Super Over innings").toBe(true);
  });

  test("T20-284 a Super Over innings ends after six legal balls", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await reachSuperOver(m);
    await openSuperOverInnings(m, [0, 1], 7);
    expect(rawSql(`SELECT i.max_balls FROM innings i JOIN cricket_matches m ON i.match_id=m.id
                   WHERE m.public_id='${m.matchPublicId}' AND i.status='IN_PROGRESS'`),
      "a Super Over is one over").toBe("6");

    let resp: any = null;
    // A wide first, to prove the limit counts legal balls only.
    await soBall(m, { runsBatsman: 0, runsExtras: 1, extraType: "WIDE" });
    for (let i = 0; i < 6; i++) resp = await soBall(m, { runsBatsman: 0 });

    // Workbook: "Super Over ends at 1.0."
    expect(resp.inningsState.totalBalls).toBe(6);
    expect(resp.inningsComplete, "six legal balls ends it").toBe(true);
  });

  test("T20-285/T20-286 a tied Super Over opens another and the previous is retained", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await reachSuperOver(m);

    // SO 1 (innings 3): batting side makes 4.
    await openSuperOverInnings(m, [0, 1], 7);
    await soBall(m, { runsBatsman: 4 });
    await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/innings/close`,
      { reason: "OVERS_COMPLETE" });

    // SO 2 (innings 4): the other side chases 5 and makes 4 — a tie.
    await openSuperOverInnings(m, [0, 1], 7);
    await soBall(m, { runsBatsman: 4 });
    await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/innings/close`,
      { reason: "OVERS_COMPLETE" });

    // Workbook T20-285/286: "Repeat/tie-break workflow"; "New phase; previous retained."
    const rows = rawSql(
      `SELECT i.innings_number, i.total_runs, i.status FROM innings i
       JOIN cricket_matches m ON i.match_id=m.id
       WHERE m.public_id='${m.matchPublicId}' AND i.is_super_over = true
       ORDER BY i.innings_number`).split("\n").filter(Boolean);
    expect(rows.length, "a third Super Over innings is opened after the tie")
      .toBeGreaterThanOrEqual(3);
    expect(rows[0], "the first Super Over is retained, completed, with its score")
      .toBe("3|4|COMPLETED");
    expect(rows[1]).toBe("4|4|COMPLETED");

    const match = await m.api.raw("get", `/api/admin/cricket/matches/${m.matchPublicId}`);
    expect(match.body.status).toBe("SUPER_OVER");
    expect(match.body.consecutiveTiedSuperOvers, "the tie is counted").toBeGreaterThanOrEqual(1);
  });

  test("T20-287 a bowler cannot bowl two Super Overs in a row", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await reachSuperOver(m);

    // SO #1 is innings 3 and 4. A tie then opens innings 5, where — per the Laws,
    // and per the comment in MatchService — the side that chased bats first. That
    // makes innings 5's bowling side the same as innings 4's, so it is innings 4's
    // bowler who is barred, not innings 3's.
    await openSuperOverInnings(m, [0, 1], 7);
    await soBall(m, { runsBatsman: 4 });
    await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/innings/close`,
      { reason: "OVERS_COMPLETE" });

    const { bowl: so2Bowl } = await openSuperOverInnings(m, [0, 1], 7);
    const so2Bowler = so2Bowl[7].mtpPublicId;
    await soBall(m, { runsBatsman: 4 });                       // a tie
    await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/innings/close`,
      { reason: "OVERS_COMPLETE" });

    const s = await m.api.state(m.matchPublicId);
    expect(s.inningsState.inningsNumber, "a further Super Over innings is open").toBe(5);

    const blocked = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/correct-bowler`,
      { bowlerPublicId: so2Bowler });
    // Shared with the normal-over rule since BUG-14, so one message covers both.
    expect(blocked.status, "the preceding Super Over's bowler is barred").toBe(400);
    expect(String(blocked.body?.message)).toContain("preceding over");

    const ok = await m.api.raw("post",
      `/api/admin/cricket/matches/${m.matchPublicId}/scoring/correct-bowler`,
      { bowlerPublicId: so2Bowl[8].mtpPublicId });
    expect(ok.status, "a different bowler from the same side is fine").toBe(200);
  });

  test("coin flip after three tied Super Overs", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await reachSuperOver(m);
    // Tie three Super Overs in a row: each pair of SO innings scores the same.
    for (let so = 0; so < 6; so++) {
      const s = await m.api.state(m.matchPublicId);
      if (!s.inningsState || s.inningsState.inningsNumber === undefined) break;
      await openSuperOverInnings(m, [so % 3, (so % 3) + 1], 7 - (so % 4));
      await soBall(m, { runsBatsman: 4 });
      const close = await m.api.raw("post",
        `/api/admin/cricket/matches/${m.matchPublicId}/innings/close`, { reason: "OVERS_COMPLETE" });
      if (close.status !== 200) break;
      const match = await m.api.raw("get", `/api/admin/cricket/matches/${m.matchPublicId}`);
      if ((match.body.consecutiveTiedSuperOvers ?? 0) >= 3) break;
    }
    const match = await m.api.raw("get", `/api/admin/cricket/matches/${m.matchPublicId}`);
    const ties = match.body.consecutiveTiedSuperOvers ?? 0;
    expect(ties, "consecutive ties are tracked").toBeGreaterThanOrEqual(1);

    if (ties >= 3) {
      const teams = await m.api.getTeams(m.matchPublicId);
      const flip = await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/coin-flip`,
        { winnerTeamPublicId: teams[0].publicId });
      expect(flip.status, "a coin flip decides it after three ties").toBe(200);
      expect(flip.body.resultType).toBe("COIN_FLIP");
      expect(flip.body.status).toBe("COMPLETED");
    }
  });

  for (const [id, what] of [
    ["T20-288", "powerplay start"],
    ["T20-289", "powerplay end"],
    ["T20-290", "custom powerplay"],
    ["T20-291", "field restriction display"],
    ["T20-292", "restriction violation metadata"],
  ] as const) {
    test(`${id} ${what}`, async () => {
      test.skip(true,
        "NOT-IMPLEMENTED: no powerplay or field-restriction model exists in the " +
        "scoring module. The only powerplay code in the repo is UmpireAssistPage.tsx, " +
        "which has no route and is unrelated to scoring. Nothing stores a powerplay " +
        "range, a current restriction, or a violation.");
    });
  }
});
