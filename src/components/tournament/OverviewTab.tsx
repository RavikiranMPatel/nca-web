import type { ApiRecord } from "./types";
import type { TournamentDashboard } from "../../api/scoring/tournamentApi";
import DashboardCards from "./DashboardCards";

/**
 * OverviewTab — Phase 4's dashboard cards, above the summary rows.
 *
 * Slice 5 added the cards. The summary rows below them are unchanged and still
 * come from data the page already had; the cards come from the single
 * /dashboard request, so the tab makes one extra call and not twelve.
 *
 * Moved out of TournamentDetailPage by the Slice 2 split, JSX unchanged. Every
 * piece of state and every handler still lives in the page and arrives here as a
 * prop: the split was about the size of one 3,559-line file, not about moving
 * where the state sits, and keeping the data flow identical is what lets
 * tournament-tabs.spec.ts prove the refactor by passing unchanged.
 */
interface Props {
  allTournamentPlayers: ApiRecord[];
  fixtures: ApiRecord[];
  teams: ApiRecord[];
  tournament: ApiRecord;
  dashboard: TournamentDashboard | null;
  dashboardLoading: boolean;
}

export default function OverviewTab({
  allTournamentPlayers,
  fixtures,
  teams,
  tournament,
  dashboard,
  dashboardLoading,
}: Props) {
  return (
      <div data-testid="tournament-panel-overview" className="space-y-4">
        <DashboardCards dashboard={dashboard} loading={dashboardLoading} />

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {[
            {
              label: "Format",
              value: tournament.format?.replace(/_/g, " "),
            },
            {
              label: "Dates",
              value: `${tournament.startDate ?? "—"} ${tournament.endDate ? "→ " + tournament.endDate : ""}`,
            },
            { label: "Venue", value: tournament.venue ?? "—" },
            {
              label: "Default Overs",
              value: `${tournament.defaultOvers} overs`,
            },
            {
              label: "Points (W/T/L)",
              value: `${tournament.winPoints} / ${tournament.tiePoints} / ${tournament.lossPoints}`,
            },
            { label: "Teams", value: teams.length },
            { label: "Total Players", value: allTournamentPlayers.length },
            { label: "Fixtures", value: fixtures.length },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between px-4 py-3">
              <span className="text-xs font-medium text-gray-400">
                {label}
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
  );
}
