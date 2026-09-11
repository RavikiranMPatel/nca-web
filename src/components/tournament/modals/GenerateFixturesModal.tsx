/**
 * GenerateFixturesModal — fixture generation, with the schedule parameters and the play-day picker.
 *
 * Moved out of TournamentDetailPage by the Slice 5 modal split, JSX unchanged.
 * The guard deciding whether it renders stays in the page, so this is mounted
 * under exactly the condition it was before; every piece of state and every
 * handler still lives in the page and arrives as a prop. The split is about the
 * size of one file, not about moving where the state sits — which is what lets
 * the existing tournament specs prove the refactor by passing unchanged.
 */
import type { Dispatch, SetStateAction } from "react";
import type { ApiRecord, GenForm, Handler } from "../types";
import { DAY_LABELS } from "../constants";

interface Props {
  genForm: GenForm;
  handleGenerate: Handler;
  posting: boolean;
  setGenForm: Dispatch<SetStateAction<GenForm>>;
  setShowGenerate: Dispatch<SetStateAction<boolean>>;
  teams: ApiRecord[];
  togglePlayDay: Handler;
  tournament: ApiRecord;
  venues: ApiRecord[];
}

export default function GenerateFixturesModal({
  genForm,
  handleGenerate,
  posting,
  setGenForm,
  setShowGenerate,
  teams,
  togglePlayDay,
  tournament,
  venues,
}: Props) {
  return (
      <div
        data-testid="generate-fixtures-modal"
        className="fixed inset-0 z-[60] bg-black/60 flex items-end"
      >
        <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              ⚡ Auto Generate Fixtures
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Format: <b>{tournament.format?.replace(/_/g, " ")}</b> ·{" "}
              {teams.length} teams
            </p>
            {tournament.format === "GROUP_KNOCKOUT" && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Teams per Group
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={8}
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                    value={genForm.teamsPerGroup}
                    onChange={(e) =>
                      setGenForm((p) => ({
                        ...p,
                        teamsPerGroup: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                {/* "Teams advancing per Group" was here and did nothing: the
                    generator only ever read teamsPerGroup. It is a stored
                    qualification rule now, on the Settings tab. */}
              </div>
            )}

            <p className="text-xs text-red-400 mb-4">
              ⚠ This will delete and regenerate all existing fixtures.
            </p>
            {/* Scheduling */}
            <div className="space-y-4 mb-4">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                📅 Schedule
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-xl px-3 py-2 text-xs text-blue-600 dark:text-blue-400">
                Leave dates blank to assign manually later.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                    value={genForm.scheduleStartDate}
                    onChange={(e) =>
                      setGenForm((p) => ({
                        ...p,
                        scheduleStartDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    First Match Time
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                    value={genForm.scheduleStartTime}
                    onChange={(e) =>
                      setGenForm((p) => ({
                        ...p,
                        scheduleStartTime: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">
                  Play Days
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAY_LABELS.map((label, idx) => {
                    const day = idx + 1;
                    const active = genForm.playDays.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => togglePlayDay(day)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                          active
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-500"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {genForm.playDays.length === 0 && (
                  <p className="text-xs text-red-400 mt-1">
                    Select at least one play day.
                  </p>
                )}
              </div>

              {venues.length > 0 && (
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">
                    Ground Assignment
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      onClick={() =>
                        setGenForm((p) => ({ ...p, autoAssignVenues: true }))
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                        genForm.autoAssignVenues
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        🔄 Auto
                      </div>
                      <div className="text-xs text-gray-400">
                        Round-robin across grounds
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        setGenForm((p) => ({ ...p, autoAssignVenues: false }))
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                        !genForm.autoAssignVenues
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        ✋ Manual
                      </div>
                      <div className="text-xs text-gray-400">
                        Assign venues later
                      </div>
                    </button>
                  </div>
                  {genForm.autoAssignVenues && (
                    <div className="space-y-1.5">
                      {venues.map((v: any) => {
                        const selected =
                          genForm.selectedVenueIds.length === 0 ||
                          genForm.selectedVenueIds.includes(v.id);
                        return (
                          <button
                            key={v.id}
                            onClick={() =>
                              setGenForm((p) => ({
                                ...p,
                                selectedVenueIds: p.selectedVenueIds.includes(
                                  v.id,
                                )
                                  ? p.selectedVenueIds.filter(
                                      (id) => id !== v.id,
                                    )
                                  : [...p.selectedVenueIds, v.id],
                              }))
                            }
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                              selected
                                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${selected ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}
                            >
                              {selected && (
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
                                {v.name}
                              </div>
                              <div className="text-xs text-gray-400">
                                Max {v.maxMatchesPerDay}/day
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      {genForm.selectedVenueIds.length === 0 && (
                        <p className="text-xs text-blue-500 px-1">
                          All venues selected by default.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowGenerate(false)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={posting || genForm.playDays.length === 0}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}
