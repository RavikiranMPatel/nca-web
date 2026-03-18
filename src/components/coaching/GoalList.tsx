import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { coachingService } from "../../api/playerService/coachingService";
import type { PlayerGoalResponse } from "../../api/playerService/coachingService";

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> =
  {
    NOT_STARTED: {
      bg: "bg-slate-100",
      text: "text-slate-600",
      dot: "bg-slate-400",
    },
    IN_PROGRESS: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      dot: "bg-blue-500",
    },
    ACHIEVED: {
      bg: "bg-green-100",
      text: "text-green-700",
      dot: "bg-green-500",
    },
    DROPPED: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-400" },
  };

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: "text-red-600 bg-red-50 border-red-200",
  MEDIUM: "text-yellow-700 bg-yellow-50 border-yellow-200",
  LOW: "text-slate-500 bg-slate-50 border-slate-200",
};

const CATEGORY_ICONS: Record<string, string> = {
  BATTING: "🏏",
  BOWLING: "🎯",
  FIELDING: "🥊",
  FITNESS: "💪",
  MENTAL: "🧠",
  GENERAL: "⭐",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  goals: PlayerGoalResponse[];
  loading: boolean;
  isSuperAdmin: boolean;
  playerPublicId: string;
  onNew: () => void;
  onEdit: (publicId: string) => void;
  onDelete: (publicId: string) => void;
  onGoalUpdated: () => void;
};

export default function GoalList({
  goals,
  loading,
  isSuperAdmin,
  playerPublicId,
  onNew,
  onEdit,
  onDelete,
  onGoalUpdated,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingNoteFor, setAddingNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteDate, setNoteDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [savingNote, setSavingNote] = useState(false);

  const handleAddNote = async (goalPublicId: string) => {
    if (!noteText.trim()) {
      toast.error("Note is required");
      return;
    }
    setSavingNote(true);
    try {
      await coachingService.addProgressNote(playerPublicId, goalPublicId, {
        note: noteText,
        recordedAt: noteDate,
      });
      toast.success("Progress note added");
      setAddingNoteFor(null);
      setNoteText("");
      onGoalUpdated();
    } catch {
      toast.error("Failed to add note");
    } finally {
      setSavingNote(false);
    }
  };

  const active = goals.filter(
    (g) => g.status === "IN_PROGRESS" || g.status === "NOT_STARTED",
  );
  const archived = goals.filter(
    (g) => g.status === "ACHIEVED" || g.status === "DROPPED",
  );

  const renderGoalCard = (goal: PlayerGoalResponse) => {
    const ss = STATUS_STYLES[goal.status] || STATUS_STYLES.NOT_STARTED;
    const isExpanded = expandedId === goal.publicId;
    const isAddingNote = addingNoteFor === goal.publicId;

    return (
      <div
        key={goal.publicId}
        className="bg-white rounded-lg border border-slate-200 shadow-sm"
      >
        {/* Header */}
        <div
          className="p-4 cursor-pointer"
          onClick={() => setExpandedId(isExpanded ? null : goal.publicId)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base">
                  {CATEGORY_ICONS[goal.category] || "⭐"}
                </span>
                <span className="font-bold text-sm text-slate-900">
                  {goal.title}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[goal.priority]}`}
                >
                  {goal.priority}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${ss.bg} ${ss.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />
                  {goal.status.replace(/_/g, " ")}
                </span>
                {goal.targetDate && (
                  <span className="text-xs text-slate-400">
                    🗓 {formatDate(goal.targetDate)}
                  </span>
                )}
                {goal.progressNotes && goal.progressNotes.length > 0 && (
                  <span className="text-xs text-slate-400">
                    💬 {goal.progressNotes.length} note
                    {goal.progressNotes.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp size={16} className="text-slate-400 flex-shrink-0" />
            ) : (
              <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Expanded */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
            {goal.description && (
              <p className="text-sm text-slate-600 leading-relaxed">
                {goal.description}
              </p>
            )}

            {/* Progress notes */}
            {goal.progressNotes && goal.progressNotes.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Progress Notes
                </p>
                {goal.progressNotes.map((note) => (
                  <div
                    key={note.publicId}
                    className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100"
                  >
                    <p className="text-xs text-slate-600">{note.note}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {formatDate(note.recordedAt)} · by {note.createdBy}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Add note */}
            {isAddingNote ? (
              <div className="space-y-2 bg-blue-50 rounded-lg p-3 border border-blue-100">
                <textarea
                  value={noteText}
                  rows={2}
                  placeholder="Progress note..."
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="px-2 py-1.5 border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <button
                    onClick={() => handleAddNote(goal.publicId)}
                    disabled={savingNote}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingNote ? "Saving..." : "Add Note"}
                  </button>
                  <button
                    onClick={() => {
                      setAddingNoteFor(null);
                      setNoteText("");
                    }}
                    className="px-3 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-medium border hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAddingNoteFor(goal.publicId);
                  setExpandedId(goal.publicId);
                }}
                className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:text-blue-700"
              >
                <MessageSquarePlus size={13} /> Add Progress Note
              </button>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(goal.publicId);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                <Pencil size={13} /> Edit
              </button>
              {isSuperAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(goal.publicId);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                >
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900">Goals</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {active.length} active · {archived.length} completed
          </p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm"
        >
          <Plus size={15} /> Add Goal
        </button>
      </div>

      {loading && (
        <div className="text-center py-10">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && goals.length === 0 && (
        <div className="bg-white rounded-lg shadow p-10 text-center">
          <div className="text-4xl mb-3">🎯</div>
          <p className="font-semibold text-slate-700">No goals yet</p>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Set the first coaching goal for this player.
          </p>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700"
          >
            <Plus size={16} /> Add First Goal
          </button>
        </div>
      )}

      {!loading && active.length > 0 && (
        <div className="space-y-2">{active.map(renderGoalCard)}</div>
      )}

      {!loading && archived.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Archived — {archived.length}
          </p>
          {archived.map(renderGoalCard)}
        </div>
      )}
    </div>
  );
}
