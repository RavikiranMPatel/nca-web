import { expect } from "@playwright/test";
import { Api } from "./api";
import { config, type Tenant } from "./env";
import { dbExec } from "./db";
import { createPlayer } from "./createPlayer";

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

  const batch = await api.raw("post", "/api/admin/batches", {
    name: `${label} Batch ${tag}`, startTime: "06:00:00", endTime: "08:00:00", active: true,
  });
  expect(batch.status, `create batch for ${tag}`).toBeLessThan(400);
  const batchId = (batch.body as any).id as string;

  const players: KitPlayer[] = [];
  for (let i = 0; i < opts.count; i++) {
    const displayName = `${label} ${tag} P${String(i + 1).padStart(2, "0")}`;
    const { publicId } = await createPlayer(api, {
      displayName, gender: "MALE", profession: "STUDENT",
      dob: `2010-01-${String((i % 28) + 1).padStart(2, "0")}`,
      // Phone is unique per academy; the tag keeps runs from colliding.
      phone: `9${tag}${String(i).padStart(2, "0")}`.slice(0, 10),
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
      // and the config refuses any non-localhost target.
      const names = players.map((p) => `'${p.publicId}'`).join(",");
      if (names) {
        dbExec(`DELETE FROM player_kit_details WHERE player_id IN
                  (SELECT id FROM players WHERE public_id IN (${names}))`);
        dbExec(`DELETE FROM player_career_stats WHERE player_id IN
                  (SELECT id FROM players WHERE public_id IN (${names}))`);
        dbExec(`DELETE FROM player_batches WHERE player_id IN
                  (SELECT id FROM players WHERE public_id IN (${names}))`);
        dbExec(`DELETE FROM players WHERE public_id IN (${names})`);
      }
      dbExec(`DELETE FROM batches WHERE id = '${batchId}'`);
      await api.dispose();
    },
  };
}
