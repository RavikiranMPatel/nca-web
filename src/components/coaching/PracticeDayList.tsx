import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import type { PracticeDayResponse } from "../../api/playerService/coachingService";

const FOCUS_COLORS: Record<string, string> = {
  BATTING: "bg-blue-100 text-blue-700",
  BOWLING: "bg-green-100 text-green-700",
  FIELDING: "bg-teal-100 text-teal-700",
  FITNESS: "bg-orange-100 text-orange-700",
  MENTAL: "bg-purple-100 text-purple-700",
  GENERAL: "bg-slate-100 text-slate-700",
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  practiceDays: PracticeDayResponse[];
  loading: boolean;
  isSuperAdmin: boolean;
  playerPublicId: string;
  onNew: () => void;
  onEdit: (publicId: string) => void;
  onDelete: (publicId: string) => void;
};

export default function PracticeDayList({
  practiceDays,
  loading,
  isSuperAdmin,
  onNew,
  onEdit,
  onDelete,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900">Practice Days</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {practiceDays.length} session{practiceDays.length !== 1 ? "s" : ""}{" "}
            recorded
          </p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus size={15} /> Log Practice
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-10">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 mt-3">Loading...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && practiceDays.length === 0 && (
        <div className="bg-white rounded-lg shadow p-10 text-center">
          <div className="text-4xl mb-3">🏏</div>
          <p className="font-semibold text-slate-700">No practice days yet</p>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Log the first practice session to start tracking.
          </p>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-all"
          >
            <Plus size={16} /> Log First Practice
          </button>
        </div>
      )}

      {/* List */}
      {!loading && practiceDays.length > 0 && (
        <div className="space-y-0">
          {practiceDays.map((day, idx) => {
            const isExpanded = expandedId === day.publicId;
            return (
              <div key={day.publicId} className="flex gap-3">
                {/* Timeline dot */}
                <div className="flex flex-col items-center w-5 flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow z-10" />
                  {idx < practiceDays.length - 1 && (
                    <div className="w-0.5 flex-1 bg-slate-200 min-h-[40px]" />
                  )}
                </div>

                {/* Card */}
                <div className="flex-1 mb-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                  {/* Card header */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : day.publicId)
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">
                            {formatDate(day.practiceDate)}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${STATUS_COLORS[day.status] || "bg-slate-100 text-slate-600"}`}
                          >
                            {day.status}
                          </span>
                          {day.isSharedWithPlayer && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-green-50 text-green-700">
                              Shared
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock size={11} className="text-slate-400" />
                          <span className="text-xs text-slate-500">
                            {day.totalDurationMinutes} min total
                          </span>
                          {day.slots && day.slots.length > 0 && (
                            <span className="text-xs text-slate-400">
                              · {day.slots.length} slot
                              {day.slots.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                      {/* Slots */}
                      {day.slots && day.slots.length > 0 && (
                        <div className="space-y-2">
                          {day.slots.map((slot) => (
                            <div
                              key={slot.publicId}
                              className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-700">
                                  {slot.startTime}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {slot.durationMinutes}min
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${FOCUS_COLORS[slot.focusArea] || "bg-slate-100 text-slate-600"}`}
                                >
                                  {slot.focusArea}
                                </span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-md ${slot.slotType === "COACHED" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}
                                >
                                  {slot.slotType === "COACHED"
                                    ? `👤 ${slot.coachName || "Coach"}`
                                    : "Self Practice"}
                                </span>
                              </div>
                              {slot.playerSummary && (
                                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                                  {slot.playerSummary}
                                </p>
                              )}
                              {slot.drills && slot.drills.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {slot.drills.map((drill) => (
                                    <div
                                      key={drill.publicId}
                                      className="flex items-center gap-2 text-xs text-slate-600"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                                      <span className="font-medium">
                                        {drill.name}
                                      </span>
                                      {drill.targetReps && (
                                        <span className="text-slate-400">
                                          · {drill.targetReps} reps
                                        </span>
                                      )}
                                      {drill.targetDuration && (
                                        <span className="text-slate-400">
                                          · {drill.targetDuration}
                                        </span>
                                      )}
                                      <span
                                        className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${
                                          drill.completionStatus === "COMPLETED"
                                            ? "bg-green-100 text-green-700"
                                            : drill.completionStatus ===
                                                "IN_PROGRESS"
                                              ? "bg-yellow-100 text-yellow-700"
                                              : "bg-slate-100 text-slate-500"
                                        }`}
                                      >
                                        {drill.completionStatus}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {day.overallPlayerSummary && (
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {day.overallPlayerSummary}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(day.publicId);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(day.publicId);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
