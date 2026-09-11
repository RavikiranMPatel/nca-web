import { test, expect, type Page } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbOne, dbCount, dbExec } from "../fixtures/db";

/**
 * Slice 4b — qualification rules stored per tournament (ruling 2).
 *
 * Slice 4 shipped `teamsPerGroup` and stopped there, so how many teams advance
 * was a number on the advance-knockout request, the knockout bracket had no rule
 * at all, and ranking inside a group was on points alone — ruling 2's NRR, wins
 * and head-to-head existed nowhere.
 *
 * The ordering arithmetic is unit-tested in TournamentRankingTest, which is where
 * it belongs. What only a live database can show is that the rules persist, are
 * validated, are audited, are reachable from the Settings tab on both viewports,
 * and are what advanceToKnockout actually reads.
 */

const RUN = `${Date.now() % 1000000}`;
let seq = 0;
const created: string[] = [];

async function makeTournament(api: Api, format = "GROUP_KNOCKOUT") {
  const name = `S4B-${RUN}-${seq++}`;
  const r = await api.raw("post", "/api/admin/cricket/tournaments", {
    name, format, venue: "S4B Ground",
    startDate: "2026-09-01", endDate: "2026-10-01",
    defaultOvers: 20, winPoints: 2, tiePoints: 1, noResultPoints: 1,
  });
  expect(r.status, `create: ${JSON.stringify(r.body)}`).toBe(200);
  const tid = (r.body as any).publicId as string;
  created.push(tid);
  return tid;
}

const rulesUrl = (tid: string) =>
  `/api/admin/cricket/tournaments/${tid}/qualification-rules`;

test.afterAll(() => {
  const t = `(SELECT id FROM tournaments WHERE name LIKE 'S4B-${RUN}-%')`;
  dbExec(`DELETE FROM fixtures WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_stages WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN ${t}`);
  dbExec(`DELETE FROM audit_logs WHERE entity_public_id IN
          (SELECT public_id FROM tournaments WHERE name LIKE 'S4B-${RUN}-%')`);
  dbExec(`DELETE FROM tournaments WHERE name LIKE 'S4B-${RUN}-%'`);
});

test.describe("qualification rules — API", () => {

  test("defaults are ruling 2's own order", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract; desktop only");
    const api = await Api.login(config().a);
    const tid = await makeTournament(api);
    const r = await api.raw("get", rulesUrl(tid));
    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      teamsAdvancingPerGroup: 2,
      knockoutSeedingRule: "CROSS_GROUP",
      tieBreakOrder: ["POINTS", "NRR", "WINS", "HEAD_TO_HEAD"],
    });
    await api.dispose();
  });

  test("a change persists, reads back, and is audited with old and new", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract; desktop only");
    const api = await Api.login(config().a);
    const tid = await makeTournament(api);

    const put = await api.raw("put", rulesUrl(tid), {
      teamsAdvancingPerGroup: 1,
      knockoutSeedingRule: "GLOBAL_SEED",
      tieBreakOrder: ["POINTS", "WINS", "NRR"],
    });
    expect(put.status, JSON.stringify(put.body)).toBe(200);

    // read back over HTTP...
    const got = await api.raw("get", rulesUrl(tid));
    expect(got.body).toEqual({
      teamsAdvancingPerGroup: 1,
      knockoutSeedingRule: "GLOBAL_SEED",
      tieBreakOrder: ["POINTS", "WINS", "NRR"],
    });
    // ...and in the row itself, in the stored form
    expect(dbOne(`SELECT teams_advancing_per_group || '|' || knockout_seeding_rule
                  || '|' || tie_break_order FROM tournaments WHERE public_id = '${tid}'`))
      .toBe("1|GLOBAL_SEED|POINTS,WINS,NRR");

    const audit = dbOne(`SELECT details FROM audit_logs
                         WHERE entity_public_id = '${tid}'
                           AND action = 'TOURNAMENT_QUALIFICATION_RULES_UPDATED'
                         ORDER BY created_at DESC LIMIT 1`);
    expect(audit, "an audit row exists").toBeTruthy();
    expect(audit).toContain("CROSS_GROUP");   // the old value
    expect(audit).toContain("GLOBAL_SEED");   // the new one
    expect(audit).toContain("POINTS,NRR,WINS,HEAD_TO_HEAD");
    await api.dispose();
  });

  /**
   * Each refusal also asserts nothing was written. A 400 that half-applies is
   * worse than one that refuses, and the CHECK constraints behind this would
   * surface as a 500 rather than a 400 if the service let a bad value through.
   */
  test("bad rules are refused and write nothing", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract; desktop only");
    const api = await Api.login(config().a);
    const tid = await makeTournament(api);
    const before = dbOne(`SELECT teams_advancing_per_group || '|' || knockout_seeding_rule
                          || '|' || tie_break_order FROM tournaments WHERE public_id = '${tid}'`);

    const bad: [string, Record<string, unknown>][] = [
      ["unknown seeding rule", {
        teamsAdvancingPerGroup: 2, knockoutSeedingRule: "COIN_TOSS",
        tieBreakOrder: ["POINTS"] }],
      ["unknown tie-break", {
        teamsAdvancingPerGroup: 2, knockoutSeedingRule: "CROSS_GROUP",
        tieBreakOrder: ["POINTS", "VIBES"] }],
      ["repeated tie-break", {
        teamsAdvancingPerGroup: 2, knockoutSeedingRule: "CROSS_GROUP",
        tieBreakOrder: ["POINTS", "NRR", "POINTS"] }],
      ["empty tie-break list", {
        teamsAdvancingPerGroup: 2, knockoutSeedingRule: "CROSS_GROUP",
        tieBreakOrder: [] }],
      ["zero advancing", {
        teamsAdvancingPerGroup: 0, knockoutSeedingRule: "CROSS_GROUP",
        tieBreakOrder: ["POINTS"] }],
      ["nine advancing", {
        teamsAdvancingPerGroup: 9, knockoutSeedingRule: "CROSS_GROUP",
        tieBreakOrder: ["POINTS"] }],
    ];

    for (const [label, body] of bad) {
      const r = await api.raw("put", rulesUrl(tid), body);
      expect(r.status, `${label} must be a 400, not ${r.status}: ${JSON.stringify(r.body)}`)
        .toBe(400);
    }

    expect(dbOne(`SELECT teams_advancing_per_group || '|' || knockout_seeding_rule
                  || '|' || tie_break_order FROM tournaments WHERE public_id = '${tid}'`),
      "nothing was written by any of the refusals").toBe(before);
    expect(dbCount(`SELECT count(*) FROM audit_logs WHERE entity_public_id = '${tid}'
                    AND action = 'TOURNAMENT_QUALIFICATION_RULES_UPDATED'`),
      "a refusal must not audit").toBe(0);
    await api.dispose();
  });

  test("cross-tenant: B cannot read or write A's rules", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract; desktop only");
    const a = await Api.login(config().a);
    const b = await Api.login(config().b);
    const tid = await makeTournament(a);
    const before = dbOne(`SELECT teams_advancing_per_group || '|' || knockout_seeding_rule
                          || '|' || tie_break_order FROM tournaments WHERE public_id = '${tid}'`);

    expect((await b.raw("get", rulesUrl(tid))).status, "B reading A's rules").toBe(404);
    const put = await b.raw("put", rulesUrl(tid), {
      teamsAdvancingPerGroup: 8, knockoutSeedingRule: "GLOBAL_SEED",
      tieBreakOrder: ["WINS"] });
    expect(put.status, "B writing A's rules").toBe(404);

    expect(dbOne(`SELECT teams_advancing_per_group || '|' || knockout_seeding_rule
                  || '|' || tie_break_order FROM tournaments WHERE public_id = '${tid}'`),
      "A's rules are untouched").toBe(before);
    expect(dbCount(`SELECT count(*) FROM audit_logs WHERE entity_public_id = '${tid}'`),
      "nothing audited").toBe(0);
    // and A itself still works
    expect((await a.raw("get", rulesUrl(tid))).status).toBe(200);
    await a.dispose();
    await b.dispose();
  });

  /**
   * The rules are what advanceToKnockout reads, which is the whole point of
   * storing them. Proven by changing only the stored count and getting a
   * different bracket out of the same group stage — the request carries no
   * number any more.
   */
  test("advance-knockout reads the stored count, not a request parameter",
    async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract; desktop only");
    const api = await Api.login(config().a);
    const tid = await makeTournament(api, "GROUP_KNOCKOUT");

    for (let i = 0; i < 8; i++) {
      const r = await api.raw("post", `/api/admin/cricket/tournaments/${tid}/teams`, {
        name: `S4B Side ${i} ${RUN}`, shortName: `Q${i}`, colorHex: "#2563eb" });
      expect(r.status).toBe(200);
    }
    const gen = await api.raw("post",
      `/api/admin/cricket/tournaments/${tid}/fixtures/generate`, { teamsPerGroup: 4 });
    expect(gen.status, `generate: ${JSON.stringify(gen.body)}`).toBe(200);

    const knockoutCount = () =>
      dbCount(`SELECT count(*) FROM fixtures f
               JOIN tournament_stages s ON s.id = f.stage_id
               WHERE s.stage_type = 'KNOCKOUT'
                 AND f.tournament_id = (SELECT id FROM tournaments WHERE public_id = '${tid}')`);

    // Two groups of four, two advancing each = four qualifiers = two ties.
    const first = await api.raw("post",
      `/api/admin/cricket/tournaments/${tid}/advance-knockout`);
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect(knockoutCount(), "2 advancing per group from 2 groups = 2 ties").toBe(2);

    // Change only the stored rule; the request below is identical.
    dbExec(`DELETE FROM fixtures WHERE stage_id IN
            (SELECT id FROM tournament_stages WHERE stage_type = 'KNOCKOUT'
             AND tournament_id = (SELECT id FROM tournaments WHERE public_id = '${tid}'))`);
    const put = await api.raw("put", rulesUrl(tid), {
      teamsAdvancingPerGroup: 1,
      knockoutSeedingRule: "CROSS_GROUP",
      tieBreakOrder: ["POINTS", "NRR", "WINS", "HEAD_TO_HEAD"],
    });
    expect(put.status).toBe(200);

    const second = await api.raw("post",
      `/api/admin/cricket/tournaments/${tid}/advance-knockout`);
    expect(second.status, JSON.stringify(second.body)).toBe(200);
    expect(knockoutCount(), "1 advancing per group from 2 groups = 1 tie").toBe(1);
    await api.dispose();
  });
});

test.describe("qualification rules — Settings tab", () => {

  async function openSettings(page: Page, api: Api, tid: string) {
    await page.addInitScript((seed) => {
      for (const [k, v] of Object.entries(seed)) {
        window.localStorage.setItem(k, v as string);
      }
    }, api.storageSeed());
    await page.goto(`/admin/cricket/tournaments/${tid}`);
    await page.getByTestId("tournament-tab-settings").click();
    await expect(page.getByTestId("qualification-rules")).toBeVisible();
  }

  test("the rules are editable and save, on desktop and iPhone 14",
    async ({ page }, testInfo) => {
    const api = await Api.login(config().a);
    const tid = await makeTournament(api);
    await openSettings(page, api, tid);

    // Reorder: NRR above POINTS.
    await page.getByTestId("tie-break-NRR-up").click();
    // Drop head-to-head entirely.
    await page.getByTestId("tie-break-HEAD_TO_HEAD-toggle").click();
    // Switch the bracket rule.
    await page.getByTestId("seeding-GLOBAL_SEED").click();
    // And change the count.
    await page.getByTestId("teams-advancing-per-group").fill("3");

    await page.getByTestId("save-qualification-rules").click();
    await expect(page.getByText("Qualification rules saved")).toBeVisible();

    // Asserted in the row, not in the DOM: the point is that it persisted.
    expect(dbOne(`SELECT teams_advancing_per_group || '|' || knockout_seeding_rule
                  || '|' || tie_break_order FROM tournaments WHERE public_id = '${tid}'`),
      `saved on ${testInfo.project.name}`).toBe("3|GLOBAL_SEED|NRR,POINTS,WINS");
    await api.dispose();
  });

  test("the last tie-break cannot be removed", async ({ page }, testInfo) => {
    const api = await Api.login(config().a);
    const tid = await makeTournament(api);
    await openSettings(page, api, tid);

    for (const k of ["HEAD_TO_HEAD", "WINS", "NRR", "POINTS"]) {
      await page.getByTestId(`tie-break-${k}-toggle`).click();
    }
    // Three removed, the fourth refused — a table with no ordering rule is not a
    // table, and the server refuses an empty list too.
    await page.getByTestId("save-qualification-rules").click();
    await expect(page.getByText("Qualification rules saved")).toBeVisible();
    expect(dbOne(`SELECT tie_break_order FROM tournaments WHERE public_id = '${tid}'`),
      `one step survived on ${testInfo.project.name}`).toBe("POINTS");
    await api.dispose();
  });
});
