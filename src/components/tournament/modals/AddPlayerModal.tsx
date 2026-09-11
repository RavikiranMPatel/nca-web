/**
 * AddPlayerModal — adding players to a squad, from the academy or as a named guest.
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
import { ROLES, ROLE_LABELS } from "../constants";

interface Props {
  closeAddPlayer: Handler;
  externalGender: string;
  externalName: string;
  externalRole: string;
  filteredPlayers: ApiRecord[];
  handleAddExternalPlayer: Handler;
  handleAddToSquad: Handler;
  playerModalTab: "academy" | "external";
  playerSearch: string;
  posting: boolean;
  selectedPlayers: ApiRecord[];
  selectedRole: string;
  setExternalGender: Dispatch<SetStateAction<string>>;
  setExternalName: Dispatch<SetStateAction<string>>;
  setExternalRole: Dispatch<SetStateAction<string>>;
  setPlayerModalTab: Dispatch<SetStateAction<"academy" | "external">>;
  setPlayerSearch: Dispatch<SetStateAction<string>>;
  setSelectedPlayers: Dispatch<SetStateAction<ApiRecord[]>>;
  setSelectedRole: Dispatch<SetStateAction<string>>;
}

export default function AddPlayerModal({
  closeAddPlayer,
  externalGender,
  externalName,
  externalRole,
  filteredPlayers,
  handleAddExternalPlayer,
  handleAddToSquad,
  playerModalTab,
  playerSearch,
  posting,
  selectedPlayers,
  selectedRole,
  setExternalGender,
  setExternalName,
  setExternalRole,
  setPlayerModalTab,
  setPlayerSearch,
  setSelectedPlayers,
  setSelectedRole,
}: Props) {
  return (
      <div
        data-testid="add-player-modal"
        className="fixed inset-0 z-[60] bg-black/70 flex items-end"
      >
        <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white text-center">
              Add Player to Squad
            </h3>
            <div className="flex mt-3 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => setPlayerModalTab("academy")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${playerModalTab === "academy" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"}`}
              >
                🏫 Academy Players
              </button>
              <button
                onClick={() => setPlayerModalTab("external")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${playerModalTab === "external" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"}`}
              >
                👤 Guest / External
              </button>
            </div>
          </div>
          {playerModalTab === "academy" && (
            <>
              <div className="px-4 pt-3 pb-2">
                <p className="text-xs text-gray-400 text-center mb-2">
                  {filteredPlayers.length} available · already in tournament
                  are excluded
                </p>
                <input
                  autoFocus
                  type="text"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  placeholder="Search players..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                />
              </div>
              <div className="overflow-y-auto flex-1 px-3 pb-2 space-y-1.5">
                {filteredPlayers.slice(0, 50).map((p) => {
                  const isSelected = selectedPlayers.some(
                    (s) => s.publicId === p.publicId,
                  );
                  return (
                    <button
                      key={p.publicId}
                      onClick={() =>
                        setSelectedPlayers((prev) =>
                          isSelected
                            ? prev.filter((s) => s.publicId !== p.publicId)
                            : [...prev, p],
                        )
                      }
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isSelected ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700" : "bg-gray-50 dark:bg-gray-800 border border-transparent"}`}
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {p.displayName}
                        </div>
                        {p.battingStyle && (
                          <div className="text-xs text-gray-400">
                            {p.battingStyle}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
                {filteredPlayers.length === 0 && (
                  <div className="text-center py-8 text-sm text-gray-400">
                    No available academy players
                  </div>
                )}
              </div>
              {selectedPlayers.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase">
                    Role for {selectedPlayers.length} selected player
                    {selectedPlayers.length > 1 ? "s" : ""}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {ROLES.map((role) => (
                      <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${selectedRole === role ? "bg-blue-600 border-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"}`}
                      >
                        {ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                <button
                  onClick={closeAddPlayer}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToSquad}
                  disabled={!selectedPlayers.length || posting}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                >
                  {posting
                    ? "Adding..."
                    : `Add ${selectedPlayers.length || ""} to Squad`.trim()}
                </button>
              </div>
            </>
          )}
          {playerModalTab === "external" && (
            <>
              <div className="flex-1 px-4 py-4 space-y-4">
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-orange-700 dark:text-orange-400">
                    Guest players will <b>not appear</b> in the academy
                    players list.
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Player Name *
                  </label>
                  <input
                    type="text"
                    autoFocus
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                    placeholder="e.g. Rahul Kumar"
                    value={externalName}
                    onChange={(e) => setExternalName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">
                    Gender
                  </label>
                  <div className="flex gap-2">
                    {["MALE", "FEMALE", "OTHER"].map((g) => (
                      <button
                        key={g}
                        onClick={() => setExternalGender(g)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${externalGender === g ? "bg-blue-600 border-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"}`}
                      >
                        {g === "MALE"
                          ? "Male"
                          : g === "FEMALE"
                            ? "Female"
                            : "Other"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">
                    Role
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {ROLES.map((role) => (
                      <button
                        key={role}
                        onClick={() => setExternalRole(role)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${externalRole === role ? "bg-blue-600 border-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"}`}
                      >
                        {ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                <button
                  onClick={closeAddPlayer}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddExternalPlayer}
                  disabled={!externalName.trim() || posting}
                  className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                >
                  {posting ? "Adding..." : "Add Guest Player"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
  );
}
