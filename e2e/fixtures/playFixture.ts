import { expect } from "@playwright/test";
import type { Api } from "./api";
import { dbOne } from "./db";
import type { Side } from "./championship";

/**
 * Playing one tournament fixture through the EXISTING scoring module.
 *
 * Phase 33 is a constraint, not a task: nothing here touches `ScoringService`,
 * `applyBall` or `replayInnings`. It drives the same endpoints the live scorer
 * drives — `select-batter`, `correct-bowler`, `scoring/ball`, `innings/close`,
 * `result` — in the same order `MatchSetupPage` drives them, `link-match`
 * included, because that call is what moves a fixture to IN_PROGRESS and is the
 * only reason the Fixtures tab ever offers "Live Scorer" for an existing match.
 *
 * Every delivery re-reads `scoring/state` rather than assuming who is on strike.
 * That is not defensiveness: strike rotation, the over change and the bowler
 * restriction are all server-side, and a client that predicts them is asserting
 * its own model of the rules instead of the server's.
 */

export type Outcome = "WIN" | "SUPER_OVER" | "ABANDONED";

/**
 * One delivery: runs off the bat, or runs plus a catch.
 *
 * A wicket is needed for the bowling and fielding leaderboards to exist at all —
 * a championship scored entirely in boundaries has no top wicket taker, and the
 * dashboard renders that card as "nothing played yet" rather than as a number.
 * Which is correct behaviour, and is why the first run of this spec found it.
 */
export type Delivery = number | { runs: number; wicket: true };

const runsOf = (d: Delivery) => (typeof d === "number" ? d : d.runs);

/**
 * Turn the last delivery of an over into a catch.
 *
 * It must be a dot ball: a batter cannot be caught off a delivery that scored, so
 * marking a 4 or a 6 would be scoring something that cannot happen. Throws rather
 * than silently declining, so a script that has no dot to use is a test error and
 * not a quietly wicketless innings.
 */
export function withCatch(runs: number[]): Delivery[] {
  const last = runs.length - 1;
  if (runs[last] !== 0) {
    throw new Error(
      `withCatch needs the last delivery to be a dot; got ${runs[last]} in [${runs}]`);
  }
  return runs.map((r, i) => (i === last ? { runs: 0, wicket: true as const } : r));
}

export interface FixtureScript {
  /** Deliveries in innings 1. */
  first: Delivery[];
  /** Deliveries in innings 2. Empty for an abandoned match. */
  second: Delivery[];
  outcome: Outcome;
  /** Required when `outcome` is SUPER_OVER: the two one-over innings. */
  superOver?: { first: Delivery[]; second: Delivery[] };
}

/** What a played fixture leaves behind, as facts rather than as expectations. */
export interface Played {
  fixturePublicId: string;
  matchPublicId: string;
  home: Side;
  away: Side;
  homeRuns: number;
  awayRuns: number;
  resultType: string;
  /** null for a tie with no Super Over, an abandonment, or a no-result. */
  winner: Side | null;
  loser: Side | null;
  /** Innings facts for the independent NRR computation, Super Over included. */
  innings: InningsRow[];
}

export interface InningsRow {
  battingTeamName: string;
  bowlingTeamName: string;
  totalRuns: number;
  totalBalls: number;
  isAllOut: boolean;
  oversAllotted: number | null;
  isSuperOver: boolean;
}

const OVERS = 20;

/**
 * Bowl a sequence of deliveries into whichever innings is live.
 *
 * Exported because two callers need it and `.claude/rules/multi-tenancy.md`
 * records what happens when a cross-cutting helper is copied instead: four
 * services carried the same bug, once per copy.
 */
export async function bowl(api: Api, match: string, deliveries: Delivery[],
                           bowlerPool: { mtpPublicId: string }[]) {
  for (const d of deliveries) {
    const s = await api.state(match);
    // After an over the server clears the bowler and refuses the one who just
    // bowled, so the next one is chosen rather than reused.
    let bowlerPublicId: string = s.currentBowlerPublicId ?? "";
    if (!bowlerPublicId) {
      bowlerPublicId = (bowlerPool.find((b) => b.mtpPublicId !== s.lastBowlerPublicId)
        ?? bowlerPool[0]).mtpPublicId;
      await api.correctBowler(match, bowlerPublicId);
    }
    const wicket = typeof d !== "number";
    await api.postBall(match, {
      bowlerPublicId,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: runsOf(d),
      ...(wicket ? {
        isWicket: true,
        dismissalType: "CAUGHT",
        dismissedPlayerPublicId: s.currentStrikerPublicId!,
        // A fielder who is not the bowler, so the catch is credited to the
        // fielding leaderboard and the wicket to the bowling one.
        fielderPublicId: (bowlerPool.find((b) => b.mtpPublicId !== bowlerPublicId)
          ?? bowlerPool[0]).mtpPublicId,
      } : {}),
    });
  }
}

/** Open whatever innings is live with two batters and a bowler. */
export async function openInnings(api: Api, match: string, batTeamPublicId: string,
                           bowlTeamPublicId: string, bowlerIdx: number) {
  const bat = (await api.getXI(match, batTeamPublicId)) as any[];
  const bowlers = (await api.getXI(match, bowlTeamPublicId)) as any[];
  const s = await api.state(match);
  if (!s.currentStrikerPublicId) await api.selectBatter(match, bat[0].mtpPublicId, "striker");
  if (!s.currentNonStrikerPublicId) await api.selectBatter(match, bat[1].mtpPublicId, "nonstriker");
  await api.correctBowler(match, bowlers[bowlerIdx].mtpPublicId);
  return { bat, bowlers };
}

/** Open an innings, bowl a whole script into it, and close it. */
export async function playInnings(api: Api, match: string, batTeamPublicId: string,
                                  bowlTeamPublicId: string, runs: Delivery[],
                                  bowlerIdx = 7) {
  await openInnings(api, match, batTeamPublicId, bowlTeamPublicId, bowlerIdx);
  await bowl(api, match, runs, (await api.getXI(match, bowlTeamPublicId)) as any[]);
  await api.raw("post", `/api/admin/cricket/matches/${match}/innings/close`,
    { reason: "OVERS_COMPLETE" });
}

/**
 * How many times BUG-11 was hit this run.
 *
 * Kept after the fix, and now expected to be ZERO. It used to be the count the
 * retry was absorbing; it is now the count a spec asserts, so "no collisions"
 * is a claim the run makes rather than an absence nobody looked for.
 */
export const bug11 = { collisions: 0 };

/** True for the 400 a public-id collision produces. */
export function isPublicIdCollision(e: unknown): boolean {
  const msg = String(e);
  // Matched on the generic message rather than a constraint name — since
  // `b9a58a5` the API no longer returns raw schema detail, and match creation
  // has exactly one unique constraint a caller can trip.
  return msg.includes("cricket_matches_public_id_key")          // pre-b9a58a5 wording
    || (msg.includes("400") && msg.includes("already exists")); // current wording
}

/**
 * `POST /matches`, once — BUGS-FOUND.md BUG-11.
 *
 * This used to retry with a bounded backoff, because
 * `MatchService.generateMatchPublicId()` was
 * `"MCH-NCA-" + System.currentTimeMillis()` and `cricket_matches.public_id` is
 * globally unique: two matches created in the same millisecond anywhere on the
 * platform collided, and two Playwright projects running at once hit it
 * routinely. The product had no retry, so the suite's retry was the only thing
 * making the defect survivable — and it was counted rather than absorbed for
 * exactly that reason.
 *
 * The generator now draws from a random UUID, so there is nothing left to retry.
 * A collision here is a REGRESSION: it is counted and rethrown with a message
 * that says so, rather than slept through.
 */
export async function createMatch(api: Api, body: Record<string, unknown>) {
  try {
    return await api.createMatch(body);
  } catch (e) {
    if (!isPublicIdCollision(e)) throw e;
    bug11.collisions++;
    throw new Error(
      "BUG-11 REGRESSION: POST /matches collided on public_id. The generator is "
      + "supposed to be a random UUID; a collision means it is back on the clock "
      + "or the suffix has been shortened. Original: " + String(e));
  }
}

/** Every innings of a match, read back from the rows the scoring engine wrote. */
export function inningsOf(matchPublicId: string): InningsRow[] {
  // The booleans are projected as explicit '1'/'0' rather than concatenated.
  // `text || boolean` in Postgres renders "true"/"false", not psql's own "t"/"f",
  // so a `=== "t"` test reads every flag as false — which is how the first run of
  // this fixture decided a match had no Super Over innings at all.
  const raw = dbOne(
    `SELECT coalesce(string_agg(
        bat.name || '|' || bowl.name || '|' || i.total_runs || '|' || i.total_balls
        || '|' || CASE WHEN i.is_all_out THEN '1' ELSE '0' END
        || '|' || coalesce(CAST(i.overs_allotted AS text), '')
        || '|' || CASE WHEN i.is_super_over THEN '1' ELSE '0' END,
        E'\\n' ORDER BY i.innings_number), '')
     FROM innings i
     JOIN cricket_matches cm ON i.match_id = cm.id
     JOIN cricket_teams bat  ON i.batting_team_id = bat.id
     JOIN cricket_teams bowl ON i.bowling_team_id = bowl.id
     WHERE cm.public_id = '${matchPublicId}'`);
  if (!raw) return [];
  return raw.split("\n").map((line) => {
    const [battingTeamName, bowlingTeamName, runs, balls, allOut, allotted, so] =
      line.split("|");
    return {
      battingTeamName, bowlingTeamName,
      totalRuns: Number(runs), totalBalls: Number(balls),
      isAllOut: allOut === "1", oversAllotted: allotted ? Number(allotted) : null,
      isSuperOver: so === "1",
    };
  });
}

/**
 * Creates the match for a fixture, scores it, and records the result.
 *
 * @param matchDate the fixture's own scheduled day where it has one, so the
 *   match and its fixture do not disagree on when it was played.
 */
export async function playFixture(
  api: Api,
  tournamentPublicId: string,
  fixture: { publicId: string; homeTeam: { publicId: string; name: string };
             awayTeam: { publicId: string; name: string } },
  home: Side,
  away: Side,
  script: FixtureScript,
  matchDate = "2026-03-10",
): Promise<Played> {

  // ── 1. prepare-match: the endpoint the "Start Match" button calls ──────────
  const prep = await api.raw("get",
    `/api/admin/cricket/tournaments/${tournamentPublicId}/fixtures/${fixture.publicId}/prepare-match`);
  expect(prep.status, `prepare-match for ${home.name} v ${away.name}`).toBe(200);
  expect((prep.body as any).homeTeam.squad.length, "the home squad comes back").toBe(11);
  expect((prep.body as any).awayTeam.squad.length, "the away squad comes back").toBe(11);

  const xi = (side: Side) => side.squad.map((p, i) => ({
    playerPublicId: p.publicId,
    battingOrder: i + 1,
    isCaptain: i === 0,
    isWicketkeeper: i === 5,
    isImpactPlayer: false,
    isForeign: false,
  }));

  // ── 2. the match, linked to the tournament and the fixture ────────────────
  const m = await createMatch(api, {
    title: (prep.body as any).suggestedTitle,
    matchDate,
    matchType: "INTERNAL",
    totalOvers: OVERS,
    venue: "RKMP Main Ground",
    tournamentPublicId,
    fixturePublicId: fixture.publicId,
  });
  const match = m.publicId as string;

  await api.setTeams(match, {
    teamAName: home.name, teamBName: away.name,
    teamAPlayers: xi(home), teamBPlayers: xi(away),
  });

  // BUG-29: ordered by teamType, so [0] is TEAM_A is the home side.
  const sides = (await api.getTeams(match)) as any[];
  expect(sides[0].name, "TEAM_A is the fixture's home side").toBe(home.name);
  const homeSide = sides[0].publicId as string;
  const awaySide = sides[1].publicId as string;

  await api.toss(match, { winnerTeamPublicId: homeSide, decision: "BAT" });

  // ── 3. link-match, exactly where MatchSetupPage.handleStartMatch does it ───
  const link = await api.raw("post",
    `/api/admin/cricket/tournaments/${tournamentPublicId}/fixtures/${fixture.publicId}/link-match`,
    { matchPublicId: match });
  expect(link.status, "link the match to its fixture").toBeLessThan(400);

  await api.start(match);

  // ── 4. innings 1 ──────────────────────────────────────────────────────────
  await openInnings(api, match, homeSide, awaySide, 7);
  const awayXI = (await api.getXI(match, awaySide)) as any[];
  await bowl(api, match, script.first, awayXI);

  if (script.outcome === "ABANDONED") {
    // Abandoned with the first innings part-played: no second innings is opened,
    // and the result carries no winner. computePoints gives both sides the
    // no-result points and buildStandingRow skips it for NRR entirely.
    const abandoned = await api.raw("post",
      `/api/admin/cricket/matches/${match}/result`, {
        resultType: "ABANDONED",
        resultDescription: "Match abandoned — ground unfit, no result",
      });
    expect(abandoned.status, "record the abandonment").toBe(200);
    const rows = inningsOf(match);
    return {
      fixturePublicId: fixture.publicId, matchPublicId: match, home, away,
      homeRuns: rows[0]?.totalRuns ?? 0, awayRuns: 0,
      resultType: "ABANDONED", winner: null, loser: null, innings: rows,
    };
  }

  await api.raw("post", `/api/admin/cricket/matches/${match}/innings/close`,
    { reason: "OVERS_COMPLETE" });

  // ── 5. innings 2 ──────────────────────────────────────────────────────────
  await openInnings(api, match, awaySide, homeSide, 7);
  const homeXI = (await api.getXI(match, homeSide)) as any[];
  await bowl(api, match, script.second, homeXI);
  await api.raw("post", `/api/admin/cricket/matches/${match}/innings/close`,
    { reason: "OVERS_COMPLETE" });

  const mainRuns = inningsOf(match);
  const homeRuns = mainRuns.find((i) => i.battingTeamName === home.name)!.totalRuns;
  const awayRuns = mainRuns.find((i) => i.battingTeamName === away.name)!.totalRuns;

  // ── 6. the Super Over, when the scores are level ───────────────────────────
  if (script.outcome === "SUPER_OVER") {
    expect(homeRuns, "the scripted tie really is level").toBe(awayRuns);
    const state = await api.raw("get", `/api/admin/cricket/matches/${match}`);
    expect((state.body as any).status, "a tie opens a Super Over").toBe("SUPER_OVER");

    // Whoever batted second in the match bats first in the Super Over. Read it
    // off the live innings rather than assuming.
    const soBat = dbOne(
      `SELECT ct.public_id FROM innings i
       JOIN cricket_matches cm ON i.match_id = cm.id
       JOIN cricket_teams ct ON i.batting_team_id = ct.id
       WHERE cm.public_id = '${match}' AND i.status = 'IN_PROGRESS'`);
    const soBowl = soBat === homeSide ? awaySide : homeSide;

    await openInnings(api, match, soBat, soBowl, 8);
    await bowl(api, match, script.superOver!.first,
      (await api.getXI(match, soBowl)) as any[]);
    await api.raw("post", `/api/admin/cricket/matches/${match}/innings/close`,
      { reason: "OVERS_COMPLETE" });

    await openInnings(api, match, soBowl, soBat, 8);
    await bowl(api, match, script.superOver!.second,
      (await api.getXI(match, soBat)) as any[]);
    await api.raw("post", `/api/admin/cricket/matches/${match}/innings/close`,
      { reason: "OVERS_COMPLETE" });

    const rows = inningsOf(match);
    const so = rows.filter((i) => i.isSuperOver);
    expect(so.length, "two Super Over innings exist and are flagged").toBe(2);

    const soWinnerName = so[0].totalRuns > so[1].totalRuns
      ? so[0].battingTeamName : so[1].battingTeamName;
    const winner = soWinnerName === home.name ? home : away;
    const loser = winner === home ? away : home;
    const winnerSide = winner === home ? homeSide : awaySide;

    const rec = await api.raw("post", `/api/admin/cricket/matches/${match}/result`, {
      resultType: "SUPER_OVER",
      winnerTeamPublicId: winnerSide,
      resultDescription: `Match tied; ${winner.name} won the Super Over`,
    });
    expect(rec.status, "record the Super Over result").toBe(200);

    return {
      fixturePublicId: fixture.publicId, matchPublicId: match, home, away,
      homeRuns, awayRuns, resultType: "SUPER_OVER", winner, loser,
      innings: rows,
    };
  }

  // ── 7. an ordinary win ────────────────────────────────────────────────────
  expect(homeRuns, "a scripted win is not level").not.toBe(awayRuns);
  const winner = homeRuns > awayRuns ? home : away;
  const loser = winner === home ? away : home;
  const winnerSide = winner === home ? homeSide : awaySide;
  const margin = Math.abs(homeRuns - awayRuns);

  const rec = await api.raw("post", `/api/admin/cricket/matches/${match}/result`, {
    resultType: "WIN",
    winnerTeamPublicId: winnerSide,
    resultMargin: margin,
    resultDescription: `${winner.name} won by ${margin} runs`,
  });
  expect(rec.status, `record ${winner.name}'s win`).toBe(200);

  return {
    fixturePublicId: fixture.publicId, matchPublicId: match, home, away,
    homeRuns, awayRuns, resultType: "WIN", winner, loser,
    innings: inningsOf(match),
  };
}

/**
 * ICC net run rate for one side, recomputed from innings rows.
 *
 * Deliberately a second implementation rather than a call into the API: the point
 * is to disagree with `buildStandingRow` if it is wrong. `includeSuperOver` makes
 * ruling 3 falsifiable — the endpoint must match the excluding figure and must
 * NOT match the including one, and the two have to differ for that to mean
 * anything.
 */
export function nrrOf(teamName: string, played: Played[],
                      opts: { includeSuperOver: boolean }): number {
  let runsFor = 0, oversFor = 0, runsAgainst = 0, oversAgainst = 0;

  for (const p of played) {
    if (p.home.name !== teamName && p.away.name !== teamName) continue;
    // ICC: a no-result is excluded from net run rate altogether.
    if (p.resultType === "ABANDONED" || p.resultType === "NO_RESULT") continue;

    for (const i of p.innings) {
      if (i.isSuperOver && !opts.includeSuperOver) continue;
      const denom = i.isAllOut && i.oversAllotted && i.oversAllotted > 0
        ? i.oversAllotted
        : i.totalBalls / 6;
      if (denom === 0) continue;
      if (i.battingTeamName === teamName) { runsFor += i.totalRuns; oversFor += denom; }
      if (i.bowlingTeamName === teamName) { runsAgainst += i.totalRuns; oversAgainst += denom; }
    }
  }
  if (oversFor === 0 || oversAgainst === 0) return 0;
  return Math.round((runsFor / oversFor - runsAgainst / oversAgainst) * 1000) / 1000;
}

/** Points for one side under the tournament's own scheme. */
export function pointsOf(teamName: string, played: Played[],
                         scheme: { win: number; tie: number; noResult: number; loss: number }) {
  let points = 0, wins = 0, losses = 0, ties = 0, noResults = 0, matches = 0;
  for (const p of played) {
    if (p.home.name !== teamName && p.away.name !== teamName) continue;
    matches++;
    if (p.resultType === "ABANDONED" || p.resultType === "NO_RESULT") {
      noResults++; points += scheme.noResult;
    } else if (p.winner === null) {
      ties++; points += scheme.tie;
    } else if (p.winner.name === teamName) {
      wins++; points += scheme.win;
    } else {
      losses++; points += scheme.loss;
    }
  }
  return { points, wins, losses, ties, noResults, matches };
}
