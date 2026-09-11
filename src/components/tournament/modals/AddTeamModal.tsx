/**
 * AddTeamModal — the sheet that enters a side into the tournament.
 *
 * Moved out of TournamentDetailPage by the Slice 5 modal split, JSX unchanged.
 * The guard deciding whether it renders stays in the page, so this is mounted
 * under exactly the condition it was before; every piece of state and every
 * handler still lives in the page and arrives as a prop. The split is about the
 * size of one file, not about moving where the state sits — which is what lets
 * the existing tournament specs prove the refactor by passing unchanged.
 */
import type { Dispatch, SetStateAction } from "react";
import type { Handler, TeamForm } from "../types";

interface Props {
  handleAddTeam: Handler;
  posting: boolean;
  setShowAddTeam: Dispatch<SetStateAction<boolean>>;
  setTeamForm: Dispatch<SetStateAction<TeamForm>>;
  teamForm: TeamForm;
}

export default function AddTeamModal({
  handleAddTeam,
  posting,
  setShowAddTeam,
  setTeamForm,
  teamForm,
}: Props) {
  return (
      <div className="fixed inset-0 z-[60] bg-black/60 flex items-end">
        <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Add Team
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Team Name *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                placeholder="e.g. Team Alpha"
                value={teamForm.name}
                onChange={(e) =>
                  setTeamForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Short Name
                </label>
                <input
                  type="text"
                  maxLength={5}
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  placeholder="ALP"
                  value={teamForm.shortName}
                  onChange={(e) =>
                    setTeamForm((p) => ({ ...p, shortName: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Group (A/B/C)
                </label>
                <input
                  type="text"
                  maxLength={3}
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  placeholder="A"
                  value={teamForm.groupName}
                  onChange={(e) =>
                    setTeamForm((p) => ({
                      ...p,
                      groupName: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Team Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                  value={teamForm.colorHex}
                  onChange={(e) =>
                    setTeamForm((p) => ({ ...p, colorHex: e.target.value }))
                  }
                />
                <span className="text-sm text-gray-500">
                  {teamForm.colorHex}
                </span>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAddTeam(false)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTeam}
                disabled={posting || !teamForm.name.trim()}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                Add Team
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}
