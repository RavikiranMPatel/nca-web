import { expect } from "@playwright/test";
import { Api } from "./api";
import { config, type Tenant } from "./env";
import { dbExec, dbOne } from "./db";
import { createPlayer } from "./createPlayer";

/**
 * Phase 31's sample tournament, built the way an academy would build it.
 *
 * Everything here goes through the application's own endpoints — the batch, the
 * players, the tournament, the eight sides, the squads of eleven, the
 * qualification rules, the grounds and the officials pool. Nothing is INSERTed.
 * That is the point of Phase 31: a tournament seeded by SQL proves the schema
 * accepts the rows, not that the product can produce them.
 *
 * The one thing that does reach the database directly is teardown, and only for
 * rows with no delete endpoint. It is keyed on the tournament's **public id**,
 * not its name, because Phase 31 names the tournament exactly "RKMP T20
 * Championship" and the desktop and iPhone projects build one each, at the same
 * time, in the same database. A teardown keyed on the name would delete the other
 * project's tournament out from under it.
 */

/** Phase 31's eight sides, in Phase 31's order, split into two groups of four. */
export const GROUP_A = ["India", "Australia", "England", "South Africa"] as const;
export const GROUP_B = ["New Zealand", "Sri Lanka", "Pakistan", "West Indies"] as const;

export const SHORT: Record<string, string> = {
  India: "IND", Australia: "AUS", England: "ENG", "South Africa": "RSA",
  "New Zealand": "NZL", "Sri Lanka": "SLK", Pakistan: "PAK", "West Indies": "WIN",
};

/** Ruling 1's scheme, which is also the default. Asserted, not assumed. */
export const POINTS = { win: 2, tie: 1, noResult: 1, loss: 0 } as const;

/** Ruling 2's order, as the configurable ordered list it is stored as. */
export const TIE_BREAK_ORDER = ["POINTS", "NRR", "WINS", "HEAD_TO_HEAD"] as const;

export const SQUAD_SIZE = 11;

export interface Side {
  publicId: string;
  name: string;
  groupName: string;
  /** The eleven academy players registered to this side, in squad order. */
  squad: { publicId: string; displayName: string }[];
}

export interface Championship {
  api: Api;
  tenant: Tenant;
  tag: string;
  tournamentPublicId: string;
  tournamentName: string;
  sides: Side[];
  sideByName: Map<string, Side>;
  venues: { id: string; name: string }[];
  officials: { name: string; role: string }[];
  destroy(): Promise<void>;
}

/**
 * @param teamNames which sides to enter. The full eight for academy A; the
 *   tenant-proof build in academy B takes four, because its job is to show that
 *   two tournaments in two academies do not see each other — not to re-run a
 *   sixteen-fixture championship a second time.
 */
export async function createChampionship(opts: {
  tenant?: Tenant;
  tag: string;
  name?: string;
  groups?: readonly (readonly string[])[];
}): Promise<Championship> {
  const env = config();
  const tenant = opts.tenant ?? env.a;
  const api = await Api.login(tenant);
  const tag = opts.tag;
  const tournamentName = opts.name ?? "RKMP T20 Championship";
  const groups = opts.groups ?? [GROUP_A, GROUP_B];

  let tournamentPublicId = "";
  try {
    const built = await build(api, tenant, tag, tournamentName, groups);
    tournamentPublicId = built.tournamentPublicId;
    return built;
  } catch (e) {
    // A build that throws part-way never hands the caller a destroy(), so
    // everything created up to the failure would survive the run. Clean up what
    // exists — by public id when there is one, by the player tag either way —
    // then rethrow the original error rather than a teardown error.
    await purge(tournamentPublicId, tag).catch(() => { /* best effort */ });
    await api.dispose().catch(() => { /* already gone */ });
    throw e;
  }
}

/**
 * Removes a run's rows. Safe to call on a half-built championship.
 *
 * Ordered by foreign key, deepest first. `cricket_matches` is NOT deleted here:
 * a scored match has `innings_batting_stats` and `innings_bowling_stats` rows
 * that nothing cascades into, so it must go through the API's delete endpoint —
 * gotchas.md records that as BUG-10. The caller deletes its matches first and
 * this only unlinks whatever is left.
 */
export function purge(tournamentPublicId: string, tag: string): Promise<void> {
  if (tournamentPublicId) {
    const tq = `(SELECT id FROM tournaments WHERE public_id = '${tournamentPublicId}')`;
    dbExec(`UPDATE cricket_matches SET fixture_id = NULL
              WHERE fixture_id IN (SELECT id FROM fixtures WHERE tournament_id IN ${tq})`);
    dbExec(`UPDATE cricket_matches SET tournament_id = NULL WHERE tournament_id IN ${tq}`);
    // The award's own audit rows first: they are keyed on the AWARD's public id,
    // not the tournament's, so deleting the awards leaves them orphaned.
    dbExec(`DELETE FROM audit_logs WHERE entity_public_id IN
              (SELECT public_id FROM tournament_awards WHERE tournament_id IN ${tq})`);
    dbExec(`DELETE FROM tournament_awards WHERE tournament_id IN ${tq}`);
    dbExec(`UPDATE tournaments SET champion_team_id = NULL, runner_up_team_id = NULL
              WHERE id IN ${tq}`);
    dbExec(`UPDATE fixtures SET match_id = NULL WHERE tournament_id IN ${tq}`);
    dbExec(`DELETE FROM fixtures WHERE tournament_id IN ${tq}`);
    dbExec(`DELETE FROM tournament_team_squad WHERE tournament_team_id IN
              (SELECT id FROM tournament_teams WHERE tournament_id IN ${tq})`);
    dbExec(`UPDATE cricket_teams SET tournament_team_id = NULL WHERE tournament_team_id IN
              (SELECT id FROM tournament_teams WHERE tournament_id IN ${tq})`);
    dbExec(`DELETE FROM cricket_teams WHERE tournament_team_id IN
              (SELECT id FROM tournament_teams WHERE tournament_id IN ${tq})`);
    dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN ${tq}`);
    dbExec(`DELETE FROM tournament_venues WHERE tournament_id IN ${tq}`);
    dbExec(`DELETE FROM tournament_officials_pool WHERE tournament_id IN ${tq}`);
    dbExec(`DELETE FROM tournament_stages WHERE tournament_id IN ${tq}`);
    dbExec(`DELETE FROM audit_logs WHERE entity_public_id = '${tournamentPublicId}'`);
    dbExec(`DELETE FROM tournaments WHERE public_id = '${tournamentPublicId}'`);
  }

  // Players and their batch are matched on the run tag, so a partially-created
  // set is still found.
  const like = `T31 ${tag} %`;
  dbExec(`DELETE FROM tournament_awards WHERE player_id IN
            (SELECT id FROM players WHERE display_name LIKE '${like}')`);
  // PLAYER_CREATED audit rows, before the players they name are gone. `players`
  // has no FK from `audit_logs`, so nothing cascades and an orphan survives every
  // teardown otherwise — 5,933 of them had accumulated in nca_scoring_test from
  // previous sessions before this fixture started clearing its own.
  dbExec(`DELETE FROM audit_logs WHERE entity_public_id IN
            (SELECT public_id FROM players WHERE display_name LIKE '${like}')`);
  dbExec(`DELETE FROM player_career_stats WHERE player_id IN
            (SELECT id FROM players WHERE display_name LIKE '${like}')`);
  dbExec(`DELETE FROM player_batches WHERE player_id IN
            (SELECT id FROM players WHERE display_name LIKE '${like}')`);
  dbExec(`DELETE FROM players WHERE display_name LIKE '${like}'`);
  dbExec(`DELETE FROM batches WHERE name = 'T31 Batch ${tag}'`);
  return Promise.resolve();
}

async function build(api: Api, tenant: Tenant, tag: string, tournamentName: string,
                     groups: readonly (readonly string[])[]): Promise<Championship> {

  // ── one batch, and eleven real academy players per side ───────────────────
  //
  // Real players, not `externalName` guests: a guest MatchTeamPlayer has
  // `player IS NULL`, so it is filtered out of every leaderboard and cannot
  // receive an award. A championship played by guests would return empty
  // statistics and no award candidates, and every assertion below it would pass
  // while proving nothing.
  const batch = await api.raw("post", "/api/admin/batches", {
    name: `T31 Batch ${tag}`,
    startTime: "06:00:00", endTime: "08:00:00", active: true,
  });
  expect(batch.status, "create the batch").toBeLessThan(400);
  const batchId = (batch.body as any).id as string;

  const flat = groups.flat();
  const squads = new Map<string, { publicId: string; displayName: string }[]>();
  let seq = 0;
  for (const teamName of flat) {
    const squad: { publicId: string; displayName: string }[] = [];
    for (let i = 0; i < SQUAD_SIZE; i++) {
      const displayName = `T31 ${tag} ${SHORT[teamName]}${String(i + 1).padStart(2, "0")}`;
      const { publicId } = await createPlayer(api, {
        displayName, gender: "MALE", profession: "STUDENT",
        dob: `2008-01-${String((seq % 28) + 1).padStart(2, "0")}`,
        phone: `${7000000000 + Number(tag.slice(-6)) * 100 + seq}`.slice(0, 10),
        joiningDate: "2026-01-05", batchIds: [batchId],
      }, displayName);
      squad.push({ publicId, displayName });
      seq++;
    }
    squads.set(teamName, squad);
  }

  // ── the tournament ────────────────────────────────────────────────────────
  //
  // GROUP_KNOCKOUT, 2026, T20. The YEAR is deliberately not sent: ruling 11
  // derives it from startDate, and TournamentRequest has no year field to send.
  const t = await api.raw("post", "/api/admin/cricket/tournaments", {
    name: tournamentName,
    shortName: "RKMPT20",
    format: "GROUP_KNOCKOUT",
    tournamentType: "INTER_ACADEMY",
    organizer: "RKMP Labs",
    venue: "RKMP Main Ground",
    description: "Phase 31 sample championship",
    startDate: "2026-03-01",
    endDate: "2026-04-05",
    defaultOvers: 20,
    winPoints: POINTS.win,
    tiePoints: POINTS.tie,
    noResultPoints: POINTS.noResult,
    lossPoints: POINTS.loss,
  });
  expect(t.status, `create ${tournamentName}`).toBe(200);
  const tournamentPublicId = (t.body as any).publicId as string;

  // Ruling 11: the year is derived, and 2026-03-01 → 2026-04-05 is one year, so
  // it displays as "2026" rather than "2026-27".
  expect((t.body as any).startYear ?? (t.body as any).year, "year derived from startDate")
    .toBe(2026);

  // ── the eight sides, in two groups of four ────────────────────────────────
  const sides: Side[] = [];
  let seed = 1;
  for (let g = 0; g < groups.length; g++) {
    const groupName = String.fromCharCode(65 + g);   // "A", "B"
    for (const name of groups[g]) {
      const r = await api.raw("post",
        `/api/admin/cricket/tournaments/${tournamentPublicId}/teams`,
        { name, shortName: SHORT[name], groupName, colorHex: "#2563eb", seed: seed++ });
      expect(r.status, `enter ${name} in group ${groupName}`).toBe(200);
      const body = r.body as any;
      expect(body.groupName, `${name} is in group ${groupName}`).toBe(groupName);
      sides.push({
        publicId: body.publicId, name, groupName, squad: squads.get(name)!,
      });
    }
  }

  // ── squads of eleven, from the academy's own players ──────────────────────
  for (const side of sides) {
    for (let i = 0; i < side.squad.length; i++) {
      const p = side.squad[i];
      const r = await api.raw("post",
        `/api/admin/cricket/tournaments/${tournamentPublicId}/teams/${side.publicId}/squad`,
        { playerPublicId: p.publicId, playerRole: "ALL_ROUNDER", squadNumber: i + 1 });
      expect(r.status, `register ${p.displayName} to ${side.name}`).toBeLessThan(400);
    }
    const back = await api.raw("get",
      `/api/admin/cricket/tournaments/${tournamentPublicId}/teams/${side.publicId}/squad`);
    expect((back.body as any[]).length, `${side.name} has a squad of eleven`).toBe(SQUAD_SIZE);
  }

  // ── qualification rules: top 2 per group, cross-group seeding, ruling 2 ───
  const qual = await api.raw("put",
    `/api/admin/cricket/tournaments/${tournamentPublicId}/qualification-rules`, {
      teamsAdvancingPerGroup: 2,
      knockoutSeedingRule: "CROSS_GROUP",
      tieBreakOrder: [...TIE_BREAK_ORDER],
    });
  expect(qual.status, "store the qualification rules").toBe(200);
  expect((qual.body as any).teamsAdvancingPerGroup).toBe(2);
  expect((qual.body as any).knockoutSeedingRule).toBe("CROSS_GROUP");
  expect((qual.body as any).tieBreakOrder).toEqual([...TIE_BREAK_ORDER]);

  // ── two grounds, so a venue clash is a thing that can be arranged ─────────
  const venues: { id: string; name: string }[] = [];
  for (const [i, name] of [`RKMP Ground 1 ${tag}`, `RKMP Ground 2 ${tag}`].entries()) {
    const r = await api.raw("post",
      `/api/admin/cricket/tournaments/${tournamentPublicId}/venues`,
      { name, maxMatchesPerDay: 3, displayOrder: i });
    expect(r.status, `add ground ${name}`).toBe(200);
    venues.push({ id: (r.body as any).id, name });
  }

  // ── an officials pool (ruling 6: no scorer role) ──────────────────────────
  const officials = [
    { name: `Umpire Alpha ${tag}`, role: "UMPIRE" },
    { name: `Umpire Bravo ${tag}`, role: "UMPIRE" },
    { name: `Referee Charlie ${tag}`, role: "MATCH_REFEREE" },
  ];
  for (const o of officials) {
    const r = await api.raw("post",
      `/api/admin/cricket/tournaments/${tournamentPublicId}/officials-pool`, o);
    expect(r.status, `add ${o.name} to the officials pool`).toBe(200);
  }

  const sideByName = new Map(sides.map((s) => [s.name, s]));

  return {
    api, tenant, tag, tournamentPublicId, tournamentName, sides, sideByName,
    venues, officials,

    async destroy() {
      // Award audit rows FIRST, before anything else is removed.
      //
      // A Man of the Match award points at a `cricket_matches` row, and deleting
      // the match through the API takes the award with it — so by the time
      // `purge` reads award public ids to clear their audit rows, the awards are
      // already gone and four `TOURNAMENT_AWARD_GIVEN` rows survive every run.
      // Which is exactly how they were found.
      dbExec(`DELETE FROM audit_logs WHERE entity_public_id IN
                (SELECT public_id FROM tournament_awards WHERE tournament_id =
                  (SELECT id FROM tournaments
                   WHERE public_id = '${tournamentPublicId}'))`);

      // Matches through the API, for BUG-10's reason, and every match that was
      // created against this tournament — read back rather than remembered, so a
      // match created by a test that then failed is still removed.
      const ids = dbOne(
        `SELECT coalesce(string_agg(public_id, ' '), '') FROM cricket_matches
         WHERE tournament_id = (SELECT id FROM tournaments
                                WHERE public_id = '${tournamentPublicId}')
            OR fixture_id IN (SELECT id FROM fixtures WHERE tournament_id =
                 (SELECT id FROM tournaments WHERE public_id = '${tournamentPublicId}'))`,
      ).split(" ").filter(Boolean);

      const refused: string[] = [];
      for (const m of ids) {
        const del = await api.deleteMatch(m).catch(() => ({ status: 0 }));
        const status = (del as { status: number }).status;
        if (status >= 400 && status !== 404) refused.push(`${m}:${status}`);
      }

      await purge(tournamentPublicId, tag);
      await api.dispose();

      // A silent teardown failure is what makes the NEXT run's counts wrong, so
      // it fails here rather than leaving a row behind quietly.
      if (refused.length) {
        throw new Error(
          `championship teardown: DELETE refused for ${refused.join(", ")}; ` +
          `cricket_matches rows are left behind`);
      }
    },
  };
}
