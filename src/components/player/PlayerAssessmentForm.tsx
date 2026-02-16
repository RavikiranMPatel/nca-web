import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Save } from "lucide-react";
import { playerAssessmentService } from "../../api/playerService/playerAssessmentService.ts";
import type {
  PlayerAssessmentRequest,
  PlayerAssessmentResponse,
  PlayerRole,
  RatingValue,
  AssessmentType,
  CricketSkillsData,
  FieldingData,
  FitnessData,
  DietData,
  MentalData,
  SkillEntry,
} from "../../api/playerService/playerAssessmentService.ts";

// ─── CONSTANTS ───────────────────────────────────────────

const RATINGS: {
  value: RatingValue;
  label: string;
  color: string;
  bg: string;
}[] = [
  {
    value: "NEEDS_WORK",
    label: "Needs Work",
    color: "text-red-800",
    bg: "bg-red-100 border-red-200",
  },
  {
    value: "DEVELOPING",
    label: "Developing",
    color: "text-yellow-800",
    bg: "bg-yellow-100 border-yellow-200",
  },
  {
    value: "GOOD",
    label: "Good",
    color: "text-green-800",
    bg: "bg-green-100 border-green-200",
  },
  {
    value: "EXCELLENT",
    label: "Excellent",
    color: "text-blue-800",
    bg: "bg-blue-100 border-blue-200",
  },
];

const ROLES: { value: PlayerRole; label: string }[] = [
  { value: "BATSMEN", label: "Batsmen" },
  { value: "BOWLER", label: "Bowler" },
  { value: "ALL_ROUNDER", label: "All Rounder" },
  { value: "WICKET_KEEPER", label: "Wicket Keeper" },
];

const AGE_GROUPS = ["U-10", "U-12", "U-14", "U-16", "U-19", "SENIOR"];

const TABS = [
  { key: "cricket", label: "Cricket Skills", icon: "🏏" },
  { key: "fielding", label: "Fielding", icon: "🥊" },
  { key: "fitness", label: "Fitness", icon: "💪" },
  { key: "diet", label: "Diet", icon: "🍎" },
  { key: "mental", label: "Mental", icon: "🧠" },
];

// ─── SKILL DEFINITIONS ──────────────────────────────────

const BATTING_SKILLS = {
  basics: ["Grip", "Stance", "Backlift"],
  intermediate: [
    "Body Alignment",
    "Footwork",
    "Shot Selection",
    "Running Between Wickets",
  ],
  advanced: [
    "Head Position",
    "Power Position",
    "Skill",
    "Technique Correction",
    "Playing Spin",
    "Playing Pace",
    "Temperament",
  ],
};

const BOWLING_SKILLS = {
  basics: [
    "Run Up",
    "Jump",
    "Gather / Loading",
    "Back Foot Landing",
    "Front Foot Landing",
    "Release",
    "Follow Through",
  ],
  intermediate: [
    "Run Up Stride",
    "Jump & Gather",
    "Back Foot Landing Position",
    "Front Foot Landing / Release & Follow Through",
    "Line & Length Consistency",
  ],
  advanced: ["Body Alignment", "Variations", "Bowling Under Pressure"],
};

const WICKET_KEEPING_SKILLS = {
  basics: ["Stance", "Glove Work", "Catching"],
  intermediate: ["Standing Up to Stumps", "Standing Back", "Footwork"],
  advanced: [
    "Diving",
    "Leg-side Takes",
    "Stumping Speed",
    "Reading the Bowler",
  ],
};

// ─── FIELDING SKILL DEFINITIONS ─────────────────────────

const COMMON_FIELDING_SKILLS = {
  basics: [
    "Gathering / Picking Up",
    "Basic Catching (Flat)",
    "Basic Catching (High)",
    "Basic Throwing Technique",
    "Walking In with Bowler",
  ],
  intermediate: [
    "Attack the Ball",
    "Close-in Catching",
    "Moving Catches",
    "Throwing Accuracy",
    "Angled Throws",
    "Sliding Stops",
    "Backing Up",
  ],
  advanced: [
    "Diving Catches",
    "Relay Throwing",
    "Direct Hit / Hitting Stumps",
    "Communication & Calling",
    "Game Sense & Field Awareness",
  ],
};

const WK_FIELDING_SKILLS = {
  basics: ["Standing Up to Stumps (Spin)", "Standing Back (Pace)"],
  intermediate: [
    "Diving Catches (Left/Right)",
    "Leg-side Takes",
    "Stumping Technique",
  ],
  advanced: [
    "Reading the Bowler",
    "Throwing from Crouch",
    "Match Awareness as Keeper",
  ],
};

const FITNESS_CATEGORIES = {
  endurance: ["Yo-Yo Test / Beep Test Level", "2km Run Time"],
  speedAgility: ["30m Sprint Time", "T-Test / Shuttle Run Time"],
  strength: ["Push-ups Count", "Plank Hold Duration", "Throwing Distance"],
  flexibility: ["Sit & Reach Test", "Shoulder Mobility"],
  injuryTracker: ["Current Injuries", "Recovery Status", "Areas of Concern"],
};

const DIET_FIELDS = {
  currentAssessment: [
    "Meals Per Day",
    "Hydration Level",
    "Junk Food Frequency",
  ],
  recommendedPlan: [
    "Pre-Training Meal",
    "Post-Training Meal",
    "Match Day Diet",
  ],
};

const MENTAL_CATEGORIES = {
  discipline: ["Punctuality", "Attitude in Training", "Coachability"],
  matchTemperament: [
    "Handling Pressure",
    "Bounce-back After Failure",
    "Concentration Span",
  ],
  teamBehavior: [
    "Communication",
    "Leadership Qualities",
    "Support to Teammates",
  ],
};

// ─── REUSABLE COMPONENTS ─────────────────────────────────

function RatingPills({
  value,
  onChange,
}: {
  value?: RatingValue;
  onChange: (v: RatingValue) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {RATINGS.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
            value === r.value
              ? `${r.bg} ${r.color}`
              : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function SkillRow({
  label,
  entry,
  onChange,
  commentRows = 1,
}: {
  label: string;
  entry: SkillEntry;
  onChange: (e: SkillEntry) => void;
  commentRows?: number;
}) {
  const [open, setOpen] = useState(!!entry.rating || !!entry.comment);

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
          open
            ? "bg-blue-50 border border-blue-200"
            : "bg-slate-50 border border-slate-100 hover:border-slate-200"
        }`}
      >
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          {entry.rating && !open && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                RATINGS.find((r) => r.value === entry.rating)?.bg || ""
              } ${RATINGS.find((r) => r.value === entry.rating)?.color || ""}`}
            >
              {entry.rating.replace(/_/g, " ")}
            </span>
          )}
          <span
            className={`text-xs text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        </div>
      </button>
      {open && (
        <div className="px-3 pt-3 pb-1 space-y-2">
          <RatingPills
            value={entry.rating}
            onChange={(v) => onChange({ ...entry, rating: v })}
          />
          <textarea
            value={entry.comment || ""}
            onChange={(e) => onChange({ ...entry, comment: e.target.value })}
            placeholder="Coach comments..."
            rows={commentRows}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y bg-slate-50"
          />
        </div>
      )}
    </div>
  );
}

function TierHeader({ tier, label }: { tier: string; label: string }) {
  const styles: Record<string, { dot: string; bg: string; text: string }> = {
    Basics: { dot: "bg-green-500", bg: "bg-green-50", text: "text-green-700" },
    Intermediate: {
      dot: "bg-orange-500",
      bg: "bg-orange-50",
      text: "text-orange-700",
    },
    Advanced: { dot: "bg-pink-500", bg: "bg-pink-50", text: "text-pink-700" },
  };
  const s = styles[tier] || styles.Basics;

  return (
    <div className="flex items-center gap-2 mt-4 mb-2">
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      <span
        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${s.bg} ${s.text}`}
      >
        {tier} — {label}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{icon}</span>
        <span className="font-bold text-sm text-slate-900">{title}</span>
      </div>
      {children}
    </div>
  );
}

// ─── HELPER: get/set nested skill data ──────────────────

function getSkill(
  data: Record<string, SkillEntry> | undefined,
  key: string,
): SkillEntry {
  return data?.[key] || {};
}

// ─── MAIN FORM COMPONENT ─────────────────────────────────

type Props = {
  playerPublicId: string;
  assessmentPublicId?: string; // for edit
  isFollowUp?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
};

function PlayerAssessmentForm({
  playerPublicId,
  assessmentPublicId,
  isFollowUp = false,
  onSuccess,
  onCancel,
}: Props) {
  const isEdit = !!assessmentPublicId;

  // Metadata
  const [assessmentDate, setAssessmentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [assessmentType, setAssessmentType] = useState<AssessmentType>(
    isFollowUp ? "FOLLOW_UP" : "MONTHLY",
  );
  const [playerRole, setPlayerRole] = useState<PlayerRole>("BATSMEN");
  const [ageGroup, setAgeGroup] = useState("");
  const [activeTab, setActiveTab] = useState("cricket");

  // Tab data
  const [cricketSkills, setCricketSkills] = useState<CricketSkillsData>({});
  const [fielding, setFielding] = useState<FieldingData>({});
  const [fitness, setFitness] = useState<FitnessData>({});
  const [diet, setDiet] = useState<DietData>({});
  const [mental, setMental] = useState<MentalData>({});

  // Overall
  const [overallRating, setOverallRating] = useState<RatingValue | undefined>();
  const [overallSummary, setOverallSummary] = useState("");

  // State
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [parentPublicId, setParentPublicId] = useState<string | undefined>();

  // Bowling specifics
  const [spinType, setSpinType] = useState<string | null>(null);
  const [balancePriority, setBalancePriority] = useState<string>("EQUAL");

  // Body metrics
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  // Diet text fields
  const [supplements, setSupplements] = useState("");
  const [coachDietNotes, setCoachDietNotes] = useState("");
  const [complianceRating, setComplianceRating] = useState<
    RatingValue | undefined
  >();

  // Goal tracking
  const [currentGoal, setCurrentGoal] = useState("");
  const [goalProgress, setGoalProgress] = useState("");
  const [nextMilestone, setNextMilestone] = useState("");

  // ─── LOAD EXISTING DATA ────────────────────────────────

  useEffect(() => {
    if (isEdit && assessmentPublicId) {
      loadAssessment(assessmentPublicId);
    } else if (isFollowUp) {
      loadLatestForFollowUp();
    }
  }, []);

  const loadAssessment = async (pubId: string) => {
    setLoadingData(true);
    try {
      const data = await playerAssessmentService.getById(playerPublicId, pubId);
      populateForm(data);
    } catch (error) {
      console.error("Error loading assessment data:", error);
      toast.error("Failed to load assessment");
    } finally {
      setLoadingData(false);
    }
  };

  const loadLatestForFollowUp = async () => {
    setLoadingData(true);
    try {
      const data = await playerAssessmentService.getLatest(playerPublicId);
      setParentPublicId(data.publicId);
      populateForm(data);
      setAssessmentDate(new Date().toISOString().split("T")[0]);
      setAssessmentType("FOLLOW_UP");
    } catch (error) {
      // No previous assessment - just start fresh
      toast("No previous assessment found. Starting fresh.", { icon: "ℹ️" });
    } finally {
      setLoadingData(false);
    }
  };

  const populateForm = (data: PlayerAssessmentResponse) => {
    setAssessmentDate(data.assessmentDate);
    setAssessmentType(data.assessmentType);
    setPlayerRole(data.playerRole);
    setAgeGroup(data.ageGroup || "");
    setCricketSkills(data.cricketSkills || {});
    setFielding(data.fielding || {});
    setFitness(data.fitness || {});
    setDiet(data.diet || {});
    setMental(data.mental || {});
    setOverallRating(data.overallRating);
    setOverallSummary(data.overallSummary || "");

    // Reconstruct local state from JSONB
    if (data.cricketSkills?.balancePriority)
      setBalancePriority(data.cricketSkills.balancePriority);
    if (data.fitness?.bodyMetrics) {
      setHeight(data.fitness.bodyMetrics.height?.toString() || "");
      setWeight(data.fitness.bodyMetrics.weight?.toString() || "");
    }
    if (data.diet?.supplements) setSupplements(data.diet.supplements as string);
    if (data.diet?.coachNotes)
      setCoachDietNotes(data.diet.coachNotes as string);
    if (data.diet?.complianceRating)
      setComplianceRating(data.diet.complianceRating);
    if (data.mental?.goalTracking) {
      setCurrentGoal(data.mental.goalTracking.currentGoal || "");
      setGoalProgress(data.mental.goalTracking.progress || "");
      setNextMilestone(data.mental.goalTracking.nextMilestone || "");
    }
  };

  // ─── SKILL DATA UPDATERS ──────────────────────────────

  const updateBattingSkill = (
    tier: string,
    skill: string,
    entry: SkillEntry,
  ) => {
    setCricketSkills((prev) => ({
      ...prev,
      batting: {
        ...prev.batting,
        [tier]: {
          ...(prev.batting?.[tier as keyof typeof prev.batting] as Record<
            string,
            SkillEntry
          >),
          [skill]: entry,
        },
      },
    }));
  };

  const updateBowlingSkill = (
    tier: string,
    skill: string,
    entry: SkillEntry,
  ) => {
    setCricketSkills((prev) => ({
      ...prev,
      bowling: {
        ...prev.bowling,
        [tier]: {
          ...(prev.bowling?.[tier as keyof typeof prev.bowling] as Record<
            string,
            SkillEntry
          >),
          [skill]: entry,
        },
      },
    }));
  };

  const updateWKSkill = (tier: string, skill: string, entry: SkillEntry) => {
    setCricketSkills((prev) => ({
      ...prev,
      wicketKeeping: {
        ...prev.wicketKeeping,
        [tier]: {
          ...(prev.wicketKeeping?.[
            tier as keyof typeof prev.wicketKeeping
          ] as Record<string, SkillEntry>),
          [skill]: entry,
        },
      },
    }));
  };

  const updateCommonFieldingSkill = (
    tier: string,
    skill: string,
    entry: SkillEntry,
  ) => {
    setFielding((prev) => ({
      ...prev,
      common: {
        ...prev.common,
        [tier]: {
          ...(prev.common?.[tier as keyof typeof prev.common] as Record<
            string,
            SkillEntry
          >),
          [skill]: entry,
        },
      },
    }));
  };

  const updateWKFieldingSkill = (
    tier: string,
    skill: string,
    entry: SkillEntry,
  ) => {
    setFielding((prev) => ({
      ...prev,
      wicketKeeping: {
        ...prev.wicketKeeping,
        [tier]: {
          ...(prev.wicketKeeping?.[
            tier as keyof typeof prev.wicketKeeping
          ] as Record<string, SkillEntry>),
          [skill]: entry,
        },
      },
    }));
  };

  const updateFitnessSkill = (
    category: string,
    skill: string,
    entry: SkillEntry,
  ) => {
    setFitness((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category as keyof FitnessData] as Record<string, SkillEntry>),
        [skill]: entry,
      },
    }));
  };

  const updateDietSkill = (
    category: string,
    skill: string,
    entry: SkillEntry,
  ) => {
    setDiet((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category as keyof DietData] as Record<string, SkillEntry>),
        [skill]: entry,
      },
    }));
  };

  const updateMentalSkill = (
    category: string,
    skill: string,
    entry: SkillEntry,
  ) => {
    setMental((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category as keyof MentalData] as Record<string, SkillEntry>),
        [skill]: entry,
      },
    }));
  };

  // ─── SAVE ──────────────────────────────────────────────

  const handleSave = async (status: "DRAFT" | "COMPLETED") => {
    if (!assessmentDate) {
      toast.error("Assessment date is required");
      return;
    }

    setSaving(true);

    const bmi =
      height && weight
        ? Math.round(
            (parseFloat(weight) / (parseFloat(height) / 100) ** 2) * 10,
          ) / 10
        : undefined;

    const payload: PlayerAssessmentRequest = {
      assessmentDate,
      assessmentType,
      playerRole,
      ageGroup: ageGroup || undefined,
      cricketSkills: {
        ...cricketSkills,
        balancePriority:
          playerRole === "ALL_ROUNDER" ? balancePriority : undefined,
      },
      fielding,
      fitness: {
        ...fitness,
        bodyMetrics: {
          height: height ? parseFloat(height) : undefined,
          weight: weight ? parseFloat(weight) : undefined,
          bmi,
        },
      },
      diet: {
        ...diet,
        supplements,
        coachNotes: coachDietNotes,
        complianceRating,
      },
      mental: {
        ...mental,
        goalTracking: {
          currentGoal,
          progress: goalProgress,
          nextMilestone,
        },
      },
      overallRating,
      overallSummary: overallSummary || undefined,
      parentAssessmentPublicId: parentPublicId,
      status,
    };

    try {
      if (isEdit && assessmentPublicId) {
        await playerAssessmentService.update(
          playerPublicId,
          assessmentPublicId,
          payload,
        );
        toast.success("Assessment updated successfully");
      } else {
        await playerAssessmentService.create(playerPublicId, payload);
        toast.success("Assessment saved successfully");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to save assessment",
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── LOADING STATE ─────────────────────────────────────

  if (loadingData) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 mt-3">Loading assessment...</p>
      </div>
    );
  }

  // ─── RENDER ────────────────────────────────────────────

  const showBatting =
    playerRole === "BATSMEN" ||
    playerRole === "ALL_ROUNDER" ||
    playerRole === "WICKET_KEEPER";
  const showBowling = playerRole === "BOWLER" || playerRole === "ALL_ROUNDER";
  const showWK = playerRole === "WICKET_KEEPER";

  return (
    <div className="space-y-6">
      {/* ─── HEADER ────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          {isEdit
            ? "Edit Assessment"
            : isFollowUp
              ? "Quick Follow-up"
              : "New Assessment"}
        </h2>
        {isFollowUp && parentPublicId && (
          <p className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-md inline-block mb-3">
            📋 Based on previous assessment — pre-filled with last data
          </p>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={assessmentDate}
              onChange={(e) => setAssessmentDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Type
            </label>
            <select
              value={assessmentType}
              onChange={(e) =>
                setAssessmentType(e.target.value as AssessmentType)
              }
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="FOLLOW_UP">Follow-up</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={playerRole}
              onChange={(e) => setPlayerRole(e.target.value as PlayerRole)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Age Group
            </label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              {AGE_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div> */}
        </div>
      </div>

      {/* ─── TABS ──────────────────────────────────────── */}
      <div className="flex gap-1 bg-white rounded-lg shadow p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB: CRICKET SKILLS ──────────────────────── */}
      {activeTab === "cricket" && (
        <div className="space-y-4">
          {/* Batting */}
          {showBatting && (
            <>
              {playerRole === "ALL_ROUNDER" && (
                <div className="text-sm font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-lg inline-block">
                  🏏 BATTING ASSESSMENT
                </div>
              )}
              {playerRole === "WICKET_KEEPER" && (
                <div className="text-sm font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-lg inline-block">
                  🏏 BATTING ASSESSMENT (Keeper as Batsman)
                </div>
              )}

              <TierHeader tier="Basics" label="Fundamentals" />
              <SectionCard title="Batting Basics" icon="🏏">
                {BATTING_SKILLS.basics.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(
                      cricketSkills.batting?.basics as Record<
                        string,
                        SkillEntry
                      >,
                      s,
                    )}
                    onChange={(e) => updateBattingSkill("basics", s, e)}
                  />
                ))}
              </SectionCard>

              <TierHeader tier="Intermediate" label="Body Mechanics" />
              <SectionCard title="Batting Intermediate" icon="⚡">
                {BATTING_SKILLS.intermediate.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(
                      cricketSkills.batting?.intermediate as Record<
                        string,
                        SkillEntry
                      >,
                      s,
                    )}
                    onChange={(e) => updateBattingSkill("intermediate", s, e)}
                    commentRows={2}
                  />
                ))}
              </SectionCard>

              <TierHeader tier="Advanced" label="High Performance" />
              <SectionCard title="Batting Advanced" icon="🔥">
                {BATTING_SKILLS.advanced.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(
                      cricketSkills.batting?.advanced as Record<
                        string,
                        SkillEntry
                      >,
                      s,
                    )}
                    onChange={(e) => updateBattingSkill("advanced", s, e)}
                    commentRows={2}
                  />
                ))}
              </SectionCard>
            </>
          )}

          {/* Bowling */}
          {showBowling && (
            <>
              {playerRole === "ALL_ROUNDER" && (
                <>
                  <hr className="border-t-2 border-dashed border-slate-200 my-4" />
                  <div className="text-sm font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-lg inline-block">
                    🎯 BOWLING ASSESSMENT
                  </div>
                </>
              )}

              <TierHeader tier="Basics" label="Bowling Action" />
              <SectionCard title="Bowling Basics" icon="🎯">
                {BOWLING_SKILLS.basics.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(
                      cricketSkills.bowling?.basics as Record<
                        string,
                        SkillEntry
                      >,
                      s,
                    )}
                    onChange={(e) => updateBowlingSkill("basics", s, e)}
                  />
                ))}
              </SectionCard>

              <TierHeader tier="Intermediate" label="Bowling Mechanics" />
              <SectionCard title="Bowling Intermediate" icon="⚡">
                {BOWLING_SKILLS.intermediate.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(
                      cricketSkills.bowling?.intermediate as Record<
                        string,
                        SkillEntry
                      >,
                      s,
                    )}
                    onChange={(e) => updateBowlingSkill("intermediate", s, e)}
                    commentRows={2}
                  />
                ))}
              </SectionCard>

              <TierHeader tier="Advanced" label="Advanced Bowling" />
              <SectionCard title="Bowling Advanced" icon="🔥">
                {BOWLING_SKILLS.advanced.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(
                      cricketSkills.bowling?.advanced as Record<
                        string,
                        SkillEntry
                      >,
                      s,
                    )}
                    onChange={(e) => updateBowlingSkill("advanced", s, e)}
                    commentRows={2}
                  />
                ))}

                {/* Spin Type */}
                <div className="mt-3 px-1">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    Spin Type (if applicable)
                  </p>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {["Finger Spinner", "Wrist Spinner", null].map((t) => (
                      <button
                        key={t || "NA"}
                        type="button"
                        onClick={() => setSpinType(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          spinType === t
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {t || "N/A"}
                      </button>
                    ))}
                  </div>
                  {spinType && (
                    <SkillRow
                      label={`${spinType} — Position & Release`}
                      entry={getSkill(
                        cricketSkills.bowling?.advanced as Record<
                          string,
                          SkillEntry
                        >,
                        spinType,
                      )}
                      onChange={(e) =>
                        updateBowlingSkill("advanced", spinType, e)
                      }
                      commentRows={2}
                    />
                  )}
                </div>
              </SectionCard>
            </>
          )}

          {/* Wicket Keeping */}
          {showWK && (
            <>
              <hr className="border-t-2 border-dashed border-slate-200 my-4" />
              <div className="text-sm font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-lg inline-block">
                🧤 WICKET KEEPING ASSESSMENT
              </div>

              <TierHeader tier="Basics" label="Keeping Fundamentals" />
              <SectionCard title="Wicket Keeping Basics" icon="🧤">
                {WICKET_KEEPING_SKILLS.basics.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(
                      cricketSkills.wicketKeeping?.basics as Record<
                        string,
                        SkillEntry
                      >,
                      s,
                    )}
                    onChange={(e) => updateWKSkill("basics", s, e)}
                  />
                ))}
              </SectionCard>

              <TierHeader tier="Intermediate" label="Keeping Mechanics" />
              <SectionCard title="Wicket Keeping Intermediate" icon="⚡">
                {WICKET_KEEPING_SKILLS.intermediate.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(
                      cricketSkills.wicketKeeping?.intermediate as Record<
                        string,
                        SkillEntry
                      >,
                      s,
                    )}
                    onChange={(e) => updateWKSkill("intermediate", s, e)}
                    commentRows={2}
                  />
                ))}
              </SectionCard>

              <TierHeader tier="Advanced" label="Advanced Keeping" />
              <SectionCard title="Wicket Keeping Advanced" icon="🔥">
                {WICKET_KEEPING_SKILLS.advanced.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(
                      cricketSkills.wicketKeeping?.advanced as Record<
                        string,
                        SkillEntry
                      >,
                      s,
                    )}
                    onChange={(e) => updateWKSkill("advanced", s, e)}
                    commentRows={2}
                  />
                ))}
              </SectionCard>
            </>
          )}

          {/* All Rounder balance */}
          {playerRole === "ALL_ROUNDER" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-yellow-800 mb-2">
                ⚖️ Balance Priority — Where should this player focus more?
              </p>
              <div className="flex gap-3 flex-wrap">
                {["BATTING_FOCUS", "BOWLING_FOCUS", "EQUAL"].map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="balance"
                      checked={balancePriority === opt}
                      onChange={() => setBalancePriority(opt)}
                      className="accent-yellow-600"
                    />
                    {opt
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: FIELDING ────────────────────────────── */}
      {activeTab === "fielding" && (
        <div className="space-y-4">
          {/* Common Fielding (all roles) */}
          <div className="text-sm font-bold text-teal-700 bg-teal-50 px-4 py-2 rounded-lg inline-block">
            🥊 FIELDING & CATCHING (All Roles)
          </div>

          <TierHeader tier="Basics" label="Fielding Fundamentals" />
          <SectionCard title="Fielding Basics" icon="🏃">
            {COMMON_FIELDING_SKILLS.basics.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(
                  fielding.common?.basics as Record<string, SkillEntry>,
                  s,
                )}
                onChange={(e) => updateCommonFieldingSkill("basics", s, e)}
              />
            ))}
          </SectionCard>

          <TierHeader tier="Intermediate" label="Match Situations" />
          <SectionCard title="Fielding Intermediate" icon="⚡">
            {COMMON_FIELDING_SKILLS.intermediate.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(
                  fielding.common?.intermediate as Record<string, SkillEntry>,
                  s,
                )}
                onChange={(e) =>
                  updateCommonFieldingSkill("intermediate", s, e)
                }
                commentRows={2}
              />
            ))}
          </SectionCard>

          <TierHeader tier="Advanced" label="Pressure Scenarios" />
          <SectionCard title="Fielding Advanced" icon="🔥">
            {COMMON_FIELDING_SKILLS.advanced.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(
                  fielding.common?.advanced as Record<string, SkillEntry>,
                  s,
                )}
                onChange={(e) => updateCommonFieldingSkill("advanced", s, e)}
                commentRows={2}
              />
            ))}
          </SectionCard>

          {/* WK-specific fielding (only for Wicket Keeper) */}
          {showWK && (
            <>
              <hr className="border-t-2 border-dashed border-slate-200 my-4" />
              <div className="text-sm font-bold text-purple-700 bg-purple-50 px-4 py-2 rounded-lg inline-block">
                🧤 WICKET KEEPER — FIELDING SPECIFIC
              </div>
              <p className="text-xs text-slate-500 px-1">
                Additional fielding skills specific to wicket keeping role
              </p>

              <TierHeader tier="Basics" label="Keeper Fielding Basics" />
              <SectionCard title="WK Fielding Basics" icon="🧤">
                {WK_FIELDING_SKILLS.basics.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(
                      fielding.wicketKeeping?.basics as Record<
                        string,
                        SkillEntry
                      >,
                      s,
                    )}
                    onChange={(e) => updateWKFieldingSkill("basics", s, e)}
                  />
                ))}
              </SectionCard>

              <TierHeader tier="Intermediate" label="Keeper Techniques" />
              <SectionCard title="WK Fielding Intermediate" icon="⚡">
                {WK_FIELDING_SKILLS.intermediate.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(
                      fielding.wicketKeeping?.intermediate as Record<
                        string,
                        SkillEntry
                      >,
                      s,
                    )}
                    onChange={(e) =>
                      updateWKFieldingSkill("intermediate", s, e)
                    }
                    commentRows={2}
                  />
                ))}
              </SectionCard>

              <TierHeader tier="Advanced" label="Advanced Keeper Skills" />
              <SectionCard title="WK Fielding Advanced" icon="🔥">
                {WK_FIELDING_SKILLS.advanced.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(
                      fielding.wicketKeeping?.advanced as Record<
                        string,
                        SkillEntry
                      >,
                      s,
                    )}
                    onChange={(e) => updateWKFieldingSkill("advanced", s, e)}
                    commentRows={2}
                  />
                ))}
              </SectionCard>
            </>
          )}
        </div>
      )}

      {/* ─── TAB: FITNESS ─────────────────────────────── */}
      {activeTab === "fitness" && (
        <div className="space-y-4">
          <SectionCard title="Endurance" icon="🫁">
            {FITNESS_CATEGORIES.endurance.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(
                  fitness.endurance as Record<string, SkillEntry>,
                  s,
                )}
                onChange={(e) => updateFitnessSkill("endurance", s, e)}
              />
            ))}
          </SectionCard>

          <SectionCard title="Speed & Agility" icon="💨">
            {FITNESS_CATEGORIES.speedAgility.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(
                  fitness.speedAgility as Record<string, SkillEntry>,
                  s,
                )}
                onChange={(e) => updateFitnessSkill("speedAgility", s, e)}
              />
            ))}
          </SectionCard>

          <SectionCard title="Strength" icon="💪">
            {FITNESS_CATEGORIES.strength.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(
                  fitness.strength as Record<string, SkillEntry>,
                  s,
                )}
                onChange={(e) => updateFitnessSkill("strength", s, e)}
              />
            ))}
          </SectionCard>

          <SectionCard title="Flexibility" icon="🤸">
            {FITNESS_CATEGORIES.flexibility.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(
                  fitness.flexibility as Record<string, SkillEntry>,
                  s,
                )}
                onChange={(e) => updateFitnessSkill("flexibility", s, e)}
              />
            ))}
          </SectionCard>

          <SectionCard title="Body Metrics" icon="📊">
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="—"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="—"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  BMI (auto)
                </label>
                <input
                  type="text"
                  value={
                    height && weight
                      ? (
                          parseFloat(weight) /
                          (parseFloat(height) / 100) ** 2
                        ).toFixed(1)
                      : ""
                  }
                  disabled
                  placeholder="—"
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-100 text-slate-600"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Injury Tracker" icon="🩹">
            {FITNESS_CATEGORIES.injuryTracker.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(
                  fitness.injuryTracker as Record<string, SkillEntry>,
                  s,
                )}
                onChange={(e) => updateFitnessSkill("injuryTracker", s, e)}
                commentRows={2}
              />
            ))}
          </SectionCard>
        </div>
      )}

      {/* ─── TAB: DIET ────────────────────────────────── */}
      {activeTab === "diet" && (
        <div className="space-y-4">
          <SectionCard title="Current Diet Assessment" icon="🍽️">
            {DIET_FIELDS.currentAssessment.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(
                  diet.currentAssessment as Record<string, SkillEntry>,
                  s,
                )}
                onChange={(e) => updateDietSkill("currentAssessment", s, e)}
              />
            ))}
            <div className="mt-3 px-1">
              <p className="text-xs font-semibold text-slate-600 mb-2">
                Compliance Rating
              </p>
              <RatingPills
                value={complianceRating}
                onChange={setComplianceRating}
              />
            </div>
          </SectionCard>

          <SectionCard title="Recommended Plan" icon="📋">
            {DIET_FIELDS.recommendedPlan.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(
                  diet.recommendedPlan as Record<string, SkillEntry>,
                  s,
                )}
                onChange={(e) => updateDietSkill("recommendedPlan", s, e)}
                commentRows={2}
              />
            ))}
          </SectionCard>

          <SectionCard title="Supplements (if any)" icon="💊">
            <textarea
              value={supplements}
              onChange={(e) => setSupplements(e.target.value)}
              placeholder="Age-appropriate supplements if recommended..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </SectionCard>

          <SectionCard title="Coach / Nutritionist Notes" icon="📝">
            <textarea
              value={coachDietNotes}
              onChange={(e) => setCoachDietNotes(e.target.value)}
              placeholder="Specific dietary advice and observations..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </SectionCard>
        </div>
      )}

      {/* ─── TAB: MENTAL ──────────────────────────────── */}
      {activeTab === "mental" && (
        <div className="space-y-4">
          <SectionCard title="Discipline" icon="🎯">
            {MENTAL_CATEGORIES.discipline.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(
                  mental.discipline as Record<string, SkillEntry>,
                  s,
                )}
                onChange={(e) => updateMentalSkill("discipline", s, e)}
              />
            ))}
          </SectionCard>

          <SectionCard title="Match Temperament" icon="🧠">
            {MENTAL_CATEGORIES.matchTemperament.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(
                  mental.matchTemperament as Record<string, SkillEntry>,
                  s,
                )}
                onChange={(e) => updateMentalSkill("matchTemperament", s, e)}
                commentRows={2}
              />
            ))}
          </SectionCard>

          <SectionCard title="Team Behavior" icon="🤝">
            {MENTAL_CATEGORIES.teamBehavior.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(
                  mental.teamBehavior as Record<string, SkillEntry>,
                  s,
                )}
                onChange={(e) => updateMentalSkill("teamBehavior", s, e)}
              />
            ))}
          </SectionCard>

          <SectionCard title="Goal Tracking" icon="🎯">
            <div className="space-y-3 px-1">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Current Goal
                </label>
                <textarea
                  value={currentGoal}
                  onChange={(e) => setCurrentGoal(e.target.value)}
                  placeholder="e.g., Improve Yo-Yo test from Level 16 to 18"
                  rows={1}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Progress Toward Goal
                </label>
                <textarea
                  value={goalProgress}
                  onChange={(e) => setGoalProgress(e.target.value)}
                  placeholder="Current progress..."
                  rows={1}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                  Next Milestone
                </label>
                <textarea
                  value={nextMilestone}
                  onChange={(e) => setNextMilestone(e.target.value)}
                  placeholder="What's the next target..."
                  rows={1}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ─── OVERALL SUMMARY ──────────────────────────── */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">📊</span>
          <span className="font-bold text-sm text-slate-900">
            Overall Assessment Summary
          </span>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">
            Overall Rating
          </p>
          <RatingPills value={overallRating} onChange={setOverallRating} />
        </div>

        <textarea
          value={overallSummary}
          onChange={(e) => setOverallSummary(e.target.value)}
          placeholder="Overall summary, key strengths, areas for improvement, and action plan..."
          rows={4}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
        />
      </div>

      {/* ─── ACTION BUTTONS ───────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 md:justify-end pb-8">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 disabled:opacity-50 transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSave("DRAFT")}
          disabled={saving}
          className="px-6 py-2.5 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 disabled:opacity-50 transition-all"
        >
          {saving ? "Saving..." : "Save as Draft"}
        </button>
        <button
          type="button"
          onClick={() => handleSave("COMPLETED")}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
        >
          <Save size={16} />
          {saving
            ? "Saving..."
            : isEdit
              ? "Update Assessment"
              : "Save Assessment"}
        </button>
      </div>
    </div>
  );
}

export default PlayerAssessmentForm;
