import { expect } from "@playwright/test";
import type { Api } from "./api";

/**
 * Creating a player through the API.
 *
 * This used to retry a **409** up to six times, because BUG-33 could hand two
 * players the same publicId: `generateNextPlayerId` was a read-modify-write
 * guarded by `synchronized` on a `@Transactional` method, which releases the
 * monitor before the new counter value is committed. It cost two full-suite runs
 * — `kit-roles` in Slice 4b, `json-boolean-keys` in Slice 5.
 *
 * Slice 5b replaced the counter with a single `INSERT … ON CONFLICT … RETURNING`
 * and **the retry is gone with it**, deliberately: a retry here would hide the
 * race coming back, and `bug-33-player-id-race.spec.ts` only proves the fix for
 * as long as nothing else is quietly papering over it. A 409 from this helper is
 * now a failure, which is what it always should have been.
 *
 * This lives in one place because two fixtures needed it and
 * `.claude/rules/multi-tenancy.md` records what happens when a cross-cutting
 * helper is copied instead: four services carried the same bug in every copy.
 */
export async function createPlayer(
  api: Api,
  player: Record<string, unknown>,
  label: string,
): Promise<{ publicId: string }> {
  const body = () => {
    const fd = new FormData();
    // Player creation is multipart (@RequestPart("player")), not JSON.
    fd.append("player", new Blob([JSON.stringify(player)], { type: "application/json" }),
      "player.json");
    return fd;
  };

  const res = await api.ctx.post("/api/admin/players", { multipart: body() as never });

  expect(res.status(), `create player ${label} (a 409 here is BUG-33, returned)`)
    .toBeLessThan(400);
  const json = await res.json();
  return { publicId: json.publicId ?? json.player?.publicId };
}
