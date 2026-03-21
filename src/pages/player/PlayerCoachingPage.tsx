import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Target, Calendar, Trophy } from "lucide-react";
import { toast } from "react-hot-toast";
import { coachingService } from "../../api/playerService/coachingService";
import type {
  PracticeDayResponse,
  PlayerGoalResponse,
  MatchPerformanceResponse,
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
  { key: "goals", label: "Goals", icon: <Target size={14} /> },
  { key: "matches", label: "Matches", icon: <Trophy size={14} /> },
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

  const isSuperAdmin = localStorage.getItem("userRole") === "ROLE_SUPER_ADMIN";

  useEffect(() => {
    if (!playerPublicId) return;
    loadPracticeDays();
    loadGoals();
    loadMatches();
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
      />
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

  return (
    <div className="space-y-4">
      {/* ── Sub-tab bar ──────────────────────────────────────── */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
        {SUB_TABS.map((tab) => {
          const badge =
            tab.key === "practice"
              ? practiceDays.length
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
      {activeSubTab === "goals" && renderGoals()}
      {activeSubTab === "matches" && renderMatches()}
    </div>
  );
}

export default PlayerCoachingPage;
