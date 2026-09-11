import { expect } from "@playwright/test";
import type { Api } from "./api";

/**
 * Creating a player through the API, retried past BUG-33.
 *
 * `AcademySettingsService.generateNextPlayerId` is `@Transactional` **and**
 * `synchronized`, which do not compose: Spring's proxy commits *after* the
 * method returns, so the monitor is released before the write is visible and two
 * threads read the same counter. It surfaces as a **409** creating a player when
 * two Playwright workers run, and passes in isolation every time.
 *
 * Slice 4b found it, reported it, and deliberately left it to the
 * player/settings module — the counter needs a single-statement database
 * increment, and a bigger lock is not the fix. It has since cost a full-suite
 * run twice: once in `kit-roles` (Slice 4b) and once in `json-boolean-keys`
 * (Slice 5).
 *
 * Retried here rather than serialising the suite, the same way
 * `createScoringMatch` retries BUG-11's public-id collision. Serialising would
 * hide a real defect behind a slower run.
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

  let res = await api.ctx.post("/api/admin/players", { multipart: body() as never });
  for (let attempt = 0; attempt < 6 && res.status() === 409; attempt++) {
    await new Promise((r) => setTimeout(r, 40 + attempt * 40));
    res = await api.ctx.post("/api/admin/players", { multipart: body() as never });
  }

  expect(res.status(), `create player ${label} (a 409 here is BUG-33)`).toBeLessThan(400);
  const json = await res.json();
  return { publicId: json.publicId ?? json.player?.publicId };
}
