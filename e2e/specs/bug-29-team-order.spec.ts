import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbOne, dbExec } from "../fixtures/db";

/**
 * BUG-29 — `getTeams` must return TEAM_A first, whatever order the rows sit in.
 *
 * `CricketTeamRepository.findAllByMatchId` had no `ORDER BY`, so Postgres was
 * free to return the two sides either way round. It stayed stable for long
 * stretches and then did not, which is why this presented as a flaky scoring
 * test: `createScoringMatch` took `teams[0]` as the batting side and was once
 * handed Australia, failing with `opener 1 must be Virat … Received: "David
 * Warner"`.
 *
 * A green suite cannot prove this fixed — the original failure was intermittent,
 * and re-running passed 10/10. So the test **forces** the condition instead of
 * waiting for it: an `UPDATE` writes a new tuple version for the TEAM_A row,
 * moving it to the tail of the heap, after which an unordered scan returns
 * TEAM_B first. That unordered scan is asserted too, because if the heap order
 * did not actually flip this test proves nothing and must fail loudly rather
 * than pass vacuously.
 *
 * Desktop only: an API and database contract with no viewport dimension.
 */

const RUN = `${Date.now() % 1000000}`;
const TITLE = `BUG29 order ${RUN}`;

const xi = (prefix: string) =>
  Array.from({ length: 11 }, (_, i) => ({
    externalName: `${prefix} P${i + 1}`,
    battingOrder: i + 1,
    isCaptain: i === 0,
    isWicketkeeper: i === 5,
    isImpactPlayer: false,
    isForeign: false,
  }));

test.afterAll(() => {
  dbExec(`DELETE FROM cricket_matches WHERE title = '${TITLE}'`);
});

test("BUG-29 getTeams returns TEAM_A first even when the heap order is reversed",
  async ({ }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "API contract, no viewport dimension");

  const api = await Api.login(config().a);

  const match = await api.createMatch({
    title: TITLE,
    matchDate: new Date().toISOString().slice(0, 10),
    matchType: "INTERNAL",
    totalOvers: 20,
    venue: "E2E Test Ground",
  });
  const matchPublicId = match.publicId as string;

  await api.setTeams(matchPublicId, {
    teamAName: "India",
    teamBName: "Australia",
    teamAPlayers: xi("IND"),
    teamBPlayers: xi("AUS"),
  });

  const order = async () =>
    ((await api.getTeams(matchPublicId)) as any[]).map(
      (t) => `${t.teamType}:${t.name}`,
    );

  expect(await order(), "TEAM_A first to begin with")
    .toEqual(["TEAM_A:India", "TEAM_B:Australia"]);

  // Force the condition. Rewriting the TEAM_A row appends a new tuple version at
  // the tail of the heap, so a sequential scan now meets TEAM_B first.
  dbExec(`UPDATE cricket_teams SET name = name
          WHERE team_type = 'TEAM_A'
            AND match_id = (SELECT id FROM cricket_matches
                            WHERE title = '${TITLE}')`);

  const heapOrder = dbOne(
    `SELECT string_agg(team_type, ',') FROM (
       SELECT team_type FROM cricket_teams
       WHERE match_id = (SELECT id FROM cricket_matches WHERE title = '${TITLE}')
     ) q`);

  // If this ever stops being TEAM_B,TEAM_A the premise has gone and the
  // assertions below would pass without testing anything.
  expect(heapOrder, "the unordered heap order really did reverse — " +
    "this is the old query's exact behaviour, and the premise of the test")
    .toBe("TEAM_B,TEAM_A");

  expect(await order(), "the endpoint still returns TEAM_A first")
    .toEqual(["TEAM_A:India", "TEAM_B:Australia"]);

  // And the symptom that actually bit: whoever takes teams[0] as the batting
  // side must still get India's XI, not Australia's.
  const teams = (await api.getTeams(matchPublicId)) as any[];
  const firstXI = (await api.getXI(matchPublicId, teams[0].publicId)) as any[];
  expect(firstXI[0].displayName, "teams[0] is still the India side")
    .toBe("IND P1");

  await api.dispose();
});
