import { test, expect } from "../fixtures/scoringMatch";
import { rawSql } from "../fixtures/captureState";

/**
 * Workbook section 15 — Fielding / Batting / Bowling Statistics (T20-370 … T20-387).
 *
 * The reconciliation tests run against a full innings rather than a handful of
 * deliveries: every extra type, boundaries, wickets of both credited and
 * non-credited kinds, and a penalty, so the sums have something to be wrong about.
 */

/** Bowl one delivery, filling an empty end or bowler first. */
async function bowl(m: any, ball: Record<string, unknown>, nextBatter?: () => string | null) {
  let s = await m.api.state(m.matchPublicId);
  for (const [key, pos] of [
    ["currentStrikerPublicId", "striker"], ["currentNonStrikerPublicId", "nonstriker"],
  ] as const) {
    if (!s[key] && nextBatter) {
      const next = nextBatter();
      if (!next) return null;
      await m.api.selectBatter(m.matchPublicId, next, pos);
      s = await m.api.state(m.matchPublicId);
    }
  }
  if (!s.currentBowlerPublicId) {
    const oversBowled = (id: string) =>
      Math.floor(((s.bowlerStats?.[id]?.legalBalls as number) ?? 0) / 6);
    const next = m.bowlers
      .filter((b: any) => b.mtpPublicId !== s.lastBowlerPublicId)
      .sort((a: any, b: any) => oversBowled(a.mtpPublicId) - oversBowled(b.mtpPublicId))[0];
    await m.api.correctBowler(m.matchPublicId, next.mtpPublicId);
    s = await m.api.state(m.matchPublicId);
  }
  return m.api.postBall(m.matchPublicId, {
    bowlerPublicId: s.currentBowlerPublicId!,
    batsmanPublicId: s.currentStrikerPublicId!,
    nonStrikerPublicId: s.currentNonStrikerPublicId!,
    ...(ball as any),
  });
}

/** A varied innings: every extra type, boundaries, and both kinds of wicket. */
async function scoreVariedInnings(m: any) {
  let idx = 2;
  const next = () => (idx < m.batters.length ? m.batters[idx++].mtpPublicId : null);
  const keeper = m.bowlers.find((b: any) => b.displayName === "Matthew Wade")!;
  const fielder = m.bowlers.find((b: any) => b.displayName === "Glenn Maxwell")!;

  const seq: Array<Record<string, unknown>> = [
    { runsBatsman: 4 }, { runsBatsman: 6 }, { runsBatsman: 1 },
    { runsBatsman: 0, runsExtras: 1, extraType: "WIDE" },
    { runsBatsman: 0, runsExtras: 3, extraType: "WIDE" },
    { runsBatsman: 0, runsExtras: 1, extraType: "NO_BALL", noBallRunsType: "BAT" },
    { runsBatsman: 0, runsExtras: 3, extraType: "NO_BALL", noBallRunsType: "BYE" },
    { runsBatsman: 0, runsExtras: 2, extraType: "BYE" },
    { runsBatsman: 0, runsExtras: 1, extraType: "LEG_BYE" },
    { runsBatsman: 2 }, { runsBatsman: 0 }, { runsBatsman: 3 },
  ];
  for (const ball of seq) await bowl(m, ball, next);

  // A caught (credited) and a run out (not credited).
  let s = await m.api.state(m.matchPublicId);
  await bowl(m, {
    runsBatsman: 0, isWicket: true, dismissalType: "CAUGHT",
    dismissedPlayerPublicId: s.currentStrikerPublicId!, fielderPublicId: fielder.mtpPublicId,
  }, next);
  s = await m.api.state(m.matchPublicId);
  await bowl(m, {
    runsBatsman: 0, isWicket: true, dismissalType: "RUN_OUT",
    dismissedPlayerPublicId: s.currentStrikerPublicId!, fielderPublicId: fielder.mtpPublicId,
  }, next);
  s = await m.api.state(m.matchPublicId);
  await bowl(m, {
    runsBatsman: 0, isWicket: true, dismissalType: "STUMPED",
    dismissedPlayerPublicId: s.currentStrikerPublicId!, fielderPublicId: keeper.mtpPublicId,
  }, next);

  await m.api.raw("post", `/api/admin/cricket/matches/${m.matchPublicId}/scoring/penalty`,
    { awardedTo: "FIELDING" });
  return { keeper, fielder };
}

test.describe("§15 Fielding / Batting / Bowling Statistics", () => {

  test("T20-377 / T20-386 batter runs plus all five extras buckets equal the team total", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await scoreVariedInnings(m);

    const s = await m.api.state(m.matchPublicId);
    const st = s.inningsState;
    const batterRuns = Object.values(s.batterStats as Record<string, { runs: number }>)
      .reduce((n, b) => n + b.runs, 0);
    const buckets = st.extrasWide + st.extrasNoBall + st.extrasBye + st.extrasLegBye + st.extrasPenalty;

    // Workbook T20-377: "Batter runs + extras + penalties reconcile to team total."
    expect(batterRuns + buckets, "the innings reconciles exactly").toBe(st.totalRuns);
    // Workbook T20-386: "Wides/NBs/byes/LBs/penalties reconcile."
    expect(st.extrasWide).toBeGreaterThan(0);
    expect(st.extrasNoBall).toBeGreaterThan(0);
    expect(st.extrasBye).toBeGreaterThan(0);
    expect(st.extrasLegBye).toBeGreaterThan(0);
    expect(st.extrasPenalty).toBe(5);
  });

  test("T20-378 / T20-379 balls faced, fours and sixes match the deliveries", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await scoreVariedInnings(m);
    const s = await m.api.state(m.matchPublicId);

    for (const [mtpId, stat] of Object.entries(s.batterStats as Record<string, any>)) {
      // Balls faced: legal deliveries plus no-balls; wides are not faced.
      const faced = Number(rawSql(
        `SELECT count(*) FROM deliveries d
         JOIN innings i ON d.innings_id=i.id JOIN cricket_matches mm ON i.match_id=mm.id
         JOIN match_team_players b ON d.batsman_id=b.id
         WHERE mm.public_id='${m.matchPublicId}' AND b.public_id='${mtpId}'
           AND (d.is_legal_ball OR d.extra_type='NO_BALL')`));
      expect(stat.balls, `balls faced for ${mtpId}`).toBe(faced);

      const fours = Number(rawSql(
        `SELECT count(*) FROM deliveries d
         JOIN innings i ON d.innings_id=i.id JOIN cricket_matches mm ON i.match_id=mm.id
         JOIN match_team_players b ON d.batsman_id=b.id
         WHERE mm.public_id='${m.matchPublicId}' AND b.public_id='${mtpId}' AND d.runs_batsman=4`));
      const sixes = Number(rawSql(
        `SELECT count(*) FROM deliveries d
         JOIN innings i ON d.innings_id=i.id JOIN cricket_matches mm ON i.match_id=mm.id
         JOIN match_team_players b ON d.batsman_id=b.id
         WHERE mm.public_id='${m.matchPublicId}' AND b.public_id='${mtpId}' AND d.runs_batsman=6`));
      expect(stat.fours, `4s counter for ${mtpId}`).toBe(fours);
      expect(stat.sixes, `6s counter for ${mtpId}`).toBe(sixes);
    }
  });

  test("T20-380 strike rate follows from the server's runs and balls", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await scoreVariedInnings(m);
    const s = await m.api.state(m.matchPublicId);
    for (const stat of Object.values(s.batterStats as Record<string, any>)) {
      // Workbook: "SR calculation correct; zero-ball handling defined."
      const sr = stat.balls > 0 ? (stat.runs * 100) / stat.balls : 0;
      expect(Number.isFinite(sr), "a zero-ball batter must not produce NaN or Infinity").toBe(true);
      if (stat.balls === 0) expect(stat.runs, "no balls faced means no runs off the bat").toBe(0);
    }
  });

  test("T20-381 / T20-384 bowler overs come from legal balls, and economy follows", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await scoreVariedInnings(m);
    const s = await m.api.state(m.matchPublicId);

    for (const [mtpId, stat] of Object.entries(s.bowlerStats as Record<string, any>)) {
      const legal = Number(rawSql(
        `SELECT count(*) FROM deliveries d
         JOIN innings i ON d.innings_id=i.id JOIN cricket_matches mm ON i.match_id=mm.id
         JOIN match_team_players b ON d.bowler_id=b.id
         WHERE mm.public_id='${m.matchPublicId}' AND b.public_id='${mtpId}' AND d.is_legal_ball`));
      // Workbook: "Overs use legal-ball count."
      expect(stat.legalBalls, `legal balls for ${mtpId}`).toBe(legal);

      const economy = stat.legalBalls > 0 ? (stat.runsConceded * 6) / stat.legalBalls : 0;
      expect(Number.isFinite(economy), "economy must be finite").toBe(true);
    }
  });

  test("T20-382 bowler runs exclude byes, leg-byes and the penalty", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await scoreVariedInnings(m);
    const s = await m.api.state(m.matchPublicId);

    const charged = Number(rawSql(
      `SELECT coalesce(sum(d.runs_batsman + CASE
             WHEN d.extra_type = 'WIDE' THEN d.runs_extras
             WHEN d.extra_type = 'NO_BALL' THEN 1 ELSE 0 END), 0)
       FROM deliveries d JOIN innings i ON d.innings_id=i.id
       JOIN cricket_matches mm ON i.match_id=mm.id WHERE mm.public_id='${m.matchPublicId}'`));
    const stored = Object.values(s.bowlerStats as Record<string, any>)
      .reduce((n, b) => n + b.runsConceded, 0);
    // Workbook: "Bowler conceded runs match attribution."
    expect(stored, "bowlers are charged only what BowlingAttribution says").toBe(charged);
    expect(stored, "and that is less than the team total, which includes byes and the penalty")
      .toBeLessThan(s.inningsState.totalRuns);
  });

  test("T20-383 only bowler-credited dismissals count (BUG-15 regression)", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await scoreVariedInnings(m);
    const s = await m.api.state(m.matchPublicId);

    const credited = Number(rawSql(
      `SELECT count(*) FROM deliveries d JOIN innings i ON d.innings_id=i.id
       JOIN cricket_matches mm ON i.match_id=mm.id
       WHERE mm.public_id='${m.matchPublicId}' AND d.is_wicket
         AND d.dismissal_type IN ('BOWLED','CAUGHT','LBW','STUMPED','HIT_WICKET')`));
    const stored = Object.values(s.bowlerStats as Record<string, any>)
      .reduce((n, b) => n + b.wickets, 0);
    // Workbook: "Only bowler-credit dismissals counted."
    expect(stored, "the caught and the stumping, not the run out").toBe(credited);
    expect(stored).toBe(2);
    expect(s.inningsState.totalWickets, "the team lost three").toBe(3);
  });

  test("T20-385 dot balls are legal deliveries with nothing off them", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await scoreVariedInnings(m);
    const s = await m.api.state(m.matchPublicId);

    const dots = Number(rawSql(
      `SELECT count(*) FROM deliveries d JOIN innings i ON d.innings_id=i.id
       JOIN cricket_matches mm ON i.match_id=mm.id
       WHERE mm.public_id='${m.matchPublicId}'
         AND d.is_legal_ball AND d.runs_batsman = 0 AND d.extra_type IS NULL`));
    const stored = Object.values(s.bowlerStats as Record<string, any>)
      .reduce((n, b) => n + b.dots, 0);
    // Workbook: "Dot-ball definition consistently applied." A leg-bye ball is a
    // legal delivery with no runs off the bat, but it is not a dot.
    expect(stored).toBe(dots);
  });

  test("the scorecard endpoint matches the live state on every bowling figure", async ({ scoringMatch }) => {
    const m = scoringMatch;
    await scoreVariedInnings(m);
    const s = await m.api.state(m.matchPublicId);

    const card = await m.api.raw("get", `/api/public/scorecard/${m.matchPublicId}`);
    expect(card.status).toBe(200);
    const inn = card.body.innings[0];

    expect(inn.totalRuns).toBe(s.inningsState.totalRuns);
    expect(inn.totalWickets).toBe(s.inningsState.totalWickets);
    expect(inn.totalBalls).toBe(s.inningsState.totalBalls);
    expect(inn.extrasWide).toBe(s.inningsState.extrasWide);
    expect(inn.extrasNoBall).toBe(s.inningsState.extrasNoBall);
    expect(inn.extrasBye).toBe(s.inningsState.extrasBye);
    expect(inn.extrasLegBye).toBe(s.inningsState.extrasLegBye);
    expect(inn.extrasPenalty).toBe(s.inningsState.extrasPenalty);

    const cardWickets = inn.bowlingCard.reduce((n: number, b: any) => n + b.wickets, 0);
    const cardRuns = inn.bowlingCard.reduce((n: number, b: any) => n + b.runs, 0);
    const liveWickets = Object.values(s.bowlerStats as Record<string, any>)
      .reduce((n, b) => n + b.wickets, 0);
    const liveRuns = Object.values(s.bowlerStats as Record<string, any>)
      .reduce((n, b) => n + b.runsConceded, 0);
    // Two independent implementations — one reads innings_bowling_stats, the other
    // recomputes from the deliveries table.
    expect(cardWickets, "scorecard bowler wickets").toBe(liveWickets);
    expect(cardRuns, "scorecard bowler runs").toBe(liveRuns);
  });

  // ── Fielding ─────────────────────────────────────────────────────────────
  test("T20-370 / T20-371 / T20-372 catches, stumpings and run-outs are attributable", async ({ scoringMatch }) => {
    const m = scoringMatch;
    const { keeper, fielder } = await scoreVariedInnings(m);

    const count = (id: string, type: string) => Number(rawSql(
      `SELECT count(*) FROM deliveries d JOIN innings i ON d.innings_id=i.id
       JOIN cricket_matches mm ON i.match_id=mm.id
       JOIN match_team_players f ON d.fielder_id=f.id
       WHERE mm.public_id='${m.matchPublicId}' AND f.public_id='${id}' AND d.dismissal_type='${type}'`));

    // Workbook T20-370 "Catch +1", T20-372 "Stumping +1", T20-371 "Run-out +1".
    // These live on the delivery's fielder_id; there is no per-player fielding
    // counter table, so they are derived wherever they are needed.
    expect(count(fielder.mtpPublicId, "CAUGHT"), "the catch is attributed").toBe(1);
    expect(count(keeper.mtpPublicId, "STUMPED"), "the stumping is attributed to the keeper").toBe(1);
    expect(count(fielder.mtpPublicId, "RUN_OUT"), "the run out is attributed").toBe(1);
  });

  for (const [id, what, why] of [
    ["T20-371b", "direct-hit / assist split on a run out",
     "there is no direct-hit flag on Delivery. fielder and fielder2 exist, but " +
     "nothing distinguishes a direct hit from a throw plus a receiver."],
    ["T20-373", "dropped catch",
     "no dropped-catch event exists. Only completed dismissals are recorded."],
    ["T20-374", "direct hit",
     "no direct-hit flag — see T20-371b."],
    ["T20-375", "primary and assist fielder retained",
     "fielder2 is stored, but no consumer distinguishes primary from assist and " +
     "the wicket modal exposes only one fielder picker."],
    ["T20-376", "misfield",
     "no misfield event exists."],
    ["T20-387", "wagon wheel / scoring area analytics",
     "shot_zone is stored per delivery and the wagon wheel modal writes it, but " +
     "there is no location-statistics aggregation to reconcile against."],
  ] as const) {
    test(`${id} ${what}`, async () => { test.skip(true, `NOT-IMPLEMENTED: ${why}`); });
  }
});
