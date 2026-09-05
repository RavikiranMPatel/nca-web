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

/** Players are seeded outside Playwright; read them back rather than create. */
async function kitPlayersA(api: Api) {
  const res = await api.raw("get", "/api/admin/players");
  return (res.body as any[])
    .filter((p) => p.displayName?.startsWith("KitTest A"))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

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

  test("BUG-23: Add New Season starts blank even when the current season is delivered", async ({ page }, testInfo) => {
    const env = config();
    const api = await Api.login(env.a);
    const shot = (n: string) =>
      page.screenshot({ path: `e2e/.artifacts/bug23-${testInfo.project.name}-${n}.png`, fullPage: true });

    const players = await kitPlayersA(api);
    const idx = PROJECT_ORDER.indexOf(testInfo.project.name);
    const player = players[(idx >= 0 ? idx : 0) + 5];   // distinct from the list spec's first five
    expect(player).toBeTruthy();

    // The season startAddNew defaults to is the current year, which is exactly
    // the one it used to inherit from. Seed that year fully delivered.
    const CURRENT = new Date().getFullYear().toString();
    const NEXT = (Number(CURRENT) + 1).toString();
    const r = await api.raw("post", `/api/admin/players/${player.publicId}/kit`, {
      seasonYear: CURRENT, tshirtSize: "XXL", trouserSize: "XXL",
      jerseyName: "OLD", jerseyNumber: "1",
      capGiven: true, tshirtGiven: true, trouserGiven: true,
    });
    expect(r.status).toBe(200);
    expect((r.body as any).deliveryStatus).toBe("DELIVERED");

    await page.addInitScript((seed) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v as string);
    }, api.storageSeed());
    await page.goto(`/admin/players/${player.publicId}/kit`);

    await page.getByRole("button", { name: "+ Add New Season" }).click();
    await expect(page.getByTestId("kit-tab-form")).toBeVisible();
    await shot("01-blank-form");

    // The form must be blank — this is the whole bug.
    await expect(page.getByTestId("kit-tab-tshirt-size")).toHaveValue("");
    await expect(page.getByTestId("kit-tab-trouser-size")).toHaveValue("");
    await expect(page.getByTestId("kit-tab-jersey-name")).toHaveValue("");
    await expect(page.getByTestId("kit-tab-jersey-number")).toHaveValue("");
    await expect(page.getByTestId("kit-tab-tshirt-given")).not.toBeChecked();
    await expect(page.getByTestId("kit-tab-trouser-given")).not.toBeChecked();
    await expect(page.getByTestId("kit-tab-cap-given")).not.toBeChecked();

    await page.getByTestId("kit-tab-season").fill(NEXT);
    await page.getByTestId("kit-tab-tshirt-size").selectOption("S");
    await page.getByRole("button", { name: "Save Kit Details" }).click();
    await expect(page.getByTestId("kit-tab-form")).toBeHidden();

    // New season carries nothing across.
    const created = await api.raw("get", `/api/admin/players/${player.publicId}/kit?season=${NEXT}`);
    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({
      seasonYear: NEXT, tshirtSize: "S",
      tshirtGiven: false, trouserGiven: false, capGiven: false,
      deliveryStatus: "NOT_DELIVERED", deliveredAt: null,
    });

    // And the season it used to copy from is untouched.
    const old = await api.raw("get", `/api/admin/players/${player.publicId}/kit?season=${CURRENT}`);
    expect(old.body).toMatchObject({
      seasonYear: CURRENT, tshirtSize: "XXL", jerseyName: "OLD",
      tshirtGiven: true, trouserGiven: true, capGiven: true, deliveryStatus: "DELIVERED",
    });

    await api.dispose();
  });
});