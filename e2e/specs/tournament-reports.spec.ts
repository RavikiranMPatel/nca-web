import { test, expect, type Page } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { createScoredTournament, SCORED, type ScoredTournament }
  from "../fixtures/scoredTournament";
import { pdfText, flat, pdftotextAvailable } from "../fixtures/pdf";

/**
 * Slice 6 — Phases 20–23: the ten tournament reports, as PDFs.
 *
 * **Every PDF is asserted by its TEXT.** `%PDF` and a byte count prove only that
 * the endpoint returned a file; they cannot tell a correct report from one with
 * every table empty, the wrong champion, or a filter that was ignored — which
 * are the ways a report actually goes wrong. So each document is parsed with
 * `pdftotext -layout` and the expected teams, totals and champion are asserted
 * in the extracted text.
 *
 * The figures are the ones `scoredTournament.ts` makes hand-computable:
 *
 * ```
 *   Innings 1  HOME  4, 4, 4          -> 12/0, all to the opener
 *   Innings 2  AWAY  2, then 0 CAUGHT ->  2/1
 *   Result     HOME won by 10 runs
 * ```
 *
 * Built with `markFinal`, so Slice 3's automation decided the champion from the
 * final's result — which is what Phase 23 asks a report to show, and what the
 * banner on every page prints.
 */

let T: ScoredTournament;
let seed: Record<string, string>;

test.beforeAll(async () => {
  T = await createScoredTournament({ label: "Report", markFinal: true });
  seed = T.api.storageSeed();

  // One award, so the Awards report has something to print. A report that only
  // ever renders its empty state is not covered by a test that only ever sees
  // the empty state.
  const award = await T.api.raw("post",
    `/api/admin/cricket/tournaments/${T.tournamentPublicId}/awards`, {
      awardType: "MAN_OF_THE_MATCH",
      playerPublicId: T.opener.publicId,
      teamPublicId: T.homeTeamPublicId,
      matchPublicId: T.matchPublicId,
      reason: "Unbeaten 12 off 3",
    });
  expect(award.status, "give one award").toBeLessThan(400);

  // And a Player of the Match on the MATCH itself, which is a different field
  // from a tournament award: the results table prints the match's own
  // playerOfMatch, and without one it would only ever render an em dash — a
  // column that is never populated is a column no test is really covering.
  // Re-recording a result is a legitimate admin correction, and the tournament
  // is already COMPLETED, so TournamentResultService declines to reapply the
  // final rather than re-deciding the champion.
  const margin = SCORED.homeRuns - SCORED.awayRuns;
  const rerecord = await T.api.raw("post",
    `/api/admin/cricket/matches/${T.matchPublicId}/result`, {
      resultType: "WIN",
      winnerTeamPublicId: undefined,
      resultMargin: margin,
      resultDescription: `${T.homeTeamName} won by ${margin} runs`,
      playerOfMatchPublicId: T.opener.publicId,
      playerOfMatchNote: "Unbeaten 12 off 3",
    });
  expect(rerecord.status, "set the match's Player of the Match").toBe(200);
});

test.afterAll(async () => {
  await T?.destroy();
});

const REPORTS = [
  "summary", "fixtures", "points-table", "results", "team-performance",
  "batting", "bowling", "fielding", "awards", "complete",
] as const;

type Report = (typeof REPORTS)[number];

/**
 * The academy the reports are generated for.
 *
 * Seeded on both test academies via `PUT /api/admin/settings/ACADEMY_NAME` and
 * recorded in SESSION-HANDOFF.md's seeded-data table, because nothing in the
 * suite creates it and a report with no academy name is what the suite silently
 * asserted for its whole life.
 */
const ACADEMY_NAME = "Test Academy A";

const url = (tid: string, type: string, query = "") =>
  `/api/admin/cricket/tournaments/${tid}/reports/${type}${query}`;

/** Fetches one report and returns its status, bytes and extracted text. */
async function fetchReport(api: Api, tid: string, type: string, query = "") {
  const res = await api.ctx.get(url(tid, type, query));
  const bytes = await res.body();
  return {
    status: res.status(),
    bytes,
    contentType: res.headers()["content-type"] ?? "",
    disposition: res.headers()["content-disposition"] ?? "",
    text: res.status() === 200 ? pdfText(bytes) : "",
  };
}

test.describe("Slice 6 — tournament reports", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop",
      "API and document contract; the UI has its own tests below");
    test.skip(!pdftotextAvailable(),
      "pdftotext (poppler) is not installed, so the PDFs cannot be asserted by text");
  });

  test("every report returns a real PDF, and says which tournament it is", async () => {
    for (const type of REPORTS) {
      const r = await fetchReport(T.api, T.tournamentPublicId, type);

      expect(r.status, `${type}: status`).toBe(200);
      expect(r.contentType, `${type}: content type`).toContain("application/pdf");
      expect(Buffer.from(r.bytes).subarray(0, 4).toString(), `${type}: %PDF magic`)
        .toBe("%PDF");
      expect(r.disposition, `${type}: downloads under a readable name`)
        .toContain(`tournament-${type}-${T.tournamentPublicId}.pdf`);

      // The text, which is the assertion that matters.
      expect(flat(r.text), `${type}: names its tournament`).toContain(T.tournamentName);

      // And the academy, which every page carries twice — the header title and
      // the confidentiality footer.
      //
      // This went unasserted because it was EMPTY: neither test academy had an
      // ACADEMY_NAME setting, so getAcademyName() returned "" and every report
      // rendered a blank header and a footer that began "  •  ". The header read
      // "— Results", which looks like a dash belonging to the title rather than
      // a missing name, which is why nobody saw it. The setting is now set on
      // both academies through the settings API, the way platform onboarding
      // would have set it.
      expect(flat(r.text), `${type}: names the academy in its header and footer`)
        .toContain(ACADEMY_NAME);
    }
  });

  test("the champion and runner-up are on every report (Phase 23)", async () => {
    for (const type of REPORTS) {
      const { text } = await fetchReport(T.api, T.tournamentPublicId, type);
      const t = flat(text);
      expect(t, `${type}: the champion is prominent`)
        .toContain(`CHAMPION: ${T.championTeamName}`);
      expect(t, `${type}: and the runner-up`)
        .toContain(`Runner-up: ${T.runnerUpTeamName}`);
      // Not merely "a champion line exists": these are Slice 3's DERIVED values,
      // so a report that recomputed them from the final could disagree.
      expect(t, `${type}: not the undecided state`).not.toContain("Champion not decided yet");
    }
  });

  test("the summary carries the headline figures", async () => {
    const { text } = await fetchReport(T.api, T.tournamentPublicId, "summary");
    const t = flat(text);
    expect(t).toContain("Tournament Summary");
    expect(t, "two teams").toContain("Teams 2");
    expect(t, "one fixture, completed").toContain("1 scheduled · 1 completed");
    expect(t, `${SCORED.totalRuns} runs`).toContain(`Runs scored ${SCORED.totalRuns}`);
    expect(t, `${SCORED.totalWickets} wicket`).toContain(`Wickets taken ${SCORED.totalWickets}`);
    expect(t, "the top scorer is named").toContain(T.opener.displayName);
  });

  test("the points table prints both sides, their points and their NRR", async () => {
    const { text } = await fetchReport(T.api, T.tournamentPublicId, "points-table");
    const t = flat(text);
    expect(t).toContain("POINTS TABLE");
    expect(t).toContain(T.homeTeamName);
    expect(t).toContain(T.awayTeamName);

    // Row-wise, so "2" cannot be satisfied by some other column on some other
    // row: the winner played 1, won 1, lost 0 and has 2 points.
    const winner = rowFor(text, T.homeTeamName, "POINTS TABLE");
    expect(winner, "winner's row").toMatch(/\b1\s+1\s+0\s+0\s+0\s+2\b/);
    const loser = rowFor(text, T.awayTeamName, "POINTS TABLE");
    expect(loser, "loser's row").toMatch(/\b1\s+0\s+1\s+0\s+0\s+0\b/);

    // NRR is signed to three places, and the two sides must be opposites here.
    expect(winner, "winner's NRR is positive").toMatch(/\+\d+\.\d{3}/);
    expect(loser, "loser's NRR is negative").toMatch(/-\d+\.\d{3}/);
  });

  test("results print the recorded result, fixtures print the whole card", async () => {
    const results = flat((await fetchReport(T.api, T.tournamentPublicId, "results")).text);
    const margin = SCORED.homeRuns - SCORED.awayRuns;
    expect(results, "the result as recorded").toContain(
      `${T.homeTeamName} won by ${margin} runs`);
    expect(results, "and the match's own Player of the Match, in its column")
      .toContain(T.opener.displayName);

    const fixtures = flat((await fetchReport(T.api, T.tournamentPublicId, "fixtures")).text);
    expect(fixtures).toContain(`${T.homeTeamName} v ${T.awayTeamName}`);
    expect(fixtures, "the final is marked as such").toContain("(FINAL)");
    expect(fixtures, "and its status").toContain("Completed");
  });

  test("the four statistics boards print the players who earned them", async () => {
    const batting = flat((await fetchReport(T.api, T.tournamentPublicId, "batting")).text);
    expect(batting).toContain("BATTING");
    expect(batting, "the opener").toContain(T.opener.displayName);
    expect(batting, "12 not out off 3, at a strike rate of 400")
      .toContain(`${SCORED.openerRuns}* ${SCORED.openerRuns.toFixed(2)} ${SCORED.openerStrikeRate.toFixed(2)}`);

    const bowling = flat((await fetchReport(T.api, T.tournamentPublicId, "bowling")).text);
    expect(bowling).toContain("BOWLING");
    expect(bowling, "the wicket taker").toContain(T.wicketTaker.displayName);

    const fielding = flat((await fetchReport(T.api, T.tournamentPublicId, "fielding")).text);
    expect(fielding).toContain("FIELDING");
    expect(fielding, "the catcher").toContain(T.catcher.displayName);

    const teamPerf = flat((await fetchReport(T.api, T.tournamentPublicId, "team-performance")).text);
    expect(teamPerf).toContain("TEAM PERFORMANCE");
    expect(teamPerf).toContain(T.homeTeamName);
    const teamPerfRaw = (await fetchReport(T.api, T.tournamentPublicId, "team-performance")).text;
    expect(rowFor(teamPerfRaw, T.homeTeamName, "TEAM PERFORMANCE"), "the winner scored 12")
      .toMatch(new RegExp(`\\b${SCORED.homeRuns}\\b`));
  });

  test("the awards report names the award, the player and the reason", async () => {
    const t = flat((await fetchReport(T.api, T.tournamentPublicId, "awards")).text);
    expect(t).toContain("AWARDS");
    expect(t).toContain(T.opener.displayName);
    expect(t).toContain("Unbeaten 12 off 3");
    expect(t, "not the empty state").not.toContain("No awards have been given yet");
  });

  test("the complete report contains every section", async () => {
    const t = flat((await fetchReport(T.api, T.tournamentPublicId, "complete")).text);
    for (const heading of [
      "TOURNAMENT INFORMATION", "HEADLINES", "POINTS TABLE", "FIXTURES",
      "RESULTS", "TEAM PERFORMANCE", "BATTING", "BOWLING", "FIELDING", "AWARDS",
    ]) {
      expect(t, `complete report contains ${heading}`).toContain(heading);
    }
    // And its standings agree with the API, which is why Slice 6 comes after
    // Slice 1: a PDF built over the old NRR would print Super-Over-contaminated
    // figures onto a signed document.
    const standings = (await T.api.raw("get",
      `/api/admin/cricket/tournaments/${T.tournamentPublicId}/standings`)).body as any[];
    const completeRaw = (await fetchReport(T.api, T.tournamentPublicId, "complete")).text;
    for (const row of standings) {
      const printed = rowFor(completeRaw, row.teamName, "POINTS TABLE");
      expect(printed, `${row.teamName}: points match the API`)
        .toContain(String(row.points));
      const nrr = (row.nrr >= 0 ? "+" : "") + Number(row.nrr).toFixed(3);
      expect(printed, `${row.teamName}: NRR matches the API`).toContain(nrr);
    }
  });

  // ── Phase 22 — filters ────────────────────────────────────────────────────

  test("a filtered export respects the filter, and says that it did", async () => {
    const completed = await fetchReport(
      T.api, T.tournamentPublicId, "fixtures", "?status=COMPLETED");
    const scheduled = await fetchReport(
      T.api, T.tournamentPublicId, "fixtures", "?status=SCHEDULED");

    expect(completed.status).toBe(200);
    expect(scheduled.status).toBe(200);

    // Two filter sets, two different documents. Diffed on the parsed TEXT rather
    // than on the bytes: two PDFs of identical content still differ byte-wise,
    // so a byte comparison would pass whether or not the filter did anything.
    expect(flat(completed.text), "the filters produce different documents")
      .not.toBe(flat(scheduled.text));

    const done = flat(completed.text);
    expect(done, "the filter is printed, so a partial export cannot read as full")
      .toContain("Filtered — Status: COMPLETED");
    expect(done, "the one completed fixture is in it")
      .toContain(`${T.homeTeamName} v ${T.awayTeamName}`);

    const pending = flat(scheduled.text);
    expect(pending).toContain("Filtered — Status: SCHEDULED");
    expect(pending, "and nothing matches the other filter")
      .toContain("No fixtures match this filter");
    expect(pending, "so the fixture is genuinely absent, not merely reordered")
      .not.toContain(`${T.homeTeamName} v ${T.awayTeamName}`);

    // An unfiltered export says so too, rather than saying nothing.
    const all = await fetchReport(T.api, T.tournamentPublicId, "fixtures");
    expect(flat(all.text)).toContain("All fixtures — no filter applied");
  });

  test("a team filter and a ground filter each narrow the set", async () => {
    const home = await fetchReport(T.api, T.tournamentPublicId, "results",
      `?teamPublicId=${T.homeTeamPublicId}`);
    expect(flat(home.text), "the team's own match is in it")
      .toContain(`${T.homeTeamName} v ${T.awayTeamName}`);
    expect(flat(home.text), "and the filter is named, resolved to a team NAME")
      .toContain(`Filtered — Team: ${T.homeTeamName}`);

    // A filter that matches nothing must empty the report rather than be ignored
    // — silently ignoring an unmatched filter is the failure mode that makes a
    // filtered export untrustworthy.
    const nobody = await fetchReport(T.api, T.tournamentPublicId, "results",
      "?teamPublicId=no-such-team-id");
    expect(nobody.status, "an unmatched filter is not an error").toBe(200);
    expect(flat(nobody.text)).toContain("No completed matches match this filter");
    expect(flat(nobody.text)).not.toContain(`${T.homeTeamName} v ${T.awayTeamName}`);
  });

  test("filters are ignored by the reports that have no fixtures in them", async () => {
    // A batting board has no ground and no round, so a filter must neither
    // change it nor be advertised on it as though it had.
    const plain = await fetchReport(T.api, T.tournamentPublicId, "batting");
    const filtered = await fetchReport(T.api, T.tournamentPublicId, "batting",
      "?status=SCHEDULED");
    expect(flat(filtered.text), "the batting board is unaffected by a fixture filter")
      .toBe(flat(plain.text));
  });

  // ── scoping ───────────────────────────────────────────────────────────────

  test("Academy B is refused every report, with 404 and no PDF", async () => {
    const b = await Api.login(config().b);
    for (const type of REPORTS) {
      const res = await b.ctx.get(url(T.tournamentPublicId, type));
      expect(res.status(), `${type}: B's ADMIN must not reach A's report`).toBe(404);

      const body = await res.text();
      expect(body, `${type}: and gets no PDF bytes`).not.toContain("%PDF");
      // 404, never 403: a 403 would confirm the tournament exists.
      expect(body, `${type}: told it does not exist`).toContain("not found");
    }
    await b.dispose();
  });

  test("an unknown report type is a 400 that names the ten that exist", async () => {
    const res = await T.api.raw("get", url(T.tournamentPublicId, "not-a-report"));
    expect(res.status, "the tournament is real; the type is the mistake").toBe(400);
    expect(JSON.stringify(res.body)).toContain("summary");
    expect(JSON.stringify(res.body)).toContain("complete");
  });
});

/**
 * The line of extracted text a team's row sits on, inside a named section.
 *
 * `-layout` keeps a table row on one line, so asserting within the line is what
 * makes "2 points" an assertion about THAT team rather than about the document
 * containing a 2 somewhere.
 *
 * The section is required rather than optional because every report prints
 * `CHAMPION: <team>` in its banner, and that line contains the winner's name
 * too. Searching the whole document found the banner first and asserted the
 * points table against it — a test that fails for the right reason by accident.
 */
function rowFor(text: string, teamName: string, section: string): string {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.includes(section));
  expect(start, `the ${section} section exists`).toBeGreaterThanOrEqual(0);
  const line = lines.slice(start + 1).find((l) => l.includes(teamName));
  expect(line, `a row for ${teamName} inside ${section}`).toBeTruthy();
  return line!;
}

// ── The tab itself, at both viewports ───────────────────────────────────────

test.describe("Reports tab", () => {
  async function openReports(page: Page) {
    await page.addInitScript((s) => {
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v as string);
    }, seed);
    await page.goto(`/admin/cricket/tournaments/${T.tournamentPublicId}`);
    await expect(page.getByRole("heading", { name: T.tournamentName })).toBeVisible();
    await page.getByTestId("tournament-tab-reports").click();
    await expect(page.getByTestId("tournament-panel-reports")).toBeVisible();
  }

  test("all ten reports are offered, each with its own download", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome",
      "desktop and iPhone 14 are the two viewports this slice commits to");
    await openReports(page);

    for (const type of REPORTS) {
      await expect(page.getByTestId(`report-row-${type}`),
        `${type} is listed`).toBeVisible();
      await expect(page.getByTestId(`report-download-${type}`),
        `${type} has a download button`).toBeVisible();
    }
  });

  test("the panel does not scroll the page sideways", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome", "desktop and iPhone 14");
    await openReports(page);
    // engineering-standards.md: wide content scrolls inside its own container,
    // never the body. The filter row wraps rather than overflowing.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, "no horizontal body scroll").toBeLessThanOrEqual(1);
  });

  test("clicking a report downloads a PDF", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome", "desktop and iPhone 14");
    await openReports(page);

    const download = page.waitForEvent("download");
    await page.getByTestId("report-download-summary").click();
    const file = await download;

    expect(file.suggestedFilename(),
      "downloads under the report's own name").toBe(
        `tournament-summary-${T.tournamentPublicId}.pdf`);
  });

  test("choosing a filter marks the reports it applies to", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome", "desktop and iPhone 14");
    await openReports(page);

    await page.getByTestId("report-filter-status").selectOption("COMPLETED");

    // It applies to fixtures, results and the complete report...
    for (const type of ["fixtures", "results", "complete"]) {
      await expect(page.getByTestId(`report-row-${type}-filtered`),
        `${type} says a filter is applied`).toBeVisible();
    }
    // ...and to nothing else, because nothing else has a fixture in it.
    for (const type of ["summary", "batting", "points-table"]) {
      await expect(page.getByTestId(`report-row-${type}-filtered`),
        `${type} does not claim to be filtered`).toHaveCount(0);
    }

    await page.getByTestId("report-filters-clear").click();
    await expect(page.getByTestId("report-row-fixtures-filtered")).toHaveCount(0);
  });
});
