import { Api } from "./api";
import type { Tenant } from "./env";

/**
 * BUG-07/BUG-08 needed a real ROLE_SCORER token, and unlike COACH/SUPER_ADMIN
 * (seeded directly, once, because no app path could create them at the time —
 * see SESSION-HANDOFF.md) createAdmin could ALWAYS create this role. So this
 * provisions and tears down its own scorer per test, through the real API,
 * rather than adding a third permanent seeded row: every other spec in this
 * suite asserts an exact user count against a fixed baseline (7), and a
 * permanent addition here would mean hunting down and updating every one of
 * them instead of just this file.
 *
 * Shared between bug-07-08-scorer-role.spec.ts and any later spec needing a
 * real SCORER token (e.g. the wagon-wheel-toggle scope check) — was defined
 * privately in the former until the latter needed the identical helper.
 */
export async function createScorer(tenant: Tenant, superAdmin: Tenant) {
  const admin = await Api.login(superAdmin);
  const branches = await admin.raw("get", "/api/admin/branches");
  const branchId = (branches.body as Array<{ id: string }>)[0]?.id;
  if (!branchId) throw new Error(`No branch found for ${superAdmin.slug} to assign the scorer to`);

  const email = `e2e-scorer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = "Tt1!ScorerPass9";
  const created = await admin.raw("post", "/api/admin/users", {
    name: "E2E Scorer", email, password, role: "ROLE_SCORER", branchId,
  });
  if (created.status !== 200) {
    await admin.dispose();
    throw new Error(`Failed to create scorer: ${created.status} ${JSON.stringify(created.body)}`);
  }
  const publicId = (created.body as { publicId: string }).publicId;
  const scorer = await Api.login({ ...tenant, email, password });
  return { scorer, adminApi: admin, publicId };
}

export async function destroyScorer(fx: { adminApi: Api; publicId: string }) {
  await fx.adminApi.raw("delete", `/api/admin/users/${fx.publicId}`);
  await fx.adminApi.dispose();
}
