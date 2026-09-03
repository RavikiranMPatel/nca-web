import { test, expect } from "@playwright/test";
import { createScoringMatch, destroyScoringMatch } from "../fixtures/scoringMatch";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";

/**
 * CLAUDE.md hard rule 2. These gate the whole suite: if either fails, stop and
 * treat it as a stop-work security bug rather than running workbook scenarios.
 *
 * The second test is the one that matters. Match-level scoping (`findMatch`) was
 * always correct; the defect fixed in this session (BUGS-FOUND.md BUG-06) was in
 * *player* resolution, which a match-level 404 check never exercises. Verified to
 * fail against the pre-fix build — see BUG-06 for the recorded 200s.
 */
test.describe("tenant isolation @security", () => {
  test("a foreign academy cannot read the match", async () => {
    const m = await createScoringMatch();
    const b = await Api.login(config().b);
    try {
      for (const path of [
        `/api/admin/cricket/matches/${m.matchPublicId}`,
        `/api/admin/cricket/matches/${m.matchPublicId}/teams`,
        `/api/admin/cricket/matches/${m.matchPublicId}/scoring/state`,
      ]) {
        const res = await b.raw("get", path);
        expect(res.status, `${path} must 404 for a foreign academy`).toBe(404);
      }
    } finally {
      await b.dispose();
      await destroyScoringMatch(m);
    }
  });

  test("own-academy actor cannot attach a foreign academy's player (BUG-06)", async () => {
    const env = config();
    const a = await createScoringMatch();                       // academy A
    const b = await createScoringMatch({ tenant: env.b });      // academy B

    const rows = async () =>
      (await a.api.state(a.matchPublicId)).inningsState.totalBalls;

    try {
      const ballsBefore = await rows();

      // Every request below is a legitimate, authenticated call by academy A's
      // own ADMIN on academy A's own match. Only the player id is foreign.
      const attempts: Array<[string, () => Promise<{ status: number; body: any }>]> = [
        ["postBall / batsman", () =>
          a.api.raw("post", `/api/admin/cricket/matches/${a.matchPublicId}/scoring/ball`, {
            bowlerPublicId: a.bowler.mtpPublicId,
            batsmanPublicId: b.striker.mtpPublicId,          // foreign
            nonStrikerPublicId: a.nonStriker.mtpPublicId,
            runsBatsman: 1,
          })],
        ["postBall / bowler", () =>
          a.api.raw("post", `/api/admin/cricket/matches/${a.matchPublicId}/scoring/ball`, {
            bowlerPublicId: b.bowler.mtpPublicId,             // foreign
            batsmanPublicId: a.striker.mtpPublicId,
            nonStrikerPublicId: a.nonStriker.mtpPublicId,
            runsBatsman: 1,
          })],
        ["postBall / fielder on a catch", () =>
          a.api.raw("post", `/api/admin/cricket/matches/${a.matchPublicId}/scoring/ball`, {
            bowlerPublicId: a.bowler.mtpPublicId,
            batsmanPublicId: a.striker.mtpPublicId,
            nonStrikerPublicId: a.nonStriker.mtpPublicId,
            runsBatsman: 0,
            isWicket: true,
            dismissalType: "CAUGHT",
            dismissedPlayerPublicId: a.striker.mtpPublicId,
            fielderPublicId: b.bowler.mtpPublicId,            // foreign
          })],
        ["selectBatter", () =>
          a.api.raw("post", `/api/admin/cricket/matches/${a.matchPublicId}/scoring/select-batter`,
            { batterPublicId: b.nonStriker.mtpPublicId, position: "striker" })],
        ["correctBowler", () =>
          a.api.raw("post", `/api/admin/cricket/matches/${a.matchPublicId}/scoring/correct-bowler`,
            { bowlerPublicId: b.bowler.mtpPublicId })],
        ["changeWicketkeeper", () =>
          a.api.raw("post", `/api/admin/cricket/matches/${a.matchPublicId}/scoring/change-wicketkeeper`,
            { newKeeperPublicId: b.bowler.mtpPublicId })],
      ];

      for (const [label, call] of attempts) {
        const res = await call();
        expect(res.status, `${label}: a foreign MTP must 404, got ${res.status}`).toBe(404);
      }

      // Nothing was written: no delivery advanced the innings.
      expect(await rows(), "no delivery may be written by a rejected cross-tenant call")
        .toBe(ballsBefore);

      // Control — the identical call with A's own players must still work.
      const ok = await a.api.raw("post", `/api/admin/cricket/matches/${a.matchPublicId}/scoring/ball`, {
        bowlerPublicId: a.bowler.mtpPublicId,
        batsmanPublicId: a.striker.mtpPublicId,
        nonStrikerPublicId: a.nonStriker.mtpPublicId,
        runsBatsman: 1,
      });
      expect(ok.status, "same-academy players must still score").toBe(200);
      expect(ok.body.inningsState.totalRuns).toBe(1);
      expect(await rows()).toBe(ballsBefore + 1);
    } finally {
      await destroyScoringMatch(b);
      await destroyScoringMatch(a);
    }
  });
});
