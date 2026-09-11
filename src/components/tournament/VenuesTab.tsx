/**
 * VenuesTab — the grounds available to the tournament and their per-day match limits.
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
  editingVenue: ApiRecord;
  handleDeleteVenue: Handler;
  handleEditVenue: ApiRecord;
  posting: ApiRecord;
  setEditingVenue: Dispatch<SetStateAction<ApiRecord>>;
  setShowAddVenue: Dispatch<SetStateAction<ApiRecord>>;
  venues: ApiRecord[];
}

export default function VenuesTab({
  editingVenue,
  handleDeleteVenue,
  handleEditVenue,
  posting,
  setEditingVenue,
  setShowAddVenue,
  venues,
}: Props) {
  return (
      <div data-testid="tournament-panel-venues" className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {venues.length} venue{venues.length !== 1 ? "s" : ""}
          </span>
          <button
            data-testid="tournament-add-venue"
            onClick={() => setShowAddVenue(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl active:scale-95"
          >
            + Add Venue
          </button>
        </div>

        {venues.length === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">🏟</div>
            <p className="text-sm text-gray-400 mb-1">
              No venues added yet.
            </p>
            <p className="text-xs text-gray-400">
              Add grounds before generating fixtures to enable
              auto-scheduling.
            </p>
          </div>
        )}

        {venues.map((v: any) => (
          <div
            key={v.id}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4"
          >
            {editingVenue?.id === v.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  value={editingVenue.name}
                  onChange={(e) =>
                    setEditingVenue((p: any) => ({
                      ...p,
                      name: e.target.value,
                    }))
                  }
                />
                <div className="flex items-center gap-3">
                  <label className="text-xs text-gray-400 flex-shrink-0">
                    Max matches/day
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className="w-20 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none text-center"
                    value={editingVenue.maxMatchesPerDay}
                    onChange={(e) =>
                      setEditingVenue((p: any) => ({
                        ...p,
                        maxMatchesPerDay: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingVenue(null)}
                    className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditVenue}
                    disabled={posting}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {v.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Max {v.maxMatchesPerDay} match
                    {v.maxMatchesPerDay !== 1 ? "es" : ""}/day
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingVenue({ ...v })}
                    className="p-2 text-blue-500 active:scale-90"
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteVenue(v.id)}
                    className="p-2 text-red-400 active:scale-90"
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
              </div>
            )}
          </div>
        ))}
      </div>
  );
}
