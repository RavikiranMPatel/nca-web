/**
 * StatsTab — the batting, bowling and MVP leaderboards, loaded when the tab is opened.
 *
 * Moved out of TournamentDetailPage by the Slice 2 split, JSX unchanged. Every
 * piece of state and every handler still lives in the page and arrives here as a
 * prop: the split was about the size of one 3,559-line file, not about moving
 * where the state sits, and keeping the data flow identical is what lets
 * tournament-tabs.spec.ts prove the refactor by passing unchanged.
 */
import type { Dispatch, SetStateAction } from "react";
import type { ApiRecord, Handler } from "./types";

interface Props {
  battingStats: ApiRecord[];
  bowlingStats: ApiRecord[];
  loadStats: Handler;
  mvpStats: ApiRecord[];
  setStatsLoaded: Dispatch<SetStateAction<ApiRecord>>;
  setStatsSubTab: Dispatch<SetStateAction<ApiRecord>>;
  statsLoading: ApiRecord;
  statsSubTab: ApiRecord;
  tournament: ApiRecord;
}

export default function StatsTab({
  battingStats,
  bowlingStats,
  loadStats,
  mvpStats,
  setStatsLoaded,
  setStatsSubTab,
  statsLoading,
  statsSubTab,
  tournament,
}: Props) {
  return (
      <div data-testid="tournament-panel-stats" className="space-y-4">
        {/* Sub-tab selector */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {(["batting", "bowling", "mvp"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatsSubTab(s)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${statsSubTab === s ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"}`}
            >
              {s === "batting"
                ? "🏏 Batting"
                : s === "bowling"
                  ? "⚾ Bowling"
                  : "⭐ MVP"}
            </button>
          ))}
        </div>

        {/* Refresh button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              setStatsLoaded(false);
              loadStats();
            }}
            className="text-xs text-blue-600 dark:text-blue-400 font-medium px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg active:scale-95 transition-all"
          >
            ↻ Refresh
          </button>
        </div>

        {statsLoading && (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Batting */}
        {!statsLoading &&
          statsSubTab === "batting" &&
          (battingStats.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-3xl mb-2">🏏</div>
              <p className="text-sm text-gray-400">
                No batting data yet. Complete some matches first.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <th className="py-2.5 px-3 text-xs font-medium text-gray-400 text-left">
                        #
                      </th>
                      <th className="py-2.5 px-3 text-xs font-medium text-gray-400 text-left">
                        Player
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        Inn
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        Runs
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        HS
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        Avg
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        SR
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        50
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        100
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        6s
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {battingStats.map((p: any, i: number) => (
                      <tr
                        key={p.playerPublicId}
                        className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                      >
                        <td className="py-2.5 px-3 text-xs text-gray-400">
                          {i + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {p.playerName}
                          </div>
                          <div className="text-xs text-gray-400">
                            {p.teamName}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs text-gray-500">
                          {p.innings}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-gray-900 dark:text-white">
                          {p.runs}
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs text-gray-600 dark:text-gray-300">
                          {p.highScore}
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs text-gray-500">
                          {p.average}
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs text-blue-600 dark:text-blue-400">
                          {p.strikeRate}
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs text-gray-500">
                          {p.fifties}
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs text-yellow-600">
                          {p.hundreds}
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs text-purple-600 dark:text-purple-400">
                          {p.sixes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

        {/* Bowling */}
        {!statsLoading &&
          statsSubTab === "bowling" &&
          (bowlingStats.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-3xl mb-2">⚾</div>
              <p className="text-sm text-gray-400">
                No bowling data yet. Complete some matches first.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <th className="py-2.5 px-3 text-xs font-medium text-gray-400 text-left">
                        #
                      </th>
                      <th className="py-2.5 px-3 text-xs font-medium text-gray-400 text-left">
                        Player
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        Ov
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        Wkts
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        Runs
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        Econ
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        Best
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        3W
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        5W
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bowlingStats.map((p: any, i: number) => (
                      <tr
                        key={p.playerPublicId}
                        className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                      >
                        <td className="py-2.5 px-3 text-xs text-gray-400">
                          {i + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {p.playerName}
                          </div>
                          <div className="text-xs text-gray-400">
                            {p.teamName}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs text-gray-500">
                          {p.overs}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-gray-900 dark:text-white">
                          {p.wickets}
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs text-gray-600 dark:text-gray-300">
                          {p.runsConceded}
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs text-blue-600 dark:text-blue-400">
                          {p.economy}
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs font-medium text-green-600 dark:text-green-400">
                          {p.bestFigures}
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs text-gray-500">
                          {p.threeWickets}
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs text-purple-600 dark:text-purple-400">
                          {p.fiveWickets}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

        {/* MVP */}
        {!statsLoading &&
          statsSubTab === "mvp" &&
          (mvpStats.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-3xl mb-2">⭐</div>
              <p className="text-sm text-gray-400">
                No MVP data yet. Complete some matches first.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {mvpStats.slice(0, 10).map((p: any, i: number) => (
                <div
                  key={p.playerPublicId}
                  className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      i === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : i === 1
                          ? "bg-gray-100 text-gray-600"
                          : i === 2
                            ? "bg-orange-100 text-orange-600"
                            : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                    }`}
                  >
                    {i === 0
                      ? "🥇"
                      : i === 1
                        ? "🥈"
                        : i === 2
                          ? "🥉"
                          : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {p.playerName}
                    </div>
                    <div className="text-xs text-gray-400">
                      {p.teamName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                      {p.mvpPoints}
                    </div>
                    <div className="text-xs text-gray-400">pts</div>
                  </div>
                </div>
              ))}
              <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-2xl">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                  MVP Points System
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-400">
                  Run: {tournament.mvpWeights?.runPoint ?? 1}pt · Wicket:{" "}
                  {tournament.mvpWeights?.wicketPoint ?? 20}pts · Catch:{" "}
                  {tournament.mvpWeights?.catchPoint ?? 10}pts · 50: +
                  {tournament.mvpWeights?.milestone50 ?? 25}pts · 100: +
                  {tournament.mvpWeights?.milestone100 ?? 50}pts
                </p>
              </div>
            </div>
          ))}
      </div>
  );
}
