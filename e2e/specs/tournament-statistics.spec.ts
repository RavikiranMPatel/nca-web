import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbCount } from "../fixtures/db";
import { createScoredTournament, SCORED, type ScoredTournament } from "../fixtures/scoredTournament";

/**
 * Slice 5, Phase 17 — the four leaderboards and Phase 4's dashboard, against a
 * real scored fixture.
 *
 * Every number asserted here is hand-computable from what the fixture bowled:
 * the home opener hit three fours and was never dismissed, the away opener was
 * caught for 2, and nobody else faced a ball. So "12 runs off 3 balls at a strike
 * rate of 400" is a comparison with arithmetic, not with whatever the endpoint
 * happened to return on the day it was written.
 *
 * Desktop only: this is arithmetic over an API and has no viewport dimension.
 * The tabs that render it are covered by tournament-dashboard-ui.spec.ts on both.
 */

let s: ScoredTournament;

// The whole file is desktop-only, so the fixture is built only for desktop.
// Without this guard beforeAll still runs for iPhone 14 and Pixel 7 even though
// every test in them skips — three scored tournaments instead of one, built
// concurrently, and the database assertions below then see each other's rows.
test.beforeAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  s = await createScoredTournament({ label: "Stats" });
});

test.afterAll(async () => {
  if (s) await s.destroy();
});

const base = () => `/api/admin/cricket/tournaments/${s.tournamentPublicId}`;

test.describe("Slice 5 — tournament statistics and dashboard", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "arithmetic over an API");
  });

  // ── PHASE 4 ─────────────────────────────────────────────────────────────

  test("the dashboard returns all twelve cards in one response", async () => {
    const r = await s.api.raw("get", `${base()}/dashboard`);
    expect(r.status).toBe(200);
    const d = r.body as any;

    expect(d.teams, "two sides entered").toBe(2);
    expect(d.matches, "a two-team round robin is one fixture").toBe(1);
    expect(d.completed).toBe(1);
    expect(d.upcoming).toBe(0);
    expect(d.live).toBe(0);

    expect(d.totalRuns, "12 + 2").toBe(SCORED.totalRuns);
    expect(d.totalWickets, "one catch").toBe(SCORED.totalWickets);

    expect(d.highestTeamScore.numericValue).toBe(SCORED.homeRuns);
    expect(d.highestTeamScore.value, "runs/wickets").toBe(`${SCORED.homeRuns}/0`);

    expect(d.highestIndividualScore.name).toBe(s.opener.displayName);
    expect(d.highestIndividualScore.value, "never dismissed, so starred")
      .toBe(`${SCORED.openerRuns}*`);

    expect(d.topRunScorer.name).toBe(s.opener.displayName);
    expect(d.topRunScorer.numericValue).toBe(SCORED.openerRuns);

    expect(d.topWicketTaker.name).toBe(s.wicketTaker.displayName);
    expect(d.topWicketTaker.numericValue).toBe(1);

    expect(d.currentLeader, "a fixture has been completed").not.toBeNull();
    expect(d.currentLeader.value).toBe("2 pts");
  });

  test("the dashboard sends no tenant or audit column", async () => {
    const r = await s.api.raw("get", `${base()}/dashboard`);
    const json = JSON.stringify(r.body);
    for (const forbidden of ["academyId", "branchId", "createdBy", "updatedBy"]) {
      expect(json, `${forbidden} on the wire`).not.toContain(`"${forbidden}"`);
    }
  });

  // ── PHASE 17 ────────────────────────────────────────────────────────────

  test("the batting leaderboard matches the arithmetic", async () => {
    const r = await s.api.raw("get", `${base()}/stats/batting`);
    expect(r.status).toBe(200);
    const page = r.body as any;

    expect(page.page).toBe(0);
    expect(page.size).toBe(20);
    expect(page.totalElements, "only two batters faced a ball").toBe(2);

    const top = page.content[0];
    expect(top.playerName).toBe(s.opener.displayName);
    expect(top.runs).toBe(SCORED.openerRuns);
    expect(top.balls).toBe(SCORED.openerBalls);
    expect(top.fours).toBe(SCORED.openerFours);
    expect(top.sixes).toBe(0);
    expect(top.strikeRate, "12 off 3").toBe(SCORED.openerStrikeRate);
    expect(top.notOuts, "never dismissed").toBe(1);
    expect(top.highScore).toBe(SCORED.openerRuns);
    expect(top.highScoreNotOut).toBe(true);
    expect(top.average, "no dismissal, so runs stand as the average")
      .toBe(SCORED.openerRuns);
    expect(top.teamName, "the team the squad entry names").toContain("Home");
  });

  test("the bowling leaderboard credits the wicket through BowlerCredit", async () => {
    const r = await s.api.raw("get", `${base()}/stats/bowling`);
    expect(r.status).toBe(200);
    const rows = (r.body as any).content;

    const wicketTaker = rows.find((x: any) => x.playerName === s.wicketTaker.displayName);
    expect(wicketTaker, "the bowler who took the catch-wicket is listed").toBeTruthy();
    expect(wicketTaker.wickets, "CAUGHT credits the bowler").toBe(1);
    expect(wicketTaker.runsConceded, "2 off the first ball").toBe(2);
    expect(wicketTaker.overs, "two legal balls").toBe("0.2");
    expect(wicketTaker.bestFigures).toBe("1/2");
    expect(wicketTaker.dotBalls, "the wicket ball was a dot").toBe(1);
    expect(wicketTaker.maidens, "no over was completed").toBe(0);
    expect(wicketTaker.average, "2 runs for 1 wicket").toBe(2);

    // The away bowler conceded 12 and took nothing, so ordering by wickets puts
    // the home bowler first — a real discrimination, not an incidental one.
    expect(rows[0].playerName).toBe(s.wicketTaker.displayName);
  });

  test("the fielding leaderboard exists and credits the catch", async () => {
    const r = await s.api.raw("get", `${base()}/stats/fielding`);
    expect(r.status).toBe(200);
    const page = r.body as any;

    expect(page.totalElements, "exactly one dismissal was fielded").toBe(1);
    const row = page.content[0];
    expect(row.playerName).toBe(s.catcher.displayName);
    expect(row.catches).toBe(1);
    expect(row.runOuts).toBe(0);
    expect(row.stumpings).toBe(0);
    expect(row.dismissals).toBe(1);
  });

  test("the team leaderboard reports both sides, with NRR from the points table", async () => {
    const teams = await s.api.raw("get", `${base()}/stats/teams`);
    expect(teams.status).toBe(200);
    const rows = (teams.body as any).content;
    expect(rows.length).toBe(2);

    const winner = rows[0];
    expect(winner.won, "sorted by wins").toBe(1);
    expect(winner.highestScore).toBe(SCORED.homeRuns);
    expect(winner.totalRuns).toBe(SCORED.homeRuns);
    expect(winner.fours).toBe(SCORED.openerFours);
    expect(winner.sixes).toBe(0);

    // The NRR on this table must be the same number the points table gives.
    const standings = await s.api.raw("get", `${base()}/standings`);
    const fromStandings = (standings.body as any[])
      .find((x) => x.teamPublicId === winner.teamPublicId);
    expect(winner.nrr, "one implementation of NRR, not two")
      .toBe(fromStandings.nrr);
  });

  test("paging is done on the server", async () => {
    const first = await s.api.raw("get", `${base()}/stats/batting?page=0&size=1`);
    expect(first.status).toBe(200);
    expect((first.body as any).content.length, "one row asked for, one returned").toBe(1);
    expect((first.body as any).totalElements, "the total is still reported").toBe(2);
    expect((first.body as any).totalPages).toBe(2);

    const second = await s.api.raw("get", `${base()}/stats/batting?page=1&size=1`);
    expect((second.body as any).content.length).toBe(1);
    expect((second.body as any).content[0].playerName,
      "page 2 is a different player").not.toBe((first.body as any).content[0].playerName);

    // A caller cannot ask for the unbounded response Slice 5 removed.
    const huge = await s.api.raw("get", `${base()}/stats/batting?page=0&size=100000`);
    expect((huge.body as any).size, "capped at 100").toBe(100);
  });

  // ── CROSS-TENANT ────────────────────────────────────────────────────────

  test("Academy B is refused every new statistics endpoint", async () => {
    const b = await Api.login(config().b);
    const paths = ["/dashboard", "/stats/batting", "/stats/bowling",
                   "/stats/fielding", "/stats/teams"];

    for (const p of paths) {
      const r = await b.raw("get", `${base()}${p}`);
      expect(r.status, `B on A's ${p}`).toBe(404);
      expect(JSON.stringify(r.body ?? ""), `${p} leaked a name`)
        .not.toContain(s.opener.displayName);
    }

    // Nothing was written by the attempt. Scoped to THIS tournament: the awards
    // spec runs concurrently and a global count would be reading its rows.
    expect(dbCount(`SELECT count(*) FROM tournament_awards a
                    JOIN tournaments t ON t.id = a.tournament_id
                    WHERE t.public_id = '${s.tournamentPublicId}'`), "no award row").toBe(0);

    // And the correct-tenant actor still gets the data.
    expect((await s.api.raw("get", `${base()}/dashboard`)).status).toBe(200);
    await b.dispose();
  });
});
