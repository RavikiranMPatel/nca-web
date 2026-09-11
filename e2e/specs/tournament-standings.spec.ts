import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbOne, dbCount, dbExec } from "../fixtures/db";

/**
 * Slice 1 — the two standings defects, end to end.
 *
 * 1. Super Over innings are excluded from NRR and from playoff seeding.
 * 2. A match's CricketTeam rows carry tournament_team_id, so standings identify a
 *    side by link rather than by name.
 *
 * The column has existed since V22 and nothing ever wrote it, which is why
 * standings matched by name and why the code claimed no FK existed. Both write
 * paths are asserted: setTeams (match created from a fixture) and
 * linkMatchToFixture (match created first, linked afterwards).
 */
const RUN = `${Date.now() % 1000000}`;

async function tournamentWithTwoTeams(api: Api, label: string) {
  const t = await api.raw("post", "/api/admin/cricket/tournaments", {
    name: `${label} ${RUN}`, format: "ROUND_ROBIN", venue: "Test Ground",
    startDate: "2026-01-01", endDate: "2026-02-01",
    defaultOvers: 20, winPoints: 2, tiePoints: 1, noResultPoints: 1,
  });
  expect(t.status, "create tournament").toBe(200);
  const tid = (t.body as any).publicId as string;

  const teams: any[] = [];
  for (const [name, short] of [["India", "IND"], ["Australia", "AUS"]]) {
    const r = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/teams`,
      { name, shortName: short, colorHex: "#123456" });
    expect(r.status, `add team ${name}`).toBe(200);
    teams.push(r.body);
  }
  return { tid, teams };
}

test.afterAll(() => {
  // fixtures.match_id and cricket_matches.fixture_id reference each other, so
  // neither table can be deleted first. Break the cycle by nulling one side.
  const tourneys = `(SELECT id FROM tournaments WHERE name LIKE '%${RUN}')`;
  dbExec(`UPDATE fixtures SET match_id = NULL WHERE tournament_id IN ${tourneys}`);
  dbExec(`DELETE FROM cricket_teams WHERE match_id IN
            (SELECT id FROM cricket_matches WHERE title LIKE '%${RUN}%')`);
  dbExec(`DELETE FROM cricket_matches WHERE title LIKE '%${RUN}%'`);
  dbExec(`DELETE FROM fixtures WHERE tournament_id IN ${tourneys}`);
  dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN ${tourneys}`);
  dbExec(`DELETE FROM tournament_stages WHERE tournament_id IN ${tourneys}`);
  dbExec(`DELETE FROM tournaments WHERE name LIKE '%${RUN}'`);
});

test.describe("Slice 1 — tournament team linking", () => {

  test("a match created from a fixture carries tournament_team_id on both sides",
    async ({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract, no viewport dimension");
    const env = config();
    const api = await Api.login(env.a);
    const { tid, teams } = await tournamentWithTwoTeams(api, "Slice1 Prepare");

    // Generate rather than add manually: addManualFixture requires an existing
    // stage, and generation creates the stage and the round-robin fixture together.
    const fx = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/fixtures/generate`, {});
    expect(fx.status, "generate fixtures").toBe(200);
    const fixturePublicId = (fx.body as any[])[0].publicId as string;

    // prepare-match returns metadata for the creation form — it does not create a
    // match. The real flow is: read it, create the match against the fixture, then
    // set teams. MatchService links match → fixture at creation, and setTeams reads
    // that fixture to stamp tournament_team_id on both CricketTeam rows.
    const prep = await api.raw("get",
      `/api/admin/cricket/tournaments/${tid}/fixtures/${fixturePublicId}/prepare-match`);
    expect(prep.status, "prepare-match metadata").toBe(200);
    expect((prep.body as any).fixturePublicId, "metadata names the fixture").toBe(fixturePublicId);

    const m = await api.createMatch({
      title: `Slice1 Prepare Match ${RUN}`,
      matchDate: "2026-01-20", matchType: "INTERNAL", totalOvers: 20,
      venue: "Test Ground",
      tournamentPublicId: tid,
      fixturePublicId,
    });
    const matchPublicId = m.publicId as string;
    expect(matchPublicId, "match created against the fixture").toBeTruthy();

    await api.setTeams(matchPublicId, {
      teamAName: "India", teamBName: "Australia",
      teamAPlayers: [], teamBPlayers: [],
    }).catch(() => { /* an empty XI may be rejected; the CricketTeam rows are what matter */ });

    const linked = dbCount(
      `SELECT count(*) FROM cricket_teams ct
       JOIN cricket_matches m ON m.id = ct.match_id
       WHERE m.public_id = '${matchPublicId}' AND ct.tournament_team_id IS NOT NULL`);
    const total = dbCount(
      `SELECT count(*) FROM cricket_teams ct
       JOIN cricket_matches m ON m.id = ct.match_id
       WHERE m.public_id = '${matchPublicId}'`);

    expect(total, "two CricketTeam rows exist for the match").toBe(2);
    expect(linked, "both carry tournament_team_id").toBe(2);

    // And each points at the right side of the fixture.
    const homeLink = dbOne(
      `SELECT tt.name FROM cricket_teams ct
       JOIN cricket_matches m ON m.id = ct.match_id
       JOIN tournament_teams tt ON tt.id = ct.tournament_team_id
       WHERE m.public_id = '${matchPublicId}' AND ct.team_type = 'TEAM_A'`);
    expect(homeLink, "TEAM_A links to the fixture's home side").toBe("India");

    await api.dispose();
  });

  test("a match linked afterwards is given the link too", async ({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract, no viewport dimension");
    const env = config();
    const api = await Api.login(env.a);
    const { tid, teams } = await tournamentWithTwoTeams(api, "Slice1 Link");

    const fx = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/fixtures/generate`, {});
    expect(fx.status, "generate fixtures").toBe(200);
    const fixturePublicId = (fx.body as any[])[0].publicId as string;

    // A match created independently, then linked — the path setTeams never sees.
    const m = await api.createMatch({
      title: `Slice1 Link Match ${RUN}`,
      matchDate: "2026-01-20", matchType: "INTERNAL", totalOvers: 20,
      venue: "Test Ground",
    });
    const matchPublicId = m.publicId as string;
    await api.setTeams(matchPublicId, {
      teamAName: "India", teamBName: "Australia",
      teamAPlayers: [], teamBPlayers: [],
    }).catch(() => {});

    // Before linking, nothing is linked — this is the state that used to persist.
    expect(dbCount(
      `SELECT count(*) FROM cricket_teams ct JOIN cricket_matches m ON m.id = ct.match_id
       WHERE m.public_id = '${matchPublicId}' AND ct.tournament_team_id IS NOT NULL`),
      "unlinked before linkMatchToFixture").toBe(0);

    const link = await api.raw("post",
      `/api/admin/cricket/tournaments/${tid}/fixtures/${fixturePublicId}/link-match`,
      { matchPublicId });
    expect(link.status, "link match to fixture").toBeLessThan(400);

    expect(dbCount(
      `SELECT count(*) FROM cricket_teams ct JOIN cricket_matches m ON m.id = ct.match_id
       WHERE m.public_id = '${matchPublicId}' AND ct.tournament_team_id IS NOT NULL`),
      "both sides linked after linkMatchToFixture").toBe(2);

    await api.dispose();
  });

  test("Academy B cannot read A's standings", async ({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract, no viewport dimension");
    const env = config();
    const a = await Api.login(env.a);
    const b = await Api.login(env.b);
    const { tid } = await tournamentWithTwoTeams(a, "Slice1 Tenant");

    expect((await a.raw("get", `/api/admin/cricket/tournaments/${tid}/standings`)).status).toBe(200);
    expect((await b.raw("get", `/api/admin/cricket/tournaments/${tid}/standings`)).status,
           "B is refused A's standings").toBe(404);

    await a.dispose(); await b.dispose();
  });
});
