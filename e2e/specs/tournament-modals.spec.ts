import { test, expect, type Page } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbExec } from "../fixtures/db";

/**
 * Slice 5 — every modal on `TournamentDetailPage` opens and renders.
 *
 * The modal split moved ten `fixed inset-0` blocks out of the page into
 * `components/tournament/modals/`. The JSX went across byte-identical and all
 * ten tournament specs came back with identical outcomes, but that run only
 * drove TWO of the ten through a browser — Reschedule and Edit Fixture, the two
 * that already had `data-testid`s. The other eight were covered by a textual
 * diff and nothing else.
 *
 * This closes that: each of the ten is opened the way a user opens it and
 * asserted to render its own content. It is deliberately shallow — one modal,
 * one field — because the submit paths already have their own specs
 * (tournament-fixtures, tournament-conflicts, tournament-status,
 * tournament-fixture-scheduling-ui). What was missing was proof that the
 * component mounts at all under the guard it was given.
 *
 * Modals are addressed by `data-testid`, per CLAUDE.md. Text matching is
 * especially wrong here: "Add Team", "Add Player" and "Add Venue" are each both
 * a trigger button and a heading inside the sheet the trigger opens.
 *
 * Desktop and iPhone 14 both, since every one of these is a bottom sheet whose
 * layout differs between them.
 */

const RUN = `${Date.now() % 1000000}`;

const TEAMS = [
  { name: `Modal Home ${RUN}`, shortName: "MHM" },
  { name: `Modal Away ${RUN}`, shortName: "MAW" },
];

let tournamentPublicId: string;
let tournamentName: string;
let seed: Record<string, string>;
let teamPublicIds: string[] = [];
let playoffPublicId: string;
let playoffName: string;

test.beforeAll(async () => {
  const api = await Api.login(config().a);
  seed = api.storageSeed();
  tournamentName = `Modals ${RUN}`;

  const t = await api.raw("post", "/api/admin/cricket/tournaments", {
    name: tournamentName,
    format: "ROUND_ROBIN",
    venue: "Modal Ground",
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
    teamPublicIds.push((r.body as any).publicId as string);
  }

  // A fixture, so the Fixtures tab has a row carrying the edit and reschedule
  // buttons. Without one, two of the ten modals have no trigger to click.
  const fx = await api.raw(
    "post",
    `/api/admin/cricket/tournaments/${tournamentPublicId}/fixtures/generate`,
    {},
  );
  expect(fx.status, "generate fixtures").toBe(200);

  // The tournament has to be out of DRAFT for the Override Result button to
  // render at all — that guard is in the page, not the modal.
  const s = await api.raw(
    "patch",
    `/api/admin/cricket/tournaments/${tournamentPublicId}/status`,
    { status: "UPCOMING" },
  );
  expect(s.status, "move out of DRAFT").toBe(200);

  // ── a second tournament, LEAGUE_PLAYOFFS, for the Advance to Playoffs modal ──
  playoffName = `Modals Playoff ${RUN}`;
  const pt = await api.raw("post", "/api/admin/cricket/tournaments", {
    name: playoffName,
    format: "LEAGUE_PLAYOFFS",
    venue: "Modal Ground",
    startDate: "2026-03-01",
    endDate: "2026-04-01",
    defaultOvers: 20,
    winPoints: 2,
    tiePoints: 1,
    noResultPoints: 1,
  });
  expect(pt.status, "create playoff tournament").toBe(200);
  playoffPublicId = (pt.body as any).publicId as string;

  for (const team of TEAMS) {
    const r = await api.raw(
      "post",
      `/api/admin/cricket/tournaments/${playoffPublicId}/teams`,
      { name: `${team.name} P`, shortName: team.shortName, colorHex: "#2563eb" },
    );
    expect(r.status, `add playoff team ${team.name}`).toBe(200);
  }
  const pfx = await api.raw(
    "post",
    `/api/admin/cricket/tournaments/${playoffPublicId}/fixtures/generate`,
    {},
  );
  expect(pfx.status, "generate playoff fixtures").toBe(200);

  await api.dispose();
});

test.afterAll(() => {
  for (const name of [tournamentName, playoffName]) cleanup(name);
});

function cleanup(name: string) {
  const t = `(SELECT id FROM tournaments WHERE name = '${name}')`;
  dbExec(`UPDATE fixtures SET match_id = NULL WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM fixtures WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_team_squad WHERE tournament_team_id IN
            (SELECT id FROM tournament_teams WHERE tournament_id IN ${t})`);
  dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_stages WHERE tournament_id IN ${t}`);
  dbExec(`UPDATE tournaments SET champion_team_id = NULL, runner_up_team_id = NULL
            WHERE name = '${name}'`);
  dbExec(`DELETE FROM tournaments WHERE name = '${name}'`);
}

async function openTournament(page: Page) {
  await page.addInitScript((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v as string);
  }, seed);
  await page.goto(`/admin/cricket/tournaments/${tournamentPublicId}`);
  await expect(page.getByRole("heading", { name: tournamentName })).toBeVisible();
}

const tabButton = (page: Page, tab: string) =>
  page.getByTestId(`tournament-tab-${tab.toLowerCase()}`);

test.describe("TournamentDetailPage — the ten modals", () => {
  test("Teams tab: Add Team and Add Player both open", async ({ page }) => {
    await openTournament(page);
    await tabButton(page, "Teams").click();

    await page.getByTestId("tournament-add-team").click();
    const addTeam = page.getByTestId("add-team-modal");
    await expect(addTeam).toBeVisible();
    await expect(addTeam.getByPlaceholder("e.g. Team Alpha")).toBeVisible();
    await addTeam.getByRole("button", { name: "Cancel" }).click();
    await expect(addTeam).toHaveCount(0);

    // Add Player lives inside an expanded team card, so the team has to be
    // opened first — the trigger does not exist until then.
    await page.getByText(TEAMS[0].name, { exact: false }).first().click();
    const addPlayer = page.getByTestId(`tournament-add-player-${teamPublicIds[0]}`);
    await expect(addPlayer).toBeVisible();
    await addPlayer.click();
    const playerModal = page.getByTestId("add-player-modal");
    await expect(playerModal).toBeVisible();
    // Both halves of the sheet: the academy picker and the guest form.
    await expect(
      playerModal.getByRole("button", { name: "🏫 Academy Players" }),
    ).toBeVisible();
    await expect(
      playerModal.getByRole("button", { name: "👤 Guest / External" }),
    ).toBeVisible();
  });

  test("Venues and Officials tabs each open their add sheet", async ({ page }) => {
    await openTournament(page);

    await tabButton(page, "Venues").click();
    await page.getByTestId("tournament-add-venue").click();
    const venue = page.getByTestId("add-venue-modal");
    await expect(venue).toBeVisible();
    await expect(venue).toContainText("Add Venue");
    await venue.getByRole("button", { name: "Cancel" }).click();
    await expect(venue).toHaveCount(0);

    await tabButton(page, "Officials").click();
    await page.getByTestId("tournament-add-official").click();
    const official = page.getByTestId("add-official-modal");
    await expect(official).toBeVisible();
    await expect(official).toContainText("Add Official");
  });

  test("Fixtures tab: generate, manual, edit and reschedule all open", async ({ page }) => {
    await openTournament(page);
    await tabButton(page, "Fixtures").click();

    await page.getByTestId("tournament-generate-fixtures").click();
    const gen = page.getByTestId("generate-fixtures-modal");
    await expect(gen).toBeVisible();
    await expect(gen).toContainText("Generate Fixtures");
    await gen.getByRole("button", { name: "Cancel" }).click();
    await expect(gen).toHaveCount(0);

    await page.getByTestId("tournament-add-fixture-manual").click();
    const manual = page.getByTestId("manual-fixture-modal");
    await expect(manual).toBeVisible();
    await manual.getByRole("button", { name: "Cancel" }).click();
    await expect(manual).toHaveCount(0);

    // Edit and Reschedule hang off a fixture row, so find one rather than
    // assuming a publicId.
    const editButton = page.locator('[data-testid^="fixture-edit-"]').first();
    await expect(editButton).toBeVisible();
    await editButton.click();
    await expect(page.getByTestId("edit-fixture-modal")).toBeVisible();
    await expect(page.getByTestId("fixture-match-number")).toBeVisible();
    // exact: the status chips in this sheet include CANCELLED, which a
    // substring match on "Cancel" also selects.
    await page.getByTestId("edit-fixture-modal")
      .getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByTestId("edit-fixture-modal")).toHaveCount(0);

    const rescheduleButton = page.locator('[data-testid^="fixture-reschedule-"]').first();
    await expect(rescheduleButton).toBeVisible();
    await rescheduleButton.click();
    await expect(page.getByTestId("reschedule-modal")).toBeVisible();
    await expect(page.getByTestId("reschedule-reason")).toBeVisible();
  });

  test("the Override Result sheet opens once the tournament has left DRAFT", async ({ page }) => {
    await openTournament(page);

    await page.getByTestId("tournament-declare-winner").click();
    const declare = page.getByTestId("declare-winner-modal");
    await expect(declare).toBeVisible();
    await expect(page.getByTestId("override-reason")).toBeVisible();
    // Both seeded sides are offered as champion.
    for (const id of teamPublicIds) {
      await expect(page.getByTestId(`override-champion-${id}`)).toBeVisible();
    }
  });

  test("Advance to Playoffs opens once every league fixture is done", async ({ page }) => {
    // Its trigger renders only for LEAGUE_PLAYOFFS (FixturesTab:134), so this
    // test drives a second tournament rather than the round-robin the rest of
    // the spec uses. Without it this modal would be the one of the ten with no
    // browser coverage at all, which is the gap the spec exists to close.
    await page.addInitScript((sd) => {
      for (const [k, v] of Object.entries(sd)) localStorage.setItem(k, v as string);
    }, seed);
    await page.goto(`/admin/cricket/tournaments/${playoffPublicId}`);
    await expect(page.getByRole("heading", { name: playoffName })).toBeVisible();
    await tabButton(page, "Fixtures").click();

    const advance = page.getByTestId("tournament-advance-playoffs");
    await expect(advance).toBeVisible();

    // Unplayed league fixtures: the trigger is present but refuses to open.
    await expect(advance).toBeDisabled();
    await expect(page.getByTestId("advance-playoffs-modal")).toHaveCount(0);

    // Completed: it opens. Marking the fixtures complete in the database is the
    // cheap way to reach the state — scoring a full league through the UI is
    // tournament-standings.spec.ts's job, not this spec's.
    dbExec(`UPDATE fixtures SET status = 'COMPLETED'
              WHERE tournament_id IN
                (SELECT id FROM tournaments WHERE name = '${playoffName}')`);
    await page.reload();
    await expect(page.getByRole("heading", { name: playoffName })).toBeVisible();
    await tabButton(page, "Fixtures").click();

    await expect(advance).toBeEnabled();
    await advance.click();
    const modal = page.getByTestId("advance-playoffs-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Playoffs");
  });
});
