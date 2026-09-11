import { test, expect } from "@playwright/test";
import { createKitPlayers } from "../fixtures/kitPlayers";

/**
 * Regression cover for the per-player Kit tab.
 *
 * Written when the kit form was extracted into components/kit/KitDetailsForm so
 * the Kit tab and the Kit / Merchandise list share one editor. The tab had no
 * browser coverage at all before that, which made the extraction unverifiable;
 * these assertions are what make it safe.
 */

test.describe("Kit tab (Player Overview → Kit)", () => {
  test("renders, saves a new season, and reads it back", async ({ page }, testInfo) => {
    const fx = await createKitPlayers({ count: 1, label: "KitTab" });
    const { api } = fx;
    const SEASON = fx.season;
    const player = fx.players[0];
  try {

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
  } finally {
    await fx.destroy();
  }
  });

  test("BUG-23: Add New Season starts blank even when the current season is delivered", async ({ page }, testInfo) => {
    const fx = await createKitPlayers({ count: 1, label: "Bug23" });
    const { api } = fx;
    const player = fx.players[0];
    const shot = (n: string) =>
      page.screenshot({ path: `e2e/.artifacts/bug23-${testInfo.project.name}-${n}.png`, fullPage: true });
  try {

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

  } finally {
    await fx.destroy();
  }
  });
});