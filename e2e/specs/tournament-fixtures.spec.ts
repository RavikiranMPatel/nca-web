import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbOne, dbCount, dbExec } from "../fixtures/db";

/**
 * Slice 4 — fixture generation, previews, and byes.
 *
 * The arithmetic of generation is unit-tested in FixtureGeneratorTest, which is
 * where it belongs: those assertions hold for any team count and need no
 * database. What can only be checked here is that the plan reaches the rows —
 * that a bye becomes a fixture, that the preview matches what saving produces,
 * and that generation still leaves a match preparable with both links BUG-30
 * depends on.
 *
 * Desktop only: API and database contracts. The views are covered separately.
 */

const RUN = `${Date.now() % 1000000}`;
let seq = 0;
const created: string[] = [];

async function build(api: Api, format: string, teamCount: number, label: string) {
  const name = `S4-${RUN}-${label}-${seq++}`;
  const t = await api.raw("post", "/api/admin/cricket/tournaments", {
    name, format, venue: "S4 Ground",
    startDate: "2026-09-01", endDate: "2026-10-01",
    defaultOvers: 20, winPoints: 2, tiePoints: 1, noResultPoints: 1,
  });
  expect(t.status, `create ${format}`).toBe(200);
  const tid = (t.body as any).publicId as string;
  created.push(tid);

  const teams: any[] = [];
  for (let i = 0; i < teamCount; i++) {
    const r = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/teams`, {
      name: `Side ${i} ${name}`, shortName: `S${i}`, colorHex: "#2563eb",
    });
    expect(r.status, `add team ${i}`).toBe(200);
    teams.push(r.body);
  }
  return { tid, teams, name };
}

async function generate(api: Api, tid: string, body: Record<string, unknown> = {}) {
  const r = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/fixtures/generate`, body);
  // Surface the server's message on failure; a bare status tells you nothing.
  expect(r.status, `generate: ${JSON.stringify(r.body)}`).toBe(200);
  return r;
}

async function preview(api: Api, tid: string, body: Record<string, unknown> = {}) {
  const r = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/fixtures/preview`, body);
  expect(r.status, `preview: ${JSON.stringify(r.body)}`).toBe(200);
  return r;
}

test.afterAll(() => {
  const t = `(SELECT id FROM tournaments WHERE name LIKE 'S4-${RUN}-%')`;
  const m = `(SELECT id FROM cricket_matches WHERE title LIKE '%S4-${RUN}%')`;
  dbExec(`UPDATE tournaments SET champion_team_id = NULL, runner_up_team_id = NULL WHERE id IN ${t}`);
  dbExec(`UPDATE cricket_matches SET winner_team_id = NULL WHERE id IN ${m}`);
  dbExec(`UPDATE fixtures SET match_id = NULL WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM cricket_matches WHERE title LIKE '%S4-${RUN}%'`);
  dbExec(`DELETE FROM fixtures WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_stages WHERE tournament_id IN ${t}`);
  if (created.length) {
    dbExec(`DELETE FROM audit_logs WHERE entity_public_id IN (${created.map((i) => `'${i}'`).join(",")})`);
  }
  dbExec(`DELETE FROM tournaments WHERE name LIKE 'S4-${RUN}-%'`);
});

test.describe("Slice 4 — fixture generation", () => {

  test.beforeEach(async ({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract, no viewport dimension");
  });

  test("an odd round robin records a bye as a real fixture", async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "ROUND_ROBIN", 5, "rr5");

    const fixtures = (await generate(api, b.tid)).body as any[];

    const byes = fixtures.filter((f) => f.byeTeam);
    const matches = fixtures.filter((f) => !f.byeTeam);

    // Byes used to be skipped: the team sitting out simply had no row, so a
    // team-by-team view of the season was missing a week.
    expect(matches, "5 teams play 10 matches").toHaveLength(10);
    expect(byes, "and there are 5 byes, one per round").toHaveLength(5);
    expect(new Set(byes.map((f) => f.byeTeam.publicId)).size,
      "each team sits out exactly once").toBe(5);

    for (const bye of byes) {
      expect(bye.homeTeam, "a bye has no opponent").toBeNull();
      expect(bye.awayTeam).toBeNull();
      expect(bye.status, "and is marked as one").toBe("BYE");
    }

    expect(dbCount(`SELECT count(*) FROM fixtures f JOIN tournaments t ON t.id = f.tournament_id
                    WHERE t.public_id = '${b.tid}' AND f.bye_team_id IS NOT NULL`),
      "bye_team_id is written, which nothing ever did before").toBe(5);

    await api.dispose();
  });

  test("a knockout puts every tie in round one and drops nobody", async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "KNOCKOUT", 5, "ko5");

    const fixtures = (await generate(api, b.tid)).body as any[];

    // Measured on the old code: rounds came out [1,2] for four teams, and a
    // five-team field produced two fixtures with one team in none of them.
    expect(new Set(fixtures.map((f) => f.roundNumber)),
      "simultaneous ties are one round, not a sequence").toEqual(new Set([1]));

    const seen = new Set<string>();
    for (const f of fixtures) {
      for (const t of [f.homeTeam, f.awayTeam, f.byeTeam]) if (t) seen.add(t.publicId);
    }
    expect(seen.size, "nobody is left out of the bracket").toBe(5);
    expect(fixtures.filter((f) => f.byeTeam), "the odd seed gets a bye").toHaveLength(1);

    await api.dispose();
  });

  test("a double round robin plays every pairing twice, home and away", async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "DOUBLE_ROUND_ROBIN", 4, "drr4");

    const fixtures = ((await generate(api, b.tid)).body as any[]).filter((f) => !f.byeTeam);
    expect(fixtures, "4 teams, 12 matches").toHaveLength(12);

    const directed = fixtures.map((f) => `${f.homeTeam.publicId}>${f.awayTeam.publicId}`);
    expect(new Set(directed).size, "no tie is played twice the same way round")
      .toBe(12);

    await api.dispose();
  });

  test("groups are a real round robin each, and only within the group", async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "GROUP_KNOCKOUT", 8, "grp8");

    const fixtures = ((await generate(api, b.tid)).body as any[]).filter((f) => !f.byeTeam);
    expect(fixtures, "two groups of four, six matches each").toHaveLength(12);

    // The old code numbered each fixture in a group as its own round, so eight
    // teams produced rounds 1..6 instead of 1..3.
    expect(Math.max(...fixtures.map((f) => f.roundNumber)),
      "three rounds, not six").toBe(3);

    for (const f of fixtures) {
      expect(f.homeTeam.groupName, `${f.publicId} crosses groups`)
        .toBe(f.awayTeam.groupName);
    }
    expect(new Set(fixtures.map((f) => f.stage.stageName)).size,
      "one stage per group").toBe(2);

    await api.dispose();
  });

  test("preview shows what saving would do, and does not do it", async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "ROUND_ROBIN", 5, "prev5");

    const p = (await preview(api, b.tid)).body as any;
    expect(p.matchCount).toBe(10);
    expect(p.byeCount).toBe(5);
    expect(p.roundCount).toBe(5);
    expect(p.teamCount).toBe(5);
    expect(p.existingFixtureCount, "nothing to destroy yet").toBe(0);

    expect(dbCount(`SELECT count(*) FROM fixtures f JOIN tournaments t ON t.id = f.tournament_id
                    WHERE t.public_id = '${b.tid}'`),
      "preview wrote nothing").toBe(0);

    // Saving must then match the preview exactly — the generator is
    // deterministic, and this is what that guarantee is for.
    const saved = (await generate(api, b.tid)).body as any[];
    expect(saved.filter((f) => !f.byeTeam)).toHaveLength(p.matchCount);
    expect(saved.filter((f) => f.byeTeam)).toHaveLength(p.byeCount);

    // And a second preview now warns how much it would destroy.
    const p2 = (await preview(api, b.tid)).body as any;
    expect(p2.existingFixtureCount, "generation is destructive, and says so").toBe(15);

    await api.dispose();
  });

  test("a generated fixture still prepares a match with both links (BUG-30)", async () => {
    const api = await Api.login(config().a);
    const b = await build(api, "ROUND_ROBIN", 4, "links4");

    const fixtures = (await generate(api, b.tid)).body as any[];
    const fixture = fixtures.find((f) => !f.byeTeam)!;

    const m = await api.createMatch({
      title: `S4-${RUN} link match`, matchDate: "2026-09-10", matchType: "INTERNAL",
      totalOvers: 20, venue: "S4 Ground",
      tournamentPublicId: b.tid, fixturePublicId: fixture.publicId,
    });
    await api.setTeams(m.publicId, {
      teamAName: fixture.homeTeam.name, teamBName: fixture.awayTeam.name,
      teamAPlayers: [], teamBPlayers: [],
    }).catch(() => {});

    // Slice 1: both CricketTeam rows carry the tournament team they play as.
    expect(dbCount(`SELECT count(*) FROM cricket_teams ct
                    JOIN cricket_matches cm ON cm.id = ct.match_id
                    WHERE cm.public_id = '${m.publicId}'
                      AND ct.tournament_team_id IS NOT NULL`),
      "both sides linked to their tournament entry").toBe(2);

    // Slice 3 / BUG-30: the fixture points back at the match.
    expect(dbOne(`SELECT coalesce(match_id::text, 'NULL') FROM fixtures
                  WHERE public_id = '${fixture.publicId}'`),
      "fixture.match is set").not.toBe("NULL");

    await api.dispose();
  });

  test("generation and preview are refused across academies", async () => {
    const a = await Api.login(config().a);
    const b2 = await Api.login(config().b);
    const b = await build(a, "ROUND_ROBIN", 4, "tenant4");

    for (const [label, url] of [
      ["generate", `/api/admin/cricket/tournaments/${b.tid}/fixtures/generate`],
      ["preview", `/api/admin/cricket/tournaments/${b.tid}/fixtures/preview`],
    ]) {
      const r = await b2.raw("post", url, {});
      expect(r.status, `B on A's ${label}`).toBe(404);
    }

    expect(dbCount(`SELECT count(*) FROM fixtures f JOIN tournaments t ON t.id = f.tournament_id
                    WHERE t.public_id = '${b.tid}'`),
      "and nothing was generated").toBe(0);

    expect((await a.raw("post", `/api/admin/cricket/tournaments/${b.tid}/fixtures/preview`, {})).status,
      "A itself still works").toBe(200);

    await a.dispose(); await b2.dispose();
  });
});
