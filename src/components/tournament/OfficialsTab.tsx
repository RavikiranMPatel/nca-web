/**
 * OfficialsTab — the officials pool — umpires, scorers and referees.
 *
 * Moved out of TournamentDetailPage by the Slice 2 split, JSX unchanged. Every
 * piece of state and every handler still lives in the page and arrives here as a
 * prop: the split was about the size of one 3,559-line file, not about moving
 * where the state sits, and keeping the data flow identical is what lets
 * tournament-tabs.spec.ts prove the refactor by passing unchanged.
 */
import type { Dispatch, SetStateAction } from "react";
import type { ApiRecord, Handler } from "./types";
import { OFFICIAL_ROLES, OFFICIAL_ROLE_LABELS } from "./constants";

interface Props {
  handleDeleteOfficial: Handler;
  officialsPool: ApiRecord[];
  setShowAddOfficial: Dispatch<SetStateAction<ApiRecord>>;
}

export default function OfficialsTab({
  handleDeleteOfficial,
  officialsPool,
  setShowAddOfficial,
}: Props) {
  return (
      <div data-testid="tournament-panel-officials" className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {officialsPool.length} official
            {officialsPool.length !== 1 ? "s" : ""} in pool
          </span>
          <button
            data-testid="tournament-add-official"
            onClick={() => setShowAddOfficial(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl active:scale-95"
          >
            + Add Official
          </button>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-xl px-3 py-2.5 text-xs text-blue-600 dark:text-blue-400">
          Officials added here are available when assigning umpires and
          scorers to each match.
        </div>

        {OFFICIAL_ROLES.map((role) => {
          const group = officialsPool.filter((o: any) => o.role === role);
          if (group.length === 0) return null;
          return (
            <div
              key={role}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden"
            >
              <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {OFFICIAL_ROLE_LABELS[role] ?? role}
                </span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {group.map((o: any) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {o.name}
                    </span>
                    <button
                      onClick={() => handleDeleteOfficial(o.id)}
                      className="p-1.5 text-red-400 active:scale-90"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {officialsPool.length === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">🦺</div>
            <p className="text-sm text-gray-400">No officials added yet.</p>
          </div>
        )}
      </div>
  );
}
