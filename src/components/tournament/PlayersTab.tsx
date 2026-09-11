import type { ApiRecord } from "./types";

/**
 * PlayersTab — every player registered to the tournament, grouped by team.
 *
 * Moved out of TournamentDetailPage by the Slice 2 split, JSX unchanged. Every
 * piece of state and every handler still lives in the page and arrives here as a
 * prop: the split was about the size of one 3,559-line file, not about moving
 * where the state sits, and keeping the data flow identical is what lets
 * tournament-tabs.spec.ts prove the refactor by passing unchanged.
 */
import { ROLE_LABELS } from "./constants";

interface Props {
  allTournamentPlayers: ApiRecord[];
  playersByTeam: ApiRecord;
  teams: ApiRecord[];
}

export default function PlayersTab({
  allTournamentPlayers,
  playersByTeam,
  teams,
}: Props) {
  return (
      <div data-testid="tournament-panel-players" className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {allTournamentPlayers.length} players across {teams.length}{" "}
            teams
          </span>
        </div>
        {Object.entries(playersByTeam).map(
          ([teamPublicId, teamData]: [string, any]) => (
            <div
              key={teamPublicId}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden"
            >
              <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: teamData.colorHex ?? "#3b82f6",
                  }}
                />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {teamData.teamName}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {teamData.players.length} players
                </span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {teamData.players.map((p: any, i: number) => (
                  <div
                    key={p.playerPublicId}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-4">
                        {i + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {p.playerName}
                          </div>
                          {p.isExternal && (
                            <span className="text-xs px-1 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded font-medium">
                              Guest
                            </span>
                          )}
                        </div>
                        {p.playerRole && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded font-medium">
                            {ROLE_LABELS[p.playerRole] ?? p.playerRole}
                          </span>
                        )}
                      </div>
                    </div>
                    {p.squadNumber && (
                      <span className="text-xs font-bold text-gray-300 dark:text-gray-600">
                        #{p.squadNumber}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ),
        )}
        {allTournamentPlayers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">👤</div>
            <p className="text-sm text-gray-400">
              No players registered yet. Go to Teams tab to add players.
            </p>
          </div>
        )}
      </div>
  );
}
