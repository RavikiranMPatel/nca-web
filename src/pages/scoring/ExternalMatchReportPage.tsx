import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit2, Save, Plus, X } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  getMatch,
  getTeams,
  getPlayingXI,
  setTeams,
  getBranchPlayers,
  patchMatchNotes,
  patchExternalMatchDetails,
  getMatchPerformances,
} from "../../api/scoring/matchApi";
import type { CricketMatch, CricketTeam, MatchTeamPlayer, PlayerOption, PlayerSelection, KeyMoment } from "../../types/match";
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

// ── Section header ────────────────────────────────────────────────────────────
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

// ── Chip select ───────────────────────────────────────────────────────────────
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
          {summary && (
            <div className="text-xs text-gray-400">{summary}</div>
          )}
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ExternalMatchReportPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<CricketMatch | null>(null);
  const [teams, setTeamsState] = useState<CricketTeam[]>([]);
  const [teamAPlayers, setTeamAPlayers] = useState<MatchTeamPlayer[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<MatchTeamPlayer[]>([]);
  const [performances, setPerformances] = useState<MatchPerformanceResponse[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Team XI picker state (for matches without teams yet)
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

  // Result banner editing
  const [editingResult, setEditingResult] = useState(false);
  const [resultType, setResultType] = useState("");
  const [resultDescription, setResultDescription] = useState("");
  const [savingResult, setSavingResult] = useState(false);

  // Ground conditions editing
  const [editingGround, setEditingGround] = useState(false);
  const [groundFields, setGroundFields] = useState({
    groundName: "",
    groundNumber: "",
    pitchType: "",
    pitchCondition: "",
    outfield: "",
    weather: "",
    matchFormat: "",
  });
  const [savingGround, setSavingGround] = useState(false);

  // Notes
  const [notes, setNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  // Key moments
  const [keyMoments, setKeyMoments] = useState<KeyMoment[]>([]);

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
      });
      setAllPlayers(
        (playersData as any[]).map((p: any) => ({
          publicId: p.publicId,
          displayName: p.displayName,
          battingStyle: p.battingStyle,
          bowlingStyle: p.bowlingStyle,
          playerRole: p.playerRole,
        })),
      );

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

  // ── Save result banner ──────────────────────────────────────────────────────
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

  const filteredA = allPlayers
    .filter((p) => !pickerBPlayers.some((s) => s.playerPublicId === p.publicId))
    .filter((p) => p.displayName.toLowerCase().includes(searchA.toLowerCase()));
  const filteredB = allPlayers
    .filter((p) => !pickerAPlayers.some((s) => s.playerPublicId === p.publicId))
    .filter((p) => p.displayName.toLowerCase().includes(searchB.toLowerCase()));

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
              External Match Report · {new Date(match.matchDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 max-w-2xl mx-auto space-y-4">

        {/* ── Result Banner ──────────────────────────────────────────────────── */}
        <Section title="Result">
          {editingResult ? (
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
              <div>
                {match.resultType ? (
                  <>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {RESULT_TYPES.find((r) => r.val === match.resultType)?.label ?? match.resultType}
                    </div>
                    {match.resultDescription && (
                      <p className="text-xs text-gray-500 mt-0.5">{match.resultDescription}</p>
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
          )}
        </Section>

        {/* ── Match Info ────────────────────────────────────────────────────── */}
        <Section title="Match Info">
          <div className="space-y-1 text-sm">
            {[
              { label: "Date", value: new Date(match.matchDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) },
              { label: "Format", value: match.matchFormat || match.totalOvers + " overs" },
              { label: "Venue", value: match.venue },
              { label: "Type", value: match.matchType?.replace(/_/g, " ") },
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
                ].map(({ label, value }) =>
                  value ? (
                    <div key={label} className="flex justify-between">
                      <span className="text-gray-400">{label}</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{value.replace(/_/g, " ")}</span>
                    </div>
                  ) : null,
                )}
                {!match.groundName && !match.pitchType && !match.weather && (
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
          <Section title="Key Moments">
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
        <Section title="Match Notes">
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

      </div>
    </div>
  );
}
