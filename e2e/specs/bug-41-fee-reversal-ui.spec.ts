import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { createFeePayment, type FeePaymentFixture } from "../fixtures/feePayment";
import { dbOne, dbCount } from "../fixtures/db";

/**
 * BUG-41 — the fee-reversal UI, under real rendering.
 *
 * Last session's BUG-41 verification (`bug-41-fee-reversal-parity.spec.ts`)
 * proved the three consolidated behaviours at the API level only. This proves
 * the SAME endpoint's UI consumer still behaves once a browser actually
 * renders it: the button reaches the real handler (including the native
 * `window.prompt()` `handleReverse` reads its reason from — Playwright's
 * `page.on("dialog")` supplies it, the standard way to drive a prompt() in a
 * controlled test browser), the success toast appears, and the reversal row
 * renders as the filtered, non-actionable "Reversed" line PlayerFeesTab
 * always drew it as — not as a second payment a user could act on.
 *
 * Setup is the same split as the API spec and for the same reason: `/reverse`
 * is SUPER_ADMIN-only, and both seeded SUPER_ADMIN accounts here are
 * deliberately branchless (BUG-25 test data) — batches, fee plans and
 * payments all need a branched actor to create, so setup runs as ADMIN and
 * only the reversal click runs as SUPER_ADMIN.
 */

let F: FeePaymentFixture;
let superAdmin: Api;

test.beforeAll(async ({}, testInfo) => {
  F = await createFeePayment({ label: "Bug41Ui" });
  superAdmin = await Api.login(config().aSuperAdmin);
});

test.afterAll(async () => {
  await superAdmin?.dispose();
  await F?.destroy();
});

test("reversing from the UI: the button, the toast, and the row that stays filtered out",
  async ({ page }, testInfo) => {
    test.setTimeout(60_000);

    await page.addInitScript((seed) => {
      for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, v as string);
    }, superAdmin.storageSeed());
    await page.goto(`/admin/players/${F.playerPublicId}/fees`);

    const isDesktop = testInfo.project.name === "desktop";
    const row = page.getByTestId(
      isDesktop ? `fee-row-${F.paymentPublicId}` : `fee-row-mobile-${F.paymentPublicId}`,
    );
    await expect(row, "the payment is rendered before anything is clicked").toBeVisible();

    const statusBefore = page.getByTestId(
      isDesktop ? `fee-status-${F.paymentPublicId}` : `fee-status-mobile-${F.paymentPublicId}`,
    );
    await expect(statusBefore).toHaveText("Paid");

    // handleReverse reads its reason from window.prompt(). Playwright auto-
    // dismisses a dialog it has no handler for, which handleReverse reads as
    // a blank reason and aborts (`if (!reason) return;`) — so a handler that
    // supplies text is not optional here, it is what lets the click do
    // anything at all.
    page.once("dialog", (dialog) => dialog.accept("BUG-41 UI verification"));

    const reverseButton = page.getByTestId(
      isDesktop
        ? `fee-reverse-desktop-${F.paymentPublicId}`
        : `fee-reverse-mobile-${F.paymentPublicId}`,
    );
    await expect(reverseButton, "the Reverse action is offered").toBeVisible();
    await reverseButton.click();

    await expect(page.getByText("Payment reversed"), "the success toast appears")
      .toBeVisible({ timeout: 15_000 });

    // PlayerFeesTab reloads the list after a successful reversal (`loadAll()`
    // in handleReverse) — wait for the badge to actually flip rather than
    // asserting against a state the reload might not have landed yet.
    const statusAfter = page.getByTestId(
      isDesktop ? `fee-status-${F.paymentPublicId}` : `fee-status-mobile-${F.paymentPublicId}`,
    );
    await expect(statusAfter, "the original payment now reads Reversed")
      .toHaveText("⊘ Reversed", { timeout: 15_000 });

    // The Reverse (and Edit Date) actions disappear once reversed — nothing
    // left to act on twice.
    await expect(reverseButton, "the button that just fired is gone").toHaveCount(0);

    // The reversal itself never gets its OWN actionable row. This is the
    // "stays filtered out of the fee list" behaviour, confirmed against the
    // real render rather than the raw API list: fee-row-* is only ever
    // applied to rows the component filters `type !== "REVERSAL"` into, so a
    // reversal's own public id must never appear as one.
    const reversalPublicId = dbOne(`SELECT public_id FROM fee_payments
      WHERE reversed_payment_id = (SELECT id FROM fee_payments WHERE public_id = '${F.paymentPublicId}')`);
    await expect(
      page.getByTestId(isDesktop ? `fee-row-${reversalPublicId}` : `fee-row-mobile-${reversalPublicId}`),
      "the reversal has no actionable row of its own",
    ).toHaveCount(0);

    // And the negative amount really did land — confirming the UI's flow
    // reached the same backend fix the API spec proved, not a stubbed path.
    expect(Number(dbOne(`SELECT amount FROM fee_payments WHERE public_id = '${reversalPublicId}'`)),
      "the reversal recorded through the UI is a true contra entry").toBeLessThan(0);
    expect(dbCount(`SELECT COUNT(*) FROM fee_payments
      WHERE reversed_payment_id = (SELECT id FROM fee_payments WHERE public_id = '${F.paymentPublicId}')`),
      "exactly one reversal, from exactly one click").toBe(1);
  });
