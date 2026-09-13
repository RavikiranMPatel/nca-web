import { expect } from "@playwright/test";
import { Api } from "./api";
import { config, type Tenant } from "./env";
import { dbExec } from "./db";
import { createPlayer } from "./createPlayer";
import { newPhoneTrunk, fixturePhone } from "./tag";

/**
 * A self-contained set of players for the kit specs.
 *
 * The kit specs used to read players seeded by a script that lived outside the
 * repository, so they failed on any machine where that data was absent — and did
 * so with an assertion about "seeded" players, which reads like a product bug
 * rather than missing fixtures. This creates what it needs through the API and
 * removes it again, the same way createScoringMatch does for matches.
 *
 * Every run gets its own tag, so concurrent Playwright projects never share a
 * player or a batch. That matters twice over here: kit rows are unique per
 * (player, season), and a shared row is what produced the earlier failures where
 * one project's save landed on another's assertion.
 */
export interface KitPlayer {
  publicId: string;
  displayName: string;
}

export interface KitFixture {
  api: Api;
  tag: string;
  batchId: string;
  players: KitPlayer[];
  /** A season no other run will use. */
  season: string;
  destroy(): Promise<void>;
}

let counter = 0;

export async function createKitPlayers(opts: {
  count: number;
  tenant?: Tenant;
  label?: string;
} ): Promise<KitFixture> {
  const env = config();
  const api = await Api.login(opts.tenant ?? env.a);
  // Unique per process and per call: Date.now() alone collides across projects
  // that start in the same millisecond.
  const tag = `${Date.now() % 1000000}${(counter++).toString().padStart(2, "0")}`;
  const label = opts.label ?? "Kit";

  try {
    return await build(api, opts.count, tag, label);
  } catch (e) {
    // If setup throws part-way, the caller never receives a fixture and can never
    // call destroy(), so everything created up to the failure stays in the
    // database. That is not hypothetical: a BUG-33 409 on the SECOND player left
    // the first one and its batch behind, and they were still there after the
    // run. Clean up what exists, then rethrow the original error.
    removeEverything(tag, label);
    await api.dispose().catch(() => { /* already gone */ });
    throw e;
  }
}

/**
 * Removes everything a run with this tag created, complete or not.
 *
 * Keyed by the tag rather than by ids collected along the way, so it works from
 * a half-built fixture — which is the case it exists for.
 */
function removeEverything(tag: string, label: string): void {
  const like = `${label} ${tag} P%`;
  const ids = `(SELECT id FROM players WHERE display_name LIKE '${like}')`;
  dbExec(`DELETE FROM player_kit_details WHERE player_id IN ${ids}`);
  dbExec(`DELETE FROM player_career_stats WHERE player_id IN ${ids}`);
  dbExec(`DELETE FROM player_batches WHERE player_id IN ${ids}`);
  // audit_logs has no FK to players, so a PLAYER_CREATED row outlives the
  // player it describes — 10,491 had accumulated before anything checked.
  // Deleted here, BEFORE the players, while the ids still resolve.
  dbExec(`DELETE FROM audit_logs WHERE entity_id IN ${ids}`);
  dbExec(`DELETE FROM players WHERE display_name LIKE '${like}'`);
  dbExec(`DELETE FROM batches WHERE name = '${label} Batch ${tag}'`);
}

async function build(
  api: Api, count: number, tag: string, label: string,
): Promise<KitFixture> {
  const batch = await api.raw("post", "/api/admin/batches", {
    name: `${label} Batch ${tag}`, startTime: "06:00:00", endTime: "08:00:00", active: true,
  });
  expect(batch.status, `create batch for ${tag}`).toBeLessThan(400);
  const batchId = (batch.body as any).id as string;

  const phoneTrunk = newPhoneTrunk();
  const players: KitPlayer[] = [];
  for (let i = 0; i < count; i++) {
    const displayName = `${label} ${tag} P${String(i + 1).padStart(2, "0")}`;
    const { publicId } = await createPlayer(api, {
      displayName, gender: "MALE", profession: "STUDENT",
      dob: `2010-01-${String((i % 28) + 1).padStart(2, "0")}`,
      // One trunk per fixture, the player index on the end (BUG-54 / V105).
      //
      // This was `9${tag}${i}`.slice(0, 10), which truncated the INDEX away and
      // gave every ten players the same number. Nothing enforced phone
      // uniqueness, so it passed — until V105 made a player's phone unique
      // within an academy and the eleventh player in a kit fixture became
      // unsaveable.
      phone: fixturePhone(phoneTrunk, i),
      joiningDate: "2026-01-15", batchIds: [batchId],
    }, displayName);
    players.push({ publicId, displayName });
  }

  return {
    api, tag, batchId, players,
    season: `9${tag}`.slice(0, 10),

    async destroy() {
      // Kit rows and squad links have no delete endpoint, and players cannot be
      // deleted while career stats reference them. Cleared directly — local only,
      // and the config refuses any non-localhost target. Same routine the
      // partial-failure path uses, so there is one implementation to keep right.
      removeEverything(tag, label);
      await api.dispose();
    },
  };
}
