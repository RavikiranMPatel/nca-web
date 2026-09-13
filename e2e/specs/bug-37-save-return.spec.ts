import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { createPlayer } from "../fixtures/createPlayer";
import { dbOne, dbExec } from "../fixtures/db";

/**
 * BUG-37 — `save()` returns a copy, and the argument stays detached.
 *
 * `BaseEntity` initialises `@Version` to `0`, so Spring Data's `isNew()` is
 * false even for a brand-new entity and `SimpleJpaRepository.save()` calls
 * `em.merge()` rather than `em.persist()`. `merge()` inserts a MANAGED COPY and
 * returns it, leaving the argument detached — so the generated primary key and
 * `@PrePersist`'s publicId land on the copy and never on the instance the caller
 * still holds.
 *
 * Slice 5 found it on a tournament create path. Slice 5b audited the rest: 26
 * call sites discard `save()`'s return and then read `getPublicId()` or
 * `getId()` off the argument. Twenty-three read a value that was already set
 * before the save, so they were harmless; three were not.
 *
 * This is the one a client can see. `FeeInstallmentService.recordPayment`
 * **returns** the payment it just created and `FeeInstallmentController`
 * serialises it straight back, so the create response carried `"id": null`. The
 * publicId is assigned by hand from a sequence a few lines earlier, which is
 * exactly what hid this: the log line printed a real id while the response did
 * not.
 *
 * `SaveReturnDiscardedTest` guards the whole class of mistake in the backend
 * suite. This proves one instance end to end, against a real row.
 *
 * Desktop only: an API and database contract with no viewport dimension.
 */

const RUN = `${Date.now() % 1000000}`;
const LABEL = `BUG37 ${RUN}`;

test.afterAll(() => {
  const players = `(SELECT id FROM players WHERE display_name LIKE '${LABEL}%')`;
  const plans = `(SELECT id FROM fee_installment_plans WHERE player_id IN ${players})`;
  const installments = `(SELECT id FROM fee_installments WHERE plan_id IN ${plans})`;
  dbExec(`DELETE FROM fee_installment_payments WHERE installment_id IN ${installments}`);
  dbExec(`DELETE FROM fee_installments WHERE plan_id IN ${plans}`);
  dbExec(`DELETE FROM fee_installment_plans WHERE player_id IN ${players}`);
  dbExec(`DELETE FROM player_career_stats WHERE player_id IN ${players}`);
  dbExec(`DELETE FROM player_batches WHERE player_id IN ${players}`);
  // audit_logs has no FK to players, so a PLAYER_CREATED row outlives the
  // player it describes — 10,491 had accumulated before anything checked.
  // Deleted here, BEFORE the players, while the ids still resolve.
  dbExec(`DELETE FROM audit_logs WHERE entity_id IN ${players}`);
  dbExec(`DELETE FROM players WHERE display_name LIKE '${LABEL}%'`);
  dbExec(`DELETE FROM batches WHERE name = '${LABEL} Batch'`);
});

test("BUG-37 a create response carries the generated id, not null",
  async ({ }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "API and DB contract, no viewport dimension");

  const api = await Api.login(config().a);

  const batch = await api.raw("post", "/api/admin/batches", {
    name: `${LABEL} Batch`, startTime: "06:00:00", endTime: "08:00:00", active: true,
  });
  expect(batch.status, "create a batch (player creation requires one)").toBeLessThan(400);

  const { publicId: playerPublicId } = await createPlayer(api, {
    displayName: `${LABEL} Payer`,
    gender: "MALE",
    profession: "STUDENT",
    dob: "2010-03-04",
    phone: `7${RUN}0`.slice(0, 10),
    joiningDate: "2026-01-15",
    batchIds: [(batch.body as any).id as string],
  }, `${LABEL} Payer`);

  const plan = await api.raw("post", "/api/admin/fee-installments/plans", {
    playerPublicId, totalAmount: 3000, description: `${LABEL} plan`,
  });
  expect(plan.status, "create the installment plan").toBe(200);
  const planPublicId = (plan.body as any).publicId as string;

  const installment = await api.raw("post", "/api/admin/fee-installments/installments", {
    planPublicId, dueDate: "2026-02-01", dueAmount: 1000, notes: `${LABEL} first`,
  });
  expect(installment.status, "add an installment").toBe(200);
  const installmentPublicId = (installment.body as any).publicId as string;

  // ── the create whose response was wrong ───────────────────────────────────
  const pay = await api.raw("post", "/api/admin/fee-installments/payments", {
    installmentPublicId, amount: 1000, paymentMode: "CASH",
    referenceNumber: `${LABEL}-ref`, notes: `${LABEL} payment`,
  });
  expect(pay.status, "record the payment").toBe(200);
  const body = pay.body as Record<string, unknown>;

  // The regression. Before the fix this was null: the row was inserted from the
  // managed copy, and the copy is not what was serialised.
  expect(body.id, "the create response must carry the generated primary key")
    .toBeTruthy();
  expect(body.publicId, "and the publicId, which was always set by hand")
    .toBeTruthy();

  // And it is the id of the row that was actually written, not merely non-null.
  const rowId = dbOne(
    `SELECT id::text FROM fee_installment_payments
      WHERE reference_number = '${LABEL}-ref'`);
  expect(rowId, "exactly one payment row was written").toBeTruthy();
  expect(String(body.id), "the response id is the persisted row's id").toBe(rowId);

  const rowPublicId = dbOne(
    `SELECT public_id FROM fee_installment_payments
      WHERE reference_number = '${LABEL}-ref'`);
  expect(body.publicId).toBe(rowPublicId);

  await api.dispose();
});
