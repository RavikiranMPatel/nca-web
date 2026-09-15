import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { createFeePayment, type FeePaymentFixture } from "../fixtures/feePayment";
import { dbOne, dbCount } from "../fixtures/db";

/**
 * BUG-41 — the surviving endpoint gets the three behaviours the dead one had.
 *
 * `/api/super-admin/fees/reverse` never worked (`@RequestAttribute("user")` with
 * nothing setting the attribute) and `/api/admin/fees/reverse` is the endpoint
 * everything actually calls. Deleting the dead one was ruled out last session:
 * it was NOT a subset of the live one, and deleting it would have silently
 * dropped a double-reversal guard and the only audit row that could name the
 * reversal it created. This session's ruling was to bring those behaviours INTO
 * the live path instead, then delete the dead code once parity is real.
 *
 * Three additions, verified here:
 *
 *   1. A payment that already has a reversal cannot be reversed again — 409.
 *   2. FEE_PAYMENT_REVERSED carries originalAmount, originalPaidOn,
 *      originalPublicId and reversalPublicId, and critical: true — not just
 *      "reason".
 *   3. The reversal amount is negated — a true contra entry, not a copy.
 *
 * (3) needed no test of its own beyond a DB read: the only UI list of payments
 * filters `type !== "REVERSAL"` before rendering, and no backend query sums
 * FeePayment.amount across a player's rows (checked directly), so there is no
 * behaviour to observe through the API — only the stored value to confirm.
 *
 * Setup runs as ADMIN and the reversal as SUPER_ADMIN, deliberately not the
 * same actor: `/reverse` is SUPER_ADMIN-only, and both academy A's seeded
 * SUPER_ADMIN accounts are deliberately branchless test data for BUG-25.
 * `batches`, `fee_plans` and `fee_payments` are all NOT NULL on branch_id with
 * no fallback, so setup has to be the branched ADMIN.
 */

test.describe.configure({ mode: "serial" });

let F: FeePaymentFixture;
let superAdmin: Api;

test.beforeAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  F = await createFeePayment({ label: "Bug41" });
  superAdmin = await Api.login(config().aSuperAdmin);
});

test.afterAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  await superAdmin?.dispose();
  await F?.destroy();
});

test.describe("BUG-41 — fee reversal parity", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one fixture per run");
  });

  test("reversing once succeeds, negates the amount, and writes a full audit row", async () => {
    const before = dbOne(`SELECT amount FROM fee_payments WHERE public_id = '${F.paymentPublicId}'`);
    expect(Number(before), "the original payment is positive").toBeGreaterThan(0);

    const r = await superAdmin.raw("post",
      `/api/admin/fees/reverse?paymentId=${F.paymentPublicId}&reason=BUG-41+parity+test`, {});
    expect(r.status, `reverse: ${JSON.stringify(r.body)}`).toBeLessThan(300);

    const reversalRow = dbOne(`SELECT amount FROM fee_payments
      WHERE reversed_payment_id = (SELECT id FROM fee_payments WHERE public_id = '${F.paymentPublicId}')`);
    expect(Number(reversalRow), "the reversal is a contra entry — negative, not a copy")
      .toBe(-Number(before));

    const reversalPublicId = dbOne(`SELECT public_id FROM fee_payments
      WHERE reversed_payment_id = (SELECT id FROM fee_payments WHERE public_id = '${F.paymentPublicId}')`);

    const audit = dbOne(`SELECT details::text FROM audit_logs
      WHERE action = 'FEE_PAYMENT_REVERSED'
        AND entity_public_id = '${F.paymentPublicId}'
      ORDER BY created_at DESC LIMIT 1`);
    const details = JSON.parse(audit);
    expect(details.originalPublicId, "names the payment it reversed").toBe(F.paymentPublicId);
    expect(details.reversalPublicId, "names the reversal it created — this is the row " +
      "the dead path's BUG-37 comment was about: nothing else can prove it exists")
      .toBe(reversalPublicId);
    expect(Number(details.originalAmount), "records the original amount").toBe(Number(before));
    expect(details.originalPaidOn, "records when the original was paid").toBeTruthy();
    expect(details.critical, "flagged as a critical financial correction").toBe(true);
    expect(details.reason, "still carries the reason").toContain("BUG-41");
  });

  test("reversing the same payment again is refused, and nothing new is written", async () => {
    const reversalCountBefore = dbCount(`SELECT COUNT(*) FROM fee_payments
      WHERE reversed_payment_id = (SELECT id FROM fee_payments WHERE public_id = '${F.paymentPublicId}')`);
    expect(reversalCountBefore, "the first reversal is already there").toBe(1);

    const again = await superAdmin.raw("post",
      `/api/admin/fees/reverse?paymentId=${F.paymentPublicId}&reason=second+attempt`, {});
    expect(again.status,
      `a payment that already has a reversal must refuse a second one: ${JSON.stringify(again.body)}`)
      .toBe(409);
    expect(JSON.stringify(again.body), "and say why").toContain("already reversed");

    const reversalCountAfter = dbCount(`SELECT COUNT(*) FROM fee_payments
      WHERE reversed_payment_id = (SELECT id FROM fee_payments WHERE public_id = '${F.paymentPublicId}')`);
    expect(reversalCountAfter, "still exactly one reversal — the refusal wrote nothing")
      .toBe(1);
  });

  test("the payments list a real UI would render is unaffected by the negative amount", async () => {
    // Confirms the user's own stated reasoning, rather than taking it on faith:
    // the reversal is present in the raw list (so it IS retrievable), and it
    // carries a negative amount and a link back to the original — exactly what
    // PlayerFeesTab needs to filter it out and render "⊘ Reversed" on the
    // original row, which is the behaviour already shipped and unaffected here.
    const list = await F.admin.raw("get", `/api/admin/fees/payments?playerPublicId=${F.playerPublicId}`, {});
    expect(list.status).toBe(200);
    const rows = list.body as any[];
    const original = rows.find((p) => p.publicId === F.paymentPublicId);
    const reversal = rows.find((p) => p.type === "REVERSAL");
    expect(original, "the original payment is still in the list").toBeTruthy();
    expect(reversal, "the reversal is too — it is the UI's job to filter it, not the API's")
      .toBeTruthy();
    expect(Number(reversal.amount), "the list carries the negative amount as stored")
      .toBeLessThan(0);
    expect(reversal.reversedPaymentPublicId, "linked back to the original")
      .toBe(F.paymentPublicId);
  });
});
