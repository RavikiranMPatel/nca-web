/**
 * Constants shared between TournamentDetailPage and the per-tab components split
 * out of it by Slice 2.
 *
 * They live here rather than in the page because both sides need them: the tabs
 * render with them, and the page's own modals (add player, add official) still
 * do too. Moving them out is what lets a tab component stop importing the page.
 */

/**
 * The tabs, as (key, label) pairs rather than bare strings.
 *
 * Two reasons, both learned in Slice 5. The page selected its tab by INDEX
 * (`tab === 7`), so inserting Awards and Reports in the middle would have
 * silently renumbered every panel after them. And the testid was derived from
 * the label, so "Points Table" would have produced
 * `tournament-tab-points table` — a testid with a space in it.
 *
 * The key is the slug used for both `tournament-tab-<key>` and
 * `tournament-panel-<key>`, and it is what `tab` now holds.
 *
 * Phase 4 names eight tabs: Overview, Teams, Fixtures, Points Table,
 * Statistics, Awards, Reports, Settings. Players, Venues and Officials are not
 * in that list but exist, work and are covered by specs, so they are kept —
 * Phase 4's list is the required set, not an exhaustive one. Standings and Stats
 * are renamed to the names Phase 4 uses for them.
 */
export interface TabDef {
  key: string;
  label: string;
}

export const TABS: TabDef[] = [
  { key: "overview", label: "Overview" },
  { key: "teams", label: "Teams" },
  { key: "players", label: "Players" },
  { key: "venues", label: "Venues" },
  { key: "officials", label: "Officials" },
  { key: "fixtures", label: "Fixtures" },
  { key: "points-table", label: "Points Table" },
  { key: "statistics", label: "Statistics" },
  { key: "awards", label: "Awards" },
  { key: "reports", label: "Reports" },
  { key: "settings", label: "Settings" },
];

export const ROLES = ["BATSMAN", "BOWLER", "ALL_ROUNDER", "WK_BATSMAN"];

export const ROLE_LABELS: Record<string, string> = {
  BATSMAN: "Bat",
  BOWLER: "Bowl",
  ALL_ROUNDER: "AR",
  WK_BATSMAN: "WK",
};

// Ruling 6: there is no scorer role. Scoring happens in the app, so appointing
// someone to it is a promise the tournament cannot keep — and the server now
// rejects it, so offering it here would only produce a 400.
export const OFFICIAL_ROLES = [
  "UMPIRE",
  "THIRD_UMPIRE",
  "REFEREE",
  "MATCH_REFEREE",
];

export const OFFICIAL_ROLE_LABELS: Record<string, string> = {
  UMPIRE: "Umpire",
  THIRD_UMPIRE: "3rd Umpire",
  REFEREE: "Referee",
  MATCH_REFEREE: "Match Referee",
  // Kept for display only: a pool entry created before ruling 6 still needs a
  // label, even though the role can no longer be chosen.
  SCORER: "Scorer",
};

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const statusBadge: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-600",
  CANCELLED: "bg-red-100 text-red-500",
};

export const fixtureStatusColor: Record<string, string> = {
  SCHEDULED: "text-gray-400",
  IN_PROGRESS: "text-green-500",
  COMPLETED: "text-blue-500",
  CANCELLED: "text-red-400",
};
