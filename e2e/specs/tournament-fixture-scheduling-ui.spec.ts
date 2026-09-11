import { test, expect, type Page } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbOne, dbCount, dbExec } from "../fixtures/db";

/**
 * Slice 4b — the scheduling fields get a UI.
 *
 * V100 added match number, city and the officials, and Slice 4 recorded plainly
 * that nothing on the Fixtures tab could edit any of them: the API accepted them
 * and no screen sent them. V102 adds the three a fixture sheet needs and the row
 * could not hold — third umpire, scorer and notes — and this is the form.
 *
 * Ruling 6 is honoured as written: there is no scorer ROLE, and the scorer field
 * is free text that grants nothing. The spec asserts that distinction rather than
 * assuming it.
 */

const RUN = `${Date.now() % 1000000}`;
let seq = 0;

async function makeFixture(api: Api) {
  const name = `S4BUI-${RUN}-${seq++}`;
  const t = await api.raw("post", "/api/admin/cricket/tournaments", {
    name, format: "ROUND_ROBIN", venue: "S4BUI Ground",
    startDate: "2026-09-01", endDate: "2026-10-01",
    defaultOvers: 20, winPoints: 2, tiePoints: 1, noResultPoints: 1,
  });
  expect(t.status, JSON.stringify(t.body)).toBe(200);
  const tid = (t.body as any).publicId as string;
  for (let i = 0; i < 2; i++) {
    const r = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/teams`, {
      name: `S4BUI Side ${i} ${RUN}`, shortName: `U${i}`, colorHex: "#2563eb" });
    expect(r.status).toBe(200);
  }
  const gen = await api.raw("post",
    `/api/admin/cricket/tournaments/${tid}/fixtures/generate`, {});
  expect(gen.status, JSON.stringify(gen.body)).toBe(200);
  const fixture = (gen.body as any[]).find((f) => f.homeTeam && f.awayTeam);
  expect(fixture, "a pairing was generated").toBeTruthy();
  return { tid, fixturePublicId: fixture.publicId as string };
}

async function openEditForm(page: Page, api: Api, tid: string, fixturePublicId: string) {
  await page.addInitScript((seed) => {
    for (const [k, v] of Object.entries(seed)) {
      window.localStorage.setItem(k, v as string);
    }
  }, api.storageSeed());
  await page.goto(`/admin/cricket/tournaments/${tid}`);
  await page.getByTestId("tournament-tab-fixtures").click();
  await page.getByTestId("tournament-panel-fixtures").waitFor();
  await page.getByTestId(`fixture-edit-${fixturePublicId}`).click();
  await expect(page.getByTestId("edit-fixture-modal")).toBeVisible();
}

test.afterAll(() => {
  const t = `(SELECT id FROM tournaments WHERE name LIKE 'S4BUI-${RUN}-%')`;
  dbExec(`DELETE FROM fixtures WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_stages WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournaments WHERE name LIKE 'S4BUI-${RUN}-%'`);
});

test.describe("fixture scheduling fields — the edit form", () => {

  test("every scheduling field saves and reads back, desktop and iPhone 14",
    async ({ page }, testInfo) => {
    const api = await Api.login(config().a);
    const { tid, fixturePublicId } = await makeFixture(api);
    await openEditForm(page, api, tid, fixturePublicId);

    await page.getByTestId("fixture-match-number").fill("14");
    await page.getByTestId("fixture-city").fill("Mysuru");
    await page.getByTestId("fixture-umpire1").fill("A Dar");
    await page.getByTestId("fixture-umpire2").fill("K Dharmasena");
    await page.getByTestId("fixture-umpire3").fill("R Illingworth");
    await page.getByTestId("fixture-referee").fill("J Crowe");
    await page.getByTestId("fixture-scorer").fill("S Bhat");
    await page.getByTestId("fixture-notes").fill("day/night, reserve day 12th");
    await page.getByTestId("fixture-save").click();
    await expect(page.getByText("Fixture updated")).toBeVisible();

    // The row, not the DOM — the point is that it persisted.
    expect(dbOne(`SELECT match_number || '|' || city || '|' || umpire1_name || '|'
                  || umpire2_name || '|' || umpire3_name || '|' || referee_name || '|'
                  || scorer_name || '|' || notes
                  FROM fixtures WHERE public_id = '${fixturePublicId}'`),
      `saved on ${testInfo.project.name}`)
      .toBe("14|Mysuru|A Dar|K Dharmasena|R Illingworth|J Crowe|S Bhat|day/night, reserve day 12th");

    // ...and comes back into the form when it is reopened, which is the half that
    // a write-only form would still pass.
    await page.reload();
    await page.getByTestId("tournament-tab-fixtures").click();
    await page.getByTestId(`fixture-edit-${fixturePublicId}`).click();
    await expect(page.getByTestId("fixture-umpire3")).toHaveValue("R Illingworth");
    await expect(page.getByTestId("fixture-scorer")).toHaveValue("S Bhat");
    await expect(page.getByTestId("fixture-notes"))
      .toHaveValue("day/night, reserve day 12th");
    await api.dispose();
  });

  test("an official who has changed can be cleared", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "same code path as the save above");
    const api = await Api.login(config().a);
    const { tid, fixturePublicId } = await makeFixture(api);

    await api.raw("patch",
      `/api/admin/cricket/tournaments/${tid}/fixtures/${fixturePublicId}`,
      { umpire1Name: "A Dar", scorerName: "S Bhat" });
    expect(dbOne(`SELECT umpire1_name FROM fixtures WHERE public_id = '${fixturePublicId}'`))
      .toBe("A Dar");

    await openEditForm(page, api, tid, fixturePublicId);
    await page.getByTestId("fixture-umpire1").fill("");
    await page.getByTestId("fixture-save").click();
    await expect(page.getByText("Fixture updated")).toBeVisible();

    // Blank clears; it does not mean "leave alone". Only an absent field does.
    expect(dbOne(`SELECT coalesce(umpire1_name, '<null>')
                  FROM fixtures WHERE public_id = '${fixturePublicId}'`)).toBe("");
    expect(dbOne(`SELECT scorer_name FROM fixtures WHERE public_id = '${fixturePublicId}'`),
      "a field the form did not change is untouched").toBe("S Bhat");
    await api.dispose();
  });

  /**
   * Ruling 6, asserted rather than assumed: the scorer field is a note on a
   * schedule and grants nothing. A COACH cannot reach the edit endpoint at all,
   * and being named in the box creates no account and no role.
   */
  test("the scorer field is free text and grants nothing", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract; desktop only");
    const api = await Api.login(config().a);
    const coach = await Api.login(config().aCoach);
    const { tid, fixturePublicId } = await makeFixture(api);

    await api.raw("patch",
      `/api/admin/cricket/tournaments/${tid}/fixtures/${fixturePublicId}`,
      { scorerName: "Totally Made Up Person" });

    expect(dbCount(`SELECT count(*) FROM users WHERE name = 'Totally Made Up Person'`),
      "naming a scorer creates no user").toBe(0);
    expect(dbCount(`SELECT count(*) FROM users WHERE role = 'ROLE_SCORER'`),
      "there is no scorer role").toBe(0);

    // And a COACH cannot edit a fixture, named on it or not.
    const asCoach = await coach.raw("patch",
      `/api/admin/cricket/tournaments/${tid}/fixtures/${fixturePublicId}`,
      { scorerName: "Someone Else" });
    expect([403, 404], `COACH got ${asCoach.status}`).toContain(asCoach.status);
    expect(dbOne(`SELECT scorer_name FROM fixtures WHERE public_id = '${fixturePublicId}'`))
      .toBe("Totally Made Up Person");
    await api.dispose();
    await coach.dispose();
  });

  test("cross-tenant: B cannot edit A's fixture", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract; desktop only");
    const a = await Api.login(config().a);
    const b = await Api.login(config().b);
    const { tid, fixturePublicId } = await makeFixture(a);

    const r = await b.raw("patch",
      `/api/admin/cricket/tournaments/${tid}/fixtures/${fixturePublicId}`,
      { city: "Somewhere Else", umpire3Name: "B's Umpire", notes: "B was here" });
    expect(r.status, "B editing A's fixture").toBe(404);
    expect(dbCount(`SELECT count(*) FROM fixtures WHERE public_id = '${fixturePublicId}'
                    AND (city IS NOT NULL OR umpire3_name IS NOT NULL OR notes IS NOT NULL)`),
      "nothing was written").toBe(0);
    await a.dispose();
    await b.dispose();
  });
});
