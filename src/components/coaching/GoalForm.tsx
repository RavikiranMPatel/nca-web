import { useState, useEffect } from "react";
import { Save, ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import { coachingService } from "../../api/playerService/coachingService";
import type {
  PlayerGoalRequest,
  GoalStatus,
  GoalPriority,
} from "../../api/playerService/coachingService";

const CATEGORIES = [
  "BATTING",
  "BOWLING",
  "FIELDING",
  "FITNESS",
  "MENTAL",
  "GENERAL",
];

type Props = {
  playerPublicId: string;
  goalPublicId?: string;
  spawnedFromPracticeDayPublicId?: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function GoalForm({
  playerPublicId,
  goalPublicId,
  spawnedFromPracticeDayPublicId,
  onSuccess,
  onCancel,
}: Props) {
  const isEdit = !!goalPublicId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [priority, setPriority] = useState<GoalPriority>("MEDIUM");
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState<GoalStatus>("NOT_STARTED");
  const [isSharedWithPlayer, setIsSharedWithPlayer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && goalPublicId) loadExisting();
  }, []);

  const loadExisting = async () => {
    setLoading(true);
    try {
      const data = await coachingService.getGoal(playerPublicId, goalPublicId!);
      setTitle(data.title);
      setDescription(data.description || "");
      setCategory(data.category);
      setPriority(data.priority);
      setTargetDate(data.targetDate || "");
      setStatus(data.status);
      setIsSharedWithPlayer(data.isSharedWithPlayer);
    } catch {
      toast.error("Failed to load goal");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    const payload: PlayerGoalRequest = {
      title: title.trim(),
      description: description || undefined,
      category,
      priority,
      targetDate: targetDate || undefined,
      status,
      isSharedWithPlayer,
      spawnedFromPracticeDayPublicId,
    };
    try {
      if (isEdit) {
        await coachingService.updateGoal(
          playerPublicId,
          goalPublicId!,
          payload,
        );
        toast.success("Goal updated");
      } else {
        await coachingService.createGoal(playerPublicId, payload);
        toast.success("Goal created");
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
    <div className="space-y-4">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-700"
      >
        <ArrowLeft size={16} /> Back to Goals
      </button>

      <div className="bg-white rounded-lg shadow p-5 space-y-4">
        <h2 className="font-bold text-slate-900">
          {isEdit ? "Edit Goal" : "New Goal"}
        </h2>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Improve front foot drive"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Description
          </label>
          <textarea
            value={description}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed goal description..."
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-slate-50"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as GoalPriority)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as GoalStatus)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ACHIEVED">Achieved</option>
              <option value="DROPPED">Dropped</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Target Date
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="goal-shared"
            checked={isSharedWithPlayer}
            onChange={(e) => setIsSharedWithPlayer(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          <label htmlFor="goal-shared" className="text-sm text-slate-700">
            Share with player
          </label>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 shadow-sm"
          >
            <Save size={15} />
            {saving ? "Saving..." : isEdit ? "Update Goal" : "Save Goal"}
          </button>
        </div>
      </div>
    </div>
  );
}
