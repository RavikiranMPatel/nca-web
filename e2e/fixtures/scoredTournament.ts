import { expect } from "@playwright/test";
import { Api } from "./api";
import { config, type Tenant } from "./env";
import { dbExec } from "./db";
import { createPlayer } from "./createPlayer";

/**
 * A tournament with one COMPLETED, really-scored fixture — built from REAL
 * academy players, not guests.
 *
 * <p>That distinction is the whole reason this exists rather than reusing
 * `tournament-super-over-nrr.spec.ts`'s inline setup, which fills both XIs with
 * `externalName` guests. A guest MatchTeamPlayer has `player IS NULL`, so it is
 * filtered out of every leaderboard and cannot receive an award — the Slice 5
 * endpoints would all return empty against it and the specs would pass while
 * proving nothing.
 *
 * <p>The scoring is small and deliberately asymmetric so every figure is
 * hand-computable and no two rows are interchangeable:
 *
 * <pre>
 *   Innings 1  HOME bats   4, 4, 4         -> 12/0, all to the opener
 *   Innings 2  AWAY bats   2, then 0 CAUGHT ->  2/1, one wicket to the bowler,
 *                                               one catch to the fielder
 *   Result     HOME win by 10 runs
 * </pre>
 *
 * <p>So: highest team score 12, highest individual score 12* (not out, never
 * dismissed), top run scorer the home opener on 12 off 3 with three fours and a
 * strike rate of 400, top wicket taker the home bowler on 1, and exactly one
 * fielding entry. Total runs 14, total wickets 1.
 */

export const SCORED = {
  homeRuns: 12,
  awayRuns: 2,
  totalRuns: 14,
  totalWickets: 1,
  openerRuns: 12,
  openerBalls: 3,
  openerFours: 3,
  openerStrikeRate: 400,
} as const;

export interface ScoredTournament {
  api: Api;
  tag: string;
  tournamentPublicId: string;
  tournamentName: string;
  fixturePublicId: string;
  matchPublicId: string;
  homeTeamPublicId: string;
  awayTeamPublicId: string;
  /** The two sides' names, which is what a rendered report prints. */
  homeTeamName: string;
  awayTeamName: string;
  /** Set when built with `markFinal`, so Slice 3's automation decided a champion. */
  championTeamName?: string;
  runnerUpTeamName?: string;
  /** The home opener — top run scorer and highest individual score. */
  opener: { publicId: string; displayName: string };
  /** The home bowler who took the wicket — top wicket taker. */
  wicketTaker: { publicId: string; displayName: string };
  /** The home fielder credited with the catch. */
  catcher: { publicId: string; displayName: string };
  destroy(): Promise<void>;
}

let counter = 0;
const PER_SIDE = 11;

export async function createScoredTournament(
  opts: { tenant?: Tenant; label?: string; markFinal?: boolean } = {},
): Promise<ScoredTournament> {
  const env = config();
  const api = await Api.login(opts.tenant ?? env.a);
  const tag = `${Date.now() % 1000000}${(counter++).toString().padStart(2, "0")}`;
  const label = opts.label ?? "Scored";
  const tournamentName = `${label} ${tag}`;

  try {
    return await build(api, tag, label, tournamentName, opts.markFinal === true);
  } catch (e) {
    // If setup throws part-way, the caller never receives a fixture and can never
    // call destroy() — so everything created up to the failure would be left in
    // the database, which is how eight players and four batches survived the runs
    // that found BUG-33. Clean up what exists, then rethrow the original error.
    await removeEverything(api, tag, label, tournamentName).catch(() => { /* best effort */ });
    await api.dispose().catch(() => { /* already gone */ });
    throw e;
  }
}

/**
 * Removes everything a run with this tag created, whether or not setup completed.
 *
 * Keyed by the tag rather than by ids collected along the way, so it works from a
 * half-built fixture — which is the case it exists for.
 */
async function removeEverything(api: Api, tag: string, label: string,
                                tournamentName: string): Promise<void> {
  const tq = `(SELECT id FROM tournaments WHERE name = '${tournamentName}')`;
  dbExec(`UPDATE cricket_matches SET fixture_id = NULL
            WHERE fixture_id IN (SELECT id FROM fixtures WHERE tournament_id IN ${tq})`);
  dbExec(`DELETE FROM tournament_awards WHERE tournament_id IN ${tq}`);
  dbExec(`UPDATE tournaments SET champion_team_id = NULL, runner_up_team_id = NULL
            WHERE id IN ${tq}`);
  dbExec(`UPDATE fixtures SET match_id = NULL WHERE tournament_id IN ${tq}`);
  dbExec(`DELETE FROM fixtures WHERE tournament_id IN ${tq}`);
  dbExec(`DELETE FROM tournament_team_squad WHERE tournament_team_id IN
            (SELECT id FROM tournament_teams WHERE tournament_id IN ${tq})`);
  dbExec(`DELETE FROM cricket_teams WHERE tournament_team_id IN
            (SELECT id FROM tournament_teams WHERE tournament_id IN ${tq})`);
  dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN ${tq}`);
  dbExec(`DELETE FROM tournament_stages WHERE tournament_id IN ${tq}`);
  dbExec(`DELETE FROM audit_logs WHERE entity_public_id IN
            (SELECT public_id FROM tournaments WHERE name = '${tournamentName}')`);
  dbExec(`DELETE FROM tournaments WHERE name = '${tournamentName}'`);

  // Players and their batch are matched on the tag, so a partially-created set is
  // still found.
  const like = `${label} ${tag} P%`;
  dbExec(`DELETE FROM player_career_stats WHERE player_id IN
            (SELECT id FROM players WHERE display_name LIKE '${like}')`);
  dbExec(`DELETE FROM player_batches WHERE player_id IN
            (SELECT id FROM players WHERE display_name LIKE '${like}')`);
  dbExec(`DELETE FROM players WHERE display_name LIKE '${like}'`);
  dbExec(`DELETE FROM batches WHERE name = '${label} Batch ${tag}'`);
}

async function build(api: Api, tag: string, label: string,
                     tournamentName: string,
                     markFinal: boolean): Promise<ScoredTournament> {

  // ── a batch and 22 real players ───────────────────────────────────────────
  const batch = await api.raw("post", "/api/admin/batches", {
    name: `${label} Batch ${tag}`,
    startTime: "06:00:00", endTime: "08:00:00", active: true,
  });
  expect(batch.status, "create batch").toBeLessThan(400);
  const batchId = (batch.body as any).id as string;

  const players: { publicId: string; displayName: string }[] = [];
  for (let i = 0; i < PER_SIDE * 2; i++) {
    const displayName = `${label} ${tag} P${String(i + 1).padStart(2, "0")}`;
    const { publicId } = await createPlayer(api, {
      displayName, gender: "MALE", profession: "STUDENT",
      dob: `2010-01-${String((i % 28) + 1).padStart(2, "0")}`,
      phone: `9${tag}${String(i).padStart(2, "0")}`.slice(0, 10),
      joiningDate: "2026-01-15", batchIds: [batchId],
    }, displayName);
    players.push({ publicId, displayName });
  }
  const homePlayers = players.slice(0, PER_SIDE);
  const awayPlayers = players.slice(PER_SIDE);

  // ── the tournament, its two sides and their squads ────────────────────────
  const t = await api.raw("post", "/api/admin/cricket/tournaments", {
    name: tournamentName, format: "ROUND_ROBIN", venue: `${label} Ground`,
    startDate: "2026-03-01", endDate: "2026-04-01",
    defaultOvers: 20, winPoints: 2, tiePoints: 1, noResultPoints: 1,
  });
  expect(t.status, "create tournament").toBe(200);
  const tournamentPublicId = (t.body as any).publicId as string;

  const teams: any[] = [];
  for (const [name, short] of [[`Home ${tag}`, "HOM"], [`Away ${tag}`, "AWY"]]) {
    const r = await api.raw("post",
      `/api/admin/cricket/tournaments/${tournamentPublicId}/teams`,
      { name, shortName: short, colorHex: "#2563eb" });
    expect(r.status, `add team ${name}`).toBe(200);
    teams.push(r.body);
  }

  for (const [team, squad] of [[teams[0], homePlayers], [teams[1], awayPlayers]] as const) {
    for (const p of squad) {
      const r = await api.raw("post",
        `/api/admin/cricket/tournaments/${tournamentPublicId}/teams/${team.publicId}/squad`,
        { playerPublicId: p.publicId, playerRole: "ALL_ROUNDER" });
      expect(r.status, `squad ${p.displayName}`).toBeLessThan(400);
    }
  }

  const fx = await api.raw("post",
    `/api/admin/cricket/tournaments/${tournamentPublicId}/fixtures/generate`, {});
  expect(fx.status, "generate fixtures").toBe(200);
  const fixture = (fx.body as any[])[0];
  const fixturePublicId = fixture.publicId as string;

  // Which tournament team is home on the generated fixture decides which squad
  // bats first, so read it rather than assuming teams[0].
  const homeIsFirst = fixture.homeTeam?.publicId === teams[0].publicId;
  const homeTeam = homeIsFirst ? teams[0] : teams[1];
  const awayTeam = homeIsFirst ? teams[1] : teams[0];
  const homeSquad = homeIsFirst ? homePlayers : awayPlayers;
  const awaySquad = homeIsFirst ? awayPlayers : homePlayers;

  // ── the match, with REAL players in both XIs ──────────────────────────────
  const xi = (squad: typeof players) =>
    squad.map((p, i) => ({
      playerPublicId: p.publicId,
      battingOrder: i + 1,
      isCaptain: i === 0,
      isWicketkeeper: i === 5,
      isImpactPlayer: false,
      isForeign: false,
    }));

  const m = await api.createMatch({
    title: `${label} match ${tag}`,
    matchDate: "2026-03-10",
    matchType: "INTERNAL",
    totalOvers: 20,
    venue: `${label} Ground`,
    tournamentPublicId, fixturePublicId,
  });
  const matchPublicId = m.publicId as string;

  await api.setTeams(matchPublicId, {
    teamAName: homeTeam.name, teamBName: awayTeam.name,
    teamAPlayers: xi(homeSquad), teamBPlayers: xi(awaySquad),
  });

  const sides = (await api.getTeams(matchPublicId)) as any[];
  await api.toss(matchPublicId, { winnerTeamPublicId: sides[0].publicId, decision: "BAT" });
  await api.start(matchPublicId);

  const homeXI = (await api.getXI(matchPublicId, sides[0].publicId)) as any[];
  const awayXI = (await api.getXI(matchPublicId, sides[1].publicId)) as any[];

  // ── innings 1: the home opener hits three fours ───────────────────────────
  await api.selectBatter(matchPublicId, homeXI[0].mtpPublicId, "striker");
  await api.selectBatter(matchPublicId, homeXI[1].mtpPublicId, "nonstriker");
  await api.correctBowler(matchPublicId, awayXI[7].mtpPublicId);
  for (let i = 0; i < 3; i++) {
    const s = await api.state(matchPublicId);
    await api.postBall(matchPublicId, {
      bowlerPublicId: s.currentBowlerPublicId!,
      batsmanPublicId: s.currentStrikerPublicId!,
      nonStrikerPublicId: s.currentNonStrikerPublicId!,
      runsBatsman: 4,
    });
  }
  await api.raw("post", `/api/admin/cricket/matches/${matchPublicId}/innings/close`,
    { reason: "OVERS_COMPLETE" });

  // ── innings 2: two runs, then a catch ─────────────────────────────────────
  await api.selectBatter(matchPublicId, awayXI[0].mtpPublicId, "striker");
  await api.selectBatter(matchPublicId, awayXI[1].mtpPublicId, "nonstriker");
  await api.correctBowler(matchPublicId, homeXI[7].mtpPublicId);

  let s = await api.state(matchPublicId);
  await api.postBall(matchPublicId, {
    bowlerPublicId: s.currentBowlerPublicId!,
    batsmanPublicId: s.currentStrikerPublicId!,
    nonStrikerPublicId: s.currentNonStrikerPublicId!,
    runsBatsman: 2,
  });

  s = await api.state(matchPublicId);
  await api.postBall(matchPublicId, {
    bowlerPublicId: s.currentBowlerPublicId!,
    batsmanPublicId: s.currentStrikerPublicId!,
    nonStrikerPublicId: s.currentNonStrikerPublicId!,
    runsBatsman: 0,
    isWicket: true,
    dismissalType: "CAUGHT",
    dismissedPlayerPublicId: s.currentStrikerPublicId!,
    fielderPublicId: homeXI[3].mtpPublicId,
  });
  await api.raw("post", `/api/admin/cricket/matches/${matchPublicId}/innings/close`,
    { reason: "ALL_OUT" });

  // ── mark it the final BEFORE the result, when asked ───────────────────────
  //
  // Order matters: Slice 3 decides the champion in `onFixtureCompleted`, which
  // runs when the result is recorded. Marking the fixture afterwards sets a flag
  // nothing re-reads, and the tournament would stay LIVE with no champion —
  // which looks like the tied-final case and proves the opposite of what a
  // champion assertion wants.
  if (markFinal) {
    const mark = await api.raw("patch",
      `/api/admin/cricket/tournaments/${tournamentPublicId}/fixtures/${fixturePublicId}/final`,
      { isFinal: true });
    expect(mark.status, "mark the fixture as the final").toBeLessThan(400);
  }

  // ── result, which is what moves the fixture to COMPLETED ──────────────────
  const res = await api.raw("post",
    `/api/admin/cricket/matches/${matchPublicId}/result`, {
      resultType: "WIN",
      winnerTeamPublicId: sides[0].publicId,
      resultMargin: SCORED.homeRuns - SCORED.awayRuns,
      resultDescription: `${homeTeam.name} won by ${SCORED.homeRuns - SCORED.awayRuns} runs`,
    });
  expect(res.status, "record result").toBeLessThan(400);

  const home = homeIsFirst ? homePlayers : awayPlayers;

  return {
    api, tag, tournamentPublicId, tournamentName, fixturePublicId, matchPublicId,
    homeTeamPublicId: homeTeam.publicId,
    awayTeamPublicId: awayTeam.publicId,
    homeTeamName: homeTeam.name,
    awayTeamName: awayTeam.name,
    // TEAM_A is the home side (setTeams above) and TEAM_A wins, so when this
    // fixture is the final the champion is home and the runner-up is away.
    championTeamName: markFinal ? homeTeam.name : undefined,
    runnerUpTeamName: markFinal ? awayTeam.name : undefined,
    opener: home[0],
    wicketTaker: home[7],
    catcher: home[3],

    async destroy() {
      // The match goes through the API: a scored match has innings_batting_stats
      // and innings_bowling_stats rows and nothing cascades into them, so a raw
      // DELETE trips the NO ACTION references gotchas.md records against BUG-10.
      const del = await api.deleteMatch(matchPublicId).catch(() => ({ status: 0 }));
      await removeEverything(api, tag, label, tournamentName);

      // If the API refused the match delete, say so rather than leaving a row
      // behind silently — a leftover match is what makes the NEXT run's counts
      // wrong, and a silent teardown failure reads as a product bug later.
      // 404 means the test deleted the match itself, which is a legitimate thing
      // for a test to do — only a real refusal is worth failing the teardown over.
      const delStatus = (del as { status: number } | null)?.status ?? 0;
      if (delStatus >= 400 && delStatus !== 404) {
        throw new Error(
          `scoredTournament teardown: DELETE match ${matchPublicId} returned ` +
          `${delStatus}; a cricket_matches row is left behind`,
        );
      }

      await api.dispose();
    },
  };
}
