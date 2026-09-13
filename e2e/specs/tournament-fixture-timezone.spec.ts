import { test, expect, type Page } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbExec, dbOne } from "../fixtures/db";
import { pdfText, flat, pdftotextAvailable } from "../fixtures/pdf";

/**
 * A fixture scheduled at 09:30 IST reads 09:30 everywhere — finding 3.
 *
 * **Where 09:30+05:30 becomes 04:00.** `fixtures.scheduled_at` is a PostgreSQL
 * `timestamptz`, which stores an instant and NOT the offset it was written in,
 * and Hibernate reads such a column back normalised to UTC. Probed against the
 * running backend before the fix, with one PATCH and one GET:
 *
 * ```
 * PATCH response scheduledAt : 2026-05-10T09:30:00+05:30   <- the value just set, in memory
 * GET  read-back scheduledAt : 2026-05-10T04:00:00Z        <- the same row, read from the DB
 * ```
 *
 * So the defect is invisible on the write and appears on every read afterwards:
 * the conflict sentence an admin has to act on said `at 10 May, 04:00`, the
 * Fixtures tab showed whatever the VIEWER's clock made of an instant, and the
 * printed schedule carried no time at all.
 *
 * **What is asserted here, and why the browser is in New York.** The read-back,
 * the conflict message, the rendered tab and the PDF. The two browser projects
 * run with `timezoneId: "America/New_York"` ON PURPOSE: this machine is already
 * in IST, so a page that formats an instant in the viewer's own zone renders
 * 09:30 here whatever the backend sends, and the test would pass against the
 * defect. Under a New York clock the unfixed page shows 12:00 am and the fixed
 * one shows 09:30 — a fixture's time belongs to the ground it is played on, not
 * to the laptop it is read on.
 */

const RUN = `${Date.now() % 1000000}`;
const NAME = `TZ-${RUN}`;

/** The slot, as an admin in Bengaluru enters it. */
const BOOKED = "2026-05-10T09:30:00+05:30";
const CLASHING = "2026-05-10T10:00:00+05:30";

let tid: string;
let fixtures: any[];
let venueId: string;
let seed: Record<string, string>;

test.beforeAll(async () => {
  const api = await Api.login(config().a);
  seed = api.storageSeed();

  const t = await api.raw("post", "/api/admin/cricket/tournaments", {
    name: NAME, format: "ROUND_ROBIN", venue: "TZ Ground",
    startDate: "2026-05-01", endDate: "2026-06-01",
    defaultOvers: 20, winPoints: 2, tiePoints: 1, noResultPoints: 1,
    matchDurationMins: 90, groundGapMins: 30,
  });
  expect(t.status, "create tournament").toBe(200);
  tid = (t.body as any).publicId;

  for (let i = 0; i < 4; i++) {
    const r = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/teams`,
      { name: `TZ Side ${i} ${RUN}`, shortName: `Z${i}`, colorHex: "#2563eb" });
    expect(r.status, `add side ${i}`).toBe(200);
  }

  const v = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/venues`,
    { name: `TZ Oval ${RUN}`, maxMatchesPerDay: 4 });
  expect(v.status, "add a ground").toBe(200);
  venueId = (v.body as any).id;

  const fx = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/fixtures/generate`, {});
  expect(fx.status, "generate").toBe(200);
  fixtures = (fx.body as any[]).filter((f) => !f.byeTeam);

  // One fixture in the slot, through reschedule — the path that has always had
  // conflict detection, so this setup is unaffected by the ruling-4 fix.
  const set = await api.raw("post",
    `/api/admin/cricket/tournaments/${tid}/fixtures/${fixtures[0].publicId}/reschedule`,
    { scheduledAt: BOOKED, venueId, reason: "Opening slot" });
  expect(set.status, `put the fixture at 09:30: ${JSON.stringify(set.body)}`).toBe(200);

  // The row really does hold half past nine Indian time.
  expect(dbOne(`SELECT (scheduled_at AT TIME ZONE 'Asia/Kolkata')::text
                FROM fixtures WHERE public_id='${fixtures[0].publicId}'`),
    "the stored instant IS 09:30 in Asia/Kolkata").toContain("09:30:00");

  await api.dispose();
});

test.afterAll(() => {
  const t = `(SELECT id FROM tournaments WHERE name = '${NAME}')`;
  dbExec(`UPDATE tournaments SET champion_team_id = NULL, runner_up_team_id = NULL WHERE id IN ${t}`);
  dbExec(`UPDATE fixtures SET match_id = NULL WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM fixtures WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_venues WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_stages WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM audit_logs WHERE entity_public_id IN
            (SELECT public_id FROM tournaments WHERE name = '${NAME}')`);
  dbExec(`DELETE FROM tournaments WHERE name = '${NAME}'`);
});

test.describe("A scheduled fixture keeps its own offset", () => {

  test("the API reads back the offset it was given, not UTC", async ({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract, no viewport dimension");
    const api = await Api.login(config().a);

    const list = await api.raw("get", `/api/admin/cricket/tournaments/${tid}/fixtures`);
    expect(list.status).toBe(200);
    const f = (list.body as any[]).find((x) => x.publicId === fixtures[0].publicId)!;

    expect(f.scheduledAt, "read back in the offset it was booked in")
      .toBe("2026-05-10T09:30:00+05:30");
    expect(String(f.scheduledAt), "and not normalised to UTC on the way out")
      .not.toContain("04:00");

    await api.dispose();
  });

  test("the conflict message names 09:30", async ({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract, no viewport dimension");
    const api = await Api.login(config().a);

    // A second fixture, no side in common, onto the same ground in the same slot.
    const first = fixtures[0];
    const disjoint = fixtures.find((f) =>
      ![f.homeTeam.publicId, f.awayTeam.publicId].some((id) =>
        [first.homeTeam.publicId, first.awayTeam.publicId].includes(id)))!;

    const refused = await api.raw("post",
      `/api/admin/cricket/tournaments/${tid}/fixtures/${disjoint.publicId}/reschedule`,
      { scheduledAt: CLASHING, venueId, reason: "clash on purpose" });

    expect(refused.status, "refused, per ruling 4").toBe(409);
    const message = (refused.body as any).message as string;
    expect(message, "the admin booked 09:30 and is told 09:30").toContain("10 May, 09:30");
    expect(message, "04:00 is the same instant at UTC, and no time anyone chose")
      .not.toContain("04:00");

    await api.dispose();
  });

  test("the printed schedule carries the time, in the fixture's own offset",
    async ({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "document contract");
    test.skip(!pdftotextAvailable(), "pdftotext (poppler) is not installed");
    const api = await Api.login(config().a);

    const res = await api.ctx.get(
      `/api/admin/cricket/tournaments/${tid}/reports/fixtures`);
    expect(res.status()).toBe(200);
    const text = flat(pdfText(await res.body()));

    expect(text, "the schedule prints the slot, date and time")
      .toContain("10 May 2026, 09:30");
    expect(text, "not the UTC reading of the same instant").not.toContain("10 May 2026, 04:00");

    await api.dispose();
  });
});

/**
 * The rendered tab, from a browser that is NOT in India.
 *
 * Separate describe because `test.use` is per-file or per-describe, and the
 * assertions above are about the API rather than the page.
 */
test.describe("The Fixtures tab, read from another timezone", () => {
  test.use({ timezoneId: "America/New_York" });

  const openFixtures = async (page: Page) => {
    await page.addInitScript((s) => {
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v as string);
    }, seed);
    await page.goto(`/admin/cricket/tournaments/${tid}`);
    await expect(page.getByRole("heading", { name: NAME })).toBeVisible();
    await page.getByTestId("tournament-tab-fixtures").click();
    await expect(page.getByTestId("tournament-panel-fixtures")).toBeVisible();
  };

  test("shows 09:30, the time at the ground", async ({ page }) => {
    await openFixtures(page);
    const panel = page.getByTestId("tournament-panel-fixtures");

    // The clock face, not merely "a time is shown". Under a New York browser an
    // instant formatted in the viewer's zone renders as the previous midnight.
    await expect(panel, "the slot as the ground keeps it").toContainText(/09:30/i);
    await expect(panel, "not the viewer's own clock")
      .not.toContainText(/12:00\s*am/i);

    // And the DATE with it: 04:00Z read in New York is 11 May the previous
    // evening, so a wrong zone moves the day as well as the hour.
    await expect(panel, "10 May, not 9 May").toContainText(/10 May/i);
  });
});
