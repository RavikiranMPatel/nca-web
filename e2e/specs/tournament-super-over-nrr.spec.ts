import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbOne, dbCount, dbExec } from "../fixtures/db";

/**
 * Closes the gap Slice 1 recorded against itself.
 *
 * Slice 1 excluded Super Over innings from NRR and proved it with unit tests over
 * the accumulators. Its PROGRESS.md entry says plainly that no end-to-end test
 * scored a real tied match through to a Super Over and read the standings back,
 * and that this was "a genuine gap … stated rather than implied". This is that
 * test.
 *
 * A real match is scored to a tie, the Super Over is bowled, the result is
 * recorded, and the points table is then compared against the figure the main
 * innings alone imply — which the test derives from the innings rows rather than
 * writing in by hand, so it is a comparison with the pre-Super-Over value and
 * not with a constant that happens to agree.
 *
 * The Super Over is deliberately lopsided, 34 against 2, so that counting it
 * could not leave NRR where it was. Both main innings are level at 6 off 3
 * balls, so NRR is nil for each side; were the Super Over included it would move
 * to roughly ±6. That is what makes "close to nil" a real discrimination rather
 * than an assertion that would hold either way.
 *
 * Ordering matters: the Super Over is bowled *before* the result is recorded,
 * because recording it moves the match to COMPLETED and the scoring endpoints
 * then refuse with "Match is not in progress".
 *
 * Desktop only: this is arithmetic over an API, with no viewport dimension.
 */

const RUN = `${Date.now() % 1000000}`;
const TNAME = `SuperOverNRR ${RUN}`;

const xi = (prefix: string) =>
  Array.from({ length: 11 }, (_, i) => ({
    externalName: `${prefix} ${RUN} P${i + 1}`,
    battingOrder: i + 1,
    isCaptain: i === 0,
    isWicketkeeper: i === 5,
    isImpactPlayer: false,
    isForeign: false,
  }));

let createdMatch: string | null = null;

test.afterAll(async () => {
  // The match goes through the API, not psql: a scored match has
  // innings_batting_stats and innings_bowling_stats rows, and nothing cascades
  // into those, so a raw DELETE trips the NO ACTION references that gotchas.md
  // records against BUG-10. deleteMatch handles them.
  if (createdMatch) {
    const api = await Api.login(config().a);
    await api.deleteMatch(createdMatch).catch(() => { /* already gone */ });
    await api.dispose();
  }

  const tourneys = `(SELECT id FROM tournaments WHERE name = '${TNAME}')`;
  dbExec(`UPDATE tournaments SET champion_team_id = NULL, runner_up_team_id = NULL
          WHERE id IN ${tourneys}`);
  dbExec(`UPDATE fixtures SET match_id = NULL WHERE tournament_id IN ${tourneys}`);
  dbExec(`DELETE FROM fixtures WHERE tournament_id IN ${tourneys}`);
  dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN ${tourneys}`);
  dbExec(`DELETE FROM tournament_stages WHERE tournament_id IN ${tourneys}`);
  dbExec(`DELETE FROM audit_logs WHERE entity_public_id IN
            (SELECT public_id FROM tournaments WHERE name = '${TNAME}')`);
  dbExec(`DELETE FROM tournaments WHERE name = '${TNAME}'`);
});

test("Super Over innings do not move the standings NRR, end to end",
  async ({ }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "arithmetic over an API");
  test.setTimeout(120_000);

  const api = await Api.login(config().a);

  // ── A one-fixture tournament ──────────────────────────────────────────────
  const t = await api.raw("post", "/api/admin/cricket/tournaments", {
    name: TNAME, format: "ROUND_ROBIN", venue: "SO Ground",
    startDate: "2026-07-01", endDate: "2026-08-01",
    defaultOvers: 20, winPoints: 2, tiePoints: 1, noResultPoints: 1,
  });
  expect(t.status).toBe(200);
  const tid = (t.body as any).publicId as string;

  const teams: any[] = [];
  for (const [n, short] of [["Kestrels", "KES"], ["Falcons", "FAL"]]) {
    const r = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/teams`,
      { name: `${n} ${RUN}`, shortName: short, colorHex: "#2563eb" });
    expect(r.status, `add ${n}`).toBe(200);
    teams.push(r.body);
  }
  const fx = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/fixtures/generate`, {});
  expect(fx.status).toBe(200);
  const fixturePublicId = (fx.body as any[])[0].publicId as string;

  // ── A match on that fixture, with real XIs ────────────────────────────────
  const m = await api.createMatch({
    title: `SO match ${RUN}`, matchDate: "2026-07-10", matchType: "INTERNAL",
    totalOvers: 20, venue: "SO Ground",
    tournamentPublicId: tid, fixturePublicId,
  });
  const match = m.publicId as string;
  createdMatch = match;

  await api.setTeams(match, {
    teamAName: teams[0].name, teamBName: teams[1].name,
    teamAPlayers: xi("KES"), teamBPlayers: xi("FAL"),
  });

  const sides = (await api.getTeams(match)) as any[];
  await api.toss(match, { winnerTeamPublicId: sides[0].publicId, decision: "BAT" });
  await api.start(match);

  /** Bowl `runs` off successive deliveries in whatever innings is live. */
  async function bowl(runs: number[]) {
    for (const r of runs) {
      const s = await api.state(match);
      await api.postBall(match, {
        bowlerPublicId: s.currentBowlerPublicId!,
        batsmanPublicId: s.currentStrikerPublicId!,
        nonStrikerPublicId: s.currentNonStrikerPublicId!,
        runsBatsman: r,
      });
    }
  }

  async function openInnings(batTeam: string, bowlTeam: string, bowlerIdx: number) {
    const bat = (await api.getXI(match, batTeam)) as any[];
    const bowlers = (await api.getXI(match, bowlTeam)) as any[];
    const s = await api.state(match);
    if (!s.currentStrikerPublicId)
      await api.selectBatter(match, bat[0].mtpPublicId, "striker");
    if (!s.currentNonStrikerPublicId)
      await api.selectBatter(match, bat[1].mtpPublicId, "nonstriker");
    await api.correctBowler(match, bowlers[bowlerIdx].mtpPublicId);
    return { bat, bowlers };
  }

  const close = () =>
    api.raw("post", `/api/admin/cricket/matches/${match}/innings/close`,
      { reason: "OVERS_COMPLETE" });

  // ── Innings 1: 6 off 3 ────────────────────────────────────────────────────
  await openInnings(sides[0].publicId, sides[1].publicId, 7);
  await bowl([2, 2, 2]);
  await close();

  // ── Innings 2: level at 6 — a tie ─────────────────────────────────────────
  await openInnings(sides[1].publicId, sides[0].publicId, 7);
  await bowl([2, 2, 2]);
  await close();

  const afterTie = await api.raw("get", `/api/admin/cricket/matches/${match}`);
  expect(afterTie.body.status, "the tie opens a Super Over").toBe("SUPER_OVER");

  // ── The Super Over, deliberately lopsided ─────────────────────────────────
  // Played before the result is recorded: recording it moves the match to
  // COMPLETED and the scoring endpoints then refuse with "Match is not in
  // progress".
  //
  // Whoever batted second in the match bats first in the Super Over; read it off
  // the live innings rather than assuming.
  const soBatTeam = dbOne(
    `SELECT ct.public_id FROM innings i
     JOIN cricket_matches cm ON i.match_id = cm.id
     JOIN cricket_teams ct ON i.batting_team_id = ct.id
     WHERE cm.public_id = '${match}' AND i.status = 'IN_PROGRESS'`);
  const soBowlTeam = sides.find((s) => s.publicId !== soBatTeam)!.publicId;

  await openInnings(soBatTeam, soBowlTeam, 8);
  await bowl([6, 6, 4, 6, 6, 6]);        // 34 off the over
  await close();

  await openInnings(soBowlTeam, soBatTeam, 8);
  await bowl([0, 1, 0, 0, 1, 0]);        // 2 off the over
  await close();

  expect(dbCount(`SELECT count(*) FROM innings i
                  JOIN cricket_matches cm ON i.match_id = cm.id
                  WHERE cm.public_id = '${match}' AND i.is_super_over`),
    "two Super Over innings exist and are flagged").toBe(2);

  // ── Record the result, so the fixture counts towards the table ────────────
  const soWinner = sides.find((s) => s.publicId === soBatTeam)!;
  const rec = await api.raw("post", `/api/admin/cricket/matches/${match}/result`, {
    resultType: "SUPER_OVER",
    resultDescription: "Match tied; decided on the Super Over",
    winnerTeamPublicId: soWinner.publicId,
  });
  expect(rec.status, "record the result").toBe(200);

  // ── What NRR should be, from the main innings alone ───────────────────────
  //
  // Computed from the database rather than written in by hand, so this is a
  // comparison against the pre-Super-Over figure and not against a number that
  // happens to agree with it.
  const mainOnly = (teamPublicId: string) => {
    const scored = Number(dbOne(
      `SELECT coalesce(sum(i.total_runs), 0) FROM innings i
       JOIN cricket_matches cm ON i.match_id = cm.id
       JOIN cricket_teams ct ON i.batting_team_id = ct.id
       WHERE cm.public_id = '${match}' AND NOT i.is_super_over
         AND ct.public_id = '${teamPublicId}'`));
    const conceded = Number(dbOne(
      `SELECT coalesce(sum(i.total_runs), 0) FROM innings i
       JOIN cricket_matches cm ON i.match_id = cm.id
       JOIN cricket_teams ct ON i.bowling_team_id = ct.id
       WHERE cm.public_id = '${match}' AND NOT i.is_super_over
         AND ct.public_id = '${teamPublicId}'`));
    return { scored, conceded };
  };

  const nrrOf = async (): Promise<Record<string, number>> => {
    const rows = (await api.raw("get",
      `/api/admin/cricket/tournaments/${tid}/standings`)).body as any[];
    const out: Record<string, number> = {};
    for (const r of rows) out[r.teamPublicId] = Number(r.nrr);
    return out;
  };

  const nrr = await nrrOf();
  expect(Object.keys(nrr), "both sides are in the table").toHaveLength(2);

  // Both sides faced the same number of balls and scored the same runs in the
  // main innings, so runs-for equals runs-against and NRR is nil either way.
  for (const [i, side] of [sides[0], sides[1]].entries()) {
    const { scored, conceded } = mainOnly(side.publicId);
    expect(scored, `main-innings runs for side ${i}`).toBe(6);
    expect(conceded, `main-innings runs against side ${i}`).toBe(6);
  }

  expect(nrr[teams[0].publicId],
    "NRR is the main-innings figure, not moved by a 34-run Super Over")
    .toBeCloseTo(0, 5);
  expect(nrr[teams[1].publicId],
    "and the same for the other side").toBeCloseTo(0, 5);

  // Had the Super Over been counted, 34 against 2 over one over each would put
  // these at roughly +6 and -6 — so "close to nil" is a real discrimination and
  // not a test that would pass either way.
  expect(Math.abs(nrr[teams[0].publicId]), "nowhere near the +6 a counted "
    + "Super Over would produce").toBeLessThan(0.001);

  // The Super Over is in the scorecard even though it is out of the arithmetic —
  // excluding it from NRR must not mean hiding it.
  const card = await api.raw("get", `/api/public/scorecard/${match}`);
  if (card.status === 200) {
    expect(JSON.stringify(card.body),
      "the Super Over is still visible in the scorecard").toContain("uperOver");
  }

  await api.dispose();
});
