import { test, expect } from "@playwright/test";
import { createChampionship, purge, type Championship } from "../fixtures/championship";
import { playFixture, withCatch, type FixtureScript } from "../fixtures/playFixture";

/**
 * BUG-49 — the points table is the GROUP table. A knockout result never moves it.
 *
 * `standingsOf` walked every completed fixture with no stage filter, so once the
 * semis were played the group table counted them: in the closing run's
 * championship the two finalists finished on `P=5` in a three-match group. A
 * side that played three group games reads as having played five, and its NRR is
 * an average over matches that were never in the group.
 *
 * Phase 11 left this undefined, which is why it was filed as a finding rather
 * than a bug. The ruling it was waiting for: **knockout results never affect the
 * points table.** LEAGUE and GROUP stages count; KNOCKOUT and PLAYOFFS do not.
 *
 * The shape of the test is the point. It snapshots the table after the group is
 * complete, plays a semi-final, and asserts the table is BYTE-IDENTICAL
 * afterwards — every column of every row, not just `played`. A test that only
 * checked `P` would pass while NRR quietly drifted, and NRR is the column the
 * bug corrupts most quietly, because nothing about it looks wrong.
 */

const RUN = String(Math.floor(Math.random() * 90000000) + 10000000);
const six = (n: number) => {
  if (n > 36) throw new Error(`${n} runs cannot be made off six deliveries`);
  const out: number[] = [];
  let left = n;
  for (let i = 0; i < 6; i++) {
    const r = Math.min(left, 6);
    out.push(i === 5 ? 0 : r);
    if (i !== 5) left -= r;
  }
  return out;
};
const win = (home: number, away: number): FixtureScript =>
  ({ first: withCatch(six(home)), second: withCatch(six(away)), outcome: "WIN" });

let C: Championship;
let beforeKnockout: any[];
// Published for the BUG-52 describe below, which needs the same bracket.
let semis: any[];
let knockoutStagePublicId: string;

/** The table as a comparable value — every row, every column, in order. */
const snapshot = (rows: any[]) =>
  rows.map((r) => ({
    team: r.teamName ?? r.name, played: r.played, won: r.won, lost: r.lost,
    tied: r.tied, noResult: r.noResult, points: r.points, nrr: r.nrr,
  }));

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  test.setTimeout(600_000);
  // Two groups of two: the smallest shape that has a real group stage AND a
  // knockout drawn from it.
  C = await createChampionship({
    tag: `B49${RUN}`,
    name: `BUG49 ${RUN}`,
    groups: [["India", "Australia"], ["England", "South Africa"]],
  });
});

test.afterAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  if (!C) return;
  // destroy() first: it deletes the scored matches through the API, which purge()
  // deliberately does not do — a scored match has innings stat rows that nothing
  // cascades into (BUG-10 / gotchas.md), so a raw DELETE trips the FK from
  // match_team_players back to players.
  await C.destroy().catch(() => {});
  await purge(C.tournamentPublicId, `B49${RUN}`).catch(() => {});
  await C.api.dispose().catch(() => {});
});

test.describe("BUG-49 — knockout results stay out of the points table", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one championship per run");
  });

  test("the group stage is played and the table reflects exactly it", async () => {
    test.setTimeout(600_000);
    const gen = await C.api.raw("post",
      `/api/admin/cricket/tournaments/${C.tournamentPublicId}/fixtures/generate`,
      { teamsPerGroup: 2 });
    expect(gen.status, "generate the group fixtures").toBe(200);

    const list = await C.api.raw("get",
      `/api/admin/cricket/tournaments/${C.tournamentPublicId}/fixtures`);
    expect(list.status).toBe(200);
    const groupFixtures = (list.body as any[])
      .filter((f) => f.stage?.stageType === "GROUP");
    expect(groupFixtures.length, "two groups of two is one fixture each").toBe(2);

    for (const [i, f] of groupFixtures.entries()) {
      const home = C.sideByName.get(f.homeTeam.name)!;
      const away = C.sideByName.get(f.awayTeam.name)!;
      await playFixture(C.api, C.tournamentPublicId, f, home, away,
        i === 0 ? win(24, 12) : win(10, 20), "2026-03-20");
    }

    const st = await C.api.raw("get",
      `/api/admin/cricket/tournaments/${C.tournamentPublicId}/standings`);
    expect(st.status).toBe(200);
    beforeKnockout = snapshot(st.body as any[]);

    expect(beforeKnockout.length, "all four sides appear").toBe(4);
    for (const row of beforeKnockout) {
      expect(row.played, `${row.team} played exactly its one group game`).toBe(1);
    }
  });

  test("a completed semi-final does not change a single cell of the table", async () => {
    test.setTimeout(600_000);

    const adv = await C.api.raw("post",
      `/api/admin/cricket/tournaments/${C.tournamentPublicId}/advance-knockout`, {});
    expect(adv.status, "advance to the knockout").toBe(200);
    semis = adv.body as any[];
    expect(semis.length, "two qualify from each group, so two semi-finals").toBe(2);
    for (const f of semis) {
      expect(f.stage.stageType, "the semis really are a knockout stage").toBe("KNOCKOUT");
    }

    // Play ONE semi-final to completion.
    const f = semis[0];
    const home = C.sideByName.get(f.homeTeam.name)!;
    const away = C.sideByName.get(f.awayTeam.name)!;
    const played = await playFixture(C.api, C.tournamentPublicId, f, home, away,
      win(30, 6), "2026-03-28");
    expect(played.winner, "the semi-final has a winner").not.toBeNull();

    // The fixture really is COMPLETED — otherwise this asserts nothing, because
    // standingsOf only ever looked at completed fixtures.
    const after = await C.api.raw("get",
      `/api/admin/cricket/tournaments/${C.tournamentPublicId}/fixtures`);
    const semiNow = (after.body as any[]).find((x) => x.publicId === f.publicId);
    expect(semiNow.status, "the semi-final is completed, so it WOULD have counted")
      .toBe("COMPLETED");

    const st = await C.api.raw("get",
      `/api/admin/cricket/tournaments/${C.tournamentPublicId}/standings`);
    expect(st.status).toBe(200);

    expect(snapshot(st.body as any[]),
      "the group table is unchanged by a knockout result — every column, every row")
      .toEqual(beforeKnockout);

    // Said again as the thing a reader would notice, so a failure names it.
    for (const row of snapshot(st.body as any[])) {
      expect(row.played, `${row.team} still shows its group games only`).toBe(1);
    }
  });
});

/**
 * BUG-52 — a manually added fixture takes the stage's NEXT round, not its
 * fixture count.
 *
 * ```java
 * int round = fixtureRepo.findAllByStageIdOrderByRoundNumberAsc(stage.getId()).size() + 1;
 * ```
 *
 * Counting fixtures assumes one fixture per round, which is exactly what a
 * knockout stage is not. Two semi-finals are simultaneous and both are correctly
 * round 1, so the final added to the same stage became **round 3** — the same
 * defect class `FixtureGeneratorTest` found in the generated bracket, surviving
 * in the manual path.
 *
 * The fix derives the round from the rounds that exist (max + 1), and honours an
 * explicit `roundNumber` when the caller sends one — adding the second
 * semi-final by hand must be able to join round 1 rather than invent round 2.
 */

test.describe("BUG-52 — manual fixture round numbering", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one championship per run");
  });

  test("two simultaneous semi-finals are both round 1, in one stage", () => {
    // The bracket BUG-49's describe already built, read back — the two bugs need
    // the same expensive setup, which is why they share a file.
    expect(semis.length, "two semi-finals").toBe(2);
    for (const f of semis) {
      expect(f.roundNumber, `${f.homeTeam.name} v ${f.awayTeam.name} is round 1`).toBe(1);
    }
    knockoutStagePublicId = semis[0].stage.publicId;
    expect(new Set(semis.map((f) => f.stage.publicId)).size,
      "both semis are in the SAME stage — which is what makes counting wrong").toBe(1);
  });

  test("the final added to that stage is round 2, not round 3", async () => {
    const a = C.sideByName.get("India")!;
    const b = C.sideByName.get("England")!;

    const add = await C.api.raw("post",
      `/api/admin/cricket/tournaments/${C.tournamentPublicId}/fixtures/manual`, {
        stagePublicId: knockoutStagePublicId,
        homeTeamPublicId: a.publicId,
        awayTeamPublicId: b.publicId,
        venue: "Final Ground",
        scheduledAt: "2026-04-01T09:30:00+05:30",
      });
    expect(add.status, "add the final by hand").toBeLessThan(400);

    expect((add.body as any).roundNumber,
      "two round-1 semis exist, so the final is round 2 — counting fixtures made it 3")
      .toBe(2);
  });

  test("an explicit round joins that round instead of inventing one", async () => {
    const a = C.sideByName.get("Australia")!;
    const b = C.sideByName.get("South Africa")!;

    const add = await C.api.raw("post",
      `/api/admin/cricket/tournaments/${C.tournamentPublicId}/fixtures/manual`, {
        stagePublicId: knockoutStagePublicId,
        homeTeamPublicId: a.publicId,
        awayTeamPublicId: b.publicId,
        venue: "Third Place Ground",
        scheduledAt: "2026-04-01T14:00:00+05:30",
        roundNumber: 2,
      });
    expect(add.status, "add a third-place play-off alongside the final").toBeLessThan(400);
    expect((add.body as any).roundNumber,
      "an explicit round is honoured — a simultaneous tie joins the round it belongs to")
      .toBe(2);
  });
});
