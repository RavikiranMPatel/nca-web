import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { createChampionship, purge, type Championship } from "../fixtures/championship";

/**
 * BUG-53 — a fixture that could not be linked says so.
 *
 * `MatchSetupPage.handleStartMatch` had:
 *
 * ```ts
 * try { await linkMatchToFixture(...); } catch { /* non-fatal *\/ }
 * ```
 *
 * `link-match` is the ONLY thing that moves a fixture to IN_PROGRESS, and a
 * fixture that is not IN_PROGRESS never offers "Live Scorer" — it keeps offering
 * "Start Match". Taking that offer creates a SECOND match and rebinds
 * `fixtures.match_id` to it, orphaning the one that was scored. Calling that
 * non-fatal turned a recoverable failure into a silently broken fixture.
 *
 * The failure is forced with route interception rather than by breaking the
 * server: the assertion is about what the PAGE does when the call fails, and
 * every other reason a real 500 might occur would be a different test.
 */

const RUN = String(Math.floor(Math.random() * 90000000) + 10000000);
let C: Championship;
let fixture: any;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  test.setTimeout(600_000);
  C = await createChampionship({
    tag: `B53${RUN}`,
    name: `BUG53 ${RUN}`,
    groups: [["India", "Australia"]],
  });
  const gen = await C.api.raw("post",
    `/api/admin/cricket/tournaments/${C.tournamentPublicId}/fixtures/generate`,
    { teamsPerGroup: 2 });
  expect(gen.status, "generate the one group fixture").toBe(200);
  fixture = (gen.body as any[])[0];
});

test.afterAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  if (!C) return;
  await C.destroy().catch(() => {});
  await purge(C.tournamentPublicId, `B53${RUN}`).catch(() => {});
  await C.api.dispose().catch(() => {});
});

test("a failed link-match is surfaced, not swallowed", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one championship per run");
  test.setTimeout(120_000);

  // The Fixtures tab seeds this before navigating; seeding it directly is what
  // lets the test start at the wizard instead of driving the tab to get there.
  const prep = await C.api.raw("get",
    `/api/admin/cricket/tournaments/${C.tournamentPublicId}/fixtures/${fixture.publicId}/prepare-match`);
  expect(prep.status, "prepare-match").toBe(200);

  const seed = C.api.storageSeed();
  await page.addInitScript(
    ({ s, prefill }) => {
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v as string);
      sessionStorage.setItem("fixture_prefill", JSON.stringify(prefill));
    },
    { s: seed, prefill: prep.body },
  );

  // The failure under test.
  let linkAttempts = 0;
  await page.route("**/link-match", async (route) => {
    linkAttempts++;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "link-match is unavailable" }),
    });
  });

  await page.goto(
    `/admin/cricket/matches/new?fixtureId=${fixture.publicId}&tournamentId=${C.tournamentPublicId}`,
  );

  const primary = page.getByTestId("match-setup-primary");

  // step 0 — details are prefilled from the fixture
  await expect(primary).toBeVisible();
  await primary.click();                                   // Create Match

  // Steps 1 and 2 — the two XIs.
  //
  // The count is asserted rather than the click assumed: the squad pool arrives
  // from the fixture prefill in an effect, and clicking "Select All" before it
  // lands selects nothing. That failed once as "still on Team A, 0/11" three
  // steps later, which reads like a broken wizard rather than a race.
  const xiCount = page.getByTestId("match-setup-xi-count");
  for (const side of ["A", "B"]) {
    await expect(xiCount, `team ${side}: the squad pool is rendered`).toBeVisible();
    await page.getByTestId("match-setup-select-all").click();
    await expect(xiCount, `team ${side}: eleven selected`).toHaveText("11/11");

    // A captain and a wicketkeeper, which "Select All" does not set and the step
    // refuses to advance without. Missing them looked like "Select All stopped
    // working": the primary click was silently refused, the side stayed on
    // screen, and the NEXT Select All toggled the same eleven back off — so the
    // failure surfaced two steps later as 0/11 on the wrong team.
    await page.getByTestId("player-role-captain").first().click();
    await page.getByTestId("player-role-wicketkeeper").first().click();

    await primary.click();
  }

  // step 3 — toss
  await page.getByTestId(/^match-setup-toss-winner-/).first().click();
  await page.getByTestId("match-setup-toss-BAT").click();
  await primary.click();                                   // Next: Officials

  // step 4 — officials, nothing required
  await primary.click();                                   // Next: Review

  // step 5 — Start Match, which is where link-match is called
  await primary.click();

  const toast = page.getByTestId("fixture-link-failed");
  await expect(toast, "the page must say the fixture could not be linked").toBeVisible({
    timeout: 20_000,
  });
  await expect(toast, "and say what to do instead of starting it again")
    .toContainText("Fixtures tab");
  await expect(toast, "and carry the server's reason")
    .toContainText("link-match is unavailable");

  expect(linkAttempts, "link-match really was attempted").toBeGreaterThan(0);
});
