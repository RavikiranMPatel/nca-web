import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";

/**
 * Regression cover for the per-player Kit tab.
 *
 * Written when the kit form was extracted into components/kit/KitDetailsForm so
 * the Kit tab and the Kit / Merchandise list share one editor. The tab had no
 * browser coverage at all before that, which made the extraction unverifiable;
 * these assertions are what make it safe.
 */
// Each project gets its own player, and every run gets a season no previous run
// has used. Two separate hazards:
//   - projects run concurrently, so a shared player+season means two runs writing
//     one player_kit_details row;
//   - a FIXED season makes the spec non-idempotent, because the second run finds
//     the row the first one left and inherits its flags.
// A run-unique season removes both. Season is VARCHAR(10) on the backend.
const RUN = `9${Date.now() % 100000}`;
const PROJECT_ORDER = ["desktop", "mobile", "mobile-chrome"];

test.describe("Kit tab (Player Overview → Kit)", () => {
  test("renders, saves a new season, and reads it back", async ({ page }, testInfo) => {
    const env = config();
    const api = await Api.login(env.a);
    const SEASON = RUN;

    const players = await api.raw("get", "/api/admin/players");
    const mine = (players.body as any[])
      .filter((p) => p.displayName?.startsWith("KitTest A"))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    const idx = PROJECT_ORDER.indexOf(testInfo.project.name);
    const player = mine[idx >= 0 ? idx : 0];
    expect(player, "seeded KitTest players must exist").toBeTruthy();

    await page.addInitScript((seed) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v as string);
    }, api.storageSeed());

    await page.goto(`/admin/players/${player.publicId}/kit`);

    // Add New Season opens the shared editor.
    await page.getByRole("button", { name: "+ Add New Season" }).click();
    await expect(page.getByTestId("kit-tab-form")).toBeVisible();

    await page.getByTestId("kit-tab-season").fill(SEASON);
    await page.getByTestId("kit-tab-tshirt-size").selectOption("XL");
    await page.getByTestId("kit-tab-trouser-size").selectOption("L");
    await page.getByTestId("kit-tab-jersey-name").fill("EXTRACTION");
    await page.getByTestId("kit-tab-jersey-number").fill("99");
    // Set all three explicitly. "+ Add New Season" repopulates the form from the
    // selected season's kit (PlayerKitPage's load effect fires on the season it
    // sets), so leaving any box untouched would inherit whatever that row had.
    await page.getByTestId("kit-tab-tshirt-given").uncheck();
    await page.getByTestId("kit-tab-trouser-given").uncheck();
    await page.getByTestId("kit-tab-cap-given").check();

    await page.getByRole("button", { name: "Save Kit Details" }).click();
    await expect(page.getByTestId("kit-tab-form")).toBeHidden();

    // Server is the source of truth — assert the round trip, not the DOM alone.
    const saved = await api.raw("get",
      `/api/admin/players/${player.publicId}/kit?season=${SEASON}`);
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({
      seasonYear: SEASON, tshirtSize: "XL", trouserSize: "L",
      jerseyName: "EXTRACTION", jerseyNumber: "99", capGiven: true,
      deliveryStatus: "PARTIAL",
    });

    await page.screenshot({ path: `e2e/.artifacts/kit-tab-${testInfo.project.name}.png`, fullPage: true });
    await api.dispose();
  });
});
