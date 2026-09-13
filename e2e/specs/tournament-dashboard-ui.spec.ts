import { test, expect, type Page } from "@playwright/test";
import { createScoredTournament, SCORED, type ScoredTournament } from "../fixtures/scoredTournament";

/**
 * Slice 5 in the browser — Phase 4's dashboard cards, Phase 17's four
 * leaderboards, and both award flows.
 *
 * The API specs beside this one (tournament-statistics, tournament-awards) prove
 * the numbers; this proves a user can see and reach them. So the assertions here
 * are about what renders and what a click does, and the figures are only checked
 * where the point is that the RIGHT number reached the screen — the top run
 * scorer's name on a card, the strike rate in a table cell.
 *
 * Desktop AND iPhone 14, per the mandatory mobile rule. That is not ceremony
 * here: the dashboard's counts are a 3-column grid at 375px and 5 across from
 * `sm`, the leaderboard tables are far wider than a phone and scroll inside
 * their own container, and the award picker is a bottom sheet. All three are
 * things that work on a desktop and break on a phone.
 */

let s: ScoredTournament;

test.beforeAll(async ({}, testInfo) => {
  // Pixel 7 adds nothing here that iPhone 14 does not already cover, and each
  // fixture is a full scored match — three of them is a minute of setup for one
  // more Chromium viewport.
  if (testInfo.project.name === "mobile-chrome") return;
  // A plain label: the fixture's tag is random per call (BUG-54), so two projects
  // running this file at once no longer need the label to tell them apart.
  s = await createScoredTournament({ label: "UI" });
});

test.afterAll(async () => {
  if (s) await s.destroy();
});

async function openTab(page: Page, key: string) {
  await page.addInitScript((seed) => {
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v as string);
  }, s.api.storageSeed());
  await page.goto(`/admin/cricket/tournaments/${s.tournamentPublicId}`);
  await expect(page.getByRole("heading", { name: s.tournamentName })).toBeVisible();
  await page.getByTestId(`tournament-tab-${key}`).click();
  await expect(page.getByTestId(`tournament-panel-${key}`)).toBeVisible();
}

test.describe("Slice 5 in the browser", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome",
      "desktop and iPhone 14 cover the two layouts this slice adds");
  });

  // ── PHASE 4 ─────────────────────────────────────────────────────────────

  test("the Overview tab shows all twelve dashboard cards", async ({ page }) => {
    await openTab(page, "overview");
    const dash = page.getByTestId("tournament-dashboard");
    await expect(dash).toBeVisible();

    for (const label of ["teams", "matches", "completed", "upcoming", "live",
                         "runs", "wickets"]) {
      await expect(page.getByTestId(`dashboard-count-${label}`),
        `${label} card`).toBeVisible();
    }
    await expect(page.getByTestId("dashboard-count-teams")).toContainText("2");
    await expect(page.getByTestId("dashboard-count-completed")).toContainText("1");
    await expect(page.getByTestId("dashboard-count-runs"))
      .toContainText(String(SCORED.totalRuns));

    // The five headline cards, each naming the right person or side.
    await expect(page.getByTestId("dashboard-current-leader")).toBeVisible();
    await expect(page.getByTestId("dashboard-highest-team-score"))
      .toContainText(`${SCORED.homeRuns}/0`);
    await expect(page.getByTestId("dashboard-highest-individual-score"))
      .toContainText(`${SCORED.openerRuns}*`);
    await expect(page.getByTestId("dashboard-top-run-scorer"))
      .toContainText(s.opener.displayName);
    await expect(page.getByTestId("dashboard-top-wicket-taker"))
      .toContainText(s.wicketTaker.displayName);
  });

  test("the page body never scrolls sideways, on either viewport", async ({ page }) => {
    // The cards grid and the leaderboard tables are the two things in this slice
    // that could push the body wider than the viewport. Checked rather than
    // assumed, because a horizontal scrollbar on a phone is the failure mode the
    // mandatory mobile rule exists for.
    for (const key of ["overview", "statistics"]) {
      await openTab(page, key);
      if (key === "statistics") {
        await expect(page.getByTestId("statistics-table-batting")).toBeVisible();
      }
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${key} tab overflows horizontally by ${overflow}px`)
        .toBeLessThanOrEqual(1);
    }
  });

  // ── PHASE 17 ────────────────────────────────────────────────────────────

  test("the Statistics tab renders all four leaderboards", async ({ page }) => {
    await openTab(page, "statistics");

    // Batting is the default board.
    const batting = page.getByTestId("statistics-table-batting");
    await expect(batting).toBeVisible();
    await expect(batting).toContainText(s.opener.displayName);
    await expect(batting, "12 off 3 at a strike rate of 400")
      .toContainText(String(SCORED.openerStrikeRate));
    await expect(batting, "not out, so starred").toContainText(`${SCORED.openerRuns}*`);

    await page.getByTestId("statistics-board-bowling").click();
    const bowling = page.getByTestId("statistics-table-bowling");
    await expect(bowling).toBeVisible();
    await expect(bowling).toContainText(s.wicketTaker.displayName);
    await expect(bowling, "best figures").toContainText("1/2");

    await page.getByTestId("statistics-board-fielding").click();
    const fielding = page.getByTestId("statistics-table-fielding");
    await expect(fielding).toBeVisible();
    await expect(fielding).toContainText(s.catcher.displayName);

    await page.getByTestId("statistics-board-teams").click();
    const teams = page.getByTestId("statistics-table-teams");
    await expect(teams).toBeVisible();
    await expect(teams).toContainText("Home");
    await expect(teams).toContainText("Away");
  });

  test("a leaderboard with one page shows no pager", async ({ page }) => {
    // Two batters, a page size of twenty. The pager appearing here would mean it
    // renders whenever the board does, which is the bug the assertion catches.
    await openTab(page, "statistics");
    await expect(page.getByTestId("statistics-table-batting")).toBeVisible();
    await expect(page.getByTestId("statistics-pager")).toHaveCount(0);
  });

  // ── PHASES 15 AND 16 ────────────────────────────────────────────────────

  test("the Awards tab lists every slot and the completed fixture", async ({ page }) => {
    await openTab(page, "awards");
    const panel = page.getByTestId("tournament-panel-awards");

    // All eight tournament-level awards, from the server's list.
    for (const type of ["MAN_OF_THE_SERIES", "BEST_BATTER", "BEST_BOWLER",
                        "BEST_FIELDER", "EMERGING_PLAYER", "PLAYER_OF_TOURNAMENT",
                        "BEST_CATCH", "BEST_PERFORMANCE"]) {
      await expect(page.getByTestId(`award-slot-${type}`), type).toBeVisible();
    }
    await expect(panel).toContainText("Not awarded");

    // And the one completed fixture, offered a Man of the Match.
    await expect(page.getByTestId(`motm-fixture-${s.fixturePublicId}`)).toBeVisible();
    await expect(page.getByTestId(`motm-give-${s.fixturePublicId}`)).toBeVisible();
  });

  test("the Man of the Match flow: candidates, award, change, remove", async ({ page }) => {
    await openTab(page, "awards");

    await page.getByTestId(`motm-give-${s.fixturePublicId}`).click();
    const modal = page.getByTestId("give-award-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Man of the Match");

    // The candidates are the match's own players, WITH their figures — Phase 15's
    // actual requirement, not merely a list of names.
    const opener = page.getByTestId(`award-candidate-${s.opener.publicId}`);
    await expect(opener).toBeVisible();
    await expect(opener).toContainText(s.opener.displayName);
    await expect(opener, "the figures that justify the choice")
      .toContainText(`${SCORED.openerRuns}*`);

    // Search narrows the list without losing the selection mechanism.
    await page.getByTestId("award-candidate-search").fill(s.opener.displayName);
    await expect(page.getByTestId(`award-candidate-${s.wicketTaker.publicId}`))
      .toHaveCount(0);
    await page.getByTestId("award-candidate-search").fill("");

    await opener.click();
    await page.getByTestId("award-reason").fill("12* off 3, three fours");
    await page.getByTestId("award-confirm").click();

    await expect(modal).toHaveCount(0);
    const fixtureRow = page.getByTestId(`motm-fixture-${s.fixturePublicId}`);
    await expect(fixtureRow).toContainText(s.opener.displayName);

    // ── change it: the same sheet, opening on the current holder ──
    await page.getByTestId(`motm-give-${s.fixturePublicId}`).click();
    await expect(page.getByTestId("give-award-modal")).toContainText("Change");
    await expect(page.getByTestId("award-reason"), "the reason is carried over")
      .toHaveValue("12* off 3, three fours");
    await page.getByTestId(`award-candidate-${s.wicketTaker.publicId}`).click();
    await page.getByTestId("award-reason").fill("1/2 and the breakthrough");
    await page.getByTestId("award-confirm").click();

    await expect(fixtureRow).toContainText(s.wicketTaker.displayName);
    await expect(fixtureRow, "replaced, not duplicated")
      .not.toContainText(s.opener.displayName);

    // ── remove it ──
    await page.getByTestId(`motm-revoke-${s.fixturePublicId}`).click();
    await expect(fixtureRow).toContainText("Not awarded");
  });

  test("the tournament-award flow: a configurable award, given and removed", async ({ page }) => {
    await openTab(page, "awards");

    await page.getByTestId("award-give-BEST_BOWLER").click();
    const modal = page.getByTestId("give-award-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Best Bowler");
    await expect(modal, "a tournament award draws on everyone who has played")
      .toContainText("tournament figures");

    // A bowling award leads with the bowling line, not the batting one.
    const bowler = page.getByTestId(`award-candidate-${s.wicketTaker.publicId}`);
    await expect(bowler).toContainText("1/2");

    await bowler.click();
    await page.getByTestId("award-reason").fill("the only wicket of the tournament");
    await page.getByTestId("award-confirm").click();

    await expect(modal).toHaveCount(0);
    const slot = page.getByTestId("award-slot-BEST_BOWLER");
    await expect(slot).toContainText(s.wicketTaker.displayName);
    await expect(slot).toContainText("the only wicket of the tournament");

    await page.getByTestId("award-revoke-BEST_BOWLER").click();
    await expect(slot).toContainText("Not awarded");
  });

  // ── REPORTS ─────────────────────────────────────────────────────────────

  // Slice 5 asserted this tab was an honest stub. Slice 6 built it, so the
  // assertion is now that the ten reports are there — `tournament-reports.spec.ts`
  // covers the documents themselves.
  test("the Reports tab offers the reports", async ({ page }) => {
    await openTab(page, "reports");
    const panel = page.getByTestId("tournament-panel-reports");
    await expect(panel, "no longer a stub").not.toContainText("Reports are not built yet");
    await expect(panel).toContainText("Points Table");
    await expect(page.getByTestId("report-download-complete")).toBeVisible();
  });
});
