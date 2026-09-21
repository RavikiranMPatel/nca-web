import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";
import { dbOne, dbExec } from "../fixtures/db";
import { createPlayer } from "../fixtures/createPlayer";
import { createScoringMatch, destroyScoringMatch } from "../fixtures/scoringMatch";

/**
 * One real Playwright pass over everything the last three tasks verified only
 * by curl/SQL/tsc: the wagon-wheel consolidation (one renderer, match-scoped
 * toggle), the striker/non-striker/bowler validation wording fix, the
 * four/six boundary-rendering fix, and the mid-match wagon-wheel toggle.
 *
 * Desktop + iPhone 14 only (mobile-chrome is Pixel 7 — redundant coverage for
 * what this file checks; skipped per test to save a third, identical run).
 */

const isRelevantProject = (name: string) => name === "desktop" || name === "mobile";

const xiGuests = (prefix: string, count: number, startOrder: number) =>
  Array.from({ length: count }, (_, i) => ({
    externalName: `${prefix} ${startOrder + i}`,
    battingOrder: startOrder + i,
    isCaptain: startOrder + i === 1,
    isWicketkeeper: startOrder + i === 6,
    isImpactPlayer: false,
    isForeign: false,
  }));

/**
 * A scoring match whose team-A opener (battingOrder 1, the one who will face
 * every ball in these tests) is a REAL academy player, not a guest.
 *
 * This used to be a forced workaround: DeliveryRepository.findShotsForBatterInInnings
 * INNER JOINed match_team_players -> players, and ScorecardService's
 * battingCard resolved playerPublicId to null for a guest MatchTeamPlayer
 * (mtp.getPlayer() == null) — so a guest's shots could never be looked up on
 * the public scorecard regardless of what id was passed, and this was the
 * only way to get a real per-batter shot view at all.
 *
 * Fixed: the shots endpoint and the repository query now key on
 * matchTeamPlayerPublicId (MatchTeamPlayer's own public id, always set —
 * guest or real), not playerPublicId. A guest's shots resolve correctly now
 * too (verified directly via curl/SQL, not just here). This fixture keeps
 * using a real player anyway — that's the normal, common case in production,
 * not a bug-driven exception — while every other spec in this suite
 * (createScoringMatch) deliberately uses guests, for its own good reasons
 * (faster setup, no batch/Player cleanup).
 */
async function createRealPlayerMatch() {
  const env = config();
  const api = await Api.login(env.a);

  const batchRes = await api.raw("post", "/api/admin/batches", {
    name: `WW-verify batch ${Date.now()}`, startTime: "06:00:00", endTime: "08:00:00", active: true,
  });
  if (batchRes.status >= 300) {
    await api.dispose();
    throw new Error(`Failed to create batch: ${batchRes.status} ${JSON.stringify(batchRes.body)}`);
  }
  const batchId = (batchRes.body as { id: string }).id;

  const displayName = `WW Verify Striker ${Date.now()}`;
  const phone = String(7000000000 + (Date.now() % 900000000)).slice(0, 10);
  const { publicId: strikerPlayerPublicId } = await createPlayer(api, {
    displayName, gender: "MALE", profession: "STUDENT",
    dob: "2008-01-15", phone, joiningDate: "2026-01-05", batchIds: [batchId],
  }, displayName);

  const match = await api.createMatch({
    title: `E2E WW-verify ${Date.now()}`,
    matchDate: new Date().toISOString().slice(0, 10),
    matchType: "INTERNAL",
    totalOvers: 20,
    venue: "E2E Test Ground",
    wagonWheelEnabled: true,
  });
  const matchPublicId: string = match.publicId;

  await api.setTeams(matchPublicId, {
    teamAName: "India",
    teamBName: "Australia",
    teamAPlayers: [
      {
        playerPublicId: strikerPlayerPublicId, battingOrder: 1,
        isCaptain: true, isWicketkeeper: false, isImpactPlayer: false, isForeign: false,
      },
      ...xiGuests("A Player", 10, 2),
    ],
    teamBPlayers: xiGuests("B Player", 11, 1),
  });

  const teams = await api.getTeams(matchPublicId);
  const battingTeamPublicId = teams[0].publicId;
  const bowlingTeamPublicId = teams[1].publicId;

  await api.toss(matchPublicId, { winnerTeamPublicId: battingTeamPublicId, decision: "BAT" });
  await api.start(matchPublicId);

  const batters = await api.getXI(matchPublicId, battingTeamPublicId);
  const bowlers = await api.getXI(matchPublicId, bowlingTeamPublicId);
  const striker = batters.find((b: { battingOrder: number }) => b.battingOrder === 1);
  const nonStriker = batters.find((b: { battingOrder: number }) => b.battingOrder === 2);
  const bowler = bowlers[7];

  expect(striker.playerPublicId, "the real player, not a guest").toBe(strikerPlayerPublicId);

  await api.selectBatter(matchPublicId, striker.mtpPublicId, "striker");
  await api.selectBatter(matchPublicId, nonStriker.mtpPublicId, "nonstriker");
  await api.correctBowler(matchPublicId, bowler.mtpPublicId);

  return {
    api, matchPublicId, striker, nonStriker, bowler, batchId, strikerPlayerPublicId, displayName,
  };
}

async function destroyRealPlayerMatch(m: Awaited<ReturnType<typeof createRealPlayerMatch>>) {
  const del = await m.api.deleteMatch(m.matchPublicId);
  if (del.status >= 300) {
    throw new Error(`Teardown failed: DELETE ${m.matchPublicId} -> ${del.status} ${JSON.stringify(del.body)}`);
  }
  // Same FK order as championship.ts's teardown: audit tombstone, career
  // stats, batch membership, the player row, then the batch. Match deleted
  // first above, so no FK from match_team_players blocks the player delete.
  dbExec(`DELETE FROM audit_logs WHERE entity_public_id = '${m.strikerPlayerPublicId}'`);
  dbExec(`DELETE FROM player_career_stats WHERE player_id =
            (SELECT id FROM players WHERE public_id = '${m.strikerPlayerPublicId}')`);
  dbExec(`DELETE FROM player_batches WHERE player_id =
            (SELECT id FROM players WHERE public_id = '${m.strikerPlayerPublicId}')`);
  dbExec(`DELETE FROM players WHERE public_id = '${m.strikerPlayerPublicId}'`);
  dbExec(`DELETE FROM batches WHERE id = '${m.batchId}'`);
  await m.api.dispose();
}

test.describe("Wagon wheel — capture, render separation, boundary rendering", () => {
  test("a 4 and a 6 in the same zone write shot_zone and render visibly separated on the public scorecard", async ({ page }, testInfo) => {
    test.skip(!isRelevantProject(testInfo.project.name), "desktop + iPhone 14 only");

    const m = await createRealPlayerMatch();
    try {
      await page.addInitScript((seed) => {
        for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, v as string);
      }, m.api.storageSeed());
      await page.goto(`/admin/cricket/matches/${m.matchPublicId}/score`);
      await expect(page.getByTestId("scoring-pad")).toBeVisible();

      // Same tap point on the field both times, so both shots resolve to the
      // SAME named zone (deriveZone is a pure function of the tap position) —
      // before the boundary-rendering fix this rendered two shots at the
      // exact same pixel; after it, a 4 and a 6 must separate visibly.
      const captureShot = async () => {
        const field = page.getByTestId("wagon-wheel-field");
        await expect(field).toBeVisible();
        const box = await field.boundingBox();
        if (!box) throw new Error("wagon-wheel-field has no bounding box");
        await field.click({ position: { x: box.width * 0.38625, y: box.height * 0.5797 } });
        await expect(page.getByTestId("wagon-wheel-zone-label")).toBeVisible();
        // saveShotZone closes the modal synchronously and PATCHes shot-zone in
        // the background (LiveScorerPage.tsx) — wait for that request to
        // actually land before reading the DB later, not just for the modal
        // to disappear.
        const patched = page.waitForResponse((r) =>
          r.url().includes("/scoring/deliveries/") && r.url().includes("/shot-zone")
          && r.request().method() === "PATCH");
        await page.getByTestId("wagon-wheel-save").click();
        await patched;
        await expect(page.getByTestId("wagon-wheel-modal")).toHaveCount(0);
      };

      // A full over: dot, 4 (captured), dot, 6 (captured), dot, dot. The
      // striker keeps strike throughout (0, 4 and 6 are all even), so every
      // ball is faced by the same real player.
      await page.getByTestId("run-0").click();
      await expect(page.getByTestId("team-score")).toHaveText("0/0");
      await expect(page.getByTestId("wagon-wheel-modal")).toHaveCount(0);

      await page.getByTestId("run-4").click();
      await expect(page.getByTestId("team-score")).toHaveText("4/0");
      await captureShot();

      await page.getByTestId("run-0").click();
      await expect(page.getByTestId("team-score")).toHaveText("4/0");

      await page.getByTestId("run-6").click();
      await expect(page.getByTestId("team-score")).toHaveText("10/0");
      await captureShot();

      await page.getByTestId("run-0").click();
      await page.getByTestId("run-0").click();
      await expect(page.getByTestId("over-count")).toHaveText("1.0 ov");

      const state = await m.api.state(m.matchPublicId);
      expect(state.inningsState.totalBalls, "6 legal balls scored").toBe(6);
      expect(state.inningsState.totalRuns, "0+4+0+6+0+0").toBe(10);

      // Both deliveries wrote a shot_zone, and it's the SAME zone — the exact
      // "same zone, different runs" case the boundary-rendering fix targets.
      const zones = dbOne(
        `SELECT string_agg(d.runs_batsman || ':' || d.shot_zone, '|' ORDER BY d.sequence_number)
         FROM deliveries d JOIN innings i ON d.innings_id = i.id
         JOIN cricket_matches cm ON i.match_id = cm.id
         WHERE cm.public_id = '${m.matchPublicId}' AND d.runs_batsman IN (4,6)`,
      );
      const [fourEntry, sixEntry] = zones.split("|");
      expect(fourEntry, `four's row: ${fourEntry}`).toMatch(/^4:.+/);
      expect(sixEntry, `six's row: ${sixEntry}`).toMatch(/^6:.+/);
      const fourZone = fourEntry.split(":")[1];
      const sixZone = sixEntry.split(":")[1];
      expect(fourZone, "both taps landed in the same named zone by construction").toBe(sixZone);

      // Now the public scorecard — genuinely public, no session needed —
      // rendering the real player's wagon wheel via the merged component.
      // The row is keyed on matchTeamPlayerPublicId, not playerPublicId —
      // that's what the fix changed, and it's what's always set (guest or
      // real), unlike playerPublicId.
      await page.goto(`/match/${m.matchPublicId}/scorecard`);
      await page.getByTestId(`batter-row-${m.striker.mtpPublicId}`).click();
      await expect(page.getByTestId("public-wagon-wheel-modal")).toBeVisible();

      // The shot-position markers are the r=6 circles FieldSVG draws per
      // shot — no other element in the field SVG uses that radius, so this
      // selects exactly the two dots and nothing else (grass/pitch/stump
      // circles are r=148/147/78.4/1.5).
      const shotDots = page.locator('[data-testid="public-wagon-wheel-modal"] svg circle[r="6"]');
      await expect(shotDots).toHaveCount(2);

      const boxes = await Promise.all([
        shotDots.nth(0).boundingBox(),
        shotDots.nth(1).boundingBox(),
      ]);
      if (!boxes[0] || !boxes[1]) throw new Error("shot dot has no bounding box");
      const [d1, d2] = boxes;
      const dx = d1.x - d2.x, dy = d1.y - d2.y;
      const separationPx = Math.sqrt(dx * dx + dy * dy);
      expect(separationPx, "the 4 and 6 must render at visibly different points, not the same pixel")
        .toBeGreaterThan(3);

      // Not just "different from each other" — actually inside the rendered
      // SVG's own box, on THIS viewport (375px-class on iPhone 14). A
      // regression that pushed a dot's radius past what the 320x320 viewBox
      // allows would clip it out of the visible field entirely.
      const svgBox = await page.locator('[data-testid="public-wagon-wheel-modal"] svg').first().boundingBox();
      if (!svgBox) throw new Error("wagon wheel svg has no bounding box");
      for (const [i, d] of boxes.entries()) {
        expect(d!.x, `shot ${i} left edge inside the svg`).toBeGreaterThanOrEqual(svgBox.x - 1);
        expect(d!.y, `shot ${i} top edge inside the svg`).toBeGreaterThanOrEqual(svgBox.y - 1);
        expect(d!.x + d!.width, `shot ${i} right edge inside the svg`)
          .toBeLessThanOrEqual(svgBox.x + svgBox.width + 1);
        expect(d!.y + d!.height, `shot ${i} bottom edge inside the svg`)
          .toBeLessThanOrEqual(svgBox.y + svgBox.height + 1);
      }
    } finally {
      await destroyRealPlayerMatch(m);
    }
  });
});

test.describe("Live scorer — setup validation names only what's missing", () => {
  test("openers selected, no bowler: the banner says 'Select bowler', not the old generic message", async ({ page }, testInfo) => {
    test.skip(!isRelevantProject(testInfo.project.name), "desktop + iPhone 14 only");

    const env = config();
    const api = await Api.login(env.a);
    const match = await api.createMatch({
      title: `E2E validation-wording ${Date.now()}`,
      matchDate: new Date().toISOString().slice(0, 10),
      matchType: "INTERNAL", totalOvers: 20, venue: "E2E Test Ground",
    });
    const matchPublicId: string = match.publicId;
    try {
      await api.setTeams(matchPublicId, {
        teamAName: "India", teamBName: "Australia",
        teamAPlayers: xiGuests("A Player", 11, 1),
        teamBPlayers: xiGuests("B Player", 11, 1),
      });
      const teams = await api.getTeams(matchPublicId);
      await api.toss(matchPublicId, { winnerTeamPublicId: teams[0].publicId, decision: "BAT" });
      await api.start(matchPublicId);

      const batters = await api.getXI(matchPublicId, teams[0].publicId);
      await api.selectBatter(matchPublicId, batters[0].mtpPublicId, "striker");
      await api.selectBatter(matchPublicId, batters[1].mtpPublicId, "nonstriker");
      // Deliberately no correct-bowler call — both openers set, bowler unset,
      // exactly the reported repro shape.

      await page.addInitScript((seed) => {
        for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, v as string);
      }, api.storageSeed());
      await page.goto(`/admin/cricket/matches/${matchPublicId}/score`);
      await expect(page.getByTestId("scoring-pad")).toBeVisible();

      // Both batters render as selected — the UI already agrees with the
      // server that only the bowler is missing.
      await expect(page.getByTestId("striker-name")).not.toHaveText("Select striker");
      await expect(page.getByTestId("nonstriker-name")).not.toHaveText("Select non-striker");

      await page.getByTestId("run-0").click();
      await expect(page.getByTestId("scoring-error-banner")).toBeVisible();
      await expect(page.getByTestId("scoring-error-banner")).toContainText("Select bowler");
      await expect(page.getByTestId("scoring-error-banner")).not.toContainText("non-striker");
    } finally {
      await api.deleteMatch(matchPublicId);
      await api.dispose();
    }
  });
});

test.describe("Wagon wheel — mid-match toggle via the settings menu", () => {
  test("toggling off stops the capture prompt; toggling back on resumes it", async ({ page }, testInfo) => {
    test.skip(!isRelevantProject(testInfo.project.name), "desktop + iPhone 14 only");

    const m = await createScoringMatch({ wagonWheelEnabled: true });
    try {
      await m.open(page);
      await expect(page.getByTestId("scoring-pad")).toBeVisible();

      // Wagon wheel starts on: a 4 must prompt.
      await page.getByTestId("run-4").click();
      await expect(page.getByTestId("team-score")).toHaveText("4/0");
      await expect(page.getByTestId("wagon-wheel-modal")).toBeVisible();
      await page.getByTestId("wagon-wheel-skip").click();
      await expect(page.getByTestId("wagon-wheel-modal")).toHaveCount(0);

      // Turn it off via the settings menu (⚙ -> Match Controls).
      await page.getByTestId("btn-match-controls").click();
      const toggle = page.getByTestId("btn-wagon-wheel-toggle");
      await expect(toggle).toBeVisible();
      await toggle.click();
      await page.getByTestId("btn-match-controls-cancel").click();

      const off = await m.api.state(m.matchPublicId);
      expect(off, "sanity: match still scoreable after the toggle").toBeTruthy();
      expect(
        dbOne(`SELECT wagon_wheel_enabled FROM cricket_matches WHERE public_id = '${m.matchPublicId}'`),
        "toggle actually persisted off",
      ).toBe("f");

      // Score another boundary — no prompt this time.
      await page.getByTestId("run-6").click();
      await expect(page.getByTestId("team-score")).toHaveText("10/0");
      await expect(page.getByTestId("wagon-wheel-modal")).toHaveCount(0);

      // Confirm the delivery just scored has no shot_zone — nothing was even
      // attempted, matching the frontend's wagonWheelEnabled gate.
      const lastZone = dbOne(
        `SELECT shot_zone FROM deliveries d JOIN innings i ON d.innings_id = i.id
         JOIN cricket_matches cm ON i.match_id = cm.id
         WHERE cm.public_id = '${m.matchPublicId}' ORDER BY d.sequence_number DESC LIMIT 1`,
      );
      expect(lastZone, "no shot_zone write was attempted while disabled").toBe("");

      // Turn it back on and confirm prompting resumes.
      await page.getByTestId("btn-match-controls").click();
      await expect(toggle).toBeVisible();
      await toggle.click();
      await page.getByTestId("btn-match-controls-cancel").click();

      expect(
        dbOne(`SELECT wagon_wheel_enabled FROM cricket_matches WHERE public_id = '${m.matchPublicId}'`),
        "toggle actually persisted back on",
      ).toBe("t");

      await page.getByTestId("run-4").click();
      await expect(page.getByTestId("team-score")).toHaveText("14/0");
      await expect(page.getByTestId("wagon-wheel-modal")).toBeVisible();
      await page.getByTestId("wagon-wheel-skip").click();
      await expect(page.getByTestId("wagon-wheel-modal")).toHaveCount(0);
    } finally {
      await destroyScoringMatch(m);
    }
  });
});
