import type { TournamentDashboard, Highlight } from "../../api/scoring/tournamentApi";

/**
 * Phase 4's twelve cards.
 *
 * Five counts, two aggregates and five headlines, all from ONE request — every
 * number is derived on the server from the innings and delivery rows the scoring
 * engine already wrote. Nothing is computed here; a card that did its own
 * arithmetic would be a second implementation of a scoring statistic, which is
 * exactly what Phase 4 says not to build.
 *
 * A headline is null until there is something to headline — before any fixture
 * is completed there is no leader, no top scorer and no highest score — and a
 * null renders as a muted placeholder rather than a zero, because "0 runs" and
 * "nobody has batted yet" are different things.
 *
 * Mobile first: the counts are a 3-column grid at 375px and 5 across from `sm`,
 * and the headline cards stack. Every value is a `tabular-nums` so the numbers
 * line up as they change.
 */
interface Props {
  dashboard: TournamentDashboard | null;
  loading: boolean;
}

function CountCard({ label, value, tone }: {
  label: string; value: number; tone: string;
}) {
  return (
    <div
      data-testid={`dashboard-count-${label.toLowerCase()}`}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-2 py-3 text-center"
    >
      <div className={`text-lg font-bold tabular-nums ${tone}`}>{value}</div>
      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">
        {label}
      </div>
    </div>
  );
}

function HighlightCard({ testId, label, highlight }: {
  testId: string; label: string; highlight: Highlight | null;
}) {
  return (
    <div
      data-testid={testId}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2.5"
    >
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
        {label}
      </div>
      {highlight ? (
        <div className="flex items-baseline justify-between gap-2 mt-1">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {highlight.name}
            </div>
            {highlight.subtitle && (
              <div className="text-[11px] text-gray-400 truncate">
                {highlight.subtitle}
              </div>
            )}
          </div>
          <div className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums flex-shrink-0">
            {highlight.value}
          </div>
        </div>
      ) : (
        // Not a zero: "nothing has been played" is a different statement from
        // "the top scorer has 0 runs", and a zero here reads as the second.
        <div className="text-xs text-gray-400 mt-1">Nothing played yet</div>
      )}
    </div>
  );
}

export default function DashboardCards({ dashboard, loading }: Props) {
  if (loading && !dashboard) {
    return (
      <div
        data-testid="dashboard-loading"
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-6 text-center text-xs text-gray-400"
      >
        Loading summary…
      </div>
    );
  }
  if (!dashboard) return null;

  return (
    <div data-testid="tournament-dashboard" className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        <CountCard label="Teams" value={dashboard.teams} tone="text-gray-900 dark:text-white" />
        <CountCard label="Matches" value={dashboard.matches} tone="text-gray-900 dark:text-white" />
        <CountCard label="Completed" value={dashboard.completed} tone="text-green-600 dark:text-green-400" />
        <CountCard label="Upcoming" value={dashboard.upcoming} tone="text-blue-600 dark:text-blue-400" />
        <CountCard label="Live" value={dashboard.live} tone="text-red-600 dark:text-red-400" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <CountCard label="Runs" value={dashboard.totalRuns} tone="text-gray-900 dark:text-white" />
        <CountCard label="Wickets" value={dashboard.totalWickets} tone="text-gray-900 dark:text-white" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <HighlightCard testId="dashboard-current-leader"
          label="Current Leader" highlight={dashboard.currentLeader} />
        <HighlightCard testId="dashboard-highest-team-score"
          label="Highest Team Score" highlight={dashboard.highestTeamScore} />
        <HighlightCard testId="dashboard-highest-individual-score"
          label="Highest Individual Score" highlight={dashboard.highestIndividualScore} />
        <HighlightCard testId="dashboard-top-run-scorer"
          label="Top Run Scorer" highlight={dashboard.topRunScorer} />
        <HighlightCard testId="dashboard-top-wicket-taker"
          label="Top Wicket Taker" highlight={dashboard.topWicketTaker} />
      </div>
    </div>
  );
}
