/**
 * DeclareWinnerModal — overriding the champion and runner-up the backend derived from the final.
 *
 * Moved out of TournamentDetailPage by the Slice 5 modal split, JSX unchanged.
 * The guard deciding whether it renders stays in the page, so this is mounted
 * under exactly the condition it was before; every piece of state and every
 * handler still lives in the page and arrives as a prop. The split is about the
 * size of one file, not about moving where the state sits — which is what lets
 * the existing tournament specs prove the refactor by passing unchanged.
 */
import type { Dispatch, SetStateAction } from "react";
import type { ApiRecord, Handler } from "../types";

interface Props {
  handleDeclareWinner: Handler;
  overrideReason: string;
  posting: boolean;
  runnerUpTeam: string;
  setOverrideReason: Dispatch<SetStateAction<string>>;
  setRunnerUpTeam: Dispatch<SetStateAction<string>>;
  setShowDeclareWinner: Dispatch<SetStateAction<boolean>>;
  setWinnerTeam: Dispatch<SetStateAction<string>>;
  teams: ApiRecord[];
  winnerTeam: string;
}

export default function DeclareWinnerModal({
  handleDeclareWinner,
  overrideReason,
  posting,
  runnerUpTeam,
  setOverrideReason,
  setRunnerUpTeam,
  setShowDeclareWinner,
  setWinnerTeam,
  teams,
  winnerTeam,
}: Props) {
  return (
      <div
        data-testid="declare-winner-modal"
        className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6"
      >
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            🏆 Override Result
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            A tournament sets its own champion when the fixture marked as the
            final is decided. Use this only to correct that, or when there is no
            final to decide it. SUPER_ADMIN only, and recorded in the audit log.
          </p>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Champion
          </p>
          <div className="space-y-2 mb-4">
            {teams.map((t: any) => (
              <button
                key={t.publicId}
                data-testid={`override-champion-${t.publicId}`}
                onClick={() => setWinnerTeam(t.publicId)}
                className={`w-full p-3 rounded-xl border text-left transition-all ${winnerTeam === t.publicId ? "bg-yellow-50 border-yellow-400 dark:bg-yellow-900/20" : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: t.colorHex ?? "#3b82f6" }}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t.name}
                  </span>
                  {winnerTeam === t.publicId && (
                    <span className="ml-auto text-yellow-500">🏆</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Runner-up <span className="font-normal normal-case">(optional)</span>
          </p>
          <select
            data-testid="override-runner-up"
            value={runnerUpTeam}
            onChange={(e) => setRunnerUpTeam(e.target.value)}
            className="w-full mb-4 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">— none —</option>
            {teams
              .filter((t: any) => t.publicId !== winnerTeam)
              .map((t: any) => (
                <option key={t.publicId} value={t.publicId}>
                  {t.name}
                </option>
              ))}
          </select>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Reason <span className="text-red-500">*</span>
          </p>
          <textarea
            data-testid="override-reason"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            rows={3}
            placeholder="Why is the computed result being overridden?"
            className="w-full mb-4 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100"
          />

          <div className="flex gap-3">
            <button
              onClick={() => setShowDeclareWinner(false)}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              data-testid="override-confirm"
              onClick={handleDeclareWinner}
              disabled={!winnerTeam || !overrideReason.trim() || posting}
              className="flex-1 py-2.5 bg-yellow-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
  );
}
