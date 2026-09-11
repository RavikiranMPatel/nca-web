/**
 * SettingsTab — the scheduling parameters and the schedule preview computed from them.
 *
 * Moved out of TournamentDetailPage by the Slice 2 split, JSX unchanged. Every
 * piece of state and every handler still lives in the page and arrives here as a
 * prop: the split was about the size of one 3,559-line file, not about moving
 * where the state sits, and keeping the data flow identical is what lets
 * tournament-tabs.spec.ts prove the refactor by passing unchanged.
 */
import type { Dispatch, SetStateAction } from "react";
import type { ApiRecord, SchedulePreview, SettingsForm } from "./types";

interface Props {
  computeMatchDuration: () => number;
  computeMaxMatchesPerGround: () => number;
  computeSchedulePreview: () => SchedulePreview;
  handleSaveSettings: ApiRecord;
  posting: ApiRecord;
  setSettingsForm: Dispatch<SetStateAction<SettingsForm>>;
  settingsForm: SettingsForm;
}

export default function SettingsTab({
  computeMatchDuration,
  computeMaxMatchesPerGround,
  computeSchedulePreview,
  handleSaveSettings,
  posting,
  setSettingsForm,
  settingsForm,
}: Props) {
  return (
      <div data-testid="tournament-panel-settings" className="space-y-5">
        {/* Match Format */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            🏏 Match Format
          </h3>

          {/* Overs preset buttons */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">
              Overs per Innings
            </label>
            <div className="flex gap-2 flex-wrap mb-2">
              {[6, 8, 10, 20, 50].map((o) => (
                <button
                  key={o}
                  onClick={() =>
                    setSettingsForm((p) => ({
                      ...p,
                      oversPerInnings: o,
                      minsPerOver: o === 50 ? 4.0 : o <= 10 ? 4.0 : 4.5,
                      maxMatchesPerDay: o === 50 ? 1 : o <= 10 ? 4 : 2,
                    }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                    settingsForm.oversPerInnings === o
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {o === 50 ? "50-over" : o === 20 ? "T20" : `${o}-over`}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={50}
              className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
              value={settingsForm.oversPerInnings}
              onChange={(e) =>
                setSettingsForm((p) => ({
                  ...p,
                  oversPerInnings: Number(e.target.value),
                }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Mins per Over
              </label>
              <input
                type="number"
                min={1}
                max={10}
                step={0.5}
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                value={settingsForm.minsPerOver}
                onChange={(e) =>
                  setSettingsForm((p) => ({
                    ...p,
                    minsPerOver: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Innings Break (mins)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                value={settingsForm.inningsBreakMins}
                onChange={(e) =>
                  setSettingsForm((p) => ({
                    ...p,
                    inningsBreakMins: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          {/* Computed duration */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-600 dark:text-blue-400">
                Full match duration
              </span>
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                {computeMatchDuration()} mins
              </span>
            </div>
            <p className="text-xs text-blue-400 mt-0.5">
              ({settingsForm.oversPerInnings} ov ×{" "}
              {settingsForm.minsPerOver} min × 2 innings) +{" "}
              {settingsForm.inningsBreakMins} min break
            </p>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-green-600 dark:text-green-400">
              Max matches per ground per day
            </span>
            <span className="text-sm font-bold text-green-700 dark:text-green-300">
              {computeMaxMatchesPerGround()} matches
            </span>
          </div>
          <p className="text-xs text-green-500 mt-0.5">
            Auto-calculated · all venues updated on Save
          </p>
        </div>

        {/* Daily Schedule */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            📅 Daily Schedule
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  First Match Time
                </label>
                <input
                  type="time"
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  value={settingsForm.dayStartTime}
                  onChange={(e) =>
                    setSettingsForm((p) => ({
                      ...p,
                      dayStartTime: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Last Match Ends By
                </label>
                <input
                  type="time"
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  value={settingsForm.dayEndTime}
                  onChange={(e) =>
                    setSettingsForm((p) => ({
                      ...p,
                      dayEndTime: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Gap Between Matches (mins)
              </label>
              <input
                type="number"
                min={0}
                max={120}
                className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                value={settingsForm.groundGapMins}
                onChange={(e) =>
                  setSettingsForm((p) => ({
                    ...p,
                    groundGapMins: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Max Matches per Ground per Day
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() =>
                    setSettingsForm((p) => ({ ...p, maxMatchesPerDay: n }))
                  }
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                    settingsForm.maxMatchesPerDay === n
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Preview */}
          {(() => {
            const { duration, slots } = computeSchedulePreview();
            return (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Preview — per ground
                </p>
                {slots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-green-700 dark:text-green-400">
                        {i + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Match {i + 1}
                      </div>
                      <div className="text-xs text-gray-400">
                        {slot.start} → {slot.end}
                        <span className="ml-2 text-gray-300">
                          ({duration} mins)
                        </span>
                      </div>
                    </div>
                    {i < slots.length - 1 && (
                      <span className="text-xs text-orange-400 font-medium">
                        +{settingsForm.groundGapMins}m gap
                      </span>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Save */}
        <button
          onClick={handleSaveSettings}
          disabled={posting}
          className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
        >
          {posting ? "Saving..." : "💾 Save Settings"}
        </button>

        <p className="text-xs text-gray-400 text-center">
          These settings are used when auto-generating fixtures. Re-generate
          fixtures after changing.
        </p>
      </div>
  );
}
