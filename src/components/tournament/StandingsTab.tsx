import type { ApiRecord } from "./types";

/**
 * StandingsTab — the points table, recomputed on read by the backend.
 *
 * Moved out of TournamentDetailPage by the Slice 2 split, JSX unchanged. Every
 * piece of state and every handler still lives in the page and arrives here as a
 * prop: the split was about the size of one 3,559-line file, not about moving
 * where the state sits, and keeping the data flow identical is what lets
 * tournament-tabs.spec.ts prove the refactor by passing unchanged.
 */
interface Props {
  standings: ApiRecord[];
}

export default function StandingsTab({
  standings,
}: Props) {
  return (
      <div data-testid="tournament-panel-points-table">
        {standings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-sm text-gray-400">No standings yet.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="py-2.5 px-3 text-xs font-medium text-gray-400 text-left">
                    #
                  </th>
                  <th className="py-2.5 px-3 text-xs font-medium text-gray-400 text-left">
                    Team
                  </th>
                  <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                    P
                  </th>
                  <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                    W
                  </th>
                  <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                    L
                  </th>
                  <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                    T
                  </th>
                  <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center font-bold">
                    Pts
                  </th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s: any, i: number) => (
                  <tr
                    key={s.teamPublicId}
                    className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  >
                    <td className="py-2.5 px-3 text-gray-400 text-xs">
                      {i + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: s.colorHex ?? "#3b82f6",
                          }}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {s.teamName}
                          </div>
                          {s.groupName && (
                            <div className="text-xs text-gray-400">
                              Group {s.groupName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center text-gray-500">
                      {s.played}
                    </td>
                    <td className="py-2.5 px-2 text-center text-green-600">
                      {s.won}
                    </td>
                    <td className="py-2.5 px-2 text-center text-red-500">
                      {s.lost}
                    </td>
                    <td className="py-2.5 px-2 text-center text-gray-400">
                      {s.tied}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-gray-900 dark:text-white">
                      {s.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
  );
}
