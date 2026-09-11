/**
 * AddOfficialModal — adding an umpire or referee to the tournament's officials pool.
 *
 * Moved out of TournamentDetailPage by the Slice 5 modal split, JSX unchanged.
 * The guard deciding whether it renders stays in the page, so this is mounted
 * under exactly the condition it was before; every piece of state and every
 * handler still lives in the page and arrives as a prop. The split is about the
 * size of one file, not about moving where the state sits — which is what lets
 * the existing tournament specs prove the refactor by passing unchanged.
 */
import type { Dispatch, SetStateAction } from "react";
import type { Handler, OfficialForm } from "../types";
import { OFFICIAL_ROLES, OFFICIAL_ROLE_LABELS } from "../constants";

interface Props {
  handleAddOfficial: Handler;
  officialForm: OfficialForm;
  posting: boolean;
  setOfficialForm: Dispatch<SetStateAction<OfficialForm>>;
  setShowAddOfficial: Dispatch<SetStateAction<boolean>>;
}

export default function AddOfficialModal({
  handleAddOfficial,
  officialForm,
  posting,
  setOfficialForm,
  setShowAddOfficial,
}: Props) {
  return (
      <div
        data-testid="add-official-modal"
        className="fixed inset-0 z-[60] bg-black/60 flex items-end"
      >
        <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            🦺 Add Match Official
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Name *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                placeholder="e.g. Ravi Kumar"
                value={officialForm.name}
                onChange={(e) =>
                  setOfficialForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {OFFICIAL_ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => setOfficialForm((p) => ({ ...p, role }))}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                      officialForm.role === role
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {OFFICIAL_ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAddOfficial(false)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddOfficial}
                disabled={posting || !officialForm.name.trim()}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                Add Official
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}
