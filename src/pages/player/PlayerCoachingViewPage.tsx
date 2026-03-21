import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Target,
  Trophy,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import { useAuth } from "../../auth/useAuth";
import {
  type PracticeDayResponse,
  type PlayerGoalResponse,
  type MatchPerformanceResponse,
  type DrillAssignmentResponse,
  coachingService,
} from "../../api/playerService/coachingService";

// ── Constants ──────────────────────────────────────────────────────

const SUB_TABS = [
  { key: "practice", label: "Practice", icon: <Calendar size={15} /> },
  { key: "drills", label: "Drills", icon: <Dumbbell size={15} /> },
  { key: "goals", label: "Goals", icon: <Target size={15} /> },
  { key: "matches", label: "Matches", icon: <Trophy size={15} /> },
  { key: "progress", label: "Progress", icon: <TrendingUp size={15} /> },
] as const;

type SubTab = (typeof SUB_TABS)[number]["key"];

const FOCUS_COLORS: Record<string, string> = {
  BATTING: "bg-blue-100 text-blue-700",
  BOWLING: "bg-green-100 text-green-700",
  FIELDING: "bg-teal-100 text-teal-700",
  FITNESS: "bg-orange-100 text-orange-700",
  MENTAL: "bg-purple-100 text-purple-700",
  GENERAL: "bg-slate-100 text-slate-600",
};

const GOAL_STATUS_STYLES: Record<
  string,
  { bg: string; text: string; icon: React.ReactNode }
> = {
  NOT_STARTED: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    icon: <Circle size={12} />,
  },
  IN_PROGRESS: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    icon: <AlertCircle size={12} />,
  },
  ACHIEVED: {
    bg: "bg-green-100",
    text: "text-green-700",
    icon: <CheckCircle2 size={12} />,
  },
  DROPPED: {
    bg: "bg-red-100",
    text: "text-red-600",
    icon: <Circle size={12} />,
  },
};

const RESULT_STYLES: Record<string, string> = {
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
  DRAW: "bg-yellow-100 text-yellow-700",
  NO_RESULT: "bg-slate-100 text-slate-600",
};

const DRILL_STATUS_STYLES: Record<string, string> = {
  ASSIGNED: "bg-blue-50 text-blue-600",
  IN_PROGRESS: "bg-yellow-50 text-yellow-700",
  COMPLETED: "bg-green-50 text-green-700",
  SKIPPED: "bg-slate-100 text-slate-500",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Main Page ──────────────────────────────────────────────────────

export default function PlayerCoachingViewPage() {
  const navigate = useNavigate();
  const { userName } = useAuth();
  const [activeTab, setActiveTab] = useState<SubTab>("practice");

  const [practiceDays, setPracticeDays] = useState<PracticeDayResponse[]>([]);
  const [goals, setGoals] = useState<PlayerGoalResponse[]>([]);
  const [matches, setMatches] = useState<MatchPerformanceResponse[]>([]);
  const [drills, setDrills] = useState<DrillAssignmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLinked, setNotLinked] = useState(false);
  const [progress, setProgress] = useState<any | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pdRes, gRes, mRes, dRes, prRes] = await Promise.all([
        api.get("/player/coaching/practice-days"),
        api.get("/player/coaching/goals"),
        api.get("/player/coaching/matches"),
        api.get("/player/coaching/drills"),
        api.get("/player/coaching/progress"),
      ]);
      setPracticeDays(pdRes.data);
      setGoals(gRes.data);
      setMatches(mRes.data);
      setDrills(dRes.data);
      setProgress(prRes.data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setNotLinked(true);
      } else {
        toast.error("Failed to load coaching data");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!loading && notLinked) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center space-y-4">
        <div className="text-5xl">🏏</div>
        <h2 className="text-xl font-bold text-gray-800">
          No Coaching Profile Linked
        </h2>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          Your account hasn't been linked to a player profile yet. Please
          contact your coach to set this up.
        </p>
        <button
          onClick={() => navigate("/home")}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 transition"
        >
          Go Home
        </button>
      </div>
    );
  }

  const activeGoals = goals.filter(
    (g) => g.status === "IN_PROGRESS" || g.status === "NOT_STARTED",
  );
  const pendingDrills = drills.filter(
    (d) =>
      d.completionStatus === "ASSIGNED" || d.completionStatus === "IN_PROGRESS",
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32 space-y-4">
      {/* ── Hero card ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-md">
        <p className="text-blue-200 text-xs font-medium uppercase tracking-wide mb-1">
          My Coaching
        </p>
        <h1 className="text-xl font-bold">{userName || "Player"}</h1>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div className="text-center">
            <p className="text-2xl font-bold">{practiceDays.length}</p>
            <p className="text-blue-200 text-xs">Sessions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{activeGoals.length}</p>
            <p className="text-blue-200 text-xs">Active Goals</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{matches.length}</p>
            <p className="text-blue-200 text-xs">Matches</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{pendingDrills.length}</p>
            <p className="text-blue-200 text-xs">Drills Pending</p>
          </div>
        </div>
      </div>

      {/* ── Sub-tab bar — scrollable on very small screens ─────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-1 shadow-sm overflow-x-auto">
        <div className="flex gap-1 min-w-max sm:min-w-0">
          {SUB_TABS.map((tab) => {
            const badge =
              tab.key === "practice"
                ? practiceDays.length
                : tab.key === "goals"
                  ? activeGoals.length
                  : tab.key === "drills"
                    ? pendingDrills.length
                    : tab.key === "matches"
                      ? matches.length
                      : 0;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 sm:flex-1 ${
                  activeTab === tab.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {badge > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.key
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
      </div>

      {/* ── Loading ───────────────────────────────────────────── */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 mt-3">
            Loading your coaching data...
          </p>
        </div>
      )}

      {/* ── Tab content ───────────────────────────────────────── */}
      {!loading && activeTab === "practice" && (
        <PracticeSection practiceDays={practiceDays} />
      )}
      {!loading && activeTab === "drills" && (
        <DrillsSection drills={drills} onUpdated={loadAll} />
      )}
      {!loading && activeTab === "goals" && <GoalsSection goals={goals} />}
      {!loading && activeTab === "matches" && (
        <MatchesSection matches={matches} />
      )}
      {!loading && activeTab === "progress" && (
        <ProgressSection progress={progress} />
      )}
    </div>
  );
}

// ── Practice Section ───────────────────────────────────────────────

function PracticeSection({
  practiceDays,
}: {
  practiceDays: PracticeDayResponse[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (practiceDays.length === 0) {
    return <EmptyState icon="📅" message="No practice sessions shared yet." />;
  }

  return (
    <div className="space-y-3">
      {practiceDays.map((day) => {
        const isExpanded = expandedId === day.publicId;
        return (
          <div
            key={day.publicId}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : day.publicId)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">
                    {formatDate(day.practiceDate)}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={11} /> {day.totalDurationMinutes} min
                    </span>
                    {day.slots && day.slots.length > 0 && (
                      <span className="text-xs text-gray-400">
                        · {day.slots.length} slot
                        {day.slots.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp
                    size={16}
                    className="text-gray-400 flex-shrink-0"
                  />
                ) : (
                  <ChevronDown
                    size={16}
                    className="text-gray-400 flex-shrink-0"
                  />
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                {day.overallPlayerSummary && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {day.overallPlayerSummary}
                  </p>
                )}
                {day.slots && day.slots.length > 0 && (
                  <div className="space-y-2">
                    {day.slots.map((slot) => (
                      <div
                        key={slot.publicId}
                        className="bg-gray-50 rounded-xl p-3 border border-gray-100"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-gray-700">
                            {slot.startTime}
                          </span>
                          <span className="text-xs text-gray-400">
                            {slot.durationMinutes}min
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${FOCUS_COLORS[slot.focusArea] || "bg-slate-100 text-slate-600"}`}
                          >
                            {slot.focusArea}
                          </span>
                          {slot.coachName && (
                            <span className="text-[10px] text-gray-500">
                              👤 {slot.coachName}
                            </span>
                          )}
                        </div>
                        {slot.playerSummary && (
                          <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                            {slot.playerSummary}
                          </p>
                        )}
                        {slot.drills && slot.drills.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {slot.drills.map((drill) => (
                              <div
                                key={drill.publicId}
                                className="flex items-center gap-2 text-xs"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                                <span className="font-medium text-gray-700">
                                  {drill.name}
                                </span>
                                {drill.targetReps && (
                                  <span className="text-gray-400">
                                    · {drill.targetReps} reps
                                  </span>
                                )}
                                {drill.targetDuration && (
                                  <span className="text-gray-400">
                                    · {drill.targetDuration}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Drills Section ────────────────────────────────────────────────

function DrillsSection({
  drills,
  onUpdated,
}: {
  drills: DrillAssignmentResponse[];
  onUpdated: () => void;
}) {
  if (drills.length === 0) {
    return <EmptyState icon="🏋️" message="No drills assigned yet." />;
  }

  const pending = drills.filter(
    (d) =>
      d.completionStatus === "ASSIGNED" || d.completionStatus === "IN_PROGRESS",
  );
  const completed = drills.filter(
    (d) =>
      d.completionStatus === "COMPLETED" || d.completionStatus === "SKIPPED",
  );

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
            Pending — {pending.length}
          </p>
          {pending.map((drill) => (
            <DrillCard
              key={drill.publicId}
              drill={drill}
              onUpdated={onUpdated}
            />
          ))}
        </div>
      )}
      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
            Completed — {completed.length}
          </p>
          {completed.map((drill) => (
            <DrillCard
              key={drill.publicId}
              drill={drill}
              onUpdated={onUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DrillCard({
  drill,
  onUpdated,
}: {
  drill: DrillAssignmentResponse;
  onUpdated: () => void;
}) {
  const [showComplete, setShowComplete] = useState(false);
  const [status, setStatus] = useState<"COMPLETED" | "SKIPPED">("COMPLETED");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const isPending =
    drill.completionStatus === "ASSIGNED" ||
    drill.completionStatus === "IN_PROGRESS";

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await coachingService.completeDrill(drill.publicId, status, note);
      toast.success(
        status === "COMPLETED"
          ? "Drill marked as completed! 🎉"
          : "Drill skipped",
      );
      setShowComplete(false);
      setNote("");
      onUpdated();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update drill");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{drill.name}</p>
          {drill.description && (
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              {drill.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {drill.targetReps && (
              <span className="text-xs text-gray-500">
                🎯 {drill.targetReps} reps
              </span>
            )}
            {drill.targetDuration && (
              <span className="text-xs text-gray-500">
                ⏱ {drill.targetDuration}
              </span>
            )}
            {drill.dueDate && (
              <span className="text-xs text-gray-400">
                📅 Due {formatDate(drill.dueDate)}
              </span>
            )}
          </div>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-1 rounded-xl flex-shrink-0 ${DRILL_STATUS_STYLES[drill.completionStatus] || "bg-slate-100 text-slate-500"}`}
        >
          {drill.completionStatus.replace(/_/g, " ")}
        </span>
      </div>

      {drill.completionNotes && !isPending && (
        <div className="bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium mb-0.5">Your note:</p>
          <p className="text-xs text-gray-600">{drill.completionNotes}</p>
        </div>
      )}

      {isPending && !showComplete && (
        <button
          onClick={() => setShowComplete(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition"
        >
          <CheckCircle2 size={16} /> Mark Complete
        </button>
      )}

      {isPending && showComplete && (
        <div className="space-y-3 bg-green-50 rounded-xl p-3 border border-green-100">
          <p className="text-xs font-bold text-green-800">
            Update Drill Status
          </p>
          <div className="flex gap-2">
            {(["COMPLETED", "SKIPPED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                  status === s
                    ? s === "COMPLETED"
                      ? "bg-green-600 border-green-600 text-white"
                      : "bg-slate-500 border-slate-500 text-white"
                    : "bg-white border-gray-200 text-gray-600"
                }`}
              >
                {s === "COMPLETED" ? "✅ Completed" : "⏭ Skipped"}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              status === "COMPLETED"
                ? "How did it go? Any feedback..."
                : "Why are you skipping this?"
            }
            rows={2}
            className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Submit"}
            </button>
            <button
              onClick={() => {
                setShowComplete(false);
                setNote("");
              }}
              className="flex-1 py-2.5 bg-white text-gray-600 rounded-xl text-sm font-medium border hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Goals Section ─────────────────────────────────────────────────

function GoalsSection({ goals }: { goals: PlayerGoalResponse[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (goals.length === 0) {
    return <EmptyState icon="🎯" message="No goals shared yet." />;
  }

  const active = goals.filter(
    (g) => g.status === "IN_PROGRESS" || g.status === "NOT_STARTED",
  );
  const archived = goals.filter(
    (g) => g.status === "ACHIEVED" || g.status === "DROPPED",
  );

  const renderGoal = (goal: PlayerGoalResponse) => {
    const ss =
      GOAL_STATUS_STYLES[goal.status] || GOAL_STATUS_STYLES.NOT_STARTED;
    const isExpanded = expandedId === goal.publicId;

    return (
      <div
        key={goal.publicId}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      >
        <div
          className="p-4 cursor-pointer"
          onClick={() => setExpandedId(isExpanded ? null : goal.publicId)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">
                {goal.title}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${ss.bg} ${ss.text}`}
                >
                  {ss.icon} {goal.status.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] text-gray-400">
                  {goal.category}
                </span>
                {goal.targetDate && (
                  <span className="text-[10px] text-gray-400">
                    🗓 {formatDate(goal.targetDate)}
                  </span>
                )}
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
            {goal.description && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {goal.description}
              </p>
            )}
            {goal.progressNotes && goal.progressNotes.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Progress Notes
                </p>
                {goal.progressNotes.map((note) => (
                  <div
                    key={note.publicId}
                    className="bg-gray-50 rounded-xl px-3 py-2 border border-gray-100"
                  >
                    <p className="text-xs text-gray-600">{note.note}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {formatDate(note.recordedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div className="space-y-2">{active.map(renderGoal)}</div>
      )}
      {archived.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
            Archived
          </p>
          {archived.map(renderGoal)}
        </div>
      )}
    </div>
  );
}

// ── Matches Section ───────────────────────────────────────────────

function MatchesSection({ matches }: { matches: MatchPerformanceResponse[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (matches.length === 0) {
    return <EmptyState icon="🏆" message="No match performances shared yet." />;
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => {
        const isExpanded = expandedId === match.publicId;
        const batting = match.battingStats as any;
        const bowling = match.bowlingStats as any;
        const fielding = match.fieldingStats as any;

        return (
          <div
            key={match.publicId}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : match.publicId)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm">
                      {formatDate(match.matchDate)}
                    </span>
                    {match.result && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${RESULT_STYLES[match.result]}`}
                      >
                        {match.result}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {match.matchType.replace(/_/g, " ")}
                    </span>
                  </div>
                  {match.oppositionTeam && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      vs {match.oppositionTeam}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {batting?.runs != null && (
                      <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        🏏 {batting.runs}R
                        {batting.balls ? ` (${batting.balls}B)` : ""}
                      </span>
                    )}
                    {bowling?.wickets != null && (
                      <span className="text-[10px] font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                        🎯 {bowling.wickets}W/{bowling.runsConceded}R
                      </span>
                    )}
                    {fielding?.catches != null && fielding.catches > 0 && (
                      <span className="text-[10px] font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
                        🥊 {fielding.catches}C
                      </span>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp
                    size={16}
                    className="text-gray-400 flex-shrink-0"
                  />
                ) : (
                  <ChevronDown
                    size={16}
                    className="text-gray-400 flex-shrink-0"
                  />
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {batting && Object.keys(batting).length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">
                        Batting
                      </p>
                      {Object.entries(batting).map(
                        ([k, v]) =>
                          v != null && (
                            <div
                              key={k}
                              className="flex justify-between text-xs"
                            >
                              <span className="text-blue-600 capitalize">
                                {k.replace(/([A-Z])/g, " $1")}
                              </span>
                              <span className="font-semibold text-blue-800">
                                {String(v)}
                              </span>
                            </div>
                          ),
                      )}
                    </div>
                  )}
                  {bowling && Object.keys(bowling).length > 0 && (
                    <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                      <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider mb-2">
                        Bowling
                      </p>
                      {Object.entries(bowling).map(
                        ([k, v]) =>
                          v != null && (
                            <div
                              key={k}
                              className="flex justify-between text-xs"
                            >
                              <span className="text-green-600 capitalize">
                                {k.replace(/([A-Z])/g, " $1")}
                              </span>
                              <span className="font-semibold text-green-800">
                                {String(v)}
                              </span>
                            </div>
                          ),
                      )}
                    </div>
                  )}
                  {fielding && Object.keys(fielding).length > 0 && (
                    <div className="bg-teal-50 rounded-xl p-3 border border-teal-100">
                      <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-2">
                        Fielding
                      </p>
                      {Object.entries(fielding).map(
                        ([k, v]) =>
                          v != null && (
                            <div
                              key={k}
                              className="flex justify-between text-xs"
                            >
                              <span className="text-teal-600 capitalize">
                                {k.replace(/([A-Z])/g, " $1")}
                              </span>
                              <span className="font-semibold text-teal-800">
                                {String(v)}
                              </span>
                            </div>
                          ),
                      )}
                    </div>
                  )}
                </div>
                {match.playerReflection && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      My Reflection
                    </p>
                    <p className="text-sm text-gray-600">
                      {match.playerReflection}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Progress Section ──────────────────────────────────────────────

function ProgressSection({ progress }: { progress: any }) {
  if (!progress) {
    return <EmptyState icon="📈" message="No progress data yet." />;
  }

  const {
    goalStats,
    drillStats,
    practiceFrequency,
    matchTrends,
    assessmentTrends,
  } = progress;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Goals
          </p>
          <p className="text-3xl font-bold text-green-600">
            {goalStats?.completionRate ?? 0}%
          </p>
          <p className="text-xs text-gray-500 mt-1">completion rate</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">
              ✅ {goalStats?.achieved ?? 0} achieved
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
              🔄 {goalStats?.inProgress ?? 0} active
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Drills
          </p>
          <p className="text-3xl font-bold text-blue-600">
            {drillStats?.completionRate ?? 0}%
          </p>
          <p className="text-xs text-gray-500 mt-1">completion rate</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">
              ✅ {drillStats?.completed ?? 0} done
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              ⏭ {drillStats?.skipped ?? 0} skipped
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Sessions
          </p>
          <p className="text-3xl font-bold text-purple-600">
            {practiceFrequency?.length ?? 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">total practice days</p>
          <p className="text-[10px] text-gray-400 mt-2">
            {practiceFrequency?.reduce(
              (sum: number, p: any) => sum + (p.duration || 0),
              0,
            ) ?? 0}{" "}
            mins total
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Matches
          </p>
          <p className="text-3xl font-bold text-orange-600">
            {matchTrends?.length ?? 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">total matches played</p>
          <p className="text-[10px] text-gray-400 mt-2">
            {matchTrends?.reduce(
              (sum: number, m: any) => sum + (m.batting?.runs || 0),
              0,
            ) ?? 0}{" "}
            total runs
          </p>
        </div>
      </div>

      {matchTrends && matchTrends.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Match Performance Trend
          </p>
          <div className="space-y-2">
            {matchTrends.map((m: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-gray-400 w-20 flex-shrink-0">
                  {new Date(m.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <span className="text-gray-500 flex-shrink-0 w-16 truncate">
                  vs {m.opposition || "—"}
                </span>
                {m.batting?.runs != null && (
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                    🏏 {m.batting.runs}R
                  </span>
                )}
                {m.bowling?.wickets != null && (
                  <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                    🎯 {m.bowling.wickets}W
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {assessmentTrends && assessmentTrends.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Latest Assessment
          </p>
          {(() => {
            const latest = assessmentTrends[assessmentTrends.length - 1];
            const categories = [
              { label: "Cricket", data: latest.cricket, color: "bg-blue-500" },
              {
                label: "Fielding",
                data: latest.fielding,
                color: "bg-teal-500",
              },
              {
                label: "Fitness",
                data: latest.fitness,
                color: "bg-orange-500",
              },
              { label: "Mental", data: latest.mental, color: "bg-purple-500" },
            ];
            return (
              <div className="space-y-3">
                <p className="text-[10px] text-gray-400">
                  Assessment date: {latest.date}
                </p>
                {categories.map((cat) => {
                  if (!cat.data) return null;
                  const RATING_MAP: Record<string, number> = {
                    NEEDS_WORK: 1,
                    DEVELOPING: 2,
                    GOOD: 3,
                    EXCELLENT: 4,
                  };
                  const extractRatings = (obj: any): number[] => {
                    if (!obj || typeof obj !== "object") return [];
                    const results: number[] = [];
                    for (const val of Object.values(obj)) {
                      if (typeof val === "object" && val !== null) {
                        if (
                          "rating" in val &&
                          typeof (val as any).rating === "string"
                        ) {
                          const score = RATING_MAP[(val as any).rating];
                          if (score !== undefined) results.push(score);
                        } else {
                          results.push(...extractRatings(val));
                        }
                      }
                    }
                    return results;
                  };
                  const scores = extractRatings(cat.data);
                  const avg = scores.length
                    ? Math.round(
                        (scores.reduce((a, b) => a + b, 0) / scores.length) *
                          10,
                      ) / 10
                    : 0;
                  const pct = (avg / 4) * 100;
                  return (
                    <div key={cat.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">
                          {cat.label}
                        </span>
                        <span className="text-gray-500">{avg}/4</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${cat.color} rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {assessmentTrends.length > 1 && (
                  <p className="text-[10px] text-gray-400 mt-2">
                    📈 {assessmentTrends.length} assessments recorded —
                    improving over time
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {practiceFrequency && practiceFrequency.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Practice Timeline
          </p>
          <div className="space-y-1.5">
            {practiceFrequency.slice(0, 8).map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-gray-400 w-20 flex-shrink-0">
                  {new Date(p.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-400 rounded-full"
                    style={{
                      width: `${Math.min((p.duration / 120) * 100, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-gray-500 w-14 text-right">
                  {p.duration} min
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-sm text-gray-500">{message}</p>
      <p className="text-xs text-gray-400 mt-1">
        Your coach will share updates here.
      </p>
    </div>
  );
}
