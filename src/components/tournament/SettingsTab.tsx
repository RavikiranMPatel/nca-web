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
import type { QualificationRules } from "../../api/scoring/tournamentApi";

/** Ruling 2's vocabulary, with the labels an admin would recognise. */
const TIE_BREAKS: { key: string; label: string; hint: string }[] = [
  { key: "POINTS", label: "Points", hint: "competition points" },
  { key: "NRR", label: "Net run rate", hint: "Super Over excluded" },
  { key: "WINS", label: "Wins", hint: "outright wins" },
  { key: "HEAD_TO_HEAD", label: "Head-to-head", hint: "results between the tied teams" },
];

interface Props {
  computeMatchDuration: () => number;
  computeMaxMatchesPerGround: () => number;
  computeSchedulePreview: () => SchedulePreview;
  handleSaveSettings: ApiRecord;
  posting: ApiRecord;
  setSettingsForm: Dispatch<SetStateAction<SettingsForm>>;
  settingsForm: SettingsForm;
  qualForm: QualificationRules;
  setQualForm: Dispatch<SetStateAction<QualificationRules>>;
  handleSaveQualificationRules: ApiRecord;
  savingQual: boolean;
}

export default function SettingsTab({
  computeMatchDuration,
  computeMaxMatchesPerGround,
  computeSchedulePreview,
  handleSaveSettings,
  posting,
  setSettingsForm,
  settingsForm,
  qualForm,
  setQualForm,
  handleSaveQualificationRules,
  savingQual,
}: Props) {
  const move = (key: string, delta: number) =>
    setQualForm((p) => {
      const order = [...p.tieBreakOrder];
      const i = order.indexOf(key);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= order.length) return p;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...p, tieBreakOrder: order };
    });

  const toggle = (key: string) =>
    setQualForm((p) => {
      const on = p.tieBreakOrder.includes(key);
      // The list must never empty out — the server refuses that, and a table with
      // no ordering rule is not a table.
      if (on && p.tieBreakOrder.length === 1) return p;
      return {
        ...p,
        tieBreakOrder: on
          ? p.tieBreakOrder.filter((k) => k !== key)
          : [...p.tieBreakOrder, key],
      };
    });

  const ordered = [
    ...qualForm.tieBreakOrder,
    ...TIE_BREAKS.map((t) => t.key).filter((k) => !qualForm.tieBreakOrder.includes(k)),
  ];

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
                data-testid="settings-innings-break"
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

        {/* Qualification rules (Slice 4b) */}
        <div
          data-testid="qualification-rules"
          className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-4"
        >
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            🥇 Qualification Rules
          </h3>

          <div>
            <label
              htmlFor="teams-advancing"
              className="text-xs text-gray-400 mb-2 block"
            >
              Teams advancing per group
            </label>
            <input
              id="teams-advancing"
              data-testid="teams-advancing-per-group"
              type="number"
              min={1}
              max={8}
              value={qualForm.teamsAdvancingPerGroup}
              onChange={(e) =>
                setQualForm((p) => ({
                  ...p,
                  teamsAdvancingPerGroup: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <span className="text-xs text-gray-400 mb-2 block">
              Knockout bracket seeding
            </span>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "CROSS_GROUP", label: "Cross-group", hint: "A1 v B2, B1 v A2" },
                { key: "GLOBAL_SEED", label: "Global seed", hint: "1 v N across all groups" },
              ].map((o) => (
                <button
                  key={o.key}
                  type="button"
                  data-testid={`seeding-${o.key}`}
                  aria-pressed={qualForm.knockoutSeedingRule === o.key}
                  onClick={() =>
                    setQualForm((p) => ({
                      ...p,
                      knockoutSeedingRule: o.key as QualificationRules["knockoutSeedingRule"],
                    }))
                  }
                  className={`flex-1 min-w-[8rem] px-3 py-2 rounded-lg text-xs font-semibold border transition-all active:scale-95 text-left ${
                    qualForm.knockoutSeedingRule === o.key
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <span className="block">{o.label}</span>
                  <span
                    className={`block mt-0.5 font-normal ${
                      qualForm.knockoutSeedingRule === o.key
                        ? "text-blue-100"
                        : "text-gray-400"
                    }`}
                  >
                    {o.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs text-gray-400 mb-2 block">
              Tie-break order — most significant first
            </span>
            <div className="space-y-2" data-testid="tie-break-order">
              {ordered.map((key) => {
                const meta = TIE_BREAKS.find((t) => t.key === key)!;
                const on = qualForm.tieBreakOrder.includes(key);
                const pos = qualForm.tieBreakOrder.indexOf(key);
                return (
                  <div
                    key={key}
                    data-testid={`tie-break-${key}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                      on
                        ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        : "bg-gray-50 dark:bg-gray-900 border-dashed border-gray-200 dark:border-gray-800 opacity-60"
                    }`}
                  >
                    <span className="w-5 text-xs font-bold text-gray-400 shrink-0">
                      {on ? pos + 1 : "—"}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {meta.label}
                      </span>
                      <span className="block text-xs text-gray-400 truncate">
                        {meta.hint}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Move ${meta.label} up`}
                      data-testid={`tie-break-${key}-up`}
                      disabled={!on || pos <= 0}
                      onClick={() => move(key, -1)}
                      className="px-2 py-1 rounded-md text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-30 active:scale-95"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${meta.label} down`}
                      data-testid={`tie-break-${key}-down`}
                      disabled={!on || pos < 0 || pos >= qualForm.tieBreakOrder.length - 1}
                      onClick={() => move(key, 1)}
                      className="px-2 py-1 rounded-md text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-30 active:scale-95"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      aria-label={`${on ? "Remove" : "Add"} ${meta.label}`}
                      data-testid={`tie-break-${key}-toggle`}
                      onClick={() => toggle(key)}
                      className={`px-2 py-1 rounded-md text-xs font-semibold active:scale-95 ${
                        on
                          ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                          : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                      }`}
                    >
                      {on ? "Remove" : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleSaveQualificationRules}
            disabled={savingQual}
            data-testid="save-qualification-rules"
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
          >
            {savingQual ? "Saving..." : "💾 Save Qualification Rules"}
          </button>

          <p className="text-xs text-gray-400">
            Used when advancing a group stage to the knockout. Changing them is
            audited.
          </p>
        </div>

        {/* Save */}
        <button
          onClick={handleSaveSettings}
          disabled={posting}
          data-testid="save-settings"
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
