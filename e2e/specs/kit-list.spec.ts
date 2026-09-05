import { test, expect, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";

/**
 * Kit / Merchandise list: filter, inline edit, bulk mark delivered, export.
 *
 * Each project owns its own season so the projects, which run concurrently,
 * never write the same player_kit_details row. Sharing one produced a failure
 * that looked like an app bug when kit-tab.spec.ts was first written.
 */
// One season per run, not a fixed one: a fixed season makes the spec
// non-idempotent, since the next run finds the rows this one delivered and the
// status filters no longer match. Season is VARCHAR(10) on the backend.
const RUN = `8${Date.now() % 100000}`;

/** Players are seeded once outside Playwright; read them back rather than create. */
async function kitPlayers(api: Api) {
  const res = await api.raw("get", "/api/admin/players");
  return (res.body as any[])
    .filter((p) => p.displayName?.startsWith("KitTest A"))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

test.describe("Kit / Merchandise list", () => {
  test("filters, edits inline, bulk-marks and exports", async ({ page }, testInfo) => {
    const env = config();
    const api = await Api.login(env.a);
    const SEASON = RUN;
    const shot = (n: string) =>
      page.screenshot({ path: `e2e/.artifacts/kit-list-${testInfo.project.name}-${n}.png`, fullPage: true });

    const players = await kitPlayers(api);
    expect(players.length, "seeded KitTest A players").toBeGreaterThanOrEqual(5);

    // Give this project's season a known starting shape: two players sized, none delivered.
    for (const p of players.slice(0, 2)) {
      const r = await api.raw("post", `/api/admin/players/${p.publicId}/kit`, {
        seasonYear: SEASON, tshirtSize: "M", trouserSize: "S",
        capGiven: false, tshirtGiven: false, trouserGiven: false,
      });
      expect(r.status).toBe(200);
    }

    await page.addInitScript((seed) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v as string);
    }, api.storageSeed());

    // The season selector is populated from seasons that already have kit rows,
    // so the seeding above must happen before the page loads.
    await page.goto("/admin/kit/list");
    await expect(page.getByTestId("kit-list-page")).toBeVisible();
    // The season selector is filled by a separate request; selecting before it
    // resolves re-renders the <select> out from under the click.
    await expect(page.getByTestId("kit-list-season")
      .locator(`option[value="${SEASON}"]`)).toHaveCount(1);
    await page.getByTestId("kit-list-season").selectOption(SEASON);
    await expect(page.getByTestId("kit-list-table")).toBeVisible();
    await shot("01-loaded");

    // ── every seeded player appears, including those with no kit row ────────
    for (const p of players.slice(0, 5)) {
      await expect(page.getByTestId(`kit-row-${p.publicId}`)).toBeVisible();
    }
    await expect(page.getByTestId(`kit-status-${players[4].publicId}`)).toHaveText("Not delivered");

    // Wait for THIS season's rows before filtering on status. Selecting the
    // season triggers a fetch; until it lands the table still shows the previous
    // season's statuses, and a status filter applied to them hides rows that are
    // NOT_DELIVERED in the season under test. That is what failed on mobile in
    // the 2026-09-05 full run, and only under load, when the fetch was slow.
    await expect(page.getByTestId(`kit-status-${players[0].publicId}`)).toHaveText("Not delivered");
    await expect(page.getByTestId(`kit-status-${players[1].publicId}`)).toHaveText("Not delivered");

    // ── filter by status ───────────────────────────────────────────────────
    await page.getByTestId("kit-filter-status").selectOption("NOT_DELIVERED");
    await expect(page.getByTestId(`kit-row-${players[0].publicId}`)).toBeVisible();
    await page.getByTestId("kit-filter-status").selectOption("DELIVERED");
    await expect(page.getByTestId("kit-list-empty")).toBeVisible();
    await shot("02-filter-delivered-empty");
    await page.getByTestId("kit-filter-status").selectOption("all");

    // ── inline edit through the shared drawer ──────────────────────────────
    await page.getByTestId(`kit-edit-${players[0].publicId}`).click();
    await expect(page.getByTestId("kit-drawer")).toBeVisible();
    await expect(page.getByTestId("kit-drawer-season")).toBeDisabled();  // locked to this row's season
    await page.getByTestId("kit-drawer-tshirt-size").selectOption("XXL");
    await page.getByTestId("kit-drawer-jersey-name").fill("DRAWER");
    await shot("03-drawer");
    await page.getByTestId("kit-drawer-save").click();
    await expect(page.getByTestId("kit-drawer")).toBeHidden();
    await expect(page.getByTestId(`kit-tshirt-${players[0].publicId}`)).toHaveText("XXL");

    // Same row through the per-player endpoint the Kit tab uses — one write path.
    const back = await api.raw("get",
      `/api/admin/players/${players[0].publicId}/kit?season=${SEASON}`);
    expect(back.body).toMatchObject({ tshirtSize: "XXL", jerseyName: "DRAWER" });

    // ── bulk mark delivered ────────────────────────────────────────────────
    await page.getByTestId(`kit-select-${players[0].publicId}`).check();
    await page.getByTestId(`kit-select-${players[1].publicId}`).check();
    await expect(page.getByTestId("kit-selected-count")).toHaveText("2 selected");
    await page.getByTestId("kit-bulk-deliver").click();
    await expect(page.getByTestId(`kit-status-${players[0].publicId}`)).toHaveText("Delivered");
    await expect(page.getByTestId(`kit-status-${players[1].publicId}`)).toHaveText("Delivered");
    await expect(page.getByTestId(`kit-status-${players[2].publicId}`)).toHaveText("Not delivered");
    await shot("04-bulk-delivered");

    // ── export is a real, non-empty xlsx ───────────────────────────────────
    const ctx: APIRequestContext = api.ctx;
    const dl = await ctx.get(`/api/admin/kit/list/export?season=${SEASON}`);
    expect(dl.status()).toBe(200);
    const body = await dl.body();
    expect(body.length).toBeGreaterThan(2000);
    expect(body.subarray(0, 2).toString("latin1")).toBe("PK");   // xlsx = zip
    fs.writeFileSync(`e2e/.artifacts/kit-export-${testInfo.project.name}.xlsx`, body);

    await api.dispose();
  });
});
