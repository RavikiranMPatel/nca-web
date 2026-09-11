/**
 * Reports — a stub, deliberately.
 *
 * Phases 20, 21 and 22 are Slice 6: six report types and a complete tournament
 * PDF, generated from structured backend data by a new TournamentReportPdfService
 * modelled on MatchReportPdfService. None of that exists yet.
 *
 * The tab exists now rather than in Slice 6 because Phase 4 names it, and a tab
 * bar that grows a new entry later moves every tab beside it under the user's
 * finger. Saying plainly what is coming is better than an empty panel that reads
 * as a page that failed to load.
 */
export default function ReportsTab() {
  return (
    <div data-testid="tournament-panel-reports" className="space-y-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-8 text-center">
        <div className="text-3xl mb-2">📄</div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">
          Reports are not built yet
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
          The six report types and the full tournament PDF land in the next slice.
          Until then, the points table and statistics on the tabs beside this one
          are the tournament's figures, and they are what the reports will be
          generated from.
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2.5">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
          Planned
        </div>
        <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
          {[
            "Tournament summary",
            "Points table",
            "Full statistics",
            "Team performance",
            "Player performance",
            "Match-by-match results",
          ].map((r) => (
            <li key={r} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
