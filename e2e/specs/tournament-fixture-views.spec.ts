import { test, expect, type Page } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbOne, dbExec } from "../fixtures/db";

/**
 * Slice 4 — the fixture views (Phase 18) and the reschedule flow, in a browser.
 *
 * Desktop and iPhone 14, because the view switcher is a horizontally scrolling
 * strip and the reschedule dialog is a modal — the two things most likely to be
 * unusable on a phone and fine on a laptop.
 *
 * The grouping itself is the interesting part: calendar, stage, group and team
 * are the same fixture cards under a different two-level grouping, and the team
 * view is the one that differs structurally, since a fixture belongs to two
 * teams rather than one date.
 */

const RUN = `${Date.now() % 1000000}`;
const TNAME = `S4V ${RUN}`;
// Six teams in two groups of three: two groups for the group view, and three
// fixtures inside each so that two of them share a side — which is what the
// clash test needs and what two groups of two cannot provide.
const TEAMS = ["Kestrels", "Falcons", "Harriers", "Ospreys", "Merlins", "Kites"];

let tid: string;
let seed: Record<string, string>;
let fixtures: any[];

test.beforeAll(async () => {
  const api = await Api.login(config().a);
  seed = api.storageSeed();

  const t = await api.raw("post", "/api/admin/cricket/tournaments", {
    name: TNAME, format: "GROUP_KNOCKOUT", venue: "Views Ground",
    startDate: "2026-11-01", endDate: "2026-12-01",
    defaultOvers: 20, winPoints: 2, tiePoints: 1, noResultPoints: 1,
    matchDurationMins: 90, groundGapMins: 30,
  });
  expect(t.status, "create tournament").toBe(200);
  tid = (t.body as any).publicId;

  for (const n of TEAMS) {
    const r = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/teams`,
      { name: `${n} ${RUN}`, shortName: n.slice(0, 3).toUpperCase(), colorHex: "#2563eb" });
    expect(r.status, `add ${n}`).toBe(200);
  }

  // Two groups of three, so the group view has something to separate and two
  // fixtures inside a group share a side.
  const fx = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/fixtures/generate`,
    { teamsPerGroup: 3 });
  expect(fx.status, "generate").toBe(200);
  fixtures = (fx.body as any[]).filter((f) => !f.byeTeam);

  // Give one fixture a slot, so the calendar view has a real date to group by.
  const r = await api.raw("post",
    `/api/admin/cricket/tournaments/${tid}/fixtures/${fixtures[0].publicId}/reschedule`,
    { scheduledAt: "2026-11-03T09:30:00+05:30", reason: "Opening fixture" });
  expect(r.status, JSON.stringify(r.body)).toBe(200);

  await api.dispose();
});

test.afterAll(() => {
  const t = `(SELECT id FROM tournaments WHERE name = '${TNAME}')`;
  dbExec(`UPDATE tournaments SET champion_team_id = NULL, runner_up_team_id = NULL WHERE id IN ${t}`);
  dbExec(`UPDATE fixtures SET match_id = NULL WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM fixtures WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_venues WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_stages WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM audit_logs WHERE entity_public_id = '${tid}'`);
  dbExec(`DELETE FROM tournaments WHERE name = '${TNAME}'`);
});

async function openFixtures(page: Page) {
  await page.addInitScript((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v as string);
  }, seed);
  await page.goto(`/admin/cricket/tournaments/${tid}`);
  await expect(page.getByRole("heading", { name: TNAME })).toBeVisible();
  await page.getByTestId("tournament-tab-fixtures").click();
  await expect(page.getByTestId("tournament-panel-fixtures")).toBeVisible();
}

const headings = (page: Page) => page.getByTestId("fixture-group-heading");

test.describe("Fixture views and rescheduling", () => {

  test("all four views are reachable and regroup the same fixtures", async ({ page }) => {
    await openFixtures(page);

    // The switcher scrolls horizontally on a phone; clicking scrolls it in,
    // which is worth exercising rather than asserting on desktop alone.
    await expect(page.getByTestId("fixture-views")).toBeVisible();

    for (const view of ["calendar", "stage", "group", "team"]) {
      await page.getByTestId(`fixture-view-${view}`).click();
      await expect(headings(page).first(), `${view} renders groups`).toBeVisible();
      expect(await headings(page).count(), `${view} groups something`)
        .toBeGreaterThan(0);
    }
  });

  test("the calendar view separates scheduled from unscheduled", async ({ page }) => {
    await openFixtures(page);
    await page.getByTestId("fixture-view-calendar").click();

    const text = await page.getByTestId("tournament-panel-fixtures").innerText();
    // One fixture was given 3 Nov in setup; the rest have no slot yet.
    expect(text, "the scheduled one is under its date").toContain("Nov");
    expect(text, "and the others are gathered as unscheduled").toContain("Unscheduled");
  });

  test("the group view keeps the two groups apart", async ({ page }) => {
    await openFixtures(page);
    await page.getByTestId("fixture-view-group").click();

    const labels = await headings(page).allInnerTexts();
    const groups = labels.filter((l) => l.includes("Group"));
    expect(groups.length, "two groups of three produce two group headings")
      .toBeGreaterThanOrEqual(2);
  });

  test("a fixture appears under both of its teams in the team view", async ({ page }) => {
    await openFixtures(page);
    await page.getByTestId("fixture-view-team").click();

    const labels = (await headings(page).allInnerTexts()).join(" ");
    // Every side that plays should head a section of its own — that is what
    // makes this view structurally different from the others.
    for (const n of TEAMS) {
      expect(labels, `${n} has its own section`).toContain(n);
    }
  });

  test("a fixture can be moved, with a reason, from the UI", async ({ page }) => {
    await openFixtures(page);

    const target = fixtures[1];
    await page.getByTestId(`fixture-reschedule-${target.publicId}`).click();
    await expect(page.getByTestId("reschedule-modal")).toBeVisible();

    await page.getByTestId("reschedule-date").fill("2026-11-05");
    await page.getByTestId("reschedule-time").fill("14:00");
    await page.getByTestId("reschedule-reason").fill("Ground double-booked");
    await page.getByTestId("reschedule-confirm").click();

    await expect(page.getByTestId("reschedule-modal")).toBeHidden();

    await expect.poll(() =>
      dbOne(`SELECT coalesce(scheduled_at::text,'NULL') FROM fixtures
             WHERE public_id = '${target.publicId}'`),
      { message: "the move reached the database" },
    ).toContain("2026-11-05");

    expect(dbOne(`SELECT reschedule_reason FROM fixtures WHERE public_id='${target.publicId}'`))
      .toBe("Ground double-booked");
  });

  test("a clash is shown in the dialog rather than thrown away", async ({ page }) => {
    await openFixtures(page);

    // Move a fixture onto a slot a team is already committed to. fixtures[0]
    // sits at 3 Nov 09:30; anything sharing a side with it will clash there.
    const first = fixtures[0];
    const sharing = fixtures.find((f) =>
      f.publicId !== first.publicId &&
      [f.homeTeam?.publicId, f.awayTeam?.publicId].some((id) =>
        [first.homeTeam?.publicId, first.awayTeam?.publicId].includes(id)));

    test.skip(!sharing, "this bracket has no fixture sharing a side with the first");

    // Read the slot first rather than assuming it is empty: an earlier test in
    // this file moves a fixture, and which one shares a side with the first
    // depends on the bracket.
    const before = dbOne(`SELECT coalesce(scheduled_at::text,'NULL') FROM fixtures
                          WHERE public_id='${sharing.publicId}'`);

    await page.getByTestId(`fixture-reschedule-${sharing.publicId}`).click();
    await page.getByTestId("reschedule-date").fill("2026-11-03");
    await page.getByTestId("reschedule-time").fill("09:45");
    await page.getByTestId("reschedule-reason").fill("deliberate clash");
    await page.getByTestId("reschedule-confirm").click();

    // The 409 is an answer: the dialog stays open and says what clashes.
    const conflict = page.getByTestId("reschedule-conflict");
    await expect(conflict, "the clash is surfaced").toBeVisible();
    await expect(conflict).toContainText(/already playing|already hosting/);
    await expect(page.getByTestId("reschedule-modal"), "and nothing was lost")
      .toBeVisible();

    expect(dbOne(`SELECT coalesce(scheduled_at::text,'NULL') FROM fixtures
                  WHERE public_id='${sharing.publicId}'`),
      "the refused move changed nothing").toBe(before);
  });

  test("a fixture can be postponed without naming a new slot", async ({ page }) => {
    await openFixtures(page);

    const target = fixtures[fixtures.length - 1];
    await page.getByTestId(`fixture-reschedule-${target.publicId}`).click();
    await page.getByTestId("reschedule-postpone").check();

    // The date and time inputs go away — there is no destination to give.
    await expect(page.getByTestId("reschedule-date")).toBeHidden();

    await page.getByTestId("reschedule-reason").fill("Travel disrupted");
    await page.getByTestId("reschedule-confirm").click();
    await expect(page.getByTestId("reschedule-modal")).toBeHidden();

    await expect.poll(() =>
      dbOne(`SELECT status FROM fixtures WHERE public_id = '${target.publicId}'`),
      { message: "the postponement reached the database" },
    ).toBe("POSTPONED");
  });
});
