/**
 * EditFixtureModal — editing a fixture, including Slice 4b's schedule-sheet section.
 *
 * Moved out of TournamentDetailPage by the Slice 5 modal split, JSX unchanged.
 * The guard deciding whether it renders stays in the page, so this is mounted
 * under exactly the condition it was before; every piece of state and every
 * handler still lives in the page and arrives as a prop. The split is about the
 * size of one file, not about moving where the state sits — which is what lets
 * the existing tournament specs prove the refactor by passing unchanged.
 */
import type { Dispatch, SetStateAction } from "react";
import type { ApiRecord, EditFixtureForm, Handler } from "../types";

interface Props {
  editFixtureForm: EditFixtureForm;
  editingFixture: ApiRecord;
  handleDeleteFixture: Handler;
  handleEditFixture: Handler;
  posting: boolean;
  setEditFixtureForm: Dispatch<SetStateAction<EditFixtureForm>>;
  setEditingFixture: Dispatch<SetStateAction<ApiRecord>>;
  setShowEditFixture: Dispatch<SetStateAction<boolean>>;
  teams: ApiRecord[];
  venues: ApiRecord[];
}

export default function EditFixtureModal({
  editFixtureForm,
  editingFixture,
  handleDeleteFixture,
  handleEditFixture,
  posting,
  setEditFixtureForm,
  setEditingFixture,
  setShowEditFixture,
  teams,
  venues,
}: Props) {
  return (
      <div
        data-testid="edit-fixture-modal"
        className="fixed inset-0 z-[60] bg-black/70 flex items-end"
      >
        <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              ✏️ Edit Fixture
            </h3>
            <span className="text-xs text-gray-400">
              Round {editingFixture.roundNumber} · {editingFixture.status}
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Round Number
              </label>
              <input
                type="number"
                min={1}
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                value={editFixtureForm.roundNumber}
                onChange={(e) =>
                  setEditFixtureForm((p) => ({
                    ...p,
                    roundNumber: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Home Team
              </label>
              <select
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                value={editFixtureForm.homeTeamPublicId}
                onChange={(e) =>
                  setEditFixtureForm((p) => ({
                    ...p,
                    homeTeamPublicId: e.target.value,
                  }))
                }
              >
                <option value="">Select team</option>
                {teams.map((t: any) => (
                  <option key={t.publicId} value={t.publicId}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Away Team
              </label>
              <select
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                value={editFixtureForm.awayTeamPublicId}
                onChange={(e) =>
                  setEditFixtureForm((p) => ({
                    ...p,
                    awayTeamPublicId: e.target.value,
                  }))
                }
              >
                <option value="">Select team</option>
                {teams
                  .filter(
                    (t: any) =>
                      t.publicId !== editFixtureForm.homeTeamPublicId,
                  )
                  .map((t: any) => (
                    <option key={t.publicId} value={t.publicId}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Venue (optional)
              </label>
              {venues.length > 0 && (
                <select
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none mb-2"
                  value={editFixtureForm.venueId}
                  onChange={(e) => {
                    const v = venues.find(
                      (vv: any) => vv.id === e.target.value,
                    );
                    setEditFixtureForm((p) => ({
                      ...p,
                      venueId: e.target.value,
                      venue: v?.name ?? p.venue,
                    }));
                  }}
                >
                  <option value="">Select from tournament venues...</option>
                  {venues.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                placeholder="Or type venue name..."
                value={editFixtureForm.venue}
                onChange={(e) =>
                  setEditFixtureForm((p) => ({ ...p, venue: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  value={editFixtureForm.scheduledDate}
                  onChange={(e) =>
                    setEditFixtureForm((p) => ({
                      ...p,
                      scheduledDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Time
                </label>
                <input
                  type="time"
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  value={editFixtureForm.scheduledTime}
                  onChange={(e) =>
                    setEditFixtureForm((p) => ({
                      ...p,
                      scheduledTime: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Status Override
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() =>
                        setEditFixtureForm((p) => ({ ...p, status: s }))
                      }
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${editFixtureForm.status === s ? "bg-blue-600 border-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"}`}
                    >
                      {s}
                    </button>
                  ),
                )}
              </div>
            </div>
            {/* ── Scheduling and officials (Slice 4b) ── */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-3">
                📋 Schedule Sheet
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="fixture-match-number"
                      className="text-xs text-gray-400 mb-1 block"
                    >
                      Match Number
                    </label>
                    <input
                      id="fixture-match-number"
                      data-testid="fixture-match-number"
                      type="number"
                      min={1}
                      placeholder="e.g. 14"
                      className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none text-gray-900 dark:text-gray-100"
                      value={editFixtureForm.matchNumber}
                      onChange={(e) =>
                        setEditFixtureForm((p) => ({
                          ...p,
                          matchNumber: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="fixture-city"
                      className="text-xs text-gray-400 mb-1 block"
                    >
                      City
                    </label>
                    <input
                      id="fixture-city"
                      data-testid="fixture-city"
                      placeholder="e.g. Mysuru"
                      className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none text-gray-900 dark:text-gray-100"
                      value={editFixtureForm.city}
                      onChange={(e) =>
                        setEditFixtureForm((p) => ({ ...p, city: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {(
                  [
                    ["umpire1Name", "Umpire 1", "fixture-umpire1"],
                    ["umpire2Name", "Umpire 2", "fixture-umpire2"],
                    ["umpire3Name", "Third Umpire", "fixture-umpire3"],
                    ["refereeName", "Match Referee", "fixture-referee"],
                    ["scorerName", "Scorer", "fixture-scorer"],
                  ] as const
                ).map(([field, label, testId]) => (
                  <div key={field}>
                    <label
                      htmlFor={testId}
                      className="text-xs text-gray-400 mb-1 block"
                    >
                      {label}
                    </label>
                    <input
                      id={testId}
                      data-testid={testId}
                      placeholder="Name"
                      className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none text-gray-900 dark:text-gray-100"
                      value={editFixtureForm[field]}
                      onChange={(e) =>
                        setEditFixtureForm((p) => ({
                          ...p,
                          [field]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}

                <p className="text-xs text-gray-400 -mt-1">
                  Officials are free text on the schedule. Naming a scorer here
                  grants no access to the scorer page.
                </p>

                <div>
                  <label
                    htmlFor="fixture-notes"
                    className="text-xs text-gray-400 mb-1 block"
                  >
                    Notes
                  </label>
                  <textarea
                    id="fixture-notes"
                    data-testid="fixture-notes"
                    rows={2}
                    maxLength={1000}
                    placeholder="e.g. day/night, reserve day 12th"
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none resize-none text-gray-900 dark:text-gray-100"
                    value={editFixtureForm.notes}
                    onChange={(e) =>
                      setEditFixtureForm((p) => ({ ...p, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowEditFixture(false);
                  setEditingFixture(null);
                }}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleEditFixture}
                disabled={posting}
                data-testid="fixture-save"
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                {posting ? "Saving..." : "Save Changes"}
              </button>
            </div>
            {editingFixture.status === "SCHEDULED" && (
              <button
                onClick={handleDeleteFixture}
                disabled={posting}
                className="w-full py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
              >
                🗑 Delete Fixture
              </button>
            )}
          </div>
        </div>
      </div>
  );
}
