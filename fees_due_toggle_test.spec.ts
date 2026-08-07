import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5175";
const DASHBOARD = `${BASE}/admin`;

async function seedMocks(page: any) {
  await page.addInitScript(() => {
    localStorage.setItem("accessToken", "mock-token");
    localStorage.setItem("userRole", "ROLE_SUPER_ADMIN");
    localStorage.setItem("academyId", "mock-id");
    localStorage.setItem("academyPublicId", "mock-pub");
    localStorage.setItem("academyName", "Test Academy");
    localStorage.setItem("userName", "Test Admin");
  });

  // Use URL predicate (not glob) so /src/api/ module loads are NOT intercepted
  await page.route(
    (url: URL) => url.pathname.startsWith("/api/"),
    (route: any) => {
      const path = new URL(route.request().url()).pathname;

      if (path === "/api/public/resolve-tenant") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            academyPublicId: "mock-pub",
            name: "Test Academy",
            slug: "test",
            logoUrl: null,
            primaryColor: null,
            secondaryColor: null,
            tagline: null,
            description: null,
            contactEmail: null,
            contactPhone: null,
            city: "Bengaluru",
            currencyCode: "INR",
          }),
        });
      }

      if (path === "/api/admin/dashboard/summary") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            totalPlayers: 42,
            activePlayers: 38,
            todayPresent: 20,
            todayAbsent: 18,
            feesDueToday: 2,
            overdueFees: 1,
            totalBatches: 5,
            upcomingMatches: 2,
          }),
        });
      }

      if (path === "/api/admin/fees/collection-summary") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              playerPublicId: "p1",
              playerName: "Arjun Sharma",
              phone: "9876543210",
              parentsPhone: "9876543211",
              feePlanName: "Monthly Plan",
              feeStatus: "OVERDUE",
              planAmount: 2500,
              nextDueOn: "2026-07-15",
            },
            {
              playerPublicId: "p2",
              playerName: "Rohit Patel",
              phone: "9123456789",
              parentsPhone: null,
              feePlanName: "Quarterly Plan",
              feeStatus: "DUE",
              planAmount: 6000,
              nextDueOn: "2026-08-10",
            },
          ]),
        });
      }

      if (path === "/api/admin/settings/feature-flags") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "{}",
        });
      }

      // All other /api/ calls get an empty success response
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
    }
  );
}

test.describe("Fees Due card click-to-expand", () => {
  test("desktop 1280px — hidden by default, expands on click, collapses on second click", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedMocks(page);
    await page.goto(DASHBOARD);
    await page.waitForLoadState("networkidle");

    // Must be on the dashboard
    expect(page.url()).toContain("/admin");

    // Fees list section is hidden initially (showFeeList === false)
    await expect(
      page.locator("section").filter({ hasText: /Fees Due \(\d+\)/ })
    ).not.toBeVisible();

    // Click the Fees Due stat card (the div wrapping it has onClick)
    await page.getByText("Fees Due").first().click();
    await page.waitForTimeout(300);

    // List should appear with both mock rows
    const feeSection = page.locator("section").filter({ hasText: /Fees Due \(\d+\)/ });
    await expect(feeSection).toBeVisible();
    await expect(feeSection.getByText("Arjun Sharma")).toBeVisible();
    await expect(feeSection.getByText("Rohit Patel")).toBeVisible();

    // Chevron is rotated 180° (expanded state)
    await expect(page.locator(".rotate-180")).toBeVisible();

    // Click again — collapses
    await page.getByText("Fees Due").first().click();
    await page.waitForTimeout(300);
    await expect(feeSection).not.toBeVisible();
    await expect(page.locator(".rotate-180")).not.toBeVisible();

    console.log("✓ desktop 1280px: hidden → expanded (rows visible, chevron rotated) → collapsed");
  });

  test("mobile 390px — same toggle behaviour", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedMocks(page);
    await page.goto(DASHBOARD);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/admin");

    // Hidden by default
    await expect(
      page.locator("section").filter({ hasText: /Fees Due \(\d+\)/ })
    ).not.toBeVisible();

    // Expand
    await page.getByText("Fees Due").first().click();
    await page.waitForTimeout(300);
    await expect(
      page.locator("section").filter({ hasText: /Fees Due \(\d+\)/ })
    ).toBeVisible();

    // Collapse
    await page.getByText("Fees Due").first().click();
    await page.waitForTimeout(300);
    await expect(
      page.locator("section").filter({ hasText: /Fees Due \(\d+\)/ })
    ).not.toBeVisible();

    console.log("✓ mobile 390px: hidden → expanded → collapsed");
  });

  test("other stat cards unaffected — Fees Due click stays on same page", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedMocks(page);
    await page.goto(DASHBOARD);
    await page.waitForLoadState("networkidle");

    // Other stat cards must render
    await expect(page.getByText("Total Players")).toBeVisible();
    await expect(page.getByText("Active Players")).toBeVisible();
    await expect(page.getByText("Absent Today")).toBeVisible();
    await expect(page.getByText("Overdue Fees")).toBeVisible();

    // Clicking Fees Due card does NOT navigate away
    await page.getByText("Fees Due").first().click();
    await page.waitForTimeout(300);
    expect(page.url()).toBe(DASHBOARD);

    console.log("✓ other cards present and unaffected; URL stays at /admin");
  });
});
