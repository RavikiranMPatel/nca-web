import { test, expect, type Page } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { createScoredTournament, type ScoredTournament } from "../fixtures/scoredTournament";
import { dbExec } from "../fixtures/db";

/**
 * The Points Table renders NRR and No Result — finding 2.
 *
 * `/standings` has carried `nrr` and `noResult` on every row since Phase 12, and
 * `StandingsTab` rendered `# · Team · P · W · L · T · Pts` and neither of them.
 * Two consequences, and the second is the one a user notices:
 *
 * - Phase 12's net run rate is computed, stored, RANKED ON and printed into the
 *   PDF, and is invisible on the screen Phase 11 names.
 * - A side whose match was abandoned reads `P=2 W=1 L=0 T=0` — which does not
 *   add up, because the column that explains it is missing. Observed in the
 *   closing run: "Australia 3 1 1 0 3".
 *
 * The fixture is a really-scored tournament (12 all-run vs 2/1, so NRR is a
 * hand-checkable number with opposite signs on the two rows) plus a second
 * fixture recorded NO_RESULT, so both new columns carry a value that a hardcoded
 * cell could not fake. Every number rendered is then compared against the
 * `/standings` payload the page was given — the assertion is "the table shows
 * what the API said", not "the table shows something".
 *
 * Runs on desktop AND iPhone 14: two more columns in a 7-column table is exactly
 * the change that overflows a 375px viewport, so the existing scrollWidth check
 * runs here too.
 */

let T: ScoredTournament;
/**
 * This run's abandoned match, named so teardown can address exactly it.
 *
 * Off the TOURNAMENT name rather than off `T.tag`: the tag is
 * `Date.now() % 1000000` plus a per-PROCESS counter, so two projects that start
 * in the same millisecond get the same tag, and a title built from the tag alone
 * named both projects' matches. The first teardown then tried to delete the
 * other project's match while its fixture still referenced it, which Postgres
 * refuses — so neither was cleaned up. The tournament name carries the
 * worker-unique label.
 */
const ABANDONED_TITLE = () => `${T.tournamentName} abandoned`;
let seed: Record<string, string>;
let standings: any[];

test.beforeAll(async ({ }, workerInfo) => {
  // The label is worker-unique on purpose. `createScoredTournament` tags its
  // rows with `Date.now() % 1000000` and tears down by MATCHING ON THE NAME, so
  // two projects that start in the same millisecond build identically-named
  // tournaments, players and batches — and the first teardown deletes the other
  // project's rows out from under it. That is the same hazard championship.ts
  // records and solves by keying teardown on the public id. Seen here as a 404
  // adding a player to a squad that had just been created.
  T = await createScoredTournament({ label: `NRRUI${workerInfo.workerIndex}` });
  seed = T.api.storageSeed();

  // ── a second fixture, abandoned ──────────────────────────────────────────
  //
  // So `noResult` is 1 rather than 0 on both rows, and a column that always
  // printed a zero could not pass. Recorded with no scoring at all, which is
  // what a no-result IS — and NO_RESULT innings are excluded from NRR by the
  // ICC rule Phase 12 implements, so this must NOT move the NRR figures.
  const stage = (await T.api.raw("get",
    `/api/admin/cricket/tournaments/${T.tournamentPublicId}/stages`)).body as any[];
  const manual = await T.api.raw("post",
    `/api/admin/cricket/tournaments/${T.tournamentPublicId}/fixtures/manual`, {
      stagePublicId: stage[0].publicId,
      homeTeamPublicId: T.homeTeamPublicId,
      awayTeamPublicId: T.awayTeamPublicId,
      venue: "NRRUI Ground",
      scheduledAt: "2026-03-20T09:30:00+05:30",
    });
  expect(manual.status, `add the abandoned fixture: ${JSON.stringify(manual.body)}`).toBe(200);
  const abandonedFixture = (manual.body as any).publicId as string;

  const m = await T.api.createMatch({
    title: ABANDONED_TITLE(),
    matchDate: "2026-03-20", matchType: "INTERNAL", totalOvers: 20,
    venue: "NRRUI Ground",
    tournamentPublicId: T.tournamentPublicId,
    fixturePublicId: abandonedFixture,
  });
  const res = await T.api.raw("post",
    `/api/admin/cricket/matches/${m.publicId}/result`, {
      resultType: "NO_RESULT",
      resultDescription: "Abandoned without a ball bowled",
    });
  expect(res.status, `record the no-result: ${JSON.stringify(res.body)}`).toBe(200);

  standings = (await T.api.raw("get",
    `/api/admin/cricket/tournaments/${T.tournamentPublicId}/standings`)).body as any[];

  // The payload really does carry both, and they are worth rendering: the two
  // NRRs are non-zero and of opposite sign, and the no-result counted.
  expect(standings.length, "two sides").toBe(2);
  for (const row of standings) {
    expect(row, "the row carries nrr").toHaveProperty("nrr");
    expect(row, "and noResult").toHaveProperty("noResult");
    expect(row.noResult, "the abandoned match counted on both rows").toBe(1);
    expect(row.played, "two played: one scored, one abandoned").toBe(2);
  }
  expect(standings.map((r: any) => Math.sign(r.nrr)).sort(),
    "one side is ahead on run rate and the other behind").toEqual([-1, 1]);
});

test.afterAll(async () => {
  // The abandoned match and its fixture, which this spec added on top of the
  // shared fixture's own teardown.
  //
  // Keyed on this run's exact title, not `LIKE 'NRRUI abandoned %'`: the two
  // projects build one each at the same time, and a wildcard deletes the other
  // project's match while its fixture still references it — which Postgres
  // refuses, so the wildcard version tore down nothing and left both.
  if (!T) return;
  const tq = `(SELECT id FROM tournaments WHERE public_id = '${T.tournamentPublicId}')`;
  dbExec(`UPDATE fixtures SET match_id = NULL WHERE tournament_id IN ${tq}`);
  dbExec(`DELETE FROM cricket_teams WHERE match_id IN
            (SELECT id FROM cricket_matches WHERE title = '${ABANDONED_TITLE()}')`);
  dbExec(`DELETE FROM cricket_matches WHERE title = '${ABANDONED_TITLE()}'`);
  await T.destroy();
});

/** `%+.3f`, which is what the backend and the PDF both use. */
const nrr3 = (v: number) => (v < 0 ? "-" : "+") + Math.abs(v).toFixed(3);

async function openPointsTable(page: Page) {
  await page.addInitScript((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v as string);
  }, seed);
  await page.goto(`/admin/cricket/tournaments/${T.tournamentPublicId}`);
  await expect(page.getByRole("heading", { name: T.tournamentName })).toBeVisible();
  await page.getByTestId("tournament-tab-points-table").click();
  const panel = page.getByTestId("tournament-panel-points-table");
  await expect(panel).toBeVisible();
  return panel;
}

test.describe("Points Table — NRR and No Result", () => {

  test("both columns have headers", async ({ page }) => {
    const panel = await openPointsTable(page);
    await expect(panel.getByRole("columnheader", { name: "NRR", exact: true }),
      "Phase 12's net run rate reaches the screen Phase 11 names").toBeVisible();
    await expect(panel.getByRole("columnheader", { name: "NR", exact: true }),
      "and the column that makes P = W + L + T + NR add up").toBeVisible();
  });

  test("every row's NRR and NR match /standings", async ({ page }) => {
    const panel = await openPointsTable(page);

    for (const row of standings) {
      const tr = panel.locator(`[data-testid="standings-row-${row.teamPublicId}"]`);
      await expect(tr, `${row.teamName} has a row`).toHaveCount(1);

      // Signed, three decimal places. A run rate of -0.05 is not "0.05", and
      // "0.1" is not a run rate anyone quotes.
      await expect(tr.getByTestId("standings-nrr"), `${row.teamName}: NRR`)
        .toHaveText(nrr3(row.nrr));
      await expect(tr.getByTestId("standings-no-result"), `${row.teamName}: NR`)
        .toHaveText(String(row.noResult));

      // The columns that were already there must still agree, or the two new
      // ones were inserted into the wrong cells.
      await expect(tr.getByTestId("standings-played")).toHaveText(String(row.played));
      await expect(tr.getByTestId("standings-points")).toHaveText(String(row.points));
    }
  });

  test("the row adds up: P = W + L + T + NR", async ({ page }) => {
    const panel = await openPointsTable(page);
    for (const row of standings) {
      const tr = panel.locator(`[data-testid="standings-row-${row.teamPublicId}"]`);
      const n = async (id: string) =>
        Number((await tr.getByTestId(id).textContent())!.trim());
      const [p, w, l, t, nr] = await Promise.all([
        n("standings-played"), n("standings-won"), n("standings-lost"),
        n("standings-tied"), n("standings-no-result"),
      ]);
      expect(w + l + t + nr, `${row.teamName}: the columns on screen account for all ${p} played`)
        .toBe(p);
    }
  });

  test("the table does not overflow a 375px viewport", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "the viewport assertion is the phone's");
    await openPointsTable(page);

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, "nine columns still fit, or scroll inside their own container")
      .toBeLessThanOrEqual(0);
  });
});
