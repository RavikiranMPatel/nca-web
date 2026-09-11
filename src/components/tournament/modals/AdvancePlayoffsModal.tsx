/**
 * AdvancePlayoffsModal — drawing the playoff bracket from the current standings.
 *
 * Moved out of TournamentDetailPage by the Slice 5 modal split, JSX unchanged.
 * The guard deciding whether it renders stays in the page, so this is mounted
 * under exactly the condition it was before; every piece of state and every
 * handler still lives in the page and arrives as a prop. The split is about the
 * size of one file, not about moving where the state sits — which is what lets
 * the existing tournament specs prove the refactor by passing unchanged.
 */
import type { Dispatch, SetStateAction } from "react";
import type { Handler } from "../types";

interface Props {
  handleAdvancePlayoffs: Handler;
  playoffBracketType: string;
  playoffTopN: number;
  posting: boolean;
  setPlayoffBracketType: Dispatch<SetStateAction<string>>;
  setPlayoffTopN: Dispatch<SetStateAction<number>>;
  setShowAdvancePlayoffs: Dispatch<SetStateAction<boolean>>;
}

export default function AdvancePlayoffsModal({
  handleAdvancePlayoffs,
  playoffBracketType,
  playoffTopN,
  posting,
  setPlayoffBracketType,
  setPlayoffTopN,
  setShowAdvancePlayoffs,
}: Props) {
  return (
      <div
        data-testid="advance-playoffs-modal"
        className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6"
      >
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            🏆 Advance to Playoffs
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Top teams from the league stage advance to playoffs.
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Teams advancing to playoffs
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 3, 4, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPlayoffTopN(n)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                      playoffTopN === n
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    Top {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Bracket Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    val: "IPL",
                    label: "🏏 IPL Fixed",
                    desc: "Q1, Eliminator, Q2, Final",
                  },
                  {
                    val: "CUSTOM",
                    label: "⚙️ Custom",
                    desc: "Admin sets each round",
                  },
                ].map(({ val, label, desc }) => (
                  <button
                    key={val}
                    onClick={() => setPlayoffBracketType(val)}
                    className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                      playoffBracketType === val
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {label}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>
            {playoffTopN === 4 && playoffBracketType === "IPL" && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-xl px-3 py-2.5 text-xs text-blue-600 dark:text-blue-400">
                <strong>IPL bracket:</strong> Qualifier 1 (1v2) + Eliminator
                (3v4) will be created. Q2 and Final are added after results.
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowAdvancePlayoffs(false)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAdvancePlayoffs}
                disabled={posting}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                {posting ? "Generating..." : "Generate Playoffs"}
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}
