import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Target, Calendar, Trophy, Dumbbell } from "lucide-react";
import { toast } from "react-hot-toast";
import { coachingService } from "../../api/playerService/coachingService";
import type {
  PracticeDayResponse,
  PlayerGoalResponse,
  MatchPerformanceResponse,
  DrillAssignmentResponse,
  CompletionStatus,
} from "../../api/playerService/coachingService";
import PracticeDayList from "../../components/coaching/PracticeDayList";
import PracticeDayForm from "../../components/coaching/PracticeDayForm";
import GoalList from "../../components/coaching/GoalList";
import GoalForm from "../../components/coaching/GoalForm";
import MatchList from "../../components/coaching/MatchList";
import MatchForm from "../../components/coaching/MatchForm";

// ── Sub-tab definition ────────────────────────────────────────────

const SUB_TABS = [
  { key: "practice", label: "Practice", icon: <Calendar size={14} /> },
  { key: "drills",   label: "Drills",   icon: <Dumbbell size={14} /> },
  { key: "goals",    label: "Goals",    icon: <Target size={14} /> },
  { key: "matches",  label: "Matches",  icon: <Trophy size={14} /> },
] as const;

type SubTab = (typeof SUB_TABS)[number]["key"];

// ── View types per sub-tab ────────────────────────────────────────

type PracticeView =
  | { type: "list" }
  | { type: "new" }
  | { type: "edit"; publicId: string };

type GoalView =
  | { type: "list" }
  | { type: "new" }
  | { type: "edit"; publicId: string };

type MatchView =
  | { type: "list" }
  | { type: "new" }
  | { type: "edit"; publicId: string };

// ── Main Page ─────────────────────────────────────────────────────

function PlayerCoachingPage() {
  const { playerPublicId } = useParams<{ playerPublicId: string }>();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("practice");

  // Practice state
  const [practiceView, setPracticeView] = useState<PracticeView>({
    type: "list",
  });
  const [practiceDays, setPracticeDays] = useState<PracticeDayResponse[]>([]);
  const [practiceLoading, setPracticeLoading] = useState(true);

  // Goal state
  const [goalView, setGoalView] = useState<GoalView>({ type: "list" });
  const [goals, setGoals] = useState<PlayerGoalResponse[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);

  // Match state
  const [matchView, setMatchView] = useState<MatchView>({ type: "list" });
  const [matches, setMatches] = useState<MatchPerformanceResponse[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  // Drills state (cross-day, admin view)
  const [drills, setDrills] = useState<DrillAssignmentResponse[]>([]);
  const [drillsLoading, setDrillsLoading] = useState(true);
  const [updatingDrillId, setUpdatingDrillId] = useState<string | null>(null);

  const isSuperAdmin = localStorage.getItem("userRole") === "ROLE_SUPER_ADMIN";

  useEffect(() => {
    if (!playerPublicId) return;
    loadPracticeDays();
    loadGoals();
    loadMatches();
    loadDrills();
  }, [playerPublicId]);

  const loadPracticeDays = async () => {
    if (!playerPublicId) return;
    setPracticeLoading(true);
    try {
      const data = await coachingService.getPracticeDays(playerPublicId);
      setPracticeDays(data);
    } catch {
      toast.error("Failed to load practice days");
    } finally {
      setPracticeLoading(false);
    }
  };

  const loadGoals = async () => {
    if (!playerPublicId) return;
    setGoalsLoading(true);
    try {
      const data = await coachingService.getGoals(playerPublicId);
      setGoals(data);
    } catch {
      toast.error("Failed to load goals");
    } finally {
      setGoalsLoading(false);
    }
  };

  const loadMatches = async () => {
    if (!playerPublicId) return;
    setMatchesLoading(true);
    try {
      const data = await coachingService.getMatches(playerPublicId);
      setMatches(data);
    } catch {
      toast.error("Failed to load matches");
    } finally {
      setMatchesLoading(false);
    }
  };

  const loadDrills = async () => {
    if (!playerPublicId) return;
    setDrillsLoading(true);
    try {
      const data = await coachingService.getPlayerDrills(playerPublicId);
      setDrills(data);
    } catch {
      toast.error("Failed to load drills");
    } finally {
      setDrillsLoading(false);
    }
  };

  const handleDrillStatusChange = async (
    drillPublicId: string,
    status: CompletionStatus,
  ) => {
    if (!playerPublicId) return;
    setUpdatingDrillId(drillPublicId);
    try {
      await coachingService.updateDrillStatus(playerPublicId, drillPublicId, status);
      toast.success("Drill status updated");
      loadDrills();
    } catch {
      toast.error("Failed to update drill status");
    } finally {
      setUpdatingDrillId(null);
    }
  };

  if (!playerPublicId) return null;

  // ── Render sub-tab content ────────────────────────────────────

  const renderPractice = () => {
    if (practiceView.type === "new") {
      return (
        <PracticeDayForm
          playerPublicId={playerPublicId}
          onSuccess={() => {
            setPracticeView({ type: "list" });
            loadPracticeDays();
          }}
          onCancel={() => setPracticeView({ type: "list" })}
        />
      );
    }
    if (practiceView.type === "edit") {
      return (
        <PracticeDayForm
          playerPublicId={playerPublicId}
          practiceDayPublicId={practiceView.publicId}
          onSuccess={() => {
            setPracticeView({ type: "list" });
            loadPracticeDays();
          }}
          onCancel={() => setPracticeView({ type: "list" })}
        />
      );
    }
    return (
      <PracticeDayList
        practiceDays={practiceDays}
        loading={practiceLoading}
        isSuperAdmin={isSuperAdmin}
        playerPublicId={playerPublicId}
        onNew={() => setPracticeView({ type: "new" })}
        onEdit={(id) => setPracticeView({ type: "edit", publicId: id })}
        onDelete={async (id) => {
          if (!confirm("Delete this practice day?")) return;
          try {
            await coachingService.deletePracticeDay(playerPublicId, id);
            toast.success("Deleted");
            loadPracticeDays();
          } catch {
            toast.error("Failed to delete");
          }
        }}
        onRefresh={() => { loadPracticeDays(); loadDrills(); }}
      />
    );
  };

  const renderDrills = () => {
    const STATUS_CLS: Record<string, string> = {
      ASSIGNED:    "bg-blue-50 text-blue-700",
      IN_PROGRESS: "bg-yellow-50 text-yellow-700",
      COMPLETED:   "bg-green-100 text-green-700",
      SKIPPED:     "bg-slate-100 text-slate-500",
    };
    const STATUS_OPTIONS: CompletionStatus[] = [
      "ASSIGNED", "IN_PROGRESS", "COMPLETED", "SKIPPED",
    ];
    const FOCUS_CLS: Record<string, string> = {
      BATTING: "bg-blue-100 text-blue-700",
      BOWLING: "bg-green-100 text-green-700",
      FIELDING: "bg-teal-100 text-teal-700",
      FITNESS: "bg-orange-100 text-orange-700",
      MENTAL: "bg-purple-100 text-purple-700",
      GENERAL: "bg-slate-100 text-slate-600",
    };

    if (drillsLoading) {
      return (
        <div className="text-center py-10">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      );
    }

    if (drills.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow p-10 text-center">
          <div className="text-4xl mb-3">🏋️</div>
          <p className="font-semibold text-slate-700">No drills logged yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Drills added inside practice slots will appear here.
          </p>
        </div>
      );
    }

    const pending   = drills.filter((d) => d.completionStatus === "ASSIGNED" || d.completionStatus === "IN_PROGRESS");
    const completed = drills.filter((d) => d.completionStatus === "COMPLETED" || d.completionStatus === "SKIPPED");

    const renderGroup = (group: DrillAssignmentResponse[]) =>
      group.map((drill) => (
        <div
          key={drill.publicId}
          className="bg-white rounded-lg border border-slate-200 shadow-sm p-3 flex items-start gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">{drill.name}</p>
            {drill.description && (
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{drill.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {drill.practiceDate && (
                <span className="text-[10px] text-slate-400">
                  📅 {new Date(drill.practiceDate).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </span>
              )}
              {drill.slotFocusArea && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${FOCUS_CLS[drill.slotFocusArea] || "bg-slate-100 text-slate-600"}`}>
                  {drill.slotFocusArea}
                </span>
              )}
              {drill.targetReps && (
                <span className="text-[10px] text-slate-500">🎯 {drill.targetReps} reps</span>
              )}
              {drill.targetDuration && (
                <span className="text-[10px] text-slate-500">⏱ {drill.targetDuration}</span>
              )}
            </div>
            {drill.completionNotes && (
              <p className="text-[10px] text-slate-400 mt-1 italic">"{drill.completionNotes}"</p>
            )}
          </div>
          <select
            value={drill.completionStatus}
            disabled={updatingDrillId === drill.publicId}
            onChange={(e) =>
              handleDrillStatusChange(drill.publicId, e.target.value as CompletionStatus)
            }
            className={`text-[10px] font-semibold px-2 py-1.5 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 flex-shrink-0 ${
              STATUS_CLS[drill.completionStatus] || "bg-slate-100 text-slate-500"
            } ${updatingDrillId === drill.publicId ? "opacity-50" : ""}`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      ));

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">All Drills</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {pendingDrills} pending · {drills.length} total
            </p>
          </div>
          <button
            onClick={loadDrills}
            className="text-xs text-blue-600 font-medium hover:text-blue-700"
          >
            Refresh
          </button>
        </div>
        {pending.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Pending — {pending.length}
            </p>
            {renderGroup(pending)}
          </div>
        )}
        {completed.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Done — {completed.length}
            </p>
            {renderGroup(completed)}
          </div>
        )}
      </div>
    );
  };

  const renderGoals = () => {
    if (goalView.type === "new") {
      return (
        <GoalForm
          playerPublicId={playerPublicId}
          onSuccess={() => {
            setGoalView({ type: "list" });
            loadGoals();
          }}
          onCancel={() => setGoalView({ type: "list" })}
        />
      );
    }
    if (goalView.type === "edit") {
      return (
        <GoalForm
          playerPublicId={playerPublicId}
          goalPublicId={goalView.publicId}
          onSuccess={() => {
            setGoalView({ type: "list" });
            loadGoals();
          }}
          onCancel={() => setGoalView({ type: "list" })}
        />
      );
    }
    return (
      <GoalList
        goals={goals}
        loading={goalsLoading}
        isSuperAdmin={isSuperAdmin}
        playerPublicId={playerPublicId}
        onNew={() => setGoalView({ type: "new" })}
        onEdit={(id) => setGoalView({ type: "edit", publicId: id })}
        onDelete={async (id) => {
          if (!confirm("Delete this goal?")) return;
          try {
            await coachingService.deleteGoal(playerPublicId, id);
            toast.success("Deleted");
            loadGoals();
          } catch {
            toast.error("Failed to delete");
          }
        }}
        onGoalUpdated={loadGoals}
      />
    );
  };

  const renderMatches = () => {
    if (matchView.type === "new") {
      return (
        <MatchForm
          playerPublicId={playerPublicId}
          onSuccess={() => {
            setMatchView({ type: "list" });
            loadMatches();
          }}
          onCancel={() => setMatchView({ type: "list" })}
        />
      );
    }
    if (matchView.type === "edit") {
      return (
        <MatchForm
          playerPublicId={playerPublicId}
          matchPublicId={matchView.publicId}
          onSuccess={() => {
            setMatchView({ type: "list" });
            loadMatches();
          }}
          onCancel={() => setMatchView({ type: "list" })}
        />
      );
    }
    return (
      <MatchList
        matches={matches}
        loading={matchesLoading}
        isSuperAdmin={isSuperAdmin}
        playerPublicId={playerPublicId}
        onNew={() => setMatchView({ type: "new" })}
        onEdit={(id) => setMatchView({ type: "edit", publicId: id })}
        onDelete={async (id) => {
          if (!confirm("Delete this match?")) return;
          try {
            await coachingService.deleteMatch(playerPublicId, id);
            toast.success("Deleted");
            loadMatches();
          } catch {
            toast.error("Failed to delete");
          }
        }}
      />
    );
  };

  // ── Summary counts for sub-tab badges ────────────────────────

  const activeGoals = goals.filter(
    (g) => g.status === "IN_PROGRESS" || g.status === "NOT_STARTED",
  ).length;

  const pendingDrills = drills.filter(
    (d) => d.completionStatus === "ASSIGNED" || d.completionStatus === "IN_PROGRESS",
  ).length;

  return (
    <div className="space-y-4">
      {/* ── Sub-tab bar ──────────────────────────────────────── */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
        {SUB_TABS.map((tab) => {
          const badge =
            tab.key === "practice"
              ? practiceDays.length
              : tab.key === "drills"
                ? pendingDrills
                : tab.key === "goals"
                  ? activeGoals
                  : matches.length;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === tab.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeSubTab === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Sub-tab content ──────────────────────────────────── */}
      {activeSubTab === "practice" && renderPractice()}
      {activeSubTab === "drills" && renderDrills()}
      {activeSubTab === "goals" && renderGoals()}
      {activeSubTab === "matches" && renderMatches()}
    </div>
  );
}

export default PlayerCoachingPage;
