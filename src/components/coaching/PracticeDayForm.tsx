import { useState, useEffect } from "react";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import { coachingService } from "../../api/playerService/coachingService";
import type {
  PracticeDayRequest,
  PracticeSlotRequest,
  DrillAssignmentRequest,
  FocusArea,
  SlotType,
} from "../../api/playerService/coachingService";

const FOCUS_AREAS: FocusArea[] = [
  "BATTING",
  "BOWLING",
  "FIELDING",
  "FITNESS",
  "MENTAL",
  "GENERAL",
];
const MENTAL_FIELDS = [
  "confidenceLevel",
  "focusLevel",
  "anxietyLevel",
  "attitudeRating",
  "bodyLanguageRating",
] as const;

const emptySlot = (): PracticeSlotRequest => ({
  startTime: "09:00",
  durationMinutes: 60,
  slotType: "COACHED",
  focusArea: "BATTING",
  coachName: "",
  coachNotes: "",
  playerSummary: "",
  drills: [],
});

const emptyDrill = (): DrillAssignmentRequest => ({
  name: "",
  description: "",
  targetReps: undefined,
  targetDuration: "",
  isSharedWithPlayer: true,
});

type Props = {
  playerPublicId: string;
  practiceDayPublicId?: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function PracticeDayForm({
  playerPublicId,
  practiceDayPublicId,
  onSuccess,
  onCancel,
}: Props) {
  const isEdit = !!practiceDayPublicId;

  const [practiceDate, setPracticeDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [status, setStatus] = useState("COMPLETED");
  const [isSharedWithPlayer, setIsSharedWithPlayer] = useState(false);
  const [overallCoachNote, setOverallCoachNote] = useState("");
  const [overallPlayerSummary, setOverallPlayerSummary] = useState("");
  const [mentalState, setMentalState] = useState<Record<string, number>>({});
  const [mentalNote, setMentalNote] = useState("");
  const [slots, setSlots] = useState<PracticeSlotRequest[]>([emptySlot()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && practiceDayPublicId) loadExisting();
  }, []);

  const loadExisting = async () => {
    setLoading(true);
    try {
      const data = await coachingService.getPracticeDay(
        playerPublicId,
        practiceDayPublicId!,
      );
      setPracticeDate(data.practiceDate);
      setStatus(data.status);
      setIsSharedWithPlayer(data.isSharedWithPlayer);
      setOverallCoachNote(data.overallCoachNote || "");
      setOverallPlayerSummary(data.overallPlayerSummary || "");
      if (data.mentalState) {
        const { coachNote, ...ratings } = data.mentalState as any;
        setMentalState(ratings);
        setMentalNote(coachNote || "");
      }
      if (data.slots) {
        setSlots(
          data.slots.map((s) => ({
            publicId: s.publicId,
            startTime: s.startTime,
            durationMinutes: s.durationMinutes,
            slotType: s.slotType,
            focusArea: s.focusArea,
            coachUserPublicId: s.coachUserPublicId,
            coachName: s.coachName || "",
            coachNotes: s.coachNotes || "",
            playerSummary: s.playerSummary || "",
            drills:
              s.drills?.map((d) => ({
                publicId: d.publicId,
                name: d.name,
                description: d.description || "",
                targetReps: d.targetReps,
                targetDuration: d.targetDuration || "",
                dueDate: d.dueDate,
                completionStatus: d.completionStatus,
                isSharedWithPlayer: d.isSharedWithPlayer,
              })) || [],
          })),
        );
      }
    } catch {
      toast.error("Failed to load practice day");
    } finally {
      setLoading(false);
    }
  };

  const totalMinutes = slots.reduce(
    (sum, s) => sum + (s.durationMinutes || 0),
    0,
  );

  const updateSlot = (idx: number, patch: Partial<PracticeSlotRequest>) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  };

  const addDrill = (slotIdx: number) => {
    setSlots((prev) =>
      prev.map((s, i) =>
        i === slotIdx
          ? { ...s, drills: [...(s.drills || []), emptyDrill()] }
          : s,
      ),
    );
  };

  const updateDrill = (
    slotIdx: number,
    drillIdx: number,
    patch: Partial<DrillAssignmentRequest>,
  ) => {
    setSlots((prev) =>
      prev.map((s, i) =>
        i === slotIdx
          ? {
              ...s,
              drills: s.drills?.map((d, j) =>
                j === drillIdx ? { ...d, ...patch } : d,
              ),
            }
          : s,
      ),
    );
  };

  const removeDrill = (slotIdx: number, drillIdx: number) => {
    setSlots((prev) =>
      prev.map((s, i) =>
        i === slotIdx
          ? { ...s, drills: s.drills?.filter((_, j) => j !== drillIdx) }
          : s,
      ),
    );
  };

  const handleSave = async () => {
    if (!practiceDate) {
      toast.error("Date is required");
      return;
    }

    setSaving(true);
    const payload: PracticeDayRequest = {
      practiceDate,
      totalDurationMinutes: totalMinutes,
      overallCoachNote: overallCoachNote || undefined,
      overallPlayerSummary: overallPlayerSummary || undefined,
      isSharedWithPlayer,
      status,
      mentalState: { ...mentalState, coachNote: mentalNote || undefined },
      slots: slots.filter((s) => s.startTime && s.durationMinutes),
    };

    try {
      if (isEdit) {
        await coachingService.updatePracticeDay(
          playerPublicId,
          practiceDayPublicId!,
          payload,
        );
        toast.success("Practice day updated");
      } else {
        await coachingService.createPracticeDay(playerPublicId, payload);
        toast.success("Practice day logged");
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-700"
      >
        <ArrowLeft size={16} /> Back to Practice Days
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="text-base font-bold text-slate-900 mb-4">
          {isEdit ? "Edit Practice Day" : "Log Practice Day"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={practiceDate}
              onChange={(e) => setPracticeDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="COMPLETED">Completed</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="shared"
              checked={isSharedWithPlayer}
              onChange={(e) => setIsSharedWithPlayer(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="shared" className="text-sm text-slate-700">
              Share with player
            </label>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 inline-block">
          Total session: <strong>{totalMinutes} minutes</strong>
        </div>
      </div>

      {/* Slots */}
      <div className="bg-white rounded-lg shadow p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Practice Slots</h3>
          <button
            onClick={() => setSlots((p) => [...p, emptySlot()])}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <Plus size={14} /> Add Slot
          </button>
        </div>

        {slots.map((slot, slotIdx) => (
          <div
            key={slotIdx}
            className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Slot {slotIdx + 1}
              </span>
              {slots.length > 1 && (
                <button
                  onClick={() =>
                    setSlots((p) => p.filter((_, i) => i !== slotIdx))
                  }
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) =>
                    updateSlot(slotIdx, { startTime: e.target.value })
                  }
                  className="w-full px-2 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Duration (min)
                </label>
                <input
                  type="number"
                  value={slot.durationMinutes}
                  min={15}
                  step={15}
                  onChange={(e) =>
                    updateSlot(slotIdx, {
                      durationMinutes: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-2 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Type
                </label>
                <select
                  value={slot.slotType}
                  onChange={(e) =>
                    updateSlot(slotIdx, {
                      slotType: e.target.value as SlotType,
                    })
                  }
                  className="w-full px-2 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="COACHED">Coached</option>
                  <option value="SELF_PRACTICE">Self Practice</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Focus Area
                </label>
                <select
                  value={slot.focusArea}
                  onChange={(e) =>
                    updateSlot(slotIdx, {
                      focusArea: e.target.value as FocusArea,
                    })
                  }
                  className="w-full px-2 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FOCUS_AREAS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {slot.slotType === "COACHED" && (
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Coach Name
                </label>
                <input
                  type="text"
                  value={slot.coachName || ""}
                  placeholder="Coach name..."
                  onChange={(e) =>
                    updateSlot(slotIdx, { coachName: e.target.value })
                  }
                  className="w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                Coach Notes (private)
              </label>
              <textarea
                value={slot.coachNotes || ""}
                rows={2}
                placeholder="Private coaching notes..."
                onChange={(e) =>
                  updateSlot(slotIdx, { coachNotes: e.target.value })
                }
                className="w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                Player Summary (shared)
              </label>
              <textarea
                value={slot.playerSummary || ""}
                rows={2}
                placeholder="What to share with player..."
                onChange={(e) =>
                  updateSlot(slotIdx, { playerSummary: e.target.value })
                }
                className="w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
              />
            </div>

            {/* Drills */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Drills / Homework
                </span>
                <button
                  onClick={() => addDrill(slotIdx)}
                  className="text-xs text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus size={12} /> Add Drill
                </button>
              </div>
              {slot.drills?.map((drill, drillIdx) => (
                <div
                  key={drillIdx}
                  className="bg-white border border-slate-200 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-500">
                      Drill {drillIdx + 1}
                    </span>
                    <button
                      onClick={() => removeDrill(slotIdx, drillIdx)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={drill.name}
                    placeholder="Drill name *"
                    onChange={(e) =>
                      updateDrill(slotIdx, drillIdx, { name: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    value={drill.description || ""}
                    rows={1}
                    placeholder="Description..."
                    onChange={(e) =>
                      updateDrill(slotIdx, drillIdx, {
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={drill.targetReps || ""}
                      placeholder="Target reps"
                      onChange={(e) =>
                        updateDrill(slotIdx, drillIdx, {
                          targetReps: parseInt(e.target.value) || undefined,
                        })
                      }
                      className="px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={drill.targetDuration || ""}
                      placeholder="Duration e.g. 20 mins"
                      onChange={(e) =>
                        updateDrill(slotIdx, drillIdx, {
                          targetDuration: e.target.value,
                        })
                      }
                      className="px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`shared-drill-${slotIdx}-${drillIdx}`}
                      checked={drill.isSharedWithPlayer !== false}
                      onChange={(e) =>
                        updateDrill(slotIdx, drillIdx, {
                          isSharedWithPlayer: e.target.checked,
                        })
                      }
                      className="w-3.5 h-3.5 accent-blue-600"
                    />
                    <label
                      htmlFor={`shared-drill-${slotIdx}-${drillIdx}`}
                      className="text-xs text-slate-600"
                    >
                      Share with player
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mental State */}
      <div className="bg-white rounded-lg shadow p-5 space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">
          Mental State (Today)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {MENTAL_FIELDS.map((field) => (
            <div key={field}>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 capitalize">
                {field.replace(/([A-Z])/g, " $1").trim()} (1-5)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={mentalState[field] || ""}
                onChange={(e) =>
                  setMentalState((p) => ({
                    ...p,
                    [field]: parseInt(e.target.value),
                  }))
                }
                className="w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
        <textarea
          value={mentalNote}
          rows={2}
          placeholder="Mental state observations..."
          onChange={(e) => setMentalNote(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-none"
        />
      </div>

      {/* Overall notes */}
      <div className="bg-white rounded-lg shadow p-5 space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">Overall Notes</h3>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Coach Notes (private)
          </label>
          <textarea
            value={overallCoachNote}
            rows={3}
            placeholder="Private overall observations..."
            onChange={(e) => setOverallCoachNote(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Player Summary (shared)
          </label>
          <textarea
            value={overallPlayerSummary}
            rows={3}
            placeholder="Overall summary to share with player..."
            onChange={(e) => setOverallPlayerSummary(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pb-8">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-200 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 shadow-sm"
        >
          <Save size={15} />
          {saving ? "Saving..." : isEdit ? "Update" : "Save Practice Day"}
        </button>
      </div>
    </div>
  );
}
