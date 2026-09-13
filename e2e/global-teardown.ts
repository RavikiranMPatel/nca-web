import { dbCount } from "./fixtures/db";

/**
 * After the whole run: fixtures must not have left orphaned audit rows behind.
 *
 * `audit_logs` has NO foreign key to `players` — nothing cascades — so every
 * player a fixture creates and deletes leaves its `PLAYER_CREATED` row behind
 * forever. By 2026-09-13 there were **10,491** of them in `nca_scoring_test`,
 * against a players table holding zero rows; `audit_logs` was 13,796 rows, of
 * which 76% were tombstones for players that had not existed for weeks.
 *
 * That is not merely untidy. SESSION-HANDOFF had to carry a standing note saying
 * "do not read a rising audit_logs count as a teardown regression" — which is a
 * signal being deliberately discarded, and the reason nobody noticed the count
 * climbing by ~500 a run.
 *
 * So the rule is narrower and the signal is kept: a fixture may leave audit rows
 * for things that still exist, but it may not leave a `PLAYER_CREATED` row whose
 * player it has already deleted. Both halves are the fixture's own doing, and
 * both are within its power to clean up — `championship.ts` already does.
 *
 * Deliberately scoped to the two seeded fixture identities. A row written by a
 * real user through the app is not a fixture's litter and is not this check's
 * business.
 */
const FIXTURE_IDENTITIES = ["admin-a@example.com", "admin-b@example.com"];

export default async function globalTeardown() {
  const inList = FIXTURE_IDENTITIES.map((e) => `'${e}'`).join(", ");
  const orphans = dbCount(`
    SELECT COUNT(*) FROM audit_logs al
    WHERE al.action = 'PLAYER_CREATED'
      AND al.created_by IN (${inList})
      AND al.entity_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM players p WHERE p.id = al.entity_id)`);

  if (orphans > 0) {
    throw new Error(
      `teardown: ${orphans} orphaned PLAYER_CREATED audit row(s) left behind by fixtures.\n` +
        `  audit_logs has no FK to players, so a deleted player's audit row survives it — ` +
        `10,491 had accumulated before this check existed.\n` +
        `  The fixture that created those players must delete their audit rows too, ` +
        `the way championship.ts does:\n` +
        `    DELETE FROM audit_logs WHERE entity_id IN (SELECT id FROM players WHERE ...)\n` +
        `  run BEFORE the players themselves are deleted, while the ids are still resolvable.`,
    );
  }

  // eslint-disable-next-line no-console
  console.log(`\n[teardown] no orphaned PLAYER_CREATED audit rows — audit_logs is clean.`);
}
