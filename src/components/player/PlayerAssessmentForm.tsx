import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Save, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
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
import {
  RATINGS,
  getSkill,
  RatingPills,
  SkillRow,
  TierHeader,
  SectionCard,
} from "./assessmentComponents.tsx";

// ─── HELPERS ─────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ─── CONSTANTS ───────────────────────────────────────────

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

const FITNESS_PHYSICAL = {
  endurance: ["Yo-Yo Test / Beep Test Level", "2km Run Time"],
  speedAgility: ["30m Sprint Time", "T-Test / Shuttle Run Time"],
  strength: ["Push-ups Count", "Plank Hold Duration", "Throwing Distance"],
  flexibility: ["Sit & Reach Test", "Shoulder Mobility"],
};

const MEASUREMENT_SKILLS: Record<string, { unit: string }> = {
  "Yo-Yo Test / Beep Test Level": { unit: "level" },
  "2km Run Time": { unit: "min" },
  "30m Sprint Time": { unit: "sec" },
  "T-Test / Shuttle Run Time": { unit: "sec" },
  "Push-ups Count": { unit: "reps" },
  "Plank Hold Duration": { unit: "sec" },
  "Throwing Distance": { unit: "m" },
  "Sit & Reach Test": { unit: "cm" },
};

const FITNESS_PERFORMANCE = {
  performanceFitness: ["Reaction Time", "Balance & Coordination", "Explosive Power"],
};

const FITNESS_HEALTH = {
  healthWellness: ["Sleep Quality", "Stress Management", "Recovery Between Sessions"],
};

const FITNESS_MOBILITY = {
  movementMobility: ["Joint Mobility", "Posture Assessment", "Functional Movement Screen"],
};

const FITNESS_REHAB = {
  rehabAndRecovery: ["Rehab Compliance"],
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

// ─── (RatingPills, SkillRow, TierHeader, SectionCard, getSkill imported above) ─

// ─── MAIN FORM COMPONENT ─────────────────────────────────

type Props = {
  playerPublicId: string;
  assessmentPublicId?: string; // for edit
  isFollowUp?: boolean;
  initialTab?: string;
  onSuccess: () => void;
  onCancel: () => void;
};

function PlayerAssessmentForm({
  playerPublicId,
  assessmentPublicId,
  isFollowUp = false,
  initialTab,
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
  const [activeTab, setActiveTab] = useState(initialTab ?? "cricket");

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

  // ─── VIEW MODE (Detailed / Quick Rate) ────────────────
  const [viewMode, setViewMode] = useState<"detailed" | "compact">("detailed");

  // ─── PREVIOUS ASSESSMENT (for inline "last rating") ────
  const [previousAssessment, setPreviousAssessment] =
    useState<PlayerAssessmentResponse | null>(null);

  // ─── AUTOSAVE STATE ────────────────────────────────────
  type AutoSaveStatus = "idle" | "saving" | "saved" | "error";
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  // publicId of the DRAFT created by autosave when in "new" mode
  const autosavePublicIdRef = useRef<string | undefined>(undefined);
  const isDirtyRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevent autosave from firing during initial data load
  const [isInitialized, setIsInitialized] = useState(false);

  // ─── LOAD EXISTING DATA ────────────────────────────────

  useEffect(() => {
    if (isEdit && assessmentPublicId) {
      loadAssessment(assessmentPublicId);
    } else if (isFollowUp) {
      loadLatestForFollowUp();
    } else {
      // New assessment: fetch latest completed for inline "last rating" hints
      playerAssessmentService
        .getLatest(playerPublicId)
        .then((d) => setPreviousAssessment(d))
        .catch(() => {});
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

  // ─── SAVE / AUTOSAVE ───────────────────────────────────

  // Ref holding the current build-payload function so autosave
  // always reads the latest state without needing deps.
  const buildPayloadRef = useRef<(status: "DRAFT" | "COMPLETED") => PlayerAssessmentRequest>(
    () => ({ assessmentDate: "", assessmentType: "MONTHLY", playerRole: "BATSMEN", status: "DRAFT" })
  );

  // Keep buildPayloadRef current on every render (captures latest closure values)
  buildPayloadRef.current = (status: "DRAFT" | "COMPLETED"): PlayerAssessmentRequest => {
    const bmi =
      height && weight
        ? Math.round(
            (parseFloat(weight) / (parseFloat(height) / 100) ** 2) * 10,
          ) / 10
        : undefined;
    return {
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
  };

  // Autosave ref — always has latest logic, no stale closure issues
  const autosaveRef = useRef<() => Promise<void>>(async () => {});
  autosaveRef.current = async () => {
    if (!assessmentDate) return;
    const payload = buildPayloadRef.current("DRAFT");
    setAutoSaveStatus("saving");
    try {
      const effectiveId = isEdit ? assessmentPublicId : autosavePublicIdRef.current;
      if (effectiveId) {
        await playerAssessmentService.update(playerPublicId, effectiveId, payload);
      } else {
        const created = await playerAssessmentService.create(playerPublicId, payload);
        autosavePublicIdRef.current = created.publicId;
      }
      setAutoSaveStatus("saved");
      setLastAutoSavedAt(new Date());
      isDirtyRef.current = false;
    } catch {
      setAutoSaveStatus("error");
    }
  };

  const scheduleAutosave = useCallback(() => {
    isDirtyRef.current = true;
    setAutoSaveStatus("idle"); // clear previous saved badge until next save completes
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveRef.current();
    }, 2500);
  }, []);

  // Trigger autosave on any form state change (after initial load)
  useEffect(() => {
    if (!isInitialized) return;
    scheduleAutosave();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assessmentDate, assessmentType, playerRole, ageGroup,
    cricketSkills, fielding, fitness, diet, mental,
    overallRating, overallSummary,
    supplements, coachDietNotes, complianceRating,
    currentGoal, goalProgress, nextMilestone,
    height, weight, spinType, balancePriority,
  ]);

  // Mark initialized after loading completes (prevents autosave during data load)
  useEffect(() => {
    if (!loadingData) {
      const t = setTimeout(() => setIsInitialized(true), 200);
      return () => clearTimeout(t);
    }
  }, [loadingData]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  const handleSave = async (status: "DRAFT" | "COMPLETED") => {
    if (!assessmentDate) {
      toast.error("Assessment date is required");
      return;
    }

    // Cancel any pending autosave
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    setSaving(true);
    const payload = buildPayloadRef.current(status);
    try {
      // Use autosave-created draft id if available (avoids duplicate create)
      const effectiveId = isEdit ? assessmentPublicId : autosavePublicIdRef.current;
      if (effectiveId) {
        await playerAssessmentService.update(playerPublicId, effectiveId, payload);
        toast.success(
          isEdit ? "Assessment updated successfully" : "Assessment saved successfully",
        );
      } else {
        await playerAssessmentService.create(playerPublicId, payload);
        toast.success("Assessment saved successfully");
      }
      isDirtyRef.current = false;
      setAutoSaveStatus("idle");
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

  const isCompact = viewMode === "compact";

  const showBatting =
    playerRole === "BATSMEN" ||
    playerRole === "ALL_ROUNDER" ||
    playerRole === "WICKET_KEEPER";
  const showBowling = playerRole === "BOWLER" || playerRole === "ALL_ROUNDER";
  const showWK = playerRole === "WICKET_KEEPER";

  // ─── PER-CATEGORY COMPLETION COUNTS ───────────────────

  function countSkills(
    data: Record<string, SkillEntry> | undefined,
    skills: string[],
  ): { rated: number; total: number } {
    let rated = 0;
    skills.forEach((s) => { if ((data as any)?.[s]?.rating) rated++; });
    return { rated, total: skills.length };
  }

  const tabCounts = (() => {
    // Cricket
    let cRated = 0, cTotal = 0;
    if (showBatting) {
      [
        [cricketSkills.batting?.basics, BATTING_SKILLS.basics],
        [cricketSkills.batting?.intermediate, BATTING_SKILLS.intermediate],
        [cricketSkills.batting?.advanced, BATTING_SKILLS.advanced],
      ].forEach(([d, l]) => {
        const c = countSkills(d as Record<string, SkillEntry>, l as string[]);
        cRated += c.rated; cTotal += c.total;
      });
    }
    if (showBowling) {
      [
        [cricketSkills.bowling?.basics, BOWLING_SKILLS.basics],
        [cricketSkills.bowling?.intermediate, BOWLING_SKILLS.intermediate],
        [cricketSkills.bowling?.advanced, BOWLING_SKILLS.advanced],
      ].forEach(([d, l]) => {
        const c = countSkills(d as Record<string, SkillEntry>, l as string[]);
        cRated += c.rated; cTotal += c.total;
      });
    }
    if (showWK) {
      [
        [cricketSkills.wicketKeeping?.basics, WICKET_KEEPING_SKILLS.basics],
        [cricketSkills.wicketKeeping?.intermediate, WICKET_KEEPING_SKILLS.intermediate],
        [cricketSkills.wicketKeeping?.advanced, WICKET_KEEPING_SKILLS.advanced],
      ].forEach(([d, l]) => {
        const c = countSkills(d as Record<string, SkillEntry>, l as string[]);
        cRated += c.rated; cTotal += c.total;
      });
    }

    // Fielding
    let fRated = 0, fTotal = 0;
    [
      [fielding.common?.basics, COMMON_FIELDING_SKILLS.basics],
      [fielding.common?.intermediate, COMMON_FIELDING_SKILLS.intermediate],
      [fielding.common?.advanced, COMMON_FIELDING_SKILLS.advanced],
    ].forEach(([d, l]) => {
      const c = countSkills(d as Record<string, SkillEntry>, l as string[]);
      fRated += c.rated; fTotal += c.total;
    });
    if (showWK) {
      [
        [fielding.wicketKeeping?.basics, WK_FIELDING_SKILLS.basics],
        [fielding.wicketKeeping?.intermediate, WK_FIELDING_SKILLS.intermediate],
        [fielding.wicketKeeping?.advanced, WK_FIELDING_SKILLS.advanced],
      ].forEach(([d, l]) => {
        const c = countSkills(d as Record<string, SkillEntry>, l as string[]);
        fRated += c.rated; fTotal += c.total;
      });
    }

    // Fitness
    let fitRated = 0, fitTotal = 0;
    const allFitnessCategories = {
      ...FITNESS_PHYSICAL,
      ...FITNESS_PERFORMANCE,
      ...FITNESS_HEALTH,
      ...FITNESS_MOBILITY,
      ...FITNESS_REHAB,
    };
    Object.entries(allFitnessCategories).forEach(([cat, skills]) => {
      const c = countSkills(
        (fitness as any)[cat] as Record<string, SkillEntry>,
        skills,
      );
      fitRated += c.rated; fitTotal += c.total;
    });

    // Diet
    let dRated = 0, dTotal = 0;
    Object.entries(DIET_FIELDS).forEach(([cat, skills]) => {
      const c = countSkills(
        (diet as any)[cat] as Record<string, SkillEntry>,
        skills,
      );
      dRated += c.rated; dTotal += c.total;
    });

    // Mental
    let mRated = 0, mTotal = 0;
    Object.entries(MENTAL_CATEGORIES).forEach(([cat, skills]) => {
      const c = countSkills(
        (mental as any)[cat] as Record<string, SkillEntry>,
        skills,
      );
      mRated += c.rated; mTotal += c.total;
    });

    return {
      cricket: { rated: cRated, total: cTotal },
      fielding: { rated: fRated, total: fTotal },
      fitness: { rated: fitRated, total: fitTotal },
      diet: { rated: dRated, total: dTotal },
      mental: { rated: mRated, total: mTotal },
    };
  })();

  return (
    <div className="space-y-6">
      {/* ─── HEADER ────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-lg font-bold text-slate-900">
            {isEdit
              ? "Edit Assessment"
              : isFollowUp
                ? "Quick Follow-up"
                : "New Assessment"}
          </h2>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Autosave status indicator */}
            {autoSaveStatus === "saving" && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin" />
                Saving…
              </span>
            )}
            {autoSaveStatus === "saved" && lastAutoSavedAt && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle size={12} />
                Draft saved {formatTimeAgo(lastAutoSavedAt)}
              </span>
            )}
            {autoSaveStatus === "error" && (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle size={12} />
                Autosave failed
              </span>
            )}
            {/* View mode toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
              <button
                type="button"
                data-testid="view-mode-detailed"
                onClick={() => setViewMode("detailed")}
                className={`px-3 py-1.5 transition-all ${
                  viewMode === "detailed"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                Detailed
              </button>
              <button
                type="button"
                data-testid="view-mode-compact"
                onClick={() => setViewMode("compact")}
                className={`px-3 py-1.5 border-l border-slate-200 transition-all ${
                  viewMode === "compact"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                Quick Rate
              </button>
            </div>
          </div>
        </div>
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
        {TABS.map((tab) => {
          const cnt = tabCounts[tab.key as keyof typeof tabCounts];
          const allDone = cnt.rated === cnt.total && cnt.total > 0;
          return (
            <button
              key={tab.key}
              type="button"
              data-testid={`tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {cnt.total > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key
                      ? allDone
                        ? "bg-white/30 text-white"
                        : "bg-white/20 text-white"
                      : allDone
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {cnt.rated}/{cnt.total}
                </span>
              )}
            </button>
          );
        })}
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
              <SectionCard title="Batting Basics" icon="🏏" compact={isCompact}>
                {BATTING_SKILLS.basics.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(cricketSkills.batting?.basics as Record<string, SkillEntry>, s)}
                    onChange={(e) => updateBattingSkill("basics", s, e)}
                    previousRating={previousAssessment?.cricketSkills?.batting?.basics?.[s]?.rating}
                  compact={isCompact}
                  />
                ))}
              </SectionCard>

              <TierHeader tier="Intermediate" label="Body Mechanics" />
              <SectionCard title="Batting Intermediate" icon="⚡" compact={isCompact}>
                {BATTING_SKILLS.intermediate.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(cricketSkills.batting?.intermediate as Record<string, SkillEntry>, s)}
                    onChange={(e) => updateBattingSkill("intermediate", s, e)}
                    commentRows={2}
                    previousRating={previousAssessment?.cricketSkills?.batting?.intermediate?.[s]?.rating}
                  compact={isCompact}
                  />
                ))}
              </SectionCard>

              <TierHeader tier="Advanced" label="High Performance" />
              <SectionCard title="Batting Advanced" icon="🔥" compact={isCompact}>
                {BATTING_SKILLS.advanced.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(cricketSkills.batting?.advanced as Record<string, SkillEntry>, s)}
                    onChange={(e) => updateBattingSkill("advanced", s, e)}
                    commentRows={2}
                    previousRating={previousAssessment?.cricketSkills?.batting?.advanced?.[s]?.rating}
                  compact={isCompact}
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
              <SectionCard title="Bowling Basics" icon="🎯" compact={isCompact}>
                {BOWLING_SKILLS.basics.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(cricketSkills.bowling?.basics as Record<string, SkillEntry>, s)}
                    onChange={(e) => updateBowlingSkill("basics", s, e)}
                    previousRating={previousAssessment?.cricketSkills?.bowling?.basics?.[s]?.rating}
                  compact={isCompact}
                  />
                ))}
              </SectionCard>

              <TierHeader tier="Intermediate" label="Bowling Mechanics" />
              <SectionCard title="Bowling Intermediate" icon="⚡" compact={isCompact}>
                {BOWLING_SKILLS.intermediate.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(cricketSkills.bowling?.intermediate as Record<string, SkillEntry>, s)}
                    onChange={(e) => updateBowlingSkill("intermediate", s, e)}
                    commentRows={2}
                    previousRating={previousAssessment?.cricketSkills?.bowling?.intermediate?.[s]?.rating}
                  compact={isCompact}
                  />
                ))}
              </SectionCard>

              <TierHeader tier="Advanced" label="Advanced Bowling" />
              <SectionCard title="Bowling Advanced" icon="🔥" compact={isCompact}>
                {BOWLING_SKILLS.advanced.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(cricketSkills.bowling?.advanced as Record<string, SkillEntry>, s)}
                    onChange={(e) => updateBowlingSkill("advanced", s, e)}
                    commentRows={2}
                    previousRating={previousAssessment?.cricketSkills?.bowling?.advanced?.[s]?.rating}
                  compact={isCompact}
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
                      entry={getSkill(cricketSkills.bowling?.advanced as Record<string, SkillEntry>, spinType)}
                      onChange={(e) => updateBowlingSkill("advanced", spinType, e)}
                      commentRows={2}
                      previousRating={previousAssessment?.cricketSkills?.bowling?.advanced?.[spinType]?.rating}
                    compact={isCompact}
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
              <SectionCard title="Wicket Keeping Basics" icon="🧤" compact={isCompact}>
                {WICKET_KEEPING_SKILLS.basics.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(cricketSkills.wicketKeeping?.basics as Record<string, SkillEntry>, s)}
                    onChange={(e) => updateWKSkill("basics", s, e)}
                    previousRating={previousAssessment?.cricketSkills?.wicketKeeping?.basics?.[s]?.rating}
                  compact={isCompact}
                  />
                ))}
              </SectionCard>

              <TierHeader tier="Intermediate" label="Keeping Mechanics" />
              <SectionCard title="Wicket Keeping Intermediate" icon="⚡" compact={isCompact}>
                {WICKET_KEEPING_SKILLS.intermediate.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(cricketSkills.wicketKeeping?.intermediate as Record<string, SkillEntry>, s)}
                    onChange={(e) => updateWKSkill("intermediate", s, e)}
                    commentRows={2}
                    previousRating={previousAssessment?.cricketSkills?.wicketKeeping?.intermediate?.[s]?.rating}
                  compact={isCompact}
                  />
                ))}
              </SectionCard>

              <TierHeader tier="Advanced" label="Advanced Keeping" />
              <SectionCard title="Wicket Keeping Advanced" icon="🔥" compact={isCompact}>
                {WICKET_KEEPING_SKILLS.advanced.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(cricketSkills.wicketKeeping?.advanced as Record<string, SkillEntry>, s)}
                    onChange={(e) => updateWKSkill("advanced", s, e)}
                    commentRows={2}
                    previousRating={previousAssessment?.cricketSkills?.wicketKeeping?.advanced?.[s]?.rating}
                  compact={isCompact}
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
          <SectionCard title="Fielding Basics" icon="🏃" compact={isCompact}>
            {COMMON_FIELDING_SKILLS.basics.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(fielding.common?.basics as Record<string, SkillEntry>, s)}
                onChange={(e) => updateCommonFieldingSkill("basics", s, e)}
                previousRating={previousAssessment?.fielding?.common?.basics?.[s]?.rating}
              compact={isCompact}
              />
            ))}
          </SectionCard>

          <TierHeader tier="Intermediate" label="Match Situations" />
          <SectionCard title="Fielding Intermediate" icon="⚡" compact={isCompact}>
            {COMMON_FIELDING_SKILLS.intermediate.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(fielding.common?.intermediate as Record<string, SkillEntry>, s)}
                onChange={(e) => updateCommonFieldingSkill("intermediate", s, e)}
                commentRows={2}
                previousRating={previousAssessment?.fielding?.common?.intermediate?.[s]?.rating}
              compact={isCompact}
              />
            ))}
          </SectionCard>

          <TierHeader tier="Advanced" label="Pressure Scenarios" />
          <SectionCard title="Fielding Advanced" icon="🔥" compact={isCompact}>
            {COMMON_FIELDING_SKILLS.advanced.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(fielding.common?.advanced as Record<string, SkillEntry>, s)}
                onChange={(e) => updateCommonFieldingSkill("advanced", s, e)}
                commentRows={2}
                previousRating={previousAssessment?.fielding?.common?.advanced?.[s]?.rating}
              compact={isCompact}
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
              <SectionCard title="WK Fielding Basics" icon="🧤" compact={isCompact}>
                {WK_FIELDING_SKILLS.basics.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(fielding.wicketKeeping?.basics as Record<string, SkillEntry>, s)}
                    onChange={(e) => updateWKFieldingSkill("basics", s, e)}
                    previousRating={previousAssessment?.fielding?.wicketKeeping?.basics?.[s]?.rating}
                  compact={isCompact}
                  />
                ))}
              </SectionCard>

              <TierHeader tier="Intermediate" label="Keeper Techniques" />
              <SectionCard title="WK Fielding Intermediate" icon="⚡" compact={isCompact}>
                {WK_FIELDING_SKILLS.intermediate.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(fielding.wicketKeeping?.intermediate as Record<string, SkillEntry>, s)}
                    onChange={(e) => updateWKFieldingSkill("intermediate", s, e)}
                    commentRows={2}
                    previousRating={previousAssessment?.fielding?.wicketKeeping?.intermediate?.[s]?.rating}
                  compact={isCompact}
                  />
                ))}
              </SectionCard>

              <TierHeader tier="Advanced" label="Advanced Keeper Skills" />
              <SectionCard title="WK Fielding Advanced" icon="🔥" compact={isCompact}>
                {WK_FIELDING_SKILLS.advanced.map((s) => (
                  <SkillRow
                    key={s}
                    label={s}
                    entry={getSkill(fielding.wicketKeeping?.advanced as Record<string, SkillEntry>, s)}
                    onChange={(e) => updateWKFieldingSkill("advanced", s, e)}
                    commentRows={2}
                    previousRating={previousAssessment?.fielding?.wicketKeeping?.advanced?.[s]?.rating}
                  compact={isCompact}
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
          {/* ── Physical Fitness ── */}
          <div className="text-sm font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-lg inline-block">
            💪 PHYSICAL FITNESS
          </div>

          <SectionCard title="Endurance" icon="🫁" compact={isCompact}>
            {FITNESS_PHYSICAL.endurance.map((s) => (
              <SkillRow key={s} label={s}
                entry={getSkill(fitness.endurance as Record<string, SkillEntry>, s)}
                onChange={(e) => updateFitnessSkill("endurance", s, e)}
                previousRating={previousAssessment?.fitness?.endurance?.[s]?.rating}
                compact={isCompact}
                measurement={MEASUREMENT_SKILLS[s]} />
            ))}
          </SectionCard>

          <SectionCard title="Speed & Agility" icon="💨" compact={isCompact}>
            {FITNESS_PHYSICAL.speedAgility.map((s) => (
              <SkillRow key={s} label={s}
                entry={getSkill(fitness.speedAgility as Record<string, SkillEntry>, s)}
                onChange={(e) => updateFitnessSkill("speedAgility", s, e)}
                previousRating={previousAssessment?.fitness?.speedAgility?.[s]?.rating}
                compact={isCompact}
                measurement={MEASUREMENT_SKILLS[s]} />
            ))}
          </SectionCard>

          <SectionCard title="Strength" icon="🏋️" compact={isCompact}>
            {FITNESS_PHYSICAL.strength.map((s) => (
              <SkillRow key={s} label={s}
                entry={getSkill(fitness.strength as Record<string, SkillEntry>, s)}
                onChange={(e) => updateFitnessSkill("strength", s, e)}
                previousRating={previousAssessment?.fitness?.strength?.[s]?.rating}
                compact={isCompact}
                measurement={MEASUREMENT_SKILLS[s]} />
            ))}
          </SectionCard>

          <SectionCard title="Flexibility" icon="🤸" compact={isCompact}>
            {FITNESS_PHYSICAL.flexibility.map((s) => (
              <SkillRow key={s} label={s}
                entry={getSkill(fitness.flexibility as Record<string, SkillEntry>, s)}
                onChange={(e) => updateFitnessSkill("flexibility", s, e)}
                previousRating={previousAssessment?.fitness?.flexibility?.[s]?.rating}
                compact={isCompact}
                measurement={MEASUREMENT_SKILLS[s]} />
            ))}
          </SectionCard>

          <SectionCard title="Body Metrics" icon="📊" compact={isCompact}>
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">Height (cm)</label>
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                  placeholder="—" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">Weight (kg)</label>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                  placeholder="—" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">BMI (auto)</label>
                <input type="text" disabled placeholder="—"
                  value={height && weight ? (parseFloat(weight) / (parseFloat(height) / 100) ** 2).toFixed(1) : ""}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-100 text-slate-600" />
              </div>
            </div>
          </SectionCard>

          {/* ── Performance Fitness ── */}
          <hr className="border-t-2 border-dashed border-slate-200 my-2" />
          <div className="text-sm font-bold text-purple-700 bg-purple-50 px-4 py-2 rounded-lg inline-block">
            ⚡ PERFORMANCE FITNESS
          </div>
          <SectionCard title="Athleticism Metrics" icon="🎯" compact={isCompact}>
            {FITNESS_PERFORMANCE.performanceFitness.map((s) => (
              <SkillRow key={s} label={s}
                entry={getSkill(fitness.performanceFitness as Record<string, SkillEntry>, s)}
                onChange={(e) => updateFitnessSkill("performanceFitness", s, e)}
                previousRating={previousAssessment?.fitness?.performanceFitness?.[s]?.rating}
                compact={isCompact} />
            ))}
          </SectionCard>

          {/* ── Health & Wellness ── */}
          <hr className="border-t-2 border-dashed border-slate-200 my-2" />
          <div className="text-sm font-bold text-green-700 bg-green-50 px-4 py-2 rounded-lg inline-block">
            🌿 HEALTH & WELLNESS
          </div>
          <SectionCard title="Lifestyle & Recovery" icon="😴" compact={isCompact}>
            {FITNESS_HEALTH.healthWellness.map((s) => (
              <SkillRow key={s} label={s}
                entry={getSkill(fitness.healthWellness as Record<string, SkillEntry>, s)}
                onChange={(e) => updateFitnessSkill("healthWellness", s, e)}
                commentRows={2}
                previousRating={previousAssessment?.fitness?.healthWellness?.[s]?.rating}
                compact={isCompact} />
            ))}
          </SectionCard>

          {/* ── Movement & Mobility ── */}
          <hr className="border-t-2 border-dashed border-slate-200 my-2" />
          <div className="text-sm font-bold text-orange-700 bg-orange-50 px-4 py-2 rounded-lg inline-block">
            🔄 MOVEMENT & MOBILITY
          </div>
          <SectionCard title="Movement Quality" icon="🤸" compact={isCompact}>
            {FITNESS_MOBILITY.movementMobility.map((s) => (
              <SkillRow key={s} label={s}
                entry={getSkill(fitness.movementMobility as Record<string, SkillEntry>, s)}
                onChange={(e) => updateFitnessSkill("movementMobility", s, e)}
                previousRating={previousAssessment?.fitness?.movementMobility?.[s]?.rating}
                compact={isCompact} />
            ))}
          </SectionCard>

          {/* ── Rehab & Recovery ── */}
          <hr className="border-t-2 border-dashed border-slate-200 my-2" />
          <div className="text-sm font-bold text-red-700 bg-red-50 px-4 py-2 rounded-lg inline-block">
            🩹 REHAB & RECOVERY
          </div>
          <SectionCard title="Rehabilitation" icon="🏥" compact={isCompact}>
            <p className="text-[10px] text-slate-400 mb-3 px-1">
              Injury data is tracked in the Injuries section. Rate the player's compliance with the rehab protocol here.
            </p>
            {FITNESS_REHAB.rehabAndRecovery.map((s) => (
              <SkillRow key={s} label={s}
                entry={getSkill(fitness.rehabAndRecovery as Record<string, SkillEntry>, s)}
                onChange={(e) => updateFitnessSkill("rehabAndRecovery", s, e)}
                commentRows={2}
                previousRating={previousAssessment?.fitness?.rehabAndRecovery?.[s]?.rating}
                compact={isCompact} />
            ))}
          </SectionCard>
        </div>
      )}

      {/* ─── TAB: DIET ────────────────────────────────── */}
      {activeTab === "diet" && (
        <div className="space-y-4">
          <SectionCard title="Current Diet Assessment" icon="🍽️" compact={isCompact}>
            {DIET_FIELDS.currentAssessment.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(diet.currentAssessment as Record<string, SkillEntry>, s)}
                onChange={(e) => updateDietSkill("currentAssessment", s, e)}
                previousRating={previousAssessment?.diet?.currentAssessment?.[s]?.rating}
              compact={isCompact}
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

          <SectionCard title="Recommended Plan" icon="📋" compact={isCompact}>
            {DIET_FIELDS.recommendedPlan.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(diet.recommendedPlan as Record<string, SkillEntry>, s)}
                onChange={(e) => updateDietSkill("recommendedPlan", s, e)}
                commentRows={2}
                previousRating={previousAssessment?.diet?.recommendedPlan?.[s]?.rating}
              compact={isCompact}
              />
            ))}
          </SectionCard>

          <SectionCard title="Supplements (if any)" icon="💊" compact={isCompact}>
            <textarea
              value={supplements}
              onChange={(e) => setSupplements(e.target.value)}
              placeholder="Age-appropriate supplements if recommended..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </SectionCard>

          <SectionCard title="Coach / Nutritionist Notes" icon="📝" compact={isCompact}>
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
          <SectionCard title="Discipline" icon="🎯" compact={isCompact}>
            {MENTAL_CATEGORIES.discipline.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(mental.discipline as Record<string, SkillEntry>, s)}
                onChange={(e) => updateMentalSkill("discipline", s, e)}
                previousRating={previousAssessment?.mental?.discipline?.[s]?.rating}
              compact={isCompact}
              />
            ))}
          </SectionCard>

          <SectionCard title="Match Temperament" icon="🧠" compact={isCompact}>
            {MENTAL_CATEGORIES.matchTemperament.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(mental.matchTemperament as Record<string, SkillEntry>, s)}
                onChange={(e) => updateMentalSkill("matchTemperament", s, e)}
                commentRows={2}
                previousRating={previousAssessment?.mental?.matchTemperament?.[s]?.rating}
              compact={isCompact}
              />
            ))}
          </SectionCard>

          <SectionCard title="Team Behavior" icon="🤝" compact={isCompact}>
            {MENTAL_CATEGORIES.teamBehavior.map((s) => (
              <SkillRow
                key={s}
                label={s}
                entry={getSkill(mental.teamBehavior as Record<string, SkillEntry>, s)}
                onChange={(e) => updateMentalSkill("teamBehavior", s, e)}
                previousRating={previousAssessment?.mental?.teamBehavior?.[s]?.rating}
              compact={isCompact}
              />
            ))}
          </SectionCard>

          <SectionCard title="Goal Tracking" icon="🎯" compact={isCompact}>
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
