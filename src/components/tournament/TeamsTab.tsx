/**
 * TeamsTab — the participating sides, each expanding to reveal its squad.
 *
 * Moved out of TournamentDetailPage by the Slice 2 split, JSX unchanged. Every
 * piece of state and every handler still lives in the page and arrives here as a
 * prop: the split was about the size of one 3,559-line file, not about moving
 * where the state sits, and keeping the data flow identical is what lets
 * tournament-tabs.spec.ts prove the refactor by passing unchanged.
 */
import type { Dispatch, SetStateAction } from "react";
import type { ApiRecord, Handler } from "./types";
import { ROLE_LABELS } from "./constants";

interface Props {
  expandedTeam: ApiRecord;
  handleExpandTeam: Handler;
  handleRemoveFromSquad: Handler;
  handleRemoveTeam: Handler;
  openAddPlayer: Handler;
  setShowAddTeam: Dispatch<SetStateAction<ApiRecord>>;
  squadMap: ApiRecord;
  teams: ApiRecord[];
}

export default function TeamsTab({
  expandedTeam,
  handleExpandTeam,
  handleRemoveFromSquad,
  handleRemoveTeam,
  openAddPlayer,
  setShowAddTeam,
  squadMap,
  teams,
}: Props) {
  return (
      <div data-testid="tournament-panel-teams" className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {teams.length} teams
          </span>
          <button
            data-testid="tournament-add-team"
            onClick={() => setShowAddTeam(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl active:scale-95"
          >
            + Add Team
          </button>
        </div>
        {teams.map((team) => {
          const squad = squadMap[team.publicId] ?? [];
          const isExpanded = expandedTeam === team.publicId;
          return (
            <div
              key={team.publicId}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden"
            >
              <div className="p-3 flex items-center justify-between">
                <button
                  onClick={() => handleExpandTeam(team.publicId)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: team.colorHex ?? "#3b82f6" }}
                  >
                    {(team.shortName ?? team.name).charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {team.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {team.shortName && (
                        <span className="mr-2">{team.shortName}</span>
                      )}
                      {team.groupName && (
                        <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 mr-2">
                          Group {team.groupName}
                        </span>
                      )}
                      <span>
                        {squadMap[team.publicId]?.length ?? 0} players
                      </span>
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleRemoveTeam(team.publicId)}
                  className="p-2 text-red-400 active:scale-90 ml-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Squad ({squad.length}/20)
                    </span>
                    <button
                      data-testid={`tournament-add-player-${team.publicId}`}
                      onClick={() => openAddPlayer(team.publicId)}
                      className="px-2.5 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg active:scale-95"
                    >
                      + Add Player
                    </button>
                  </div>
                  {squad.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-xs text-gray-400">
                        No players yet. Add players to this squad.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                      {squad.map((entry: any) => (
                        <div
                          key={entry.id ?? entry.player?.publicId}
                          className="flex items-center justify-between px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            {entry.squadNumber && (
                              <span className="text-xs font-bold text-gray-400 w-5 text-right">
                                {entry.squadNumber}
                              </span>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {entry.player?.displayName ?? "Unknown"}
                                </div>
                                {entry.player?.external && (
                                  <span className="text-xs px-1 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded font-medium">
                                    Guest
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                {entry.playerRole && (
                                  <span className="text-xs px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded font-medium">
                                    {ROLE_LABELS[entry.playerRole] ??
                                      entry.playerRole}
                                  </span>
                                )}
                                {entry.player?.battingStyle && (
                                  <span className="text-xs text-gray-400">
                                    {entry.player.battingStyle}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handleRemoveFromSquad(
                                team.publicId,
                                entry.player?.publicId,
                              )
                            }
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
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
  );
}
