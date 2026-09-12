import { Api } from "./api";
import { dbExec } from "./db";

/**
 * A set of tournaments with deliberately different names, years, formats, types,
 * teams and grounds — the fixture the list specs filter and sort against.
 *
 * <p>Self-provisioning, per Slice 0's rule: it creates everything it needs
 * through the API and removes it again, so the suite runs green from a truncated
 * database and does not depend on rows seeded by a script outside the repo.
 *
 * <p>The values are chosen so that no two rows are interchangeable. Every filter
 * has at least one row it matches and at least one it must exclude, and no sort
 * order is a permutation of another — otherwise a broken sort could still
 * produce the expected sequence by accident.
 */

export interface SeededTournament {
  publicId: string;
  name: string;
  shortName: string;
  year: number;
  seasonLabel: string;
  status: string;
  format: string;
  tournamentType: string;
  startDate: string;
  endDate: string;
  venue: string;
  teams: string[];
}

export interface TournamentSet {
  api: Api;
  /** Unique to this run, so concurrent projects never share a row. */
  tag: string;
  all: SeededTournament[];
  byShortName: Record<string, SeededTournament>;
  cleanup: () => Promise<void>;
}

/**
 * Six tournaments. Chosen so that:
 *
 * <ul>
 *   <li>three distinct years, one of them shared by two rows</li>
 *   <li>one season crossing a year boundary, so "2026-27" is exercised</li>
 *   <li>one with NO dates at all — the nullable-column state, which must sort
 *       last and match no year or date filter</li>
 *   <li>four formats and four types, none aligned with each other</li>
 *   <li>team counts 4/2/0, so a sort on teams is not the same as any other</li>
 *   <li>two grounds, one shared</li>
 *   <li>alphabetical order deliberately different from date order</li>
 * </ul>
 */
const PLAN: Omit<SeededTournament, "publicId" | "year" | "seasonLabel">[] = [
  {
    name: "Zephyr Shield", shortName: "ZEPH", status: "DRAFT",
    format: "KNOCKOUT", tournamentType: "AGE_GROUP",
    startDate: "2026-03-01", endDate: "2026-03-10",
    venue: "Oval Ground", teams: ["Eagles", "Falcons", "Hawks", "Kites"],
  },
  {
    name: "Aurora Trophy", shortName: "AURO", status: "DRAFT",
    format: "ROUND_ROBIN", tournamentType: "INTER_ACADEMY",
    startDate: "2026-07-05", endDate: "2026-07-20",
    venue: "Oval Ground", teams: ["Eagles", "Owls"],
  },
  {
    name: "Monsoon League", shortName: "MONS", status: "DRAFT",
    format: "LEAGUE_PLAYOFFS", tournamentType: "OPEN",
    startDate: "2025-06-01", endDate: "2025-08-30",
    venue: "River Park", teams: [],
  },
  {
    name: "Century Classic", shortName: "CENT", status: "DRAFT",
    format: "GROUP_KNOCKOUT", tournamentType: "INVITATIONAL",
    startDate: "2024-01-05", endDate: "2024-01-25",
    venue: "River Park", teams: [],
  },
  {
    // Crosses a year boundary — ruling 11's "2026-27".
    name: "Winter Series", shortName: "WINT", status: "DRAFT",
    format: "ROUND_ROBIN", tournamentType: "FRIENDLY",
    startDate: "2026-11-20", endDate: "2027-02-10",
    venue: "Oval Ground", teams: [],
  },
  {
    // No dates. A real state: start_date is nullable.
    name: "Undated Cup", shortName: "UNDA", status: "DRAFT",
    format: "ROUND_ROBIN", tournamentType: "INTERNAL",
    startDate: "", endDate: "",
    venue: "", teams: [],
  },
];

function seasonOf(start: string, end: string): string {
  if (!start) return "";
  const s = Number(start.slice(0, 4));
  const e = end ? Number(end.slice(0, 4)) : s;
  return e === s ? String(s) : `${s}-${String(e % 100).padStart(2, "0")}`;
}

export async function createTournamentSet(
  opts: { label: string; tenant?: "a" | "b" } = { label: "List" },
): Promise<TournamentSet> {
  const tag = `${opts.label}-${Math.random().toString(36).slice(2, 8)}`;
  const api = await Api.login(
    (await import("./env")).config()[opts.tenant ?? "a"],
  );

  const all: SeededTournament[] = [];
  for (const p of PLAN) {
    const body: Record<string, unknown> = {
      // The tag is in the name so teardown can find the rows and so two
      // projects running at once never collide.
      name: `${p.name} ${tag}`,
      shortName: `${p.shortName}${tag.slice(-3)}`,
      format: p.format,
      tournamentType: p.tournamentType,
    };
    if (p.startDate) body.startDate = p.startDate;
    if (p.endDate) body.endDate = p.endDate;
    if (p.venue) body.venue = p.venue;

    const created = await api.raw("post", "/api/admin/cricket/tournaments", body);
    if (created.status !== 200) {
      throw new Error(
        `seeding ${p.name} -> ${created.status} ${JSON.stringify(created.body)}`,
      );
    }
    const row: SeededTournament = {
      ...p,
      publicId: created.body.publicId,
      name: `${p.name} ${tag}`,
      shortName: `${p.shortName}${tag.slice(-3)}`,
      year: p.startDate ? Number(p.startDate.slice(0, 4)) : 0,
      seasonLabel: seasonOf(p.startDate, p.endDate),
    };
    for (const team of p.teams) {
      const r = await api.raw(
        "post", `/api/admin/cricket/tournaments/${row.publicId}/teams`,
        { name: `${team} ${tag}`, shortName: team.slice(0, 3).toUpperCase() });
      if (r.status !== 200) {
        throw new Error(`seeding team ${team} -> ${r.status} ${JSON.stringify(r.body)}`);
      }
    }
    all.push(row);
  }

  // Fixtures on the four-team knockout, so a sort on matches has a non-zero row
  // and is not just the id tiebreaker.
  const knockout = all.find((t) => t.teams.length === 4)!;
  const gen = await api.raw(
    "post", `/api/admin/cricket/tournaments/${knockout.publicId}/fixtures/generate`, {});
  if (gen.status !== 200) {
    throw new Error(`generating fixtures -> ${gen.status} ${JSON.stringify(gen.body)}`);
  }

  const byShortName: Record<string, SeededTournament> = {};
  for (const t of all) byShortName[t.shortName.slice(0, 4)] = t;

  return {
    api, tag, all, byShortName,
    async cleanup() {
      for (const t of all) {
        await api.raw("delete", `/api/admin/cricket/tournaments/${t.publicId}`);
      }
      // Belt and braces: the delete endpoint cascades, but a row left behind by
      // a failed delete would move the baseline every other spec is measured
      // against. Matched on the run tag, so nothing else can be caught by it.
      dbExec(`DELETE FROM fixtures WHERE tournament_id IN
                (SELECT id FROM tournaments WHERE name LIKE '%${tag}')`);
      dbExec(`DELETE FROM tournament_stages WHERE tournament_id IN
                (SELECT id FROM tournaments WHERE name LIKE '%${tag}')`);
      dbExec(`DELETE FROM tournament_teams WHERE tournament_id IN
                (SELECT id FROM tournaments WHERE name LIKE '%${tag}')`);
      dbExec(`DELETE FROM tournaments WHERE name LIKE '%${tag}'`);
      await api.dispose();
    },
  };
}
