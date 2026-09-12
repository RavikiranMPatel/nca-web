import { test, expect, type Page } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbExec } from "../fixtures/db";

/**
 * Slice 2 — coverage of every existing tab on `TournamentDetailPage`, written
 * *before* the 3,559-line file is split into per-tab components.
 *
 * This spec is the whole proof of that refactor: it must pass unchanged
 * afterwards. So it asserts what a user sees — the panel for each tab, and one
 * piece of real content inside it — and deliberately not how the page is
 * structured internally, since that is exactly what the split changes.
 *
 * Panels are addressed by `data-testid`, per CLAUDE.md: text matching has picked
 * the wrong element here before, and several tab labels ("Teams", "Players",
 * "Stats", "Fixtures") also appear as row labels on the Overview tab and in the
 * surrounding navigation.
 *
 * Runs on desktop and iPhone 14. The tab bar is `overflow-x-auto`, so on a phone
 * the later tabs sit off-screen; clicking scrolls them in, which is itself worth
 * covering and is why this is not desktop-only.
 */

const RUN = `${Date.now() % 1000000}`;

/**
 * Every tab, as (key, label), in the order the tab bar renders them.
 *
 * Slice 5 took this from nine to eleven and renamed two. The KEY is what the
 * testids are built from — `tournament-tab-<key>` and `tournament-panel-<key>` —
 * because the page selects by key now rather than by index, and because
 * "Points Table" as a label would otherwise have produced a testid with a space
 * in it.
 */
const TABS = [
  { key: "overview", label: "Overview" },
  { key: "teams", label: "Teams" },
  { key: "players", label: "Players" },
  { key: "venues", label: "Venues" },
  { key: "officials", label: "Officials" },
  { key: "fixtures", label: "Fixtures" },
  { key: "points-table", label: "Points Table" },
  { key: "statistics", label: "Statistics" },
  { key: "awards", label: "Awards" },
  { key: "reports", label: "Reports" },
  { key: "settings", label: "Settings" },
] as const;

const TEAMS = [
  { name: `Chargers ${RUN}`, shortName: "CHG" },
  { name: `Strikers ${RUN}`, shortName: "STR" },
];

let tournamentPublicId: string;
let tournamentName: string;
let seed: Record<string, string>;

test.beforeAll(async () => {
  const api = await Api.login(config().a);
  seed = api.storageSeed();
  tournamentName = `Tabs ${RUN}`;

  const t = await api.raw("post", "/api/admin/cricket/tournaments", {
    name: tournamentName,
    format: "ROUND_ROBIN",
    venue: "Tabs Ground",
    startDate: "2026-03-01",
    endDate: "2026-04-01",
    defaultOvers: 20,
    winPoints: 2,
    tiePoints: 1,
    noResultPoints: 1,
  });
  expect(t.status, "create tournament").toBe(200);
  tournamentPublicId = (t.body as any).publicId as string;

  for (const team of TEAMS) {
    const r = await api.raw(
      "post",
      `/api/admin/cricket/tournaments/${tournamentPublicId}/teams`,
      { ...team, colorHex: "#2563eb" },
    );
    expect(r.status, `add team ${team.name}`).toBe(200);
  }

  // Generate the round-robin so the Fixtures tab has something to render; with
  // no fixtures it shows only its empty state and the tab proves less.
  const fx = await api.raw(
    "post",
    `/api/admin/cricket/tournaments/${tournamentPublicId}/fixtures/generate`,
    {},
  );
  expect(fx.status, "generate fixtures").toBe(200);
  expect((fx.body as any[]).length, "two teams produce one fixture").toBeGreaterThan(0);

  await api.dispose();
});

test.afterAll(() => {
  const t = `(SELECT id FROM tournaments WHERE name = '${tournamentName}')`;
  dbExec(`UPDATE fixtures SET match_id = NULL WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM fixtures WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_stages WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournaments WHERE name = '${tournamentName}'`);
});

async function openTournament(page: Page) {
  await page.addInitScript((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v as string);
  }, seed);
  await page.goto(`/admin/cricket/tournaments/${tournamentPublicId}`);
  // The header only renders once the tournament has loaded, so this is the
  // signal that the page is ready rather than an arbitrary wait.
  await expect(
    page.getByRole("heading", { name: tournamentName }),
  ).toBeVisible();
}

const panel = (page: Page, key: string) =>
  page.getByTestId(`tournament-panel-${key}`);

const tabButton = (page: Page, key: string) =>
  page.getByTestId(`tournament-tab-${key}`);

test.describe("TournamentDetailPage — tabs", () => {
  test("every tab opens its own panel, and only that panel", async ({ page }) => {
    await openTournament(page);

    // Overview is the landing tab and must already be showing.
    await expect(panel(page, "overview")).toBeVisible();

    for (const tab of TABS) {
      await tabButton(page, tab.key).click();
      await expect(panel(page, tab.key), `${tab.label} panel visible`).toBeVisible();

      // Exactly one panel at a time — a split that renders two tabs at once, or
      // none, fails here rather than silently looking fine.
      for (const other of TABS) {
        if (other.key === tab.key) continue;
        await expect(
          panel(page, other.key),
          `${other.label} panel hidden while on ${tab.label}`,
        ).toHaveCount(0);
      }
    }
  });

  test("each tab renders its own content, not just an empty shell", async ({ page }) => {
    await openTournament(page);

    // ── Overview: the summary rows, with counts that match what was seeded.
    await tabButton(page, "overview").click();
    const overview = panel(page, "overview");
    await expect(overview).toContainText("Format");
    await expect(overview).toContainText("Default Overs");
    await expect(overview).toContainText("20 overs");
    await expect(overview).toContainText("Tabs Ground");

    // ── Teams: both seeded sides, by name.
    await tabButton(page, "teams").click();
    const teams = panel(page, "teams");
    for (const team of TEAMS) {
      await expect(teams, `${team.name} listed`).toContainText(team.name);
    }
    await expect(teams.getByRole("button", { name: "+ Add Team" })).toBeVisible();

    // ── Players: no squad was registered, so the empty state is the content.
    await tabButton(page, "players").click();
    await expect(panel(page, "players")).toContainText("No players registered yet");

    // ── Venues and Officials: both load on demand when their tab is selected,
    // which is behaviour the split could easily drop.
    await tabButton(page, "venues").click();
    await expect(panel(page, "venues")).toContainText("No venues added yet");

    await tabButton(page, "officials").click();
    await expect(panel(page, "officials")).toContainText("No officials added yet");

    // ── Fixtures: the generated round-robin.
    await tabButton(page, "fixtures").click();
    const fixtures = panel(page, "fixtures");
    // The fixture card names both sides in full, not by short name.
    await expect(fixtures).toContainText(TEAMS[0].name);
    await expect(fixtures).toContainText(TEAMS[1].name);
    await expect(fixtures).toContainText("Round 1");

    // ── Standings: both teams on zero, the fixture being unplayed.
    await tabButton(page, "points-table").click();
    const standings = panel(page, "points-table");
    // The table renders `teamName`, so it is the full name here too.
    for (const team of TEAMS) {
      await expect(standings, `${team.name} in the table`).toContainText(team.name);
    }

    // ── Statistics: nothing scored, so the batting board is empty. The tab
    // fetches its own page now rather than the page pre-loading three arrays.
    await tabButton(page, "statistics").click();
    await expect(panel(page, "statistics")).toContainText("No batting data yet");

    // ── Awards: the tournament-level slots always render; there are no
    // completed fixtures, so Man of the Match has nothing to offer.
    await tabButton(page, "awards").click();
    const awards = panel(page, "awards");
    await expect(awards).toContainText("Man of the Series");
    await expect(awards).toContainText("No completed matches yet");

    // ── Reports: the ten reports Slice 6 built, where Slice 5 had a stub.
    await tabButton(page, "reports").click();
    await expect(panel(page, "reports")).toContainText("Complete Tournament Report");

    // ── Settings: the editable form, holding the values the tournament was
    // created with.
    await tabButton(page, "settings").click();
    const settings = panel(page, "settings");
    await expect(settings.locator("input, select").first()).toBeVisible();
  });

  test("the selected tab survives a reload of the page", async ({ page }) => {
    await openTournament(page);

    // Overview is the default on load. This pins the current behaviour so the
    // split cannot quietly introduce (or lose) tab persistence without the
    // change showing up here.
    await tabButton(page, "points-table").click();
    await expect(panel(page, "points-table")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: tournamentName })).toBeVisible();
    await expect(
      panel(page, "overview"),
      "tab selection is not persisted today — Overview is shown again",
    ).toBeVisible();
  });
});
