/**
 * AddVenueModal — adding a ground to the tournament's venue pool.
 *
 * Moved out of TournamentDetailPage by the Slice 5 modal split, JSX unchanged.
 * The guard deciding whether it renders stays in the page, so this is mounted
 * under exactly the condition it was before; every piece of state and every
 * handler still lives in the page and arrives as a prop. The split is about the
 * size of one file, not about moving where the state sits — which is what lets
 * the existing tournament specs prove the refactor by passing unchanged.
 */
import type { Dispatch, SetStateAction } from "react";
import type { Handler, VenueForm } from "../types";

interface Props {
  handleAddVenue: Handler;
  posting: boolean;
  setShowAddVenue: Dispatch<SetStateAction<boolean>>;
  setVenueForm: Dispatch<SetStateAction<VenueForm>>;
  venueForm: VenueForm;
}

export default function AddVenueModal({
  handleAddVenue,
  posting,
  setShowAddVenue,
  setVenueForm,
  venueForm,
}: Props) {
  return (
      <div
        data-testid="add-venue-modal"
        className="fixed inset-0 z-[60] bg-black/60 flex items-end"
      >
        <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            🏟 Add Venue
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Ground Name *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                placeholder="e.g. NCA Ground A"
                value={venueForm.name}
                onChange={(e) =>
                  setVenueForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Max Matches per Day
              </label>
              <input
                type="number"
                min={1}
                max={10}
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none text-center"
                value={venueForm.maxMatchesPerDay}
                onChange={(e) =>
                  setVenueForm((p) => ({
                    ...p,
                    maxMatchesPerDay: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAddVenue(false)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddVenue}
                disabled={posting || !venueForm.name.trim()}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                Add Venue
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}
