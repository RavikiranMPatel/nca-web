/**
 * RescheduleModal — moving or postponing a fixture, including the SUPER_ADMIN clash override.
 *
 * Moved out of TournamentDetailPage by the Slice 5 modal split, JSX unchanged.
 * The guard deciding whether it renders stays in the page, so this is mounted
 * under exactly the condition it was before; every piece of state and every
 * handler still lives in the page and arrives as a prop. The split is about the
 * size of one file, not about moving where the state sits — which is what lets
 * the existing tournament specs prove the refactor by passing unchanged.
 */
import type { Dispatch, SetStateAction } from "react";
import type { ApiRecord, Handler, RescheduleForm } from "../types";

interface Props {
  posting: boolean;
  rescheduleConflict: string;
  rescheduleForm: RescheduleForm;
  rescheduleOverride: string;
  reschedulingFixture: ApiRecord;
  setRescheduleForm: Dispatch<SetStateAction<RescheduleForm>>;
  setRescheduleOverride: Dispatch<SetStateAction<string>>;
  setReschedulingFixture: Dispatch<SetStateAction<ApiRecord>>;
  submitReschedule: Handler;
}

export default function RescheduleModal({
  posting,
  rescheduleConflict,
  rescheduleForm,
  rescheduleOverride,
  reschedulingFixture,
  setRescheduleForm,
  setRescheduleOverride,
  setReschedulingFixture,
  submitReschedule,
}: Props) {
  return (
      <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6">
        <div
          data-testid="reschedule-modal"
          className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5 max-h-[90vh] overflow-y-auto"
        >
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            🕑 Reschedule
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {reschedulingFixture.homeTeam?.name ?? "TBD"} v{" "}
            {reschedulingFixture.awayTeam?.name ?? "TBD"}
          </p>

          <label className="flex items-center gap-2 mb-4 text-xs text-gray-700 dark:text-gray-300">
            <input
              data-testid="reschedule-postpone"
              type="checkbox"
              checked={rescheduleForm.postpone}
              onChange={(e) =>
                setRescheduleForm({ ...rescheduleForm, postpone: e.target.checked })
              }
            />
            Postpone instead — give up the slot without setting a new one
          </label>

          {!rescheduleForm.postpone && (
            <div className="flex gap-2 mb-4">
              <input
                data-testid="reschedule-date"
                type="date"
                value={rescheduleForm.date}
                onChange={(e) =>
                  setRescheduleForm({ ...rescheduleForm, date: e.target.value })
                }
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100"
              />
              <input
                data-testid="reschedule-time"
                type="time"
                value={rescheduleForm.time}
                onChange={(e) =>
                  setRescheduleForm({ ...rescheduleForm, time: e.target.value })
                }
                className="w-28 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100"
              />
            </div>
          )}

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Reason <span className="text-red-500">*</span>
          </p>
          <textarea
            data-testid="reschedule-reason"
            value={rescheduleForm.reason}
            onChange={(e) =>
              setRescheduleForm({ ...rescheduleForm, reason: e.target.value })
            }
            rows={2}
            placeholder="Why is it moving?"
            className="w-full mb-4 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100"
          />

          {/* The server refused the slot. This is an answer, not an error — it
              names what clashes, and only a SUPER_ADMIN can go ahead anyway. */}
          {rescheduleConflict && (
            <div
              data-testid="reschedule-conflict"
              className="mb-4 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400"
            >
              {rescheduleConflict}
              <textarea
                data-testid="reschedule-override-reason"
                value={rescheduleOverride}
                onChange={(e) => setRescheduleOverride(e.target.value)}
                rows={2}
                placeholder="SUPER_ADMIN only — why schedule over it anyway?"
                className="w-full mt-2 px-3 py-2 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-xl text-xs text-gray-900 dark:text-gray-100"
              />
              <button
                data-testid="reschedule-override-confirm"
                onClick={() => submitReschedule(true)}
                disabled={!rescheduleOverride.trim() || posting}
                className="w-full mt-2 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold disabled:opacity-40"
              >
                Schedule over the clash
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setReschedulingFixture(null)}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              data-testid="reschedule-confirm"
              onClick={() => submitReschedule(false)}
              disabled={
                !rescheduleForm.reason.trim() ||
                posting ||
                (!rescheduleForm.postpone &&
                  (!rescheduleForm.date || !rescheduleForm.time))
              }
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
            >
              {rescheduleForm.postpone ? "Postpone" : "Move"}
            </button>
          </div>
        </div>
      </div>
  );
}
