/**
 * Constants shared between TournamentDetailPage and the per-tab components split
 * out of it by Slice 2.
 *
 * They live here rather than in the page because both sides need them: the tabs
 * render with them, and the page's own modals (add player, add official) still
 * do too. Moving them out is what lets a tab component stop importing the page.
 */

export const TABS = [
  "Overview",
  "Teams",
  "Players",
  "Venues",
  "Officials",
  "Fixtures",
  "Standings",
  "Stats",
  "Settings",
];

export const ROLES = ["BATSMAN", "BOWLER", "ALL_ROUNDER", "WK_BATSMAN"];

export const ROLE_LABELS: Record<string, string> = {
  BATSMAN: "Bat",
  BOWLER: "Bowl",
  ALL_ROUNDER: "AR",
  WK_BATSMAN: "WK",
};

export const OFFICIAL_ROLES = [
  "UMPIRE",
  "THIRD_UMPIRE",
  "SCORER",
  "REFEREE",
  "MATCH_REFEREE",
];

export const OFFICIAL_ROLE_LABELS: Record<string, string> = {
  UMPIRE: "Umpire",
  THIRD_UMPIRE: "3rd Umpire",
  SCORER: "Scorer",
  REFEREE: "Referee",
  MATCH_REFEREE: "Match Referee",
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
