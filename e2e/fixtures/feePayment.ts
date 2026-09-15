import { expect } from "@playwright/test";
import { Api } from "./api";
import { config, type Tenant } from "./env";
import { dbExec } from "./db";
import { createPlayer } from "./createPlayer";
import { newFixtureTag, newPhoneTrunk, fixturePhone } from "./tag";

/**
 * A player with an active fee account and one recorded NORMAL payment, built
 * through the real API.
 *
 * The reversal endpoint is SUPER_ADMIN-only, but everything up to the payment
 * is created as ADMIN. This is not a convenience — both SUPER_ADMIN accounts
 * seeded in this environment are deliberately branchless (SESSION-HANDOFF's
 * BUG-25 test data), and `batches`, `fee_plans` and `fee_payments` are all
 * NOT NULL on branch_id with no fallback, so any of these creates would 400
 * under a branchless actor. The reversal call itself is made separately, by
 * whichever tenant the caller passes as `superAdmin`.
 */
export interface FeePaymentFixture {
  admin: Api;
  tag: string;
  playerPublicId: string;
  feePlanPublicId: string;
  feeAccountPublicId: string;
  paymentPublicId: string;
  destroy(): Promise<void>;
}

export async function createFeePayment(
  opts: { tenant?: Tenant; label?: string; amount?: number } = {},
): Promise<FeePaymentFixture> {
  const env = config();
  const admin = await Api.login(opts.tenant ?? env.a);
  const tag = newFixtureTag();
  const label = opts.label ?? "FeeReversal";

  try {
    return await build(admin, tag, label, opts.amount ?? 1000);
  } catch (e) {
    await removeEverything(tag, label).catch(() => { /* best effort */ });
    await admin.dispose().catch(() => { /* already gone */ });
    throw e;
  }
}

function removeEverything(tag: string, label: string): void {
  const like = `${label} ${tag}%`;
  dbExec(`DELETE FROM audit_logs WHERE entity_id IN
            (SELECT id FROM fee_payments WHERE reference_number LIKE '${like}%'
             OR player_id IN (SELECT id FROM players WHERE display_name LIKE '${like}'))
          OR entity_id IN (SELECT id FROM players WHERE display_name LIKE '${like}')`);
  dbExec(`DELETE FROM fee_payments WHERE player_id IN
            (SELECT id FROM players WHERE display_name LIKE '${like}')`);
  dbExec(`DELETE FROM fee_accounts WHERE player_id IN
            (SELECT id FROM players WHERE display_name LIKE '${like}')`);
  dbExec(`DELETE FROM player_career_stats WHERE player_id IN
            (SELECT id FROM players WHERE display_name LIKE '${like}')`);
  dbExec(`DELETE FROM player_batches WHERE player_id IN
            (SELECT id FROM players WHERE display_name LIKE '${like}')`);
  dbExec(`DELETE FROM players WHERE display_name LIKE '${like}'`);
  dbExec(`DELETE FROM fee_plans WHERE name LIKE '${like}'`);
  dbExec(`DELETE FROM batches WHERE name LIKE '${like}'`);
}

async function build(
  admin: Api, tag: string, label: string, amount: number,
): Promise<FeePaymentFixture> {
  const batch = await admin.raw("post", "/api/admin/batches", {
    name: `${label} ${tag} Batch`, startTime: "06:00:00", endTime: "08:00:00", active: true,
  });
  expect(batch.status, "create batch").toBeLessThan(400);
  const batchId = (batch.body as any).id as string;

  const phoneTrunk = newPhoneTrunk();
  const { publicId: playerPublicId } = await createPlayer(admin, {
    displayName: `${label} ${tag} Player`, gender: "MALE", profession: "STUDENT",
    dob: "2010-05-05", phone: fixturePhone(phoneTrunk, 0),
    joiningDate: "2026-01-15", batchIds: [batchId],
  }, `${label} ${tag} Player`);

  const plan = await admin.raw("post", "/api/admin/fees/plans", {
    name: `${label} ${tag} Plan`, amount, durationDays: 30, campType: "REGULAR",
  });
  expect(plan.status, "create fee plan").toBeLessThan(400);
  const feePlanPublicId = (plan.body as any).publicId as string;

  const account = await admin.raw("post",
    `/api/admin/fees/accounts/assign?playerPublicId=${playerPublicId}&feePlanPublicId=${feePlanPublicId}`,
    undefined);
  expect(account.status, "assign the fee plan").toBeLessThan(400);
  const feeAccountPublicId = (account.body as any).publicId as string;

  const payment = await admin.raw("post",
    `/api/admin/fees/pay?feeAccountPublicId=${feeAccountPublicId}&paymentMode=CASH`,
    undefined);
  expect(payment.status, `record the payment: ${JSON.stringify(payment.body)}`).toBeLessThan(400);
  const paymentPublicId = (payment.body as any).publicId as string;

  return {
    admin, tag, playerPublicId, feePlanPublicId, feeAccountPublicId, paymentPublicId,
    async destroy() {
      await removeEverything(tag, label);
      await admin.dispose();
    },
  };
}
