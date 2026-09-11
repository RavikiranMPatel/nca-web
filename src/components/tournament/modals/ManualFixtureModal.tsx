/**
 * ManualFixtureModal — adding one fixture by hand rather than generating a set.
 *
 * Moved out of TournamentDetailPage by the Slice 5 modal split, JSX unchanged.
 * The guard deciding whether it renders stays in the page, so this is mounted
 * under exactly the condition it was before; every piece of state and every
 * handler still lives in the page and arrives as a prop. The split is about the
 * size of one file, not about moving where the state sits — which is what lets
 * the existing tournament specs prove the refactor by passing unchanged.
 */
import type { Dispatch, SetStateAction } from "react";
import type { ApiRecord, Handler, ManualFixtureForm } from "../types";

interface Props {
  fixtureForm: ManualFixtureForm;
  handleManualFixture: Handler;
  posting: boolean;
  setFixtureForm: Dispatch<SetStateAction<ManualFixtureForm>>;
  setShowManualFixture: Dispatch<SetStateAction<boolean>>;
  stages: ApiRecord[];
  teams: ApiRecord[];
}

export default function ManualFixtureModal({
  fixtureForm,
  handleManualFixture,
  posting,
  setFixtureForm,
  setShowManualFixture,
  stages,
  teams,
}: Props) {
  return (
      <div
        data-testid="manual-fixture-modal"
        className="fixed inset-0 z-[60] bg-black/60 flex items-end"
      >
        <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Add Fixture
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Stage
              </label>
              <select
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                value={fixtureForm.stagePublicId}
                onChange={(e) =>
                  setFixtureForm((p) => ({
                    ...p,
                    stagePublicId: e.target.value,
                  }))
                }
              >
                <option value="">Select stage</option>
                {stages.map((s: any) => (
                  <option key={s.publicId} value={s.publicId}>
                    {s.stageName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Home Team
              </label>
              <select
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                value={fixtureForm.homeTeamPublicId}
                onChange={(e) =>
                  setFixtureForm((p) => ({
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
                value={fixtureForm.awayTeamPublicId}
                onChange={(e) =>
                  setFixtureForm((p) => ({
                    ...p,
                    awayTeamPublicId: e.target.value,
                  }))
                }
              >
                <option value="">Select team</option>
                {teams
                  .filter(
                    (t: any) => t.publicId !== fixtureForm.homeTeamPublicId,
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
              <input
                type="text"
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                placeholder="e.g. NCA Ground B"
                value={fixtureForm.venue}
                onChange={(e) =>
                  setFixtureForm((p) => ({ ...p, venue: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Date (optional)
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  value={fixtureForm.scheduledDate}
                  onChange={(e) =>
                    setFixtureForm((p) => ({
                      ...p,
                      scheduledDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Time (optional)
                </label>
                <input
                  type="time"
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  value={fixtureForm.scheduledTime}
                  onChange={(e) =>
                    setFixtureForm((p) => ({
                      ...p,
                      scheduledTime: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowManualFixture(false)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleManualFixture}
                disabled={posting}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                Add Fixture
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}
