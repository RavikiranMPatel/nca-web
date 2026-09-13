import type { ApiRecord } from "./types";

/**
 * StandingsTab — the points table, recomputed on read by the backend.
 *
 * Moved out of TournamentDetailPage by the Slice 2 split, JSX unchanged. Every
 * piece of state and every handler still lives in the page and arrives here as a
 * prop: the split was about the size of one 3,559-line file, not about moving
 * where the state sits, and keeping the data flow identical is what lets
 * tournament-tabs.spec.ts prove the refactor by passing unchanged.
 *
 * The closeout slice added the two columns the API had been sending all along.
 * `/standings` has carried `nrr` and `noResult` on every row since Phase 12, and
 * this table rendered neither — so Phase 12's net run rate was computed, stored,
 * RANKED ON and printed into the PDF while being invisible on the screen Phase
 * 11 names, and a side whose match was abandoned read `P=3 W=1 L=1 T=0`, which
 * does not add up because the column that explains it was missing.
 *
 * Nine columns now, and 375px is the viewport that has to hold them, so the
 * table scrolls inside its own `overflow-x-auto` wrapper rather than widening
 * the document: a body that scrolls sideways is the overflow the mobile check
 * forbids.
 */
interface Props {
  standings: ApiRecord[];
}

/**
 * Net run rate, signed, to three decimal places.
 *
 * Signed because a run rate of -0.05 is not "0.05" and the sign is the whole
 * point of the number; three places because that is how a run rate is quoted,
 * and because it is what `TournamentReportPdfService.nrr` already prints — the
 * screen and the printed table must not disagree about the same figure.
 */
function nrr(value: unknown): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "+0.000";
  return `${n < 0 ? "-" : "+"}${Math.abs(n).toFixed(3)}`;
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
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[34rem]">
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
                  <th
                    className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center"
                    title="No result — abandoned or washed out"
                  >
                    NR
                  </th>
                  <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center font-bold">
                    Pts
                  </th>
                  <th
                    className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center"
                    title="Net run rate"
                  >
                    NRR
                  </th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s: any, i: number) => (
                  <tr
                    key={s.teamPublicId}
                    data-testid={`standings-row-${s.teamPublicId}`}
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
                    <td
                      data-testid="standings-played"
                      className="py-2.5 px-2 text-center text-gray-500"
                    >
                      {s.played}
                    </td>
                    <td
                      data-testid="standings-won"
                      className="py-2.5 px-2 text-center text-green-600"
                    >
                      {s.won}
                    </td>
                    <td
                      data-testid="standings-lost"
                      className="py-2.5 px-2 text-center text-red-500"
                    >
                      {s.lost}
                    </td>
                    <td
                      data-testid="standings-tied"
                      className="py-2.5 px-2 text-center text-gray-400"
                    >
                      {s.tied}
                    </td>
                    <td
                      data-testid="standings-no-result"
                      className="py-2.5 px-2 text-center text-gray-400"
                    >
                      {s.noResult ?? 0}
                    </td>
                    <td
                      data-testid="standings-points"
                      className="py-2.5 px-2 text-center font-bold text-gray-900 dark:text-white"
                    >
                      {s.points}
                    </td>
                    <td
                      data-testid="standings-nrr"
                      className={`py-2.5 px-2 text-center tabular-nums whitespace-nowrap ${
                        Number(s.nrr ?? 0) < 0
                          ? "text-red-500"
                          : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {nrr(s.nrr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
  );
}
