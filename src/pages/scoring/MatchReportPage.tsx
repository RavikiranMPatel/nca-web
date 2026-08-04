import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit2, Save, Plus, X, FileText, Trophy, Target, Zap, Users, BookOpen, TrendingUp, Activity, BarChart2, Download } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import {
  getMatch,
  getTeams,
  getPlayingXI,
  setTeams,
  getBranchPlayers,
  patchMatchNotes,
  patchExternalMatchDetails,
  getMatchPerformances,
  getMatchInnings,
  patchTeamChecklists,
  patchIndividualObservations,
  patchLessonsLearned,
} from "../../api/scoring/matchApi";
import type {
  CricketMatch,
  CricketTeam,
  MatchTeamPlayer,
  PlayerOption,
  PlayerSelection,
  KeyMoment,
  TeamChecklist,
  TeamPerformanceComments,
  IndividualObservation,
} from "../../types/match";
import KeyMomentsEditor from "../../components/scoring/KeyMomentsEditor";
import type { MatchPerformanceResponse } from "../../api/playerService/coachingService";
import {
  PlayerCard,
  togglePlayer as doTogglePlayer,
  removePlayer as doRemovePlayer,
  toggleRole as doToggleRole,
  toggleForeign as doToggleForeign,
} from "../../components/scoring/PlayerPicker";
import MatchForm from "../../components/coaching/MatchForm";

// ── Result type labels ────────────────────────────────────────────────────────
const RESULT_TYPES = [
  { val: "WON_BY_RUNS", label: "Won by Runs" },
  { val: "WON_BY_WICKETS", label: "Won by Wickets" },
  { val: "TIE", label: "Tie" },
  { val: "DRAW", label: "Draw" },
  { val: "NO_RESULT", label: "No Result" },
  { val: "ABANDONED", label: "Abandoned" },
];

// ── Ground condition options ──────────────────────────────────────────────────
const PITCH_TYPES = ["TURF", "RED_SOIL", "BLACK_SOIL", "MATTING", "ARTIFICIAL"];
const PITCH_CONDITIONS = ["GOOD", "SLOW", "FAST", "WORN", "DAMP", "UNEVEN"];
const OUTFIELD_CONDITIONS = ["FAST", "AVERAGE", "SLOW", "WET"];
const WEATHER_CONDITIONS = ["CLEAR", "OVERCAST", "HUMID", "WINDY", "RAIN_INTERRUPTED"];
const MATCH_FORMATS = ["T20", "T10", "ODI", "TEST", "THE_HUNDRED", "OTHER"];
const BOUNCE_OPTIONS = ["LOW", "MEDIUM", "HIGH", "VARIABLE"];
const SWING_OPTIONS = ["NONE", "CONVENTIONAL", "REVERSE", "BOTH"];
const SPIN_OPTIONS = ["NONE", "OFF_SPIN", "LEG_SPIN", "BOTH"];

// ── Review chip option pools ──────────────────────────────────────────────────
const BATTING_POSITIVES = [
  "Good partnerships", "Strong opening", "Clean hitting", "Good running",
  "Excellent sixes", "Controlled innings", "No panic", "Good intent",
  "Lower order contribution", "Rotated strike well",
];
const BATTING_IMPROVEMENTS = [
  "Too many dot balls", "Wicket clusters", "Slow scoring", "Poor running",
  "Lost top order early", "Poor shot selection", "Didn't rotate strike",
  "Missed boundary opportunities",
];
const BOWLING_POSITIVES = [
  "Good new ball", "Excellent yorkers", "Tight death bowling", "Regular wickets",
  "Good economy", "Spin partnership", "No extras", "Good variation",
  "Set good fields",
];
const BOWLING_IMPROVEMENTS = [
  "Too many wides", "No balls", "Expensive death bowling", "Loose deliveries",
  "Dropped catches", "No yorkers", "Poor variation", "Overstepped",
];
const FIELDING_POSITIVES = [
  "Sharp catching", "Good stops", "Direct hits", "Saved runs",
  "Good backing up", "Excellent ground fielding", "Quick returns",
];
const FIELDING_IMPROVEMENTS = [
  "Dropped catches", "Overthrows", "Poor backing up", "Missed run outs",
  "Slow to ball", "Poor communication", "Misfields",
];

// ── Section header ────────────────────────────────────────────────────────────
const Section = ({
  title,
  icon: Icon,
  iconColor = "text-gray-400",
  children,
}: {
  title: string;
  icon?: React.ElementType;
  iconColor?: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
      {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />}
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

// ── Single-select chip ────────────────────────────────────────────────────────
const ChipSelect = ({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => (
  <div className="flex flex-wrap gap-2">
    {placeholder && (
      <button
        onClick={() => onChange("")}
        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
          !value
            ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900"
            : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
        }`}
      >
        {placeholder}
      </button>
    )}
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt === value ? "" : opt)}
        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
          value === opt
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
        }`}
      >
        {opt.replace(/_/g, " ")}
      </button>
    ))}
  </div>
);

// ── Multi-select chip ─────────────────────────────────────────────────────────
const CHIP_SELECTED: Record<string, string> = {
  positive: "bg-green-600 text-white border-green-600",
  improvement: "bg-red-500 text-white border-red-500",
  default: "bg-blue-600 text-white border-blue-600",
};

const MultiChipSelect = ({
  options,
  value,
  onChange,
  variant = "default",
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  variant?: "positive" | "improvement" | "default";
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => {
      const selected = value.includes(opt);
      return (
        <button
          key={opt}
          onClick={() => onChange(selected ? value.filter((v) => v !== opt) : [...value, opt])}
          className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
            selected
              ? (CHIP_SELECTED[variant] ?? CHIP_SELECTED.default)
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
          }`}
        >
          {opt}
        </button>
      );
    })}
  </div>
);

// ── Result banner (shared display for all dataSource types) ───────────────────
interface InningsLine {
  teamName: string;
  runs: number;
  wickets: number;
  balls: number;
  target?: number;
}
interface ResultBannerProps {
  innings: InningsLine[];
  resultDescription?: string;
  toss?: { winnerName: string; decision: string };
  playerOfMatch?: string;
}
const ResultBanner = ({ innings, resultDescription, toss, playerOfMatch }: ResultBannerProps) => {
  if (!innings.length && !resultDescription) return null;
  return (
    <div className="space-y-1">
      {innings.map((inn, i) => (
        <div key={i} className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 min-w-0 truncate">
            {inn.teamName}
          </span>
          <span className="text-base font-bold text-gray-900 dark:text-white flex-shrink-0">
            {inn.runs}/{inn.wickets}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0">
            ({Math.floor(inn.balls / 6)}.{inn.balls % 6} ov)
            {inn.target ? ` T:${inn.target}` : ""}
          </span>
        </div>
      ))}
      {resultDescription && (
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">{resultDescription}</p>
      )}
      {toss && (
        <p className="text-xs text-gray-400 mt-0.5">
          {toss.winnerName} won toss · elected to {toss.decision.toLowerCase()} first
        </p>
      )}
      {playerOfMatch && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
          🏅 Player of the match: {playerOfMatch}
        </p>
      )}
    </div>
  );
};

// ── Player performance row ────────────────────────────────────────────────────
const PerformanceRow = ({
  player,
  perf,
  onLog,
}: {
  player: MatchTeamPlayer;
  perf?: MatchPerformanceResponse;
  onLog: () => void;
}) => {
  const hasPerf = !!perf;
  const batting = perf?.battingStats as any;
  const bowling = perf?.bowlingStats as any;

  const summary = hasPerf
    ? [
        batting?.runs != null ? `${batting.runs}${batting.dismissalType ? "*" : ""} (${batting.balls ?? "?"})` : null,
        bowling?.wickets != null ? `${bowling.wickets}/${bowling.runsConceded ?? "?"}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || perf!.playerRole
    : null;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">
          {player.displayName.charAt(0)}
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {player.displayName}
            {player.isCaptain && <span className="ml-1 text-xs text-yellow-600">(C)</span>}
            {player.isWicketkeeper && <span className="ml-1 text-xs text-green-600">(WK)</span>}
          </div>
          {summary && <div className="text-xs text-gray-400">{summary}</div>}
        </div>
      </div>
      <button
        onClick={onLog}
        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all active:scale-95 ${
          hasPerf
            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700"
            : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700"
        }`}
      >
        {hasPerf ? "Edit" : "+ Log"}
      </button>
    </div>
  );
};

// ── Discipline review card ────────────────────────────────────────────────────
const DisciplineReview = ({
  discipline,
  positives,
  improvements,
  comment,
  posOptions,
  impOptions,
  onPositivesChange,
  onImprovementsChange,
  onCommentChange,
  saving,
  onSave,
}: {
  discipline: string;
  positives: string[];
  improvements: string[];
  comment: string;
  posOptions: string[];
  impOptions: string[];
  onPositivesChange: (v: string[]) => void;
  onImprovementsChange: (v: string[]) => void;
  onCommentChange: (v: string) => void;
  saving: boolean;
  onSave: () => void;
}) => (
  <div className="space-y-4">
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
        <label className="text-xs font-semibold text-green-700 dark:text-green-400">
          Positives {positives.length > 0 && <span className="ml-1 text-green-500">({positives.length})</span>}
        </label>
      </div>
      <MultiChipSelect options={posOptions} value={positives} onChange={onPositivesChange} variant="positive" />
    </div>
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
        <label className="text-xs font-semibold text-red-600 dark:text-red-400">
          Improvements {improvements.length > 0 && <span className="ml-1 text-red-400">({improvements.length})</span>}
        </label>
      </div>
      <MultiChipSelect options={impOptions} value={improvements} onChange={onImprovementsChange} variant="improvement" />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        Coach Comment
      </label>
      <textarea
        rows={3}
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        placeholder={`${discipline} coach observations…`}
        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    </div>
    <button
      onClick={onSave}
      disabled={saving}
      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl font-medium disabled:opacity-50"
    >
      <Save className="w-3.5 h-3.5" />
      {saving ? "Saving…" : `Save ${discipline} Review`}
    </button>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MatchReportPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<CricketMatch | null>(null);
  const [teams, setTeamsState] = useState<CricketTeam[]>([]);
  const [teamAPlayers, setTeamAPlayers] = useState<MatchTeamPlayer[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<MatchTeamPlayer[]>([]);
  const [performances, setPerformances] = useState<MatchPerformanceResponse[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [innings, setInnings] = useState<Array<{
    inningsNumber: number; status: string; totalRuns: number; totalWickets: number;
    totalBalls: number; target?: number; battingTeamPublicId: string; bowlingTeamPublicId: string;
  }>>([]);

  // Team XI picker state
  const [pickerAPlayers, setPickerAPlayers] = useState<PlayerSelection[]>([]);
  const [pickerBPlayers, setPickerBPlayers] = useState<PlayerSelection[]>([]);
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");
  const [teamAGuestName, setTeamAGuestName] = useState("");
  const [teamBGuestName, setTeamBGuestName] = useState("");
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [savingTeams, setSavingTeams] = useState(false);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [pickerError, setPickerError] = useState("");

  // Performance form
  const [logTarget, setLogTarget] = useState<{ player: MatchTeamPlayer; existingPublicId?: string } | null>(null);

  // Result banner editing (EXTERNAL only)
  const [editingResult, setEditingResult] = useState(false);
  const [resultType, setResultType] = useState("");
  const [resultDescription, setResultDescription] = useState("");
  const [savingResult, setSavingResult] = useState(false);

  // Ground conditions editing
  const [editingGround, setEditingGround] = useState(false);
  const [groundFields, setGroundFields] = useState({
    groundName: "", groundNumber: "", pitchType: "", pitchCondition: "",
    outfield: "", weather: "", matchFormat: "", bounce: "", swingAvailable: "", spinAvailable: "",
  });
  const [savingGround, setSavingGround] = useState(false);

  // Notes
  const [notes, setNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  // Key moments
  const [keyMoments, setKeyMoments] = useState<KeyMoment[]>([]);

  // Team checklists — per discipline
  const [battingPositives, setBattingPositives] = useState<string[]>([]);
  const [battingImprovements, setBattingImprovements] = useState<string[]>([]);
  const [battingComment, setBattingComment] = useState("");
  const [bowlingPositives, setBowlingPositives] = useState<string[]>([]);
  const [bowlingImprovements, setBowlingImprovements] = useState<string[]>([]);
  const [bowlingComment, setBowlingComment] = useState("");
  const [fieldingPositives, setFieldingPositives] = useState<string[]>([]);
  const [fieldingImprovements, setFieldingImprovements] = useState<string[]>([]);
  const [fieldingComment, setFieldingComment] = useState("");
  const [savingBatting, setSavingBatting] = useState(false);
  const [savingBowling, setSavingBowling] = useState(false);
  const [savingFielding, setSavingFielding] = useState(false);

  // Individual observations
  const [observations, setObservations] = useState<IndividualObservation[]>([]);
  const [savingObservations, setSavingObservations] = useState(false);

  // Lessons learned
  const [lessons, setLessons] = useState<string[]>([]);
  const [savingLessons, setSavingLessons] = useState(false);

  // PDF export
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!publicId) return;
    loadAll();
  }, [publicId]);

  const loadAll = async () => {
    if (!publicId) return;
    setLoading(true);
    try {
      const [matchData, playersData] = await Promise.all([
        getMatch(publicId),
        getBranchPlayers(),
      ]);
      setMatch(matchData);
      setNotes(matchData.notes ?? "");
      setKeyMoments(matchData.keyMoments ?? []);
      setResultType(matchData.resultType ?? "");
      setResultDescription(matchData.resultDescription ?? "");
      setGroundFields({
        groundName: matchData.groundName ?? "",
        groundNumber: matchData.groundNumber ?? "",
        pitchType: matchData.pitchType ?? "",
        pitchCondition: matchData.pitchCondition ?? "",
        outfield: matchData.outfield ?? "",
        weather: matchData.weather ?? "",
        matchFormat: matchData.matchFormat ?? "",
        bounce: matchData.bounce ?? "",
        swingAvailable: matchData.swingAvailable ?? "",
        spinAvailable: matchData.spinAvailable ?? "",
      });

      // Load team checklists
      setBattingPositives(matchData.positives?.batting ?? []);
      setBattingImprovements(matchData.improvements?.batting ?? []);
      setBattingComment(matchData.teamPerformanceComments?.batting ?? "");
      setBowlingPositives(matchData.positives?.bowling ?? []);
      setBowlingImprovements(matchData.improvements?.bowling ?? []);
      setBowlingComment(matchData.teamPerformanceComments?.bowling ?? "");
      setFieldingPositives(matchData.positives?.fielding ?? []);
      setFieldingImprovements(matchData.improvements?.fielding ?? []);
      setFieldingComment(matchData.teamPerformanceComments?.fielding ?? "");

      // Load individual observations & lessons
      setObservations(matchData.individualObservations ?? []);
      setLessons(matchData.lessonsLearned ?? []);

      setAllPlayers(
        (playersData as any[]).map((p: any) => ({
          publicId: p.publicId,
          displayName: p.displayName,
          battingStyle: p.battingStyle,
          bowlingStyle: p.bowlingStyle,
          playerRole: p.playerRole,
        })),
      );

      // Load innings for non-EXTERNAL matches (ResultBanner)
      if (matchData.dataSource !== "EXTERNAL") {
        getMatchInnings(publicId).then(setInnings).catch(() => {});
      }

      try {
        const fetchedTeams = await getTeams(publicId);
        setTeamsState(fetchedTeams);
        if (fetchedTeams.length >= 2) {
          setTeamAName(fetchedTeams.find((t) => t.teamType === "TEAM_A")?.name ?? "Team A");
          setTeamBName(fetchedTeams.find((t) => t.teamType === "TEAM_B")?.name ?? "Team B");
          const [xiA, xiB] = await Promise.all([
            getPlayingXI(publicId, fetchedTeams.find((t) => t.teamType === "TEAM_A")!.publicId),
            getPlayingXI(publicId, fetchedTeams.find((t) => t.teamType === "TEAM_B")!.publicId),
          ]);
          setTeamAPlayers(xiA);
          setTeamBPlayers(xiB);
        } else {
          setShowTeamPicker(true);
        }
      } catch {
        setShowTeamPicker(true);
      }

      try {
        const perfs = await getMatchPerformances(publicId);
        setPerformances(perfs);
      } catch {
        // non-fatal
      }
    } catch {
      toast.error("Failed to load match");
    } finally {
      setLoading(false);
    }
  };

  // ── Save teams ──────────────────────────────────────────────────────────────
  const handleSaveTeams = async () => {
    if (!publicId) return;
    setSavingTeams(true);
    setPickerError("");
    try {
      await setTeams(publicId, {
        teamAName,
        teamBName,
        teamAPlayers: pickerAPlayers,
        teamBPlayers: pickerBPlayers,
      });
      toast.success("Playing XI saved");
      setShowTeamPicker(false);
      const fetchedTeams = await getTeams(publicId);
      setTeamsState(fetchedTeams);
      const [xiA, xiB] = await Promise.all([
        getPlayingXI(publicId, fetchedTeams.find((t) => t.teamType === "TEAM_A")!.publicId),
        getPlayingXI(publicId, fetchedTeams.find((t) => t.teamType === "TEAM_B")!.publicId),
      ]);
      setTeamAPlayers(xiA);
      setTeamBPlayers(xiB);
    } catch (e: any) {
      setPickerError(e.response?.data?.message || "Failed to save teams");
    } finally {
      setSavingTeams(false);
    }
  };

  // ── Save result banner (EXTERNAL only) ─────────────────────────────────────
  const handleSaveResult = async () => {
    if (!publicId) return;
    setSavingResult(true);
    try {
      const updated = await patchExternalMatchDetails(publicId, {
        resultType: resultType || undefined,
        resultDescription: resultDescription || undefined,
      });
      setMatch(updated);
      setEditingResult(false);
      toast.success("Result saved");
    } catch {
      toast.error("Failed to save result");
    } finally {
      setSavingResult(false);
    }
  };

  // ── Save ground conditions ──────────────────────────────────────────────────
  const handleSaveGround = async () => {
    if (!publicId) return;
    setSavingGround(true);
    try {
      const updated = await patchExternalMatchDetails(publicId, groundFields);
      setMatch(updated);
      setEditingGround(false);
      toast.success("Ground conditions saved");
    } catch {
      toast.error("Failed to save ground conditions");
    } finally {
      setSavingGround(false);
    }
  };

  // ── Save notes ──────────────────────────────────────────────────────────────
  const handleSaveNotes = async () => {
    if (!publicId) return;
    setSavingNotes(true);
    try {
      await patchMatchNotes(publicId, notes);
      setEditingNotes(false);
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  // ── Save discipline review ──────────────────────────────────────────────────
  const makeSaveDiscipline = (
    discipline: "batting" | "bowling" | "fielding",
    setSaving: (v: boolean) => void,
  ) => async () => {
    if (!publicId) return;
    setSaving(true);
    try {
      const pos: TeamChecklist = {
        batting: discipline === "batting" ? battingPositives : (match?.positives?.batting ?? []),
        bowling: discipline === "bowling" ? bowlingPositives : (match?.positives?.bowling ?? []),
        fielding: discipline === "fielding" ? fieldingPositives : (match?.positives?.fielding ?? []),
      };
      const imp: TeamChecklist = {
        batting: discipline === "batting" ? battingImprovements : (match?.improvements?.batting ?? []),
        bowling: discipline === "bowling" ? bowlingImprovements : (match?.improvements?.bowling ?? []),
        fielding: discipline === "fielding" ? fieldingImprovements : (match?.improvements?.fielding ?? []),
      };
      const comments: TeamPerformanceComments = {
        batting: discipline === "batting" ? battingComment : (match?.teamPerformanceComments?.batting ?? ""),
        bowling: discipline === "bowling" ? bowlingComment : (match?.teamPerformanceComments?.bowling ?? ""),
        fielding: discipline === "fielding" ? fieldingComment : (match?.teamPerformanceComments?.fielding ?? ""),
      };
      const updated = await patchTeamChecklists(publicId, {
        positives: pos,
        improvements: imp,
        teamPerformanceComments: comments,
      });
      setMatch(updated);
      toast.success(`${discipline.charAt(0).toUpperCase() + discipline.slice(1)} review saved`);
    } catch {
      toast.error("Failed to save review");
    } finally {
      setSaving(false);
    }
  };

  // ── Save individual observations ────────────────────────────────────────────
  const handleSaveObservations = async () => {
    if (!publicId) return;
    setSavingObservations(true);
    try {
      const updated = await patchIndividualObservations(publicId, observations.filter((o) => o.observation.trim()));
      setMatch(updated);
      setObservations(updated.individualObservations ?? []);
      toast.success("Observations saved");
    } catch {
      toast.error("Failed to save observations");
    } finally {
      setSavingObservations(false);
    }
  };

  // ── Save lessons learned ────────────────────────────────────────────────────
  const handleSaveLessons = async () => {
    if (!publicId) return;
    setSavingLessons(true);
    try {
      const updated = await patchLessonsLearned(publicId, lessons.filter((l) => l.trim()));
      setMatch(updated);
      setLessons(updated.lessonsLearned ?? []);
      toast.success("Lessons saved");
    } catch {
      toast.error("Failed to save lessons");
    } finally {
      setSavingLessons(false);
    }
  };

  // ── Download PDF ────────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!publicId) return;
    setDownloadingPdf(true);
    try {
      const res = await api.get(`/admin/cricket/matches/${publicId}/report.pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `match-report-${publicId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Report PDF downloaded");
    } catch {
      toast.error("Failed to download report PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ── After performance logged ────────────────────────────────────────────────
  const handlePerfSuccess = async () => {
    setLogTarget(null);
    if (!publicId) return;
    try {
      const perfs = await getMatchPerformances(publicId);
      setPerformances(perfs);
    } catch {
      // non-fatal
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Match not found</p>
      </div>
    );
  }

  const teamA = teams.find((t) => t.teamType === "TEAM_A");
  const teamB = teams.find((t) => t.teamType === "TEAM_B");
  const isExternal = match.dataSource === "EXTERNAL";

  const filteredA = allPlayers
    .filter((p) => !pickerBPlayers.some((s) => s.playerPublicId === p.publicId))
    .filter((p) => p.displayName.toLowerCase().includes(searchA.toLowerCase()));
  const filteredB = allPlayers
    .filter((p) => !pickerAPlayers.some((s) => s.playerPublicId === p.publicId))
    .filter((p) => p.displayName.toLowerCase().includes(searchB.toLowerCase()));

  // Build innings lines for ResultBanner (non-EXTERNAL)
  const inningsLines = innings.map((inn) => {
    const battingTeam = teams.find((t) => t.publicId === inn.battingTeamPublicId);
    return {
      teamName: battingTeam?.name ?? inn.battingTeamPublicId,
      runs: inn.totalRuns,
      wickets: inn.totalWickets,
      balls: inn.totalBalls,
      target: inn.target,
    };
  });

  // All playing XI for player dropdowns
  const allXIPlayers = [...teamAPlayers, ...teamBPlayers].filter((p) => !!p.playerPublicId);

  // ── Performance form modal ──────────────────────────────────────────────────
  if (logTarget) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setLogTarget(null)}
            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {logTarget.existingPublicId ? "Edit" : "Log"} Performance
            </div>
            <div className="text-xs text-gray-500">{logTarget.player.displayName}</div>
          </div>
        </div>
        <div className="px-4 pt-4 max-w-2xl mx-auto">
          <MatchForm
            playerPublicId={logTarget.player.playerPublicId ?? ""}
            matchPublicId={logTarget.existingPublicId}
            onSuccess={handlePerfSuccess}
            onCancel={() => setLogTarget(null)}
            defaultMatchDate={match.matchDate}
            defaultOppositionTeam={
              logTarget.player.battingOrder != null
                ? (teamAPlayers.some((p) => p.playerPublicId === logTarget.player.playerPublicId)
                    ? teamB?.name
                    : teamA?.name) ?? undefined
                : undefined
            }
            defaultVenue={match.venue}
            cricketMatchPublicId={publicId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/cricket/matches")}
            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {match.title}
            </h1>
            <p className="text-xs text-gray-500">
              Match Report · {new Date(match.matchDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg disabled:opacity-50 active:scale-95 transition-all"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5" />
            {downloadingPdf ? "…" : "PDF"}
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 max-w-2xl mx-auto space-y-4">

        {/* ── Result Banner ──────────────────────────────────────────────────── */}
        <Section title="Result" icon={Trophy} iconColor="text-yellow-500">
          {isExternal ? (
            editingResult ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Result Type
                  </label>
                  <ChipSelect
                    options={RESULT_TYPES.map((r) => r.val)}
                    value={resultType}
                    onChange={setResultType}
                    placeholder="— Not set —"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder='e.g. "Team A 145/6 (20) beat Team B 122/9 (20) by 23 runs"'
                    value={resultDescription}
                    onChange={(e) => setResultDescription(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveResult}
                    disabled={savingResult}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl font-medium disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingResult ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setResultType(match.resultType ?? "");
                      setResultDescription(match.resultDescription ?? "");
                      setEditingResult(false);
                    }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  {match.resultType ? (
                    <>
                      <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold ${
                        ["WON_BY_RUNS", "WON_BY_WICKETS"].includes(match.resultType)
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : ["TIE", "DRAW", "NO_RESULT"].includes(match.resultType)
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}>
                        {RESULT_TYPES.find((r) => r.val === match.resultType)?.label ?? match.resultType}
                      </span>
                      {match.resultDescription && (
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">{match.resultDescription}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">No result recorded yet</p>
                  )}
                </div>
                <button
                  onClick={() => setEditingResult(true)}
                  className="flex-shrink-0 p-2 rounded-lg bg-gray-100 dark:bg-gray-800"
                >
                  <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            )
          ) : (
            <ResultBanner
              innings={inningsLines}
              resultDescription={match.resultDescription}
            />
          )}
        </Section>

        {/* ── Match Info ────────────────────────────────────────────────────── */}
        <Section title="Match Info" icon={BarChart2} iconColor="text-gray-400">
          <div className="space-y-1 text-sm">
            {[
              { label: "Date", value: new Date(match.matchDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) },
              { label: "Format", value: match.matchFormat || match.totalOvers + " overs" },
              { label: "Venue", value: match.venue },
              { label: "Type", value: match.matchType?.replace(/_/g, " ") },
              { label: "Source", value: match.dataSource?.replace(/_/g, " ") },
            ].map(({ label, value }) =>
              value ? (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-400">{label}</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{value}</span>
                </div>
              ) : null,
            )}
          </div>
        </Section>

        {/* ── Ground Conditions ─────────────────────────────────────────────── */}
        <Section title="Ground Conditions">
          {editingGround ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ground Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. NCA Ground A"
                    value={groundFields.groundName}
                    onChange={(e) => setGroundFields((p) => ({ ...p, groundName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pitch No.</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Pitch 2"
                    value={groundFields.groundNumber}
                    onChange={(e) => setGroundFields((p) => ({ ...p, groundNumber: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Match Format</label>
                <ChipSelect options={MATCH_FORMATS} value={groundFields.matchFormat} onChange={(v) => setGroundFields((p) => ({ ...p, matchFormat: v }))} placeholder="— Not set —" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Pitch Type</label>
                <ChipSelect options={PITCH_TYPES} value={groundFields.pitchType} onChange={(v) => setGroundFields((p) => ({ ...p, pitchType: v }))} placeholder="— Not set —" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Pitch Condition</label>
                <ChipSelect options={PITCH_CONDITIONS} value={groundFields.pitchCondition} onChange={(v) => setGroundFields((p) => ({ ...p, pitchCondition: v }))} placeholder="— Not set —" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Outfield</label>
                <ChipSelect options={OUTFIELD_CONDITIONS} value={groundFields.outfield} onChange={(v) => setGroundFields((p) => ({ ...p, outfield: v }))} placeholder="— Not set —" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Weather</label>
                <ChipSelect options={WEATHER_CONDITIONS} value={groundFields.weather} onChange={(v) => setGroundFields((p) => ({ ...p, weather: v }))} placeholder="— Not set —" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Bounce</label>
                <ChipSelect options={BOUNCE_OPTIONS} value={groundFields.bounce} onChange={(v) => setGroundFields((p) => ({ ...p, bounce: v }))} placeholder="— Not set —" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Swing Available</label>
                <ChipSelect options={SWING_OPTIONS} value={groundFields.swingAvailable} onChange={(v) => setGroundFields((p) => ({ ...p, swingAvailable: v }))} placeholder="— Not set —" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Spin Available</label>
                <ChipSelect options={SPIN_OPTIONS} value={groundFields.spinAvailable} onChange={(v) => setGroundFields((p) => ({ ...p, spinAvailable: v }))} placeholder="— Not set —" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveGround}
                  disabled={savingGround}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl font-medium disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingGround ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setGroundFields({
                      groundName: match.groundName ?? "",
                      groundNumber: match.groundNumber ?? "",
                      pitchType: match.pitchType ?? "",
                      pitchCondition: match.pitchCondition ?? "",
                      outfield: match.outfield ?? "",
                      weather: match.weather ?? "",
                      matchFormat: match.matchFormat ?? "",
                      bounce: match.bounce ?? "",
                      swingAvailable: match.swingAvailable ?? "",
                      spinAvailable: match.spinAvailable ?? "",
                    });
                    setEditingGround(false);
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-xl font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 text-sm flex-1">
                {[
                  { label: "Ground", value: [match.groundName, match.groundNumber].filter(Boolean).join(", ") },
                  { label: "Pitch", value: [match.pitchType, match.pitchCondition].filter(Boolean).join(" · ") },
                  { label: "Outfield", value: match.outfield },
                  { label: "Weather", value: match.weather },
                  { label: "Bounce", value: match.bounce },
                  { label: "Swing", value: match.swingAvailable },
                  { label: "Spin", value: match.spinAvailable },
                ].map(({ label, value }) =>
                  value ? (
                    <div key={label} className="flex justify-between">
                      <span className="text-gray-400">{label}</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{value.replace(/_/g, " ")}</span>
                    </div>
                  ) : null,
                )}
                {!match.groundName && !match.pitchType && !match.weather && !match.bounce && (
                  <p className="text-sm text-gray-400">No conditions recorded</p>
                )}
              </div>
              <button
                onClick={() => setEditingGround(true)}
                className="flex-shrink-0 p-2 rounded-lg bg-gray-100 dark:bg-gray-800"
              >
                <Edit2 className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          )}
        </Section>

        {/* ── Playing XI + Performance Logging ─────────────────────────────── */}
        {showTeamPicker ? (
          <Section title="Set Playing XI">
            <div className="space-y-5">
              {pickerError && (
                <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                  {pickerError}
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tap <strong>C</strong> for captain, <strong>WK</strong> for keeper, <strong>✈</strong> for overseas.
              </p>

              {/* Team A */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Team A name"
                    value={teamAName}
                    onChange={(e) => setTeamAName(e.target.value)}
                  />
                  <span className="text-xs text-gray-400">{pickerAPlayers.length}/11</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
                    placeholder="Search players…"
                    value={searchA}
                    onChange={(e) => setSearchA(e.target.value)}
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      className="w-36 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
                      placeholder="Add guest…"
                      value={teamAGuestName}
                      onChange={(e) => setTeamAGuestName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && teamAGuestName.trim() && pickerAPlayers.length < 11) {
                          setPickerAPlayers((prev) => [...prev, { playerPublicId: "", externalName: teamAGuestName.trim(), battingOrder: prev.length + 1, isCaptain: false, isWicketkeeper: false, isImpactPlayer: false, isForeign: false }]);
                          setTeamAGuestName("");
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (teamAGuestName.trim() && pickerAPlayers.length < 11) {
                          setPickerAPlayers((prev) => [...prev, { playerPublicId: "", externalName: teamAGuestName.trim(), battingOrder: prev.length + 1, isCaptain: false, isWicketkeeper: false, isImpactPlayer: false, isForeign: false }]);
                          setTeamAGuestName("");
                        }
                      }}
                      className="px-3 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {filteredA.map((p) => (
                    <PlayerCard
                      key={p.publicId}
                      player={p}
                      selected={pickerAPlayers}
                      onToggle={() => doTogglePlayer(p, pickerAPlayers, setPickerAPlayers, new Set(), setPickerError)}
                      onRoleToggle={(role) => doToggleRole(p.publicId, role, pickerAPlayers, setPickerAPlayers)}
                      onForeignToggle={() => doToggleForeign(p.publicId, pickerAPlayers, setPickerAPlayers)}
                    />
                  ))}
                </div>
              </div>

              {/* Team B */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Team B name"
                    value={teamBName}
                    onChange={(e) => setTeamBName(e.target.value)}
                  />
                  <span className="text-xs text-gray-400">{pickerBPlayers.length}/11</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
                    placeholder="Search players…"
                    value={searchB}
                    onChange={(e) => setSearchB(e.target.value)}
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      className="w-36 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
                      placeholder="Add guest…"
                      value={teamBGuestName}
                      onChange={(e) => setTeamBGuestName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && teamBGuestName.trim() && pickerBPlayers.length < 11) {
                          setPickerBPlayers((prev) => [...prev, { playerPublicId: "", externalName: teamBGuestName.trim(), battingOrder: prev.length + 1, isCaptain: false, isWicketkeeper: false, isImpactPlayer: false, isForeign: false }]);
                          setTeamBGuestName("");
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (teamBGuestName.trim() && pickerBPlayers.length < 11) {
                          setPickerBPlayers((prev) => [...prev, { playerPublicId: "", externalName: teamBGuestName.trim(), battingOrder: prev.length + 1, isCaptain: false, isWicketkeeper: false, isImpactPlayer: false, isForeign: false }]);
                          setTeamBGuestName("");
                        }
                      }}
                      className="px-3 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {filteredB.map((p) => (
                    <PlayerCard
                      key={p.publicId}
                      player={p}
                      selected={pickerBPlayers}
                      onToggle={() => doTogglePlayer(p, pickerBPlayers, setPickerBPlayers, new Set(), setPickerError)}
                      onRoleToggle={(role) => doToggleRole(p.publicId, role, pickerBPlayers, setPickerBPlayers)}
                      onForeignToggle={() => doToggleForeign(p.publicId, pickerBPlayers, setPickerBPlayers)}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveTeams}
                disabled={savingTeams}
                className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
              >
                {savingTeams ? "Saving…" : "Save Playing XI"}
              </button>
            </div>
          </Section>
        ) : (
          <>
            {/* Team A performances */}
            {teamAPlayers.length > 0 && (
              <Section title={`${teamA?.name ?? "Team A"} — Performances`}>
                <div>
                  {teamAPlayers
                    .filter((p) => !!p.playerPublicId)
                    .map((p) => {
                      const perf = performances.find((pf) => pf.playerPublicId === p.playerPublicId);
                      return (
                        <PerformanceRow
                          key={p.mtpPublicId}
                          player={p}
                          perf={perf}
                          onLog={() => setLogTarget({ player: p, existingPublicId: perf?.publicId })}
                        />
                      );
                    })}
                  {teamAPlayers.filter((p) => !!p.playerPublicId).length === 0 && (
                    <p className="text-sm text-gray-400">No academy players in this team</p>
                  )}
                </div>
              </Section>
            )}

            {/* Team B performances */}
            {teamBPlayers.length > 0 && (
              <Section title={`${teamB?.name ?? "Team B"} — Performances`}>
                <div>
                  {teamBPlayers
                    .filter((p) => !!p.playerPublicId)
                    .map((p) => {
                      const perf = performances.find((pf) => pf.playerPublicId === p.playerPublicId);
                      return (
                        <PerformanceRow
                          key={p.mtpPublicId}
                          player={p}
                          perf={perf}
                          onLog={() => setLogTarget({ player: p, existingPublicId: perf?.publicId })}
                        />
                      );
                    })}
                  {teamBPlayers.filter((p) => !!p.playerPublicId).length === 0 && (
                    <p className="text-sm text-gray-400">No academy players in this team</p>
                  )}
                </div>
              </Section>
            )}

            {(teamAPlayers.length > 0 || teamBPlayers.length > 0) && (
              <button
                onClick={() => setShowTeamPicker(true)}
                className="text-xs text-blue-600 dark:text-blue-400 underline"
              >
                Edit Playing XI
              </button>
            )}
          </>
        )}

        {/* ── Key Moments ──────────────────────────────────────────────────── */}
        {publicId && (
          <Section title="Key Moments" icon={Zap} iconColor="text-yellow-500">
            <KeyMomentsEditor
              matchPublicId={publicId}
              initialMoments={keyMoments}
              playerOptions={[...teamAPlayers, ...teamBPlayers]
                .filter((p) => !!p.playerPublicId)
                .map((p) => ({ value: p.playerPublicId!, label: p.displayName }))}
            />
          </Section>
        )}

        {/* ── Match Notes ───────────────────────────────────────────────────── */}
        <Section title="Match Notes" icon={FileText} iconColor="text-blue-500">
          {editingNotes ? (
            <div className="space-y-3">
              <textarea
                rows={6}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key takeaways, coach observations…"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl font-medium disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingNotes ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setNotes(match.notes ?? "");
                    setEditingNotes(false);
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-xl font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {notes ? (
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{notes}</p>
                ) : (
                  <p className="text-sm text-gray-400">No notes yet</p>
                )}
              </div>
              <button
                onClick={() => setEditingNotes(true)}
                className="flex-shrink-0 p-2 rounded-lg bg-gray-100 dark:bg-gray-800"
              >
                <Edit2 className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          )}
        </Section>

        {/* ── Batting Review ────────────────────────────────────────────────── */}
        <Section title="Batting Review" icon={TrendingUp} iconColor="text-blue-500">
          <DisciplineReview
            discipline="Batting"
            positives={battingPositives}
            improvements={battingImprovements}
            comment={battingComment}
            posOptions={BATTING_POSITIVES}
            impOptions={BATTING_IMPROVEMENTS}
            onPositivesChange={setBattingPositives}
            onImprovementsChange={setBattingImprovements}
            onCommentChange={setBattingComment}
            saving={savingBatting}
            onSave={makeSaveDiscipline("batting", setSavingBatting)}
          />
        </Section>

        {/* ── Bowling Review ────────────────────────────────────────────────── */}
        <Section title="Bowling Review" icon={Activity} iconColor="text-purple-500">
          <DisciplineReview
            discipline="Bowling"
            positives={bowlingPositives}
            improvements={bowlingImprovements}
            comment={bowlingComment}
            posOptions={BOWLING_POSITIVES}
            impOptions={BOWLING_IMPROVEMENTS}
            onPositivesChange={setBowlingPositives}
            onImprovementsChange={setBowlingImprovements}
            onCommentChange={setBowlingComment}
            saving={savingBowling}
            onSave={makeSaveDiscipline("bowling", setSavingBowling)}
          />
        </Section>

        {/* ── Fielding Review ───────────────────────────────────────────────── */}
        <Section title="Fielding Review" icon={Target} iconColor="text-green-500">
          <DisciplineReview
            discipline="Fielding"
            positives={fieldingPositives}
            improvements={fieldingImprovements}
            comment={fieldingComment}
            posOptions={FIELDING_POSITIVES}
            impOptions={FIELDING_IMPROVEMENTS}
            onPositivesChange={setFieldingPositives}
            onImprovementsChange={setFieldingImprovements}
            onCommentChange={setFieldingComment}
            saving={savingFielding}
            onSave={makeSaveDiscipline("fielding", setSavingFielding)}
          />
        </Section>

        {/* ── Individual Observations ───────────────────────────────────────── */}
        <Section title="Individual Observations" icon={Users} iconColor="text-indigo-500">
          <div className="space-y-3">
            {allXIPlayers.length === 0 && observations.length === 0 ? (
              <div className="py-6 flex flex-col items-center gap-2 text-center">
                <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-400">Set your Playing XI to add individual observations</p>
              </div>
            ) : (
              <>
                {observations.map((obs, idx) => {
                  const playerName = obs.playerName || allXIPlayers.find((p) => p.playerPublicId === obs.playerPublicId)?.displayName || "";
                  const initial = playerName.charAt(0).toUpperCase();
                  return (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-1">
                        {initial || "?"}
                      </div>
                      <div className="flex-1 space-y-1">
                        <select
                          value={obs.playerPublicId}
                          onChange={(e) => {
                            const player = allXIPlayers.find((p) => p.playerPublicId === e.target.value);
                            setObservations((prev) =>
                              prev.map((o, i) =>
                                i === idx
                                  ? { ...o, playerPublicId: e.target.value, playerName: player?.displayName ?? "" }
                                  : o,
                              ),
                            );
                          }}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select player…</option>
                          {allXIPlayers.map((p) => (
                            <option key={p.playerPublicId} value={p.playerPublicId ?? ""}>
                              {p.displayName}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={obs.observation}
                          onChange={(e) =>
                            setObservations((prev) =>
                              prev.map((o, i) => (i === idx ? { ...o, observation: e.target.value } : o)),
                            )
                          }
                          placeholder="Observation…"
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        onClick={() => setObservations((prev) => prev.filter((_, i) => i !== idx))}
                        className="mt-1 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {allXIPlayers.length > 0 && (
                  <button
                    onClick={() =>
                      setObservations((prev) => [
                        ...prev,
                        { playerPublicId: "", playerName: "", observation: "" },
                      ])
                    }
                    className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add player
                  </button>
                )}
                <button
                  onClick={handleSaveObservations}
                  disabled={savingObservations}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl font-medium disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingObservations ? "Saving…" : "Save Observations"}
                </button>
              </>
            )}
          </div>
        </Section>

        {/* ── Lessons Learned ───────────────────────────────────────────────── */}
        <Section title="Lessons Learned" icon={BookOpen} iconColor="text-amber-500">
          <div className="space-y-3">
            {lessons.map((lesson, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <span className="text-xs text-gray-400 font-semibold w-5 flex-shrink-0">{idx + 1}.</span>
                <input
                  type="text"
                  value={lesson}
                  onChange={(e) =>
                    setLessons((prev) => prev.map((l, i) => (i === idx ? e.target.value : l)))
                  }
                  placeholder="What did we learn?"
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setLessons((prev) => prev.filter((_, i) => i !== idx))}
                  className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setLessons((prev) => [...prev, ""])}
              className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add lesson
            </button>
            <button
              onClick={handleSaveLessons}
              disabled={savingLessons}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl font-medium disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {savingLessons ? "Saving…" : "Save Lessons"}
            </button>
          </div>
        </Section>

        {/* ── Practice Focus ────────────────────────────────────────────────── */}
        {allXIPlayers.length > 0 && (
          <Section title="Practice Focus">
            <p className="text-xs text-gray-400 mb-3">
              Assign a practice session with drills for any player in today's match.
            </p>
            <div className="space-y-2">
              {allXIPlayers.map((p) => (
                <div
                  key={p.playerPublicId}
                  className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                      {p.displayName.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {p.displayName}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      navigate(`/admin/players/${p.playerPublicId}/coaching`)
                    }
                    className="text-xs px-3 py-1.5 rounded-lg font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700 active:scale-95 transition-all"
                  >
                    Assign Drill →
                  </button>
                </div>
              ))}
            </div>
          </Section>
        )}

      </div>
    </div>
  );
}
