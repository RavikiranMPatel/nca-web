import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { createMatch } from "../fixtures/playFixture";

/**
 * Feature A — Playing XI size is an explicit three-way choice (11 / 12 / 13)
 * instead of a boolean "allow more than 11 players?" toggle. One column,
 * cricket_matches.playing_xi_size (V107, replacing the old boolean
 * allow_extended_squad), is the single source of truth for the cap — applied
 * to both batting selection and bowling eligibility, since MatchService never
 * had a separate "eligible bowler" list: selectBatter and correctBowler both
 * just pick from whichever MatchTeamPlayer rows exist for the team, so
 * raising the cap at team-selection time is the whole fix for bowling too.
 *
 * Backward-compat (an existing row with the old allow_extended_squad = true
 * maps to playing_xi_size = 12) was verified directly against the migration
 * with a real row before it ran — see the BUG-A commit message — not here:
 * there is no way to construct that "before" state through the running app
 * once V107 has applied.
 */

const xi = (n: number, prefix: string) =>
  Array.from({ length: n }, (_, i) => ({
    externalName: `${prefix} ${i + 1}`,
    battingOrder: i + 1,
    isCaptain: i === 0,
    isWicketkeeper: i === 5,
    isImpactPlayer: false,
    isForeign: false,
  }));

async function setUpMatch(api: Api, playingXiSize: number, squadSize: number) {
  const match = await createMatch(api, {
    title: `E2E XI-size ${playingXiSize} ${Date.now()}`,
    matchDate: new Date().toISOString().slice(0, 10),
    matchType: "INTERNAL",
    totalOvers: 20,
    venue: "E2E Test Ground",
    playingXiSize,
  });
  const matchPublicId: string = match.publicId;
  await api.setTeams(matchPublicId, {
    teamAName: "Team A",
    teamBName: "Team B",
    teamAPlayers: xi(squadSize, "A Player"),
    teamBPlayers: xi(squadSize, "B Player"),
  });
  return matchPublicId;
}

test.describe("Feature A — Playing XI size", () => {
  test("13 allows a 13th batter and a 13th bowler", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract, no viewport dimension");

    const env = config();
    const api = await Api.login(env.a);
    let matchPublicId: string | null = null;
    try {
      matchPublicId = await setUpMatch(api, 13, 13);

      const teams = await api.getTeams(matchPublicId);
      const battingTeamPublicId = teams[0].publicId;
      const bowlingTeamPublicId = teams[1].publicId;

      const batters = await api.getXI(matchPublicId, battingTeamPublicId);
      const bowlers = await api.getXI(matchPublicId, bowlingTeamPublicId);
      expect(batters.length, "all 13 batting players were accepted").toBe(13);
      expect(bowlers.length, "all 13 bowling players were accepted").toBe(13);

      await api.toss(matchPublicId, { winnerTeamPublicId: battingTeamPublicId, decision: "BAT" });
      await api.start(matchPublicId);

      // The 13th player in each XI (battingOrder 13) — proves both batting
      // selection and bowling eligibility draw from the same, now-larger pool.
      const thirteenthBatter = batters[12];
      const twelfthBatter = batters[11]; // non-striker
      const thirteenthBowler = bowlers[12];

      await api.selectBatter(matchPublicId, thirteenthBatter.mtpPublicId, "striker");
      await api.selectBatter(matchPublicId, twelfthBatter.mtpPublicId, "nonstriker");
      await api.correctBowler(matchPublicId, thirteenthBowler.mtpPublicId);

      // One full legal over bowled by the 13th player, faced by the 13th batter.
      for (let i = 0; i < 6; i++) {
        const res = await api.raw("post", `/api/admin/cricket/matches/${matchPublicId}/scoring/ball`, {
          bowlerPublicId: thirteenthBowler.mtpPublicId,
          batsmanPublicId: thirteenthBatter.mtpPublicId,
          nonStrikerPublicId: twelfthBatter.mtpPublicId,
          runsBatsman: 0,
          deliveryClientId: crypto.randomUUID(),
        });
        expect(res.status, `ball ${i + 1}, 13th batter facing the 13th bowler`).toBe(200);
      }

      const state = await api.state(matchPublicId);
      expect(state.inningsState.totalBalls, "six legal balls bowled by the 13th player").toBe(6);

    } finally {
      if (matchPublicId) await api.deleteMatch(matchPublicId);
      await api.dispose();
    }
  });

  test("14 players is still refused, even with playingXiSize 13", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract, no viewport dimension");

    const env = config();
    const api = await Api.login(env.a);
    const match = await createMatch(api, {
      title: `E2E XI-size overflow ${Date.now()}`,
      matchDate: new Date().toISOString().slice(0, 10),
      matchType: "INTERNAL",
      totalOvers: 20,
      venue: "E2E Test Ground",
      playingXiSize: 13,
    });
    try {
      const res = await api.raw("post", `/api/admin/cricket/matches/${match.publicId}/teams`, {
        teamAName: "Team A",
        teamBName: "Team B",
        teamAPlayers: xi(14, "A Player"),
        teamBPlayers: xi(13, "B Player"),
      });
      expect(res.status, "14 players must still be refused at the cap of 13").toBe(400);
      expect((res.body as { message?: string }).message).toContain("cannot have more than 13");
    } finally {
      await api.deleteMatch(match.publicId);
      await api.dispose();
    }
  });

  test("11 (default) still refuses a 12th player", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract, no viewport dimension");

    const env = config();
    const api = await Api.login(env.a);
    // No playingXiSize supplied — must default to 11, exactly as before.
    const match = await createMatch(api, {
      title: `E2E XI-size default ${Date.now()}`,
      matchDate: new Date().toISOString().slice(0, 10),
      matchType: "INTERNAL",
      totalOvers: 20,
      venue: "E2E Test Ground",
    });
    try {
      expect(match.playingXiSize, "default must still be 11").toBe(11);

      const res = await api.raw("post", `/api/admin/cricket/matches/${match.publicId}/teams`, {
        teamAName: "Team A",
        teamBName: "Team B",
        teamAPlayers: xi(12, "A Player"),
        teamBPlayers: xi(11, "B Player"),
      });
      expect(res.status, "a 12th player must still be refused by default").toBe(400);
      expect((res.body as { message?: string }).message).toContain("cannot have more than 11");
    } finally {
      await api.deleteMatch(match.publicId);
      await api.dispose();
    }
  });

  test("an invalid playingXiSize is refused at match creation", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract, no viewport dimension");

    const env = config();
    const api = await Api.login(env.a);
    const res = await api.raw("post", "/api/admin/cricket/matches", {
      title: "should be refused", matchDate: "2026-01-01", matchType: "INTERNAL",
      totalOvers: 20, venue: "E2E Test Ground", playingXiSize: 14,
    });
    expect(res.status).toBe(400);
    expect((res.body as { message?: string }).message).toContain("playingXiSize must be 11, 12, or 13");
    await api.dispose();
  });
});

test.describe("Feature A — the settings toggle in match setup", () => {
  test("segmented control picks 11, 12, or 13", async ({ page }, testInfo) => {
    const env = config();
    const admin = await Api.login(env.a);
    await page.addInitScript((seed) => {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v as string);
    }, admin.storageSeed());

    await page.goto("/admin/cricket/matches/new");

    // The control renders with Standard (11) selected by default.
    await expect(page.getByTestId("playing-xi-size")).toBeVisible();
    await expect(page.getByTestId("playing-xi-size-13")).toBeVisible();

    await page.getByTestId("playing-xi-size-13").click();

    // Visual confirmation the 13 option is now the selected one — same active
    // styling class the component applies (bg-blue-600).
    await expect(page.getByTestId("playing-xi-size-13")).toHaveClass(/bg-blue-600/);
    await expect(page.getByTestId("playing-xi-size-11")).not.toHaveClass(/bg-blue-600/);

    await page.screenshot({
      path: `e2e/.artifacts/feature-a-xi-size-toggle-${testInfo.project.name}.png`, fullPage: true });

    await admin.dispose();
  });
});
