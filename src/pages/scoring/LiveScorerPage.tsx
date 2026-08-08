import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  postBall,
  undoLastBall,
  getScoringState,
  getThisOver,
  awardPenalty,
  recordResult,
  swapBatters,
  correctBowler,
  editDelivery,
  getDeliveries,
  selectBatter,
  substitutePlayer,
  changeWicketkeeper,
  createAnnotation,
} from "../../api/scoring/scoringApi";
import { getMatch, getTeams, pauseMatch, resumeMatch } from "../../api/scoring/matchApi";
import type {
  BallResponse,
  BatterStatDTO,
  BowlerStatDTO,
  InningsState,
  BallDTO,
  ScoringPlayer,
  DeliveryRecord,
} from "../../types/scoring";
import type { CricketMatch, CricketTeam } from "../../types/match";
import api from "../../api/axios";
import WagonWheelModal from "./WagonWheelModal";

const fmtOvers = (balls: number, perOver = 6) =>
  `${Math.floor(balls / perOver)}.${balls % perOver}`;

const fmtCRR = (runs: number, balls: number, perOver = 6) => {
  if (balls === 0) return "0.00";
  return ((runs / balls) * perOver).toFixed(2);
};

const BallCircle = ({
  label,
  cls,
  empty,
}: {
  label: string;
  cls?: string;
  empty?: boolean;
}) => {
  const base =
    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-[1.5px]";
  if (empty)
    return (
      <div className={`${base} border-dashed border-gray-700 text-gray-700`}>
        ·
      </div>
    );
  const styles: Record<string, string> = {
    "b-dot": "bg-gray-800 border-gray-600 text-gray-400",
    "b-1": "bg-blue-900 border-blue-600 text-blue-300",
    "b-4": "bg-green-900 border-green-600 text-green-300",
    "b-6": "bg-purple-900 border-purple-500 text-purple-200",
    "b-wd": "bg-amber-900 border-amber-600 text-amber-300",
    "b-nb": "bg-orange-900 border-orange-600 text-orange-300",
    "b-wk": "bg-red-900 border-red-600 text-red-300",
  };
  return (
    <div className={`${base} ${styles[cls || "b-dot"] || styles["b-dot"]}`}>
      {label}
    </div>
  );
};

const DISMISSALS = [
  "Bowled",
  "Caught",
  "LBW",
  "Run Out",
  "Stumped",
  "Hit Wicket",
  "Retired Hurt",
  "Retired Out",
  "Obstructing Field",
];

const PlayerSelector = ({
  title,
  players,
  onSelect,
  exclude = [],
  searchValue,
  onSearchChange,
  onClose,
}: {
  title: string;
  players: ScoringPlayer[];
  onSelect: (p: ScoringPlayer) => void;
  exclude?: string[];
  searchValue: string;
  onSearchChange: (v: string) => void;
  onClose: () => void;
}) => {
  const filtered = players
    .filter((p) => !exclude.includes(p.publicId))
    .filter((p) =>
      (p.displayName ?? "").toLowerCase().includes(searchValue.toLowerCase()),
    );
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-end">
      <div className="w-full bg-gray-900 rounded-t-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white text-center">
            {title}
          </h3>
          <input
            autoFocus
            type="text"
            className="mt-3 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {filtered.map((p) => (
            <button
              key={p.publicId}
              onClick={() => {
                onSelect(p);
                onSearchChange("");
              }}
              className="w-full flex items-center gap-3 px-3 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-left active:scale-95 transition-all"
            >
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {p.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  {p.displayName}
                </div>
                {(p.battingStyle || p.playerRole) && (
                  <div className="text-xs text-gray-400">
                    {[
                      p.playerRole === "WK_BATSMAN"
                        ? "🧤 WK"
                        : p.playerRole === "BATSMAN"
                          ? "🏏 Bat"
                          : p.playerRole === "BOWLER"
                            ? "⚾ Bowl"
                            : p.playerRole === "ALL_ROUNDER"
                              ? "⭐ AR"
                              : null,
                      p.battingStyle,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-500">
              No players found
            </div>
          )}
        </div>
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-3 text-sm text-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const mapToBallDTO = (d: Record<string, unknown>): BallDTO => ({
  runsBatsman: d.runsBatsman as number,
  runsExtras: d.runsExtras as number,
  extraType: d.extraType as string | undefined,
  isWicket: d.isWicket as boolean,
  isLegalBall: d.isLegalBall as boolean,
  sequenceNumber: d.sequenceNumber as number,
  displayLabel: d.isWicket
    ? "W"
    : d.extraType === "WIDE"
      ? "Wd"
      : d.extraType === "NO_BALL"
        ? `Nb${(d.runsExtras as number) > 1 ? `+${(d.runsExtras as number) - 1}b` : ""}${(d.runsBatsman as number) > 0 ? `+${d.runsBatsman}` : ""}`
        : d.extraType === "LEG_BYE"
          ? `Lb${(d.runsExtras as number) > 1 ? d.runsExtras : ""}`
          : d.extraType === "BYE"
            ? `B${(d.runsExtras as number) > 1 ? d.runsExtras : ""}`
            : (d.runsBatsman as number) === 0
              ? "·"
              : String(d.runsBatsman),
  displayClass: d.isWicket
    ? "b-wk"
    : (d.runsBatsman as number) === 6
      ? "b-6"
      : (d.runsBatsman as number) === 4
        ? "b-4"
        : d.extraType === "WIDE"
          ? "b-wd"
          : d.extraType === "NO_BALL"
            ? "b-nb"
            : (d.runsBatsman as number) > 0
              ? "b-1"
              : "b-dot",
});

// At module level — not inside any function
const needsWagonWheel = (runs: number, extra?: string): boolean => {
  if (extra === "WIDE") return false;
  if (extra === "NO_BALL" && runs === 0) return false;
  return runs > 0;
};

export default function LiveScorerPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<CricketMatch | null>(null);
  const [teams, setTeams] = useState<CricketTeam[]>([]);
  const [innings, setInnings] = useState<InningsState | null>(null);
  const [thisOver, setThisOver] = useState<BallDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [lastOverNumber, setLastOverNumber] = useState(1);
  const [dismissedPlayerIds, setDismissedPlayerIds] = useState<Set<string>>(
    new Set(),
  );

  const [showPenalty, setShowPenalty] = useState(false);
  const [overJustEnded, setOverJustEnded] = useState(false);
  const [isWideDelivery, setIsWideDelivery] = useState(false);
  const [nbPickerRuns, setNbPickerRuns] = useState<number | null>(null);
  const [showNbSubPicker, setShowNbSubPicker] = useState(false);
  const [showFiveSevenPicker, setShowFiveSevenPicker] = useState(false);
  const [runOutEnd, setRunOutEnd] = useState<"striker" | "nonstriker" | null>(
    null,
  );
  const [pendingExtra, setPendingExtra] = useState<
    | "BYE"
    | "LEG_BYE"
    | "WIDE"
    | "NO_BALL_BYE"
    | "NO_BALL_LB"
    | "NO_BALL_RUNS"
    | null
  >(null);

  // ── Wagon wheel — read from localStorage (set during match setup) ──────────
  const wagonWheelEnabled = localStorage.getItem("nca_ww_enabled") !== "false";
  const [showWagonWheel, setShowWagonWheel] = useState(false);
  const [lastDeliveryPublicId, setLastDeliveryPublicId] = useState<
    string | null
  >(null);
  const [lastBallRuns, setLastBallRuns] = useState(0);

  // Partnership state
  const [partnershipRuns, setPartnershipRuns] = useState(0);
  const [partnershipBalls, setPartnershipBalls] = useState(0);

  const [bowlerOversMap, setBowlerOversMap] = useState<Record<string, number>>(
    {},
  );
  const [lastBowlerPublicId, setLastBowlerPublicId] = useState<string | null>(
    null,
  );
  const [battingTeamId, setBattingTeamId] = useState<string | null>(null);
  const [bowlingTeamId, setBowlingTeamId] = useState<string | null>(null);
  const [battingPlayers, setBattingPlayers] = useState<ScoringPlayer[]>([]);
  const [bowlingPlayers, setBowlingPlayers] = useState<ScoringPlayer[]>([]);
  const [striker, setStriker] = useState<ScoringPlayer | null>(null);
  const [nonStriker, setNonStriker] = useState<ScoringPlayer | null>(null);
  const [bowler, setBowler] = useState<ScoringPlayer | null>(null);
  const [batterStatsMap, setBatterStatsMap] = useState<
    Record<string, BatterStatDTO>
  >({});
  const [bowlerStatsMap, setBowlerStatsMap] = useState<
    Record<string, BowlerStatDTO>
  >({});
  const [showWicket, setShowWicket] = useState(false);
  const [showBatterSelect, setShowBatterSelect] = useState<
    "striker" | "nonstriker" | null
  >(null);
  const [showBowlerSelect, setShowBowlerSelect] = useState(false);
  const [showFielderSelect, setShowFielderSelect] = useState(false);
  const [showOverSummary, setShowOverSummary] = useState(false);
  const [showCloseInnings, setShowCloseInnings] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showPlayerSearch, setShowPlayerSearch] = useState("");
  const [dismissalType, setDismissalType] = useState("");
  const [dismissedPlayer, setDismissedPlayer] = useState<ScoringPlayer | null>(
    null,
  );
  const [fielder, setFielder] = useState<ScoringPlayer | null>(null);
  const [pendingRuns, setPendingRuns] = useState(0);
  const [isFreeHit, setIsFreeHit] = useState(false);
  const [resultType, setResultType] = useState("");
  const [resultMargin, setResultMargin] = useState("");
  const [resultDesc, setResultDesc] = useState("");
  const [lastOverBalls, setLastOverBalls] = useState<BallDTO[]>([]);
  const [lastOverRuns, setLastOverRuns] = useState(0);
  const [autoResult, setAutoResult] = useState<{
    resultType: string;
    resultMargin: number;
    resultDescription: string;
  } | null>(null);
  const [finalInningsState, setFinalInningsState] =
    useState<InningsState | null>(null);

  // ── Stage 4: swap / correct-bowler / edit-delivery ───────────────────────
  const [showCorrectBowler, setShowCorrectBowler] = useState(false);
  const [showBallHistory, setShowBallHistory] = useState(false);
  const [historyDeliveries, setHistoryDeliveries] = useState<DeliveryRecord[]>([]);
  const [editingDelivery, setEditingDelivery] = useState<DeliveryRecord | null>(null);
  const [editRuns, setEditRuns] = useState(0);
  const [editExtraRuns, setEditExtraRuns] = useState(0);
  const [editExtraType, setEditExtraType] = useState("");
  const [editDismissalType, setEditDismissalType] = useState("");
  const [editBowlerPid, setEditBowlerPid] = useState("");
  const [editBowlerName, setEditBowlerName] = useState("");
  const [editIsFreeHit, setEditIsFreeHit] = useState(false);
  const [showEditBowlerPicker, setShowEditBowlerPicker] = useState(false);

  // ── Stage 5: pause/resume ─────────────────────────────────────────────────
  const [matchPauseReason, setMatchPauseReason] = useState<string | null>(null);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReasonInput, setPauseReasonInput] = useState("");

  // ── Substitution ──────────────────────────────────────────────────────────
  // Tracks publicIds of MTPs that have been substituted out — excluded from
  // batter/bowler selection (same mechanism as dismissedPlayerIds).
  const [substitutedOutIds, setSubstitutedOutIds] = useState<Set<string>>(new Set());
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [subOriginalMtp, setSubOriginalMtp] = useState<ScoringPlayer | null>(null);
  const [subReasonInput, setSubReasonInput] = useState<string>("Injury");
  const [subPosting, setSubPosting] = useState(false);

  // ── WK change ─────────────────────────────────────────────────────────────
  const [showChangeWkModal, setShowChangeWkModal] = useState(false);
  const [wkSelectedPid, setWkSelectedPid] = useState<string>("");
  const [wkReason, setWkReason] = useState<string>("");
  const [wkPosting, setWkPosting] = useState(false);

  // ── Live annotations ──────────────────────────────────────────────────────
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [annotationText, setAnnotationText] = useState("");

  const loadingRef = useRef(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleSaveAnnotation = async () => {
    if (!matchId || !annotationText.trim()) return;
    try {
      await createAnnotation(matchId, annotationText.trim());
      showToast("Note saved");
      setAnnotationText("");
      setShowAnnotationForm(false);
    } catch {
      showToast("Failed to save note");
    }
  };

  const handleChangeWk = async () => {
    if (!matchId || !wkSelectedPid.trim()) return;
    setWkPosting(true);
    try {
      const updated = await changeWicketkeeper(matchId, wkSelectedPid.trim(), wkReason || undefined);
      applyBallResponse(updated);
      showToast("Wicketkeeper changed");
      setShowChangeWkModal(false);
      setWkSelectedPid("");
      setWkReason("");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || "Failed to change wicketkeeper");
    } finally {
      setWkPosting(false);
    }
  };

  const saveShotZone = async (zone: string) => {
    setShowWagonWheel(false);
    if (!lastDeliveryPublicId || !matchId) return;
    try {
      await api.patch(
        `/admin/cricket/matches/${matchId}/scoring/deliveries/${lastDeliveryPublicId}/shot-zone`,
        { shotZone: zone },
      );
    } catch {
      /* silent — shot zone is optional */
    }
    setLastDeliveryPublicId(null);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!matchId) return;
    loadAll();
  }, [matchId]);

  const loadAll = async () => {
    if (!matchId || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const [m, ts] = await Promise.all([getMatch(matchId), getTeams(matchId)]);
      setMatch(m);
      setMatchPauseReason(m.pauseReason ?? null);
      setTeams(ts as CricketTeam[]);

      const teamPlayers: Record<string, ScoringPlayer[]> = {};
      for (const team of ts as CricketTeam[]) {
        const xi = await api
          .get(
            `/admin/cricket/matches/${matchId}/teams/${team.publicId}/players`,
          )
          .then((r) => r.data as Record<string, unknown>[]);
        // Use mtpPublicId as the scoring identifier (works for both academy and guest players)
        // Collect substituted-out MTP publicIds to exclude from selection
        const subOutForTeam = xi
          .filter((mtp) => mtp.isSubstitutedOut)
          .map((mtp) => (mtp.mtpPublicId ?? mtp.playerPublicId) as string);
        if (subOutForTeam.length > 0) {
          setSubstitutedOutIds((prev) => new Set([...prev, ...subOutForTeam]));
        }

        teamPlayers[team.publicId] = xi
          .filter(
            (mtp) =>
              (mtp.mtpPublicId || mtp.playerPublicId) &&
              mtp.displayName &&
              !mtp.isSubstitutedOut,
          )
          .map((mtp) => ({
            publicId: (mtp.mtpPublicId ?? mtp.playerPublicId) as string,
            displayName: (mtp.isSubstitute
              ? `${mtp.displayName as string} (sub)`
              : (mtp.displayName as string)),
            battingStyle: mtp.battingStyle as string | undefined,
            bowlingStyle: mtp.bowlingStyle as string | undefined,
            isWicketkeeper: !!mtp.isWicketkeeper,
            isCaptain: !!mtp.isCaptain,
            playerRole: mtp.playerRole as string | undefined,
          }));
      }

      const inningsList = await api
        .get(`/admin/cricket/matches/${matchId}/innings`)
        .then((r) => r.data as Record<string, unknown>[])
        .catch(() => [] as Record<string, unknown>[]);

      const currentInnings = inningsList.find(
        (i) => i.status === "IN_PROGRESS",
      );

      // Capture player arrays locally — React state won't update until next render,
      // so we must use local variables when resolving publicIds immediately below.
      let localBattingPlayers: ScoringPlayer[] = [];
      let localBowlingPlayers: ScoringPlayer[] = [];

      if (currentInnings) {
        const batTeamId = currentInnings.battingTeamPublicId as string;
        const bowlTeamId = currentInnings.bowlingTeamPublicId as string;
        setBattingTeamId(batTeamId);
        setBowlingTeamId(bowlTeamId);
        localBattingPlayers = teamPlayers[batTeamId] ?? [];
        localBowlingPlayers = teamPlayers[bowlTeamId] ?? [];
        setBattingPlayers(localBattingPlayers);
        setBowlingPlayers(localBowlingPlayers);
      } else {
        const t0 = (ts as CricketTeam[])[0]?.publicId;
        const t1 = (ts as CricketTeam[])[1]?.publicId;
        setBattingTeamId(t0 ?? null);
        setBowlingTeamId(t1 ?? null);
        localBattingPlayers = teamPlayers[t0] ?? [];
        localBowlingPlayers = teamPlayers[t1] ?? [];
        setBattingPlayers(localBattingPlayers);
        setBowlingPlayers(localBowlingPlayers);
      }

      try {
        const state = await getScoringState(matchId);

        // Assign all server-authoritative state directly — no delivery replay.
        setInnings(state.inningsState);
        setIsFreeHit(state.isFreeHit ?? false);
        setPartnershipRuns(state.partnershipRuns ?? 0);
        setPartnershipBalls(state.partnershipBalls ?? 0);
        setDismissedPlayerIds(new Set(state.dismissedMtpPublicIds ?? []));
        setBatterStatsMap(state.batterStats ?? {});
        setBowlerStatsMap(state.bowlerStats ?? {});
        setLastBowlerPublicId(state.lastBowlerPublicId ?? null);
        setOverJustEnded(state.overJustEnded ?? false);

        const bpo = m.ballsPerOver ?? 6;
        const oversMap: Record<string, number> = {};
        for (const [pid, bs] of Object.entries(state.bowlerStats ?? {})) {
          oversMap[pid] = Math.floor(bs.legalBalls / bpo);
        }
        setBowlerOversMap(oversMap);

        // Resolve players using local vars — state updates are async.
        setStriker(
          state.currentStrikerPublicId
            ? (localBattingPlayers.find((p) => p.publicId === state.currentStrikerPublicId) ?? null)
            : null,
        );
        setNonStriker(
          state.currentNonStrikerPublicId
            ? (localBattingPlayers.find((p) => p.publicId === state.currentNonStrikerPublicId) ?? null)
            : null,
        );
        setBowler(
          state.currentBowlerPublicId
            ? (localBowlingPlayers.find((p) => p.publicId === state.currentBowlerPublicId) ?? null)
            : null,
        );

        await refreshOver();
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status !== 404) {
          // 404 = no active innings (normal for a fresh match); anything else = genuine failure
          setError("Failed to load scoring state — tap to retry");
        }
      }
    } catch {
      setError("Failed to load match");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // Applies all server-authoritative fields from a BallResponse to local state.
  // Must only be called after battingPlayers/bowlingPlayers are populated in state.
  const applyBallResponse = (state: BallResponse) => {
    setInnings(state.inningsState);
    setIsFreeHit(state.isFreeHit ?? false);
    setPartnershipRuns(state.partnershipRuns ?? 0);
    setPartnershipBalls(state.partnershipBalls ?? 0);
    setDismissedPlayerIds(new Set(state.dismissedMtpPublicIds ?? []));
    setBatterStatsMap(state.batterStats ?? {});
    setBowlerStatsMap(state.bowlerStats ?? {});
    setLastBowlerPublicId(state.lastBowlerPublicId ?? null);
    setOverJustEnded(state.overJustEnded ?? false);

    const bpo = match?.ballsPerOver ?? 6;
    const oversMap: Record<string, number> = {};
    for (const [pid, bs] of Object.entries(state.bowlerStats ?? {})) {
      oversMap[pid] = Math.floor(bs.legalBalls / bpo);
    }
    setBowlerOversMap(oversMap);

    setStriker(
      state.currentStrikerPublicId
        ? (battingPlayers.find((p) => p.publicId === state.currentStrikerPublicId) ?? null)
        : null,
    );
    setNonStriker(
      state.currentNonStrikerPublicId
        ? (battingPlayers.find((p) => p.publicId === state.currentNonStrikerPublicId) ?? null)
        : null,
    );
    setBowler(
      state.currentBowlerPublicId
        ? (bowlingPlayers.find((p) => p.publicId === state.currentBowlerPublicId) ?? null)
        : null,
    );

    if (state.inningsComplete) {
      if (state.inningsState.inningsNumber === 2) {
        setFinalInningsState(state.inningsState);
        setShowResult(true);
      } else {
        setShowCloseInnings(true);
      }
    }
  };

  const refreshOver = useCallback(async () => {
    if (!matchId) return;
    try {
      const over = await getThisOver(matchId);
      setThisOver(
        (over as unknown as Record<string, unknown>[]).map(mapToBallDTO),
      );
    } catch {
      /* silent */
    }
  }, [matchId]);

  const score = async (runs: number, extra?: string, extraRuns = 1) => {
    if (!matchId || !striker || !nonStriker || !bowler) {
      setError(
        overJustEnded
          ? "Over complete — select a new bowler before continuing"
          : "Set striker, non-striker and bowler first",
      );
      return;
    }
    if (posting) return;
    setPosting(true);
    setError("");

    const isLegalBall = !extra || !["WIDE", "NO_BALL"].includes(extra);

    const currentBallForSummary: BallDTO = {
      runsBatsman: runs,
      runsExtras: extra ? extraRuns : 0,
      extraType: extra,
      isWicket: false,
      isLegalBall,
      sequenceNumber: 0,
      displayLabel:
        extra === "WIDE"
          ? "Wd"
          : extra === "NO_BALL"
            ? `Nb${extraRuns > 1 ? `+${extraRuns - 1}b` : ""}${runs > 0 ? `+${runs}` : ""}`
            : extra === "LEG_BYE"
              ? `Lb${extraRuns > 1 ? extraRuns : ""}`
              : extra === "BYE"
                ? `B${extraRuns > 1 ? extraRuns : ""}`
                : runs === 0
                  ? "·"
                  : String(runs),
      displayClass:
        runs === 6
          ? "b-6"
          : runs === 4
            ? "b-4"
            : extra === "WIDE"
              ? "b-wd"
              : extra === "NO_BALL"
                ? "b-nb"
                : runs > 0
                  ? "b-1"
                  : "b-dot",
    };

    try {
      const state = await postBall(matchId, {
        bowlerPublicId: bowler.publicId,
        batsmanPublicId: striker.publicId,
        nonStrikerPublicId: nonStriker.publicId,
        runsBatsman: runs,
        runsExtras: extra ? extraRuns : 0,
        extraType: (extra ?? null) as
          | "WIDE"
          | "NO_BALL"
          | "LEG_BYE"
          | "BYE"
          | "PENALTY"
          | null
          | undefined,
        isWicket: false,
        isFreeHit,
      });

      // Over-strip: capture before clearing, then update or reset.
      if (state.overJustEnded) {
        const overSnap = [...thisOver, currentBallForSummary];
        setLastOverBalls(overSnap);
        setLastOverRuns(overSnap.reduce((s, b) => s + b.runsBatsman + b.runsExtras, 0));
        setLastOverNumber(innings?.overNumber ?? 1);
        setThisOver([]);
        setShowOverSummary(true);
        setShowBowlerSelect(true);
      } else {
        setThisOver((prev) => [...prev, currentBallForSummary]);
      }

      // Replace all local stat/rotation/player computation with server response.
      applyBallResponse(state);
      showToast("✓ Ball saved");

      if (wagonWheelEnabled && state.lastDeliveryPublicId && needsWagonWheel(runs, extra)) {
        setLastDeliveryPublicId(state.lastDeliveryPublicId);
        setLastBallRuns(runs);
        setShowWagonWheel(true);
      }
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : ((e as { response?: { data?: { message?: string } } })?.response
              ?.data?.message ?? "Failed to post ball");
      setError(msg);
    } finally {
      setPosting(false);
    }
  };

  const openWicket = (runs = 0) => {
    if (!striker || !nonStriker || !bowler) {
      setError(
        overJustEnded
          ? "Over complete — select a new bowler before continuing"
          : "Set striker, non-striker and bowler first",
      );
      return;
    }
    setPendingRuns(runs);
    setDismissedPlayer(striker);
    setShowWicket(true);
  };

  const confirmWicket = async () => {
    if (!dismissalType) { setError("Select dismissal type"); return; }
    if (!striker || !nonStriker) { setError("Select striker and non-striker first"); return; }
    if (!bowler) { setError("Select bowler first"); return; }
    if (!matchId) return;

    const wicketBallForSummary: BallDTO = {
      runsBatsman: isWideDelivery ? 0 : pendingRuns,
      runsExtras: isWideDelivery ? 1 : 0,
      extraType: isWideDelivery ? "WIDE" : undefined,
      isWicket: true,
      isLegalBall: !isWideDelivery,
      sequenceNumber: 0,
      displayLabel: "W",
      displayClass: "b-wk",
    };

    setPosting(true);
    setError("");
    try {
      const state = await postBall(matchId, {
        bowlerPublicId: bowler.publicId,
        batsmanPublicId: striker.publicId,
        nonStrikerPublicId: nonStriker.publicId,
        runsBatsman: isWideDelivery ? 0 : pendingRuns,
        runsExtras: isWideDelivery ? 1 : 0,
        extraType: isWideDelivery ? "WIDE" : null,
        isWicket: true,
        dismissalType: dismissalType.toUpperCase().replace(/ /g, "_"),
        dismissedPlayerPublicId: dismissedPlayer?.publicId,
        fielderPublicId: fielder?.publicId || undefined,
        isFreeHit,
      });

      setShowWicket(false);
      setDismissalType("");
      setDismissedPlayer(null);
      setFielder(null);
      setRunOutEnd(null);
      setIsWideDelivery(false);

      if (wagonWheelEnabled && state.lastDeliveryPublicId && pendingRuns > 0) {
        setLastDeliveryPublicId(state.lastDeliveryPublicId);
        setLastBallRuns(pendingRuns);
        setShowWagonWheel(true);
      }

      // Over-strip: capture before clearing, then update or reset.
      if (state.overJustEnded) {
        const overSnap = [...thisOver, wicketBallForSummary];
        setLastOverBalls(overSnap);
        setLastOverRuns(overSnap.reduce((s, b) => s + b.runsBatsman + b.runsExtras, 0));
        setLastOverNumber(innings?.overNumber ?? 1);
        setThisOver([]);
        setShowOverSummary(true);
        setShowBowlerSelect(true);
      } else {
        setThisOver((prev) => [...prev, wicketBallForSummary]);
      }

      // Replace all local stat/rotation/player computation with server response.
      // Server sets the dismissed position to null; we use that to decide which slot to fill.
      applyBallResponse(state);
      showToast("✓ Wicket saved");

      if (!state.inningsComplete) {
        const newDismissed = new Set(state.dismissedMtpPublicIds ?? []);
        if (!state.currentStrikerPublicId) {
          const survivingId = state.currentNonStrikerPublicId;
          const available = battingPlayers.filter(
            (p) => !newDismissed.has(p.publicId) && p.publicId !== survivingId,
          );
          if (available.length > 0) setShowBatterSelect("striker");
        } else if (!state.currentNonStrikerPublicId) {
          const survivingId = state.currentStrikerPublicId;
          const available = battingPlayers.filter(
            (p) => !newDismissed.has(p.publicId) && p.publicId !== survivingId,
          );
          if (available.length > 0) setShowBatterSelect("nonstriker");
        }
      }
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to record wicket";
      setError(msg);
    } finally {
      setPosting(false);
    }
  };

  const handleUndo = async () => {
    if (!matchId || posting) return;
    setPosting(true);
    setError("");
    try {
      const state = await undoLastBall(matchId);
      await refreshOver();
      // Close any open selector that may have been opened at an over/wicket boundary
      setShowBowlerSelect(false);
      setShowBatterSelect(null);
      applyBallResponse(state);
      showToast("✓ Undone");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Nothing to undo";
      setError(msg);
    } finally {
      setPosting(false);
    }
  };

  const handleCloseInnings = async () => {
    if (!matchId) return;
    setPosting(true);
    try {
      await api.post(`/admin/cricket/matches/${matchId}/innings/close`, {
        reason: "OVERS_COMPLETE",
      });
      setShowCloseInnings(false);
      setBattingTeamId(bowlingTeamId);
      setBowlingTeamId(battingTeamId);
      setBattingPlayers(bowlingPlayers);
      setBowlingPlayers(battingPlayers);
      setStriker(null);
      setNonStriker(null);
      setBowler(null);
      setThisOver([]);
      setIsFreeHit(false);
      setInnings(null);
      setDismissedPlayerIds(new Set());
      setBowlerOversMap({});
      setLastBowlerPublicId(null);
      setBatterStatsMap({});
      setBowlerStatsMap({});
      setPartnershipRuns(0);
      setPartnershipBalls(0);
      await loadAll();
      showToast("✓ Innings closed");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to close innings";
      setError(msg);
    } finally {
      setPosting(false);
    }
  };

  const handleSwapBatters = async () => {
    if (!matchId || posting) return;
    setPosting(true);
    setError("");
    try {
      const state = await swapBatters(matchId);
      applyBallResponse(state);
      showToast("✓ Ends swapped");
    } catch {
      setError("Failed to swap batters");
    } finally {
      setPosting(false);
    }
  };

  const handleCorrectBowler = async (p: ScoringPlayer) => {
    if (!matchId) return;
    setShowCorrectBowler(false);
    setPosting(true);
    setError("");
    try {
      const state = await correctBowler(matchId, p.publicId);
      applyBallResponse(state);
      showToast("✓ Bowler corrected");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to correct bowler";
      setError(msg);
    } finally {
      setPosting(false);
    }
  };

  const PAUSE_REASONS = [
    "Rain",
    "Bad Light",
    "Wet Outfield",
    "Lightning",
    "Crowd",
    "Medical Emergency",
    "Equipment Failure",
    "Other",
  ];

  const handlePauseMatch = async () => {
    if (!matchId) return;
    const reason = pauseReasonInput.trim() || "Delay";
    setPosting(true);
    setError("");
    try {
      const updated = await pauseMatch(matchId, reason);
      setMatchPauseReason(updated.pauseReason ?? reason);
      setMatch(updated);
      setShowPauseModal(false);
      setPauseReasonInput("");
      showToast(`⏸ Match paused — ${reason}`);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to pause match";
      setError(msg);
    } finally {
      setPosting(false);
    }
  };

  const handleResumeMatch = async () => {
    if (!matchId) return;
    setPosting(true);
    setError("");
    try {
      const updated = await resumeMatch(matchId);
      setMatchPauseReason(null);
      setMatch(updated);
      showToast("▶ Match resumed");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to resume match";
      setError(msg);
    } finally {
      setPosting(false);
    }
  };

  const loadBallHistory = async () => {
    if (!matchId) return;
    try {
      const raw = await getDeliveries(matchId);
      // Delivery entity booleans serialize without "is" prefix (Lombok getter → Jackson strips "is").
      // Access both keys for safety.
      const mapped: DeliveryRecord[] = [...raw]
        .reverse()
        .slice(0, 30)
        .map((d) => {
          const runs = d.runsBatsman ?? 0;
          const extra = d.extraType;
          const label = d.isWicket
            ? "W"
            : extra === "WIDE"
              ? "Wd"
              : extra === "NO_BALL"
                ? "Nb"
                : extra === "LEG_BYE"
                  ? "Lb"
                  : extra === "BYE"
                    ? "B"
                    : runs === 0
                      ? "·"
                      : String(runs);
          const cls = d.isWicket
            ? "b-wk"
            : runs === 6
              ? "b-6"
              : runs === 4
                ? "b-4"
                : extra === "WIDE"
                  ? "b-wd"
                  : extra === "NO_BALL"
                    ? "b-nb"
                    : runs > 0
                      ? "b-1"
                      : "b-dot";
          return {
            ...d,
            displayLabel: label,
            displayClass: cls,
          };
        });
      setHistoryDeliveries(mapped);
      setShowBallHistory(true);
    } catch {
      setError("Failed to load ball history");
    }
  };

  const openEditDelivery = (d: DeliveryRecord) => {
    setEditingDelivery(d);
    setEditRuns(d.runsBatsman);
    setEditExtraRuns(d.runsExtras);
    setEditExtraType(d.extraType ?? "");
    setEditDismissalType(d.dismissalType ?? "");
    setEditBowlerPid(d.bowlerPublicId ?? "");
    setEditBowlerName(d.bowlerName ?? "");
    setEditIsFreeHit(d.isFreeHit);
    setShowBallHistory(false);
  };

  const handleEditDeliverySave = async () => {
    if (!matchId || !editingDelivery || posting) return;
    setPosting(true);
    setError("");
    try {
      const req: { [k: string]: unknown } = {};
      if (editRuns !== editingDelivery.runsBatsman) req.runsBatsman = editRuns;
      if (editExtraRuns !== editingDelivery.runsExtras) req.runsExtras = editExtraRuns;
      // "" means "clear extra type"; only send if changed
      if (editExtraType !== (editingDelivery.extraType ?? "")) req.extraType = editExtraType;
      if (editDismissalType !== (editingDelivery.dismissalType ?? ""))
        req.dismissalType = editDismissalType;
      if (editBowlerPid && editBowlerPid !== editingDelivery.bowlerPublicId)
        req.bowlerPublicId = editBowlerPid;
      if (editIsFreeHit !== editingDelivery.isFreeHit) req.isFreeHit = editIsFreeHit;

      const state = await editDelivery(matchId, editingDelivery.publicId, req);
      await refreshOver();
      applyBallResponse(state);
      setEditingDelivery(null);
      showToast("✓ Ball corrected");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to edit delivery";
      setError(msg);
    } finally {
      setPosting(false);
    }
  };

  const battingTeamName =
    teams.find((t) => t.publicId === battingTeamId)?.name ?? "Batting Team";
  const bowlingTeamName =
    teams.find((t) => t.publicId === bowlingTeamId)?.name ?? "Bowling Team";

  const computeAutoResult = useCallback(() => {
    const src = finalInningsState ?? innings;
    if (!src) return null;
    const { totalRuns, totalWickets, target, inningsNumber } = src;
    if (inningsNumber === 2 && target) {
      if (totalRuns >= target) {
        const w = 10 - totalWickets;
        return {
          resultType: "WON_BY_WICKETS",
          resultMargin: w,
          resultDescription: `${battingTeamName} won by ${w} wicket${w !== 1 ? "s" : ""}`,
        };
      } else {
        const r = target - totalRuns - 1;
        return {
          resultType: "WON_BY_RUNS",
          resultMargin: r,
          resultDescription: `${bowlingTeamName} won by ${r} run${r !== 1 ? "s" : ""}`,
        };
      }
    }
    return null;
  }, [finalInningsState, innings, battingTeamName, bowlingTeamName]);

  useEffect(() => {
    if (showResult) {
      const computed = computeAutoResult();
      setAutoResult(computed);
      if (computed) {
        setResultType(computed.resultType);
        setResultDesc(computed.resultDescription);
        setResultMargin(String(computed.resultMargin));
      }
    }
  }, [showResult, computeAutoResult]);

  const handleResult = async () => {
    if (!matchId) return;
    const finalResultType = resultType || autoResult?.resultType;
    if (!finalResultType) return;
    setPosting(true);
    try {
      await recordResult(matchId, {
        resultType: finalResultType,
        resultMargin: resultMargin
          ? Number(resultMargin)
          : autoResult?.resultMargin,
        resultDescription: resultDesc || autoResult?.resultDescription,
      });
      navigate("/admin/cricket/matches");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to record result";
      setError(msg);
    } finally {
      setPosting(false);
    }
  };

  const closeSelector = () => {
    setShowBatterSelect(null);
    setShowBowlerSelect(false);
    setShowFielderSelect(false);
    setShowPlayerSearch("");
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading scorer...</div>
      </div>
    );

  const totalRuns = innings?.totalRuns ?? 0;
  const totalWickets = innings?.totalWickets ?? 0;
  const totalBalls = innings?.totalBalls ?? 0;
  const crr = innings
    ? fmtCRR(totalRuns, totalBalls, match?.ballsPerOver ?? 6)
    : "0.00";
  const emptyBatterStat: BatterStatDTO = { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
  const strikerStats = batterStatsMap[striker?.publicId ?? ""] ?? emptyBatterStat;
  const nonStrikerStats = batterStatsMap[nonStriker?.publicId ?? ""] ?? emptyBatterStat;
  const bpo = match?.ballsPerOver ?? 6;
  const curBowlerStats = bowler ? (bowlerStatsMap[bowler.publicId] ?? null) : null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col select-none">
      {/* Match header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {match?.title} · {match?.totalOvers} Ov
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-white">
                {totalRuns}/{totalWickets}
              </span>
              <span className="text-lg text-gray-400">
                {Math.floor(totalBalls / (match?.ballsPerOver ?? 6))}.
                {totalBalls % (match?.ballsPerOver ?? 6)} ov
              </span>
            </div>
            <div className="flex gap-4 mt-1 text-xs text-gray-500">
              <span>
                CRR <b className="text-gray-300">{crr}</b>
              </span>
              {innings?.target && (
                <>
                  <span>
                    Target <b className="text-gray-300">{innings.target}</b>
                  </span>
                  <span>
                    Need <b className="text-yellow-400">{innings.requiredRuns}</b>
                  </span>
                </>
              )}
              {isFreeHit && (
                <span className="text-orange-400 font-semibold animate-pulse">
                  FREE HIT
                </span>
              )}
            </div>
          </div>
          {/* Report + Note buttons — top-right corner of header */}
          <div className="flex flex-col gap-1 flex-shrink-0 items-end">
            <button
              onClick={() => window.open(`/matches/${matchId}/report`, "_blank")}
              className="text-xs text-gray-500 hover:text-blue-400 active:scale-95 transition-all px-2 py-1 rounded border border-gray-700 bg-gray-800"
            >
              📋 Report
            </button>
            <button
              onClick={() => setShowAnnotationForm((v) => !v)}
              className="text-xs text-gray-500 hover:text-green-400 active:scale-95 transition-all px-2 py-1 rounded border border-gray-700 bg-gray-800"
            >
              ✏️ Note
            </button>
          </div>
        </div>
        {/* Inline annotation form — collapsed by default */}
        {showAnnotationForm && (
          <div className="mt-2 p-3 bg-gray-800 rounded-xl border border-gray-700">
            <div className="text-xs text-gray-400 mb-2">
              Auto-context: {Math.floor(totalBalls / (match?.ballsPerOver ?? 6))}.{totalBalls % (match?.ballsPerOver ?? 6)} ov
              {striker ? ` · ${striker.name}` : ""}
              {bowler ? ` · ${bowler.name}` : ""}
            </div>
            <textarea
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              placeholder="Add a coaching note…"
              className="w-full bg-gray-900 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500 resize-none"
              rows={2}
            />
            <div className="flex gap-2 mt-2 justify-end">
              <button
                onClick={() => { setShowAnnotationForm(false); setAnnotationText(""); }}
                className="text-xs text-gray-400 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAnnotation}
                disabled={!annotationText.trim()}
                className="text-xs text-white px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40"
              >
                Save note
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pause banner — shown when match is paused; blocks scorer interaction visually */}
      {matchPauseReason && (
        <div className="bg-amber-900/40 border-b border-amber-700 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg flex-shrink-0">⏸</span>
            <span className="text-sm font-semibold text-amber-300 truncate">
              Match Paused — {matchPauseReason}
            </span>
          </div>
          <button
            onClick={handleResumeMatch}
            disabled={posting}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-semibold transition-all disabled:opacity-40"
          >
            ▶ Resume
          </button>
        </div>
      )}

      {/* Batters */}
      <div className={`bg-gray-900 px-4 py-2 border-b border-gray-800 ${matchPauseReason ? "opacity-40 pointer-events-none" : ""}`}>
        {(
          [
            { player: striker, stats: strikerStats, isStriker: true },
            { player: nonStriker, stats: nonStrikerStats, isStriker: false },
          ] as const
        ).map(({ player, stats, isStriker }, idx) => (
          <div key={isStriker ? "striker" : "ns"}>
            <button
              onClick={() =>
                setShowBatterSelect(isStriker ? "striker" : "nonstriker")
              }
              className="w-full flex items-center justify-between active:bg-gray-800 rounded-lg px-1 py-0.5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isStriker
                      ? "bg-green-400"
                      : "bg-transparent border border-gray-600"
                  }`}
                />
                <span
                  className={`text-sm ${player ? "text-gray-100" : "text-gray-600"}`}
                >
                  {player?.displayName ??
                    (isStriker ? "Select striker" : "Select non-striker")}
                </span>
              </div>
              {player && (
                <span className="text-xs text-gray-400">
                  <b className="text-white">{stats.runs}</b>({stats.balls})
                  {stats.fours > 0 && (
                    <span className="ml-1 text-green-400">4s:{stats.fours}</span>
                  )}
                  {stats.sixes > 0 && (
                    <span className="ml-1 text-purple-400">6s:{stats.sixes}</span>
                  )}
                </span>
              )}
            </button>
            {/* Swap icon — shown between the two rows when both batters are set */}
            {idx === 0 && striker && nonStriker && (
              <div className="flex justify-center my-0.5">
                <button
                  onClick={handleSwapBatters}
                  disabled={posting}
                  title="Swap ends"
                  className="px-3 py-0.5 rounded-full text-xs text-gray-600 hover:text-gray-300 hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-40"
                >
                  ⇄ swap ends
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Substitute / Change WK — only visible when match is active (not paused) */}
      {!matchPauseReason && (
        <div className="bg-gray-900 px-4 pb-1 border-b border-gray-800 flex gap-4">
          <button
            onClick={() => setShowSubstituteModal(true)}
            className="text-xs text-gray-600 hover:text-amber-400 active:scale-95 transition-all py-0.5"
          >
            ⇆ Substitute player
          </button>
          <button
            onClick={() => setShowChangeWkModal(true)}
            className="text-xs text-gray-600 hover:text-blue-400 active:scale-95 transition-all py-0.5"
          >
            🧤 Change WK
          </button>
        </div>
      )}

      {/* Partnership */}
      {striker && nonStriker && (
        <div className={`bg-gray-950 px-4 py-1.5 border-b border-gray-800 flex items-center justify-between ${matchPauseReason ? "opacity-40 pointer-events-none" : ""}`}>
          <span className="text-xs text-gray-600">
            Partnership: <b className="text-gray-400">{partnershipRuns}</b> (
            {partnershipBalls}b)
          </span>
          {partnershipBalls > 0 && (
            <span className="text-xs text-gray-600">
              RR:{" "}
              <b className="text-gray-400">
                {((partnershipRuns / partnershipBalls) * 6).toFixed(2)}
              </b>
            </span>
          )}
        </div>
      )}

      {/* Bowler */}
      <div className={`bg-gray-950 px-4 py-2 border-b border-gray-800 flex justify-between items-center ${matchPauseReason ? "opacity-40 pointer-events-none" : ""}`}>
        <button
          onClick={() => setShowBowlerSelect(true)}
          className="flex-1 flex justify-between items-center active:opacity-70 transition-opacity"
        >
          <span className="text-xs text-gray-600">
            BOWLING &nbsp;
            <b className="text-gray-300">
              {bowler?.displayName ?? "Select bowler"}
            </b>
          </span>
          <span className="text-xs text-gray-500">
            {Math.floor((curBowlerStats?.legalBalls ?? 0) / bpo)}-{curBowlerStats?.maidens ?? 0}-{curBowlerStats?.runsConceded ?? 0}-{curBowlerStats?.wickets ?? 0}
          </span>
        </button>
        {/* Bowler correction — only before first ball of the over */}
        {bowler && innings && innings.ballInOver === 0 && (
          <button
            onClick={() => setShowCorrectBowler(true)}
            title="Wrong bowler? Correct before first ball"
            className="ml-3 text-gray-600 hover:text-gray-300 active:scale-95 transition-all text-sm"
          >
            ✏
          </button>
        )}
      </div>

      {/* Over strip */}
      <div className={`bg-gray-900 px-4 py-2.5 border-b border-gray-800 flex items-center gap-2 flex-wrap ${matchPauseReason ? "opacity-40 pointer-events-none" : ""}`}>
        <span className="text-xs text-gray-600 min-w-[48px] uppercase">
          This Ov
        </span>
        {thisOver.map((b, i) => (
          <BallCircle key={i} label={b.displayLabel} cls={b.displayClass} />
        ))}
        {Array.from({
          length: Math.max(
            0,
            (match?.ballsPerOver ?? 6) - (innings?.ballInOver ?? 0),
          ),
        }).map((_, i) => (
          <BallCircle key={`empty-${i}`} label="·" empty />
        ))}
      </div>

      {error && (
        <div
          className="mx-4 mt-3 px-3 py-2 bg-red-900/30 border border-red-800 rounded-xl text-xs text-red-400"
          onClick={innings === null ? loadAll : undefined}
          style={innings === null ? { cursor: "pointer" } : undefined}
        >
          {error}
          {innings === null && (
            <span className="ml-2 font-semibold underline">Tap to retry</span>
          )}
        </div>
      )}

      {overJustEnded && !bowler && (
        <div className="mx-4 mt-2 px-3 py-2 bg-amber-900/30 border border-amber-700 rounded-xl text-xs text-amber-400 flex items-center justify-between">
          <span>⚠ Over complete — select a new bowler</span>
          <button
            onClick={() => setShowBowlerSelect(true)}
            className="ml-2 px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-semibold active:scale-95"
          >
            Select
          </button>
        </div>
      )}

      {/* Scoring pad */}
      <div className={`flex-1 px-3 pt-4 pb-2 ${matchPauseReason ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="text-xs text-gray-600 uppercase tracking-wider mb-2">
          Runs
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[0, 1, 2, 3].map((r) => (
            <button
              key={r}
              disabled={posting}
              onClick={() => score(r)}
              className={`h-16 rounded-2xl text-2xl font-bold transition-all active:scale-90 disabled:opacity-40 ${
                r === 0
                  ? "bg-gray-800 text-gray-500 border border-gray-700"
                  : "bg-blue-950 text-blue-300 border border-blue-800"
              }`}
            >
              {r}
            </button>
          ))}
          <button
            disabled={posting}
            onClick={() => score(4)}
            className="h-16 rounded-2xl text-2xl font-bold bg-green-950 text-green-300 border border-green-800 transition-all active:scale-90 disabled:opacity-40"
          >
            4
          </button>
          <button
            disabled={posting}
            onClick={() => score(6)}
            className="h-16 rounded-2xl text-2xl font-bold bg-purple-950 text-purple-300 border border-purple-800 transition-all active:scale-90 disabled:opacity-40"
          >
            6
          </button>
          <button
            disabled={posting}
            onClick={() => openWicket(0)}
            className="h-16 rounded-2xl col-span-2 text-base font-bold bg-red-950 text-red-300 border border-red-800 transition-all active:scale-90 disabled:opacity-40"
          >
            WICKET
          </button>
        </div>
        <div className="text-xs text-gray-600 uppercase tracking-wider mb-2">
          Extras
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            disabled={posting}
            onClick={() => {
              if (!striker || !nonStriker || !bowler) {
                setError(
                  overJustEnded
                    ? "Over complete — select a new bowler before continuing"
                    : "Set striker, non-striker and bowler first",
                );
                return;
              }
              setPendingExtra("WIDE");
            }}
            className="h-11 rounded-xl text-xs font-semibold bg-gray-900 border text-amber-400 border-amber-900 transition-all active:scale-90 disabled:opacity-40"
          >
            Wide
          </button>
          <button
            disabled={posting}
            onClick={() => {
              if (!striker || !nonStriker || !bowler) {
                setError(
                  overJustEnded
                    ? "Over complete — select a new bowler before continuing"
                    : "Set striker, non-striker and bowler first",
                );
                return;
              }
              setPendingExtra("NO_BALL_RUNS");
            }}
            className="h-11 rounded-xl text-xs font-semibold bg-gray-900 border text-orange-400 border-orange-900 transition-all active:scale-90 disabled:opacity-40"
          >
            No Ball
          </button>
          <button
            disabled={posting}
            onClick={() => {
              if (!striker || !nonStriker || !bowler) {
                setError(
                  overJustEnded
                    ? "Over complete — select a new bowler before continuing"
                    : "Set striker, non-striker and bowler first",
                );
                return;
              }
              setPendingExtra("LEG_BYE");
            }}
            className="h-11 rounded-xl text-xs font-semibold bg-gray-900 border text-gray-400 border-gray-700 transition-all active:scale-90 disabled:opacity-40"
          >
            Leg Bye
          </button>
          <button
            disabled={posting}
            onClick={() => {
              if (!striker || !nonStriker || !bowler) {
                setError(
                  overJustEnded
                    ? "Over complete — select a new bowler before continuing"
                    : "Set striker, non-striker and bowler first",
                );
                return;
              }
              setPendingExtra("BYE");
            }}
            className="h-11 rounded-xl text-xs font-semibold bg-gray-900 border text-gray-400 border-gray-700 transition-all active:scale-90 disabled:opacity-40"
          >
            Bye
          </button>
          <button
            disabled={posting}
            onClick={() => {
              if (!striker || !nonStriker || !bowler) {
                setError(
                  overJustEnded
                    ? "Over complete — select a new bowler before continuing"
                    : "Set striker, non-striker and bowler first",
                );
                return;
              }
              setShowFiveSevenPicker(true);
            }}
            className="h-11 rounded-xl text-xs font-semibold bg-gray-900 border text-gray-400 border-gray-700 transition-all active:scale-90 disabled:opacity-40"
          >
            5, 7
          </button>
          <button
            disabled={posting}
            onClick={() => setShowPenalty(true)}
            className="h-11 rounded-xl text-xs font-semibold bg-gray-900 border text-gray-400 border-gray-700 transition-all active:scale-90 disabled:opacity-40"
          >
            Penalty
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-3 pb-6 flex gap-2">
        <button
          disabled={posting || !!matchPauseReason}
          onClick={handleUndo}
          className="flex-1 h-11 rounded-xl bg-gray-900 border border-red-900 text-red-400 text-sm font-semibold active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <span>↩</span> Undo Last Ball
        </button>
        {!matchPauseReason ? (
          <button
            disabled={posting}
            onClick={() => setShowPauseModal(true)}
            className="w-11 h-11 rounded-xl bg-gray-900 border border-amber-800 text-amber-500 flex items-center justify-center text-lg active:scale-95 transition-all disabled:opacity-40"
            title="Pause match"
          >
            ⏸
          </button>
        ) : null}
        <button
          onClick={() => setShowCloseInnings(true)}
          className="w-11 h-11 rounded-xl bg-gray-900 border border-gray-700 text-gray-500 flex items-center justify-center text-lg active:scale-95"
        >
          ⚙
        </button>
      </div>

      {/* Wide picker */}
      {pendingExtra === "WIDE" && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white text-center mb-1">
              Wide ball{" "}
              <span className="text-gray-500 font-normal text-sm">(WD=1)</span>
            </h3>
            <div className="grid grid-cols-4 gap-2 mb-4 mt-4">
              {[0, 1, 2, 3, 4, 5, 6].map((r) => (
                <button
                  key={r}
                  disabled={posting}
                  onClick={() => {
                    score(0, "WIDE", r + 1);
                    setPendingExtra(null);
                  }}
                  className="h-14 rounded-xl text-sm font-bold bg-gray-800 border border-gray-700 text-gray-200 active:bg-gray-700 active:scale-95 transition-all disabled:opacity-40"
                >
                  WD+{r}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPendingExtra(null)}
              className="w-full py-2 text-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* NB picker step 1 */}
      {pendingExtra === "NO_BALL_RUNS" && nbPickerRuns === null && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white text-center mb-1">
              No ball{" "}
              <span className="text-gray-500 font-normal text-sm">(NB=1)</span>
            </h3>
            <div className="grid grid-cols-4 gap-2 mb-4 mt-4">
              {[0, 1, 2, 3, 4, 5, 6].map((r) => (
                <button
                  key={r}
                  disabled={posting}
                  onClick={() => {
                    if (r === 0) {
                      score(0, "NO_BALL", 1);
                      setPendingExtra(null);
                      setNbPickerRuns(null);
                    } else {
                      setNbPickerRuns(r);
                      setShowNbSubPicker(true);
                    }
                  }}
                  className="h-14 rounded-xl text-sm font-bold bg-gray-800 border border-gray-700 text-gray-200 active:bg-gray-700 active:scale-95 transition-all disabled:opacity-40"
                >
                  NB+{r}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setPendingExtra(null);
                setNbPickerRuns(null);
              }}
              className="w-full py-2 text-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* NB picker step 2 */}
      {showNbSubPicker && nbPickerRuns !== null && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white text-center mb-1">
              NB + {nbPickerRuns} — How scored?
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-4 mt-4">
              <button
                disabled={posting}
                onClick={() => {
                  score(nbPickerRuns, "NO_BALL", 1);
                  setPendingExtra(null);
                  setNbPickerRuns(null);
                  setShowNbSubPicker(false);
                }}
                className="py-4 rounded-xl text-sm font-bold bg-gray-800 border border-gray-700 text-gray-200 active:bg-gray-700 active:scale-95 transition-all"
              >
                🏏<div className="text-xs mt-1 font-normal">Batsman</div>
              </button>
              <button
                disabled={posting}
                onClick={() => {
                  score(0, "NO_BALL", nbPickerRuns + 1);
                  setPendingExtra(null);
                  setNbPickerRuns(null);
                  setShowNbSubPicker(false);
                }}
                className="py-4 rounded-xl text-sm font-bold bg-gray-800 border border-gray-700 text-gray-200 active:bg-gray-700 active:scale-95 transition-all"
              >
                B<div className="text-xs mt-1 font-normal">Bye</div>
              </button>
              <button
                disabled={posting}
                onClick={() => {
                  score(0, "NO_BALL", nbPickerRuns + 1);
                  setPendingExtra(null);
                  setNbPickerRuns(null);
                  setShowNbSubPicker(false);
                }}
                className="py-4 rounded-xl text-sm font-bold bg-gray-800 border border-gray-700 text-gray-200 active:bg-gray-700 active:scale-95 transition-all"
              >
                LB<div className="text-xs mt-1 font-normal">Leg Bye</div>
              </button>
            </div>
            <button
              onClick={() => {
                setShowNbSubPicker(false);
                setNbPickerRuns(null);
                setPendingExtra(null);
              }}
              className="w-full py-2 text-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bye picker */}
      {pendingExtra === "BYE" && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white text-center mb-4">
              Bye runs
            </h3>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  disabled={posting}
                  onClick={() => {
                    score(0, "BYE", r);
                    setPendingExtra(null);
                  }}
                  className="flex-1 h-14 rounded-xl text-xl font-bold bg-gray-800 border border-gray-700 text-gray-200 active:bg-gray-700 active:scale-95 transition-all disabled:opacity-40"
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPendingExtra(null)}
              className="w-full py-2 text-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Leg bye picker */}
      {pendingExtra === "LEG_BYE" && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white text-center mb-4">
              Leg bye runs
            </h3>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  disabled={posting}
                  onClick={() => {
                    score(0, "LEG_BYE", r);
                    setPendingExtra(null);
                  }}
                  className="flex-1 h-14 rounded-xl text-xl font-bold bg-gray-800 border border-gray-700 text-gray-200 active:bg-gray-700 active:scale-95 transition-all disabled:opacity-40"
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPendingExtra(null)}
              className="w-full py-2 text-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 5/7 picker */}
      {showFiveSevenPicker && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white text-center mb-4">
              Overthrow runs
            </h3>
            <div className="flex gap-3 mb-4">
              {[5, 7].map((r) => (
                <button
                  key={r}
                  disabled={posting}
                  onClick={() => {
                    score(r);
                    setShowFiveSevenPicker(false);
                  }}
                  className="flex-1 h-16 rounded-xl text-3xl font-bold bg-gray-800 border border-gray-700 text-gray-200 active:bg-gray-700 active:scale-95 transition-all disabled:opacity-40"
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFiveSevenPicker(false)}
              className="w-full py-2 text-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Penalty modal */}
      {showPenalty && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-white text-center mb-1">
              Penalty Runs
            </h3>
            <p className="text-xs text-gray-500 text-center mb-5">
              5 runs — select which side committed the offence
            </p>
            <div className="space-y-2 mb-3">
              <button
                disabled={posting}
                onClick={async () => {
                  if (!matchId) return;
                  setPosting(true);
                  try {
                    const state = await awardPenalty(matchId, "FIELDING");
                    applyBallResponse(state);
                    showToast("✓ 5 penalty runs awarded");
                    setShowPenalty(false);
                  } catch {
                    setError("Failed to award penalty");
                  } finally {
                    setPosting(false);
                  }
                }}
                className="w-full py-3.5 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl text-sm font-semibold active:scale-95 disabled:opacity-40"
              >
                Batting side gets 5 runs
                <div className="text-xs text-gray-500 font-normal mt-0.5">
                  Fielding side committed the offence
                </div>
              </button>
              <button
                disabled={posting}
                onClick={async () => {
                  if (!matchId) return;
                  setPosting(true);
                  try {
                    const state = await awardPenalty(matchId, "BATTING");
                    applyBallResponse(state);
                    showToast("✓ 5 penalty runs awarded");
                    setShowPenalty(false);
                  } catch {
                    setError("Failed to award penalty");
                  } finally {
                    setPosting(false);
                  }
                }}
                className="w-full py-3.5 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl text-sm font-semibold active:scale-95 disabled:opacity-40"
              >
                Bowling side gets 5 runs
                <div className="text-xs text-gray-500 font-normal mt-0.5">
                  Batting side committed the offence
                </div>
              </button>
            </div>
            <button
              onClick={() => setShowPenalty(false)}
              className="w-full py-2 text-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Batter selector */}
      {showBatterSelect && (
        <PlayerSelector
          title={
            showBatterSelect === "striker"
              ? "Select Striker"
              : "Select Non-Striker"
          }
          players={battingPlayers}
          exclude={[
            showBatterSelect === "striker"
              ? (nonStriker?.publicId ?? "")
              : (striker?.publicId ?? ""),
            ...Array.from(dismissedPlayerIds),
            ...Array.from(substitutedOutIds),
          ].filter(Boolean)}
          searchValue={showPlayerSearch}
          onSearchChange={setShowPlayerSearch}
          onClose={closeSelector}
          onSelect={async (p) => {
            if (!matchId) return;
            const pos = showBatterSelect as "striker" | "nonstriker";
            // Persist to server immediately — fixes refresh-loses-selection bug.
            try {
              const state = await selectBatter(matchId, p.publicId, pos);
              if (pos === "striker") setStriker(p);
              else setNonStriker(p);
              setShowBatterSelect(null);
              setShowPlayerSearch("");
              applyBallResponse(state);
            } catch (e: unknown) {
              const msg =
                (e as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message ?? "Failed to select batter";
              setError(msg);
            }
          }}
        />
      )}

      {/* Substitute player modal */}
      {showSubstituteModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800">
              <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white text-center">
                Player Substitution
              </h3>
              <p className="text-xs text-gray-500 text-center mt-1">
                Original player's stats are frozen. Substitute enters with fresh stats.
              </p>
            </div>
            <div className="p-4 space-y-4">
              {/* Step 1: pick original player from current batting XI */}
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">Player leaving the field</div>
                <div className="space-y-1">
                  {[...battingPlayers, ...bowlingPlayers]
                    .filter((p, idx, arr) => arr.findIndex((x) => x.publicId === p.publicId) === idx)
                    .map((p) => (
                      <button
                        key={p.publicId}
                        onClick={() => setSubOriginalMtp(p)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all ${
                          subOriginalMtp?.publicId === p.publicId
                            ? "bg-amber-900/50 border border-amber-700 text-amber-200"
                            : "bg-gray-800 border border-gray-700 text-gray-300 active:scale-95"
                        }`}
                      >
                        <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {p.displayName.charAt(0).toUpperCase()}
                        </div>
                        {p.displayName}
                      </button>
                    ))}
                </div>
              </div>
              {/* Step 2: reason */}
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">Reason</div>
                <div className="grid grid-cols-3 gap-2">
                  {["Concussion", "Injury", "Other"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setSubReasonInput(r)}
                      className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                        subReasonInput === r
                          ? "bg-amber-900 border-amber-600 text-amber-200"
                          : "bg-gray-800 border-gray-700 text-gray-400"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {/* Step 3: pick substitute from team roster (via a simple picker) */}
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">Substitute entering the field</div>
                <p className="text-xs text-gray-600">
                  After confirming, use "Select Striker / Non-Striker" or "Correct Bowler"
                  to bring the substitute on to the field.
                </p>
                <p className="text-xs text-amber-500 mt-2">
                  Substitute player selection is done via their academy Player Public ID.
                  Enter it below (ask coach for the player's ID from the roster).
                </p>
                <input
                  type="text"
                  id="sub-player-id"
                  placeholder="Substitute player publicId (e.g. PLY-ABC-1234)"
                  className="mt-2 w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:border-amber-600"
                />
              </div>
              <p className="text-xs text-red-400">
                This action is permanent for this match — the original player cannot bat or bowl again.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowSubstituteModal(false);
                    setSubOriginalMtp(null);
                    setSubReasonInput("Injury");
                  }}
                  className="flex-1 py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  disabled={!subOriginalMtp || subPosting}
                  onClick={async () => {
                    if (!matchId || !subOriginalMtp) return;
                    const inputEl = document.getElementById("sub-player-id") as HTMLInputElement | null;
                    const subPid = inputEl?.value?.trim();
                    if (!subPid) { setError("Enter the substitute player's publicId"); return; }
                    setSubPosting(true);
                    try {
                      const newMtp = await substitutePlayer(
                        matchId,
                        subOriginalMtp.publicId,
                        subPid,
                        subReasonInput,
                      ) as { mtpPublicId: string; displayName: string };
                      // Mark original as substituted out
                      setSubstitutedOutIds((prev) => new Set([...prev, subOriginalMtp.publicId]));
                      // Add substitute to batting players list
                      const subPlayer: ScoringPlayer = {
                        publicId: newMtp.mtpPublicId,
                        displayName: `${newMtp.displayName} (sub)`,
                        isWicketkeeper: false,
                        isCaptain: false,
                      };
                      setBattingPlayers((prev) => [...prev, subPlayer]);
                      showToast(`✓ ${subOriginalMtp.displayName} substituted out`);
                      setShowSubstituteModal(false);
                      setSubOriginalMtp(null);
                      setSubReasonInput("Injury");
                    } catch (e: unknown) {
                      const msg =
                        (e as { response?: { data?: { message?: string } } })
                          ?.response?.data?.message ?? "Substitution failed";
                      setError(msg);
                    } finally {
                      setSubPosting(false);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-amber-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
                >
                  {subPosting ? "Substituting…" : "Confirm Substitution"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change wicketkeeper modal */}
      {showChangeWkModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800">
              <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white text-center">Change Wicketkeeper</h3>
              <p className="text-xs text-gray-500 text-center mt-1">
                Select a fielding-team player. Mid-over changes are allowed.
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">New keeper (fielding team)</div>
                <div className="space-y-1">
                  {bowlingPlayers.map((p) => (
                    <button
                      key={p.publicId}
                      onClick={() => setWkSelectedPid(p.publicId)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                        wkSelectedPid === p.publicId
                          ? "bg-blue-900/60 border border-blue-600"
                          : "bg-gray-800 border border-gray-700"
                      }`}
                    >
                      <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {p.name.charAt(0)}
                      </div>
                      <span className="text-sm text-white">{p.name}</span>
                      {p.isWicketkeeper && (
                        <span className="ml-auto text-xs text-blue-400">current WK</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">Reason</div>
                <div className="flex gap-2 flex-wrap">
                  {["Injury", "Concussion", "Tactical", "Other"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setWkReason(r)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        wkReason === r
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-400"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowChangeWkModal(false); setWkSelectedPid(""); setWkReason(""); }}
                  className="flex-1 py-3 rounded-xl bg-gray-700 text-gray-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  disabled={!wkSelectedPid || wkPosting}
                  onClick={handleChangeWk}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
                >
                  {wkPosting ? "Changing…" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bowler selector */}
      {showBowlerSelect &&
        (() => {
          const maxOvers = match ? Math.floor(match.totalOvers / 5) : 99;
          const totalOvers = match?.totalOvers ?? 0;
          const currentOver = innings?.overNumber ?? 0;
          const oversRemaining = totalOvers - currentOver;

          const bowlersWithStatus = bowlingPlayers.map((p) => {
            const oversUsed = bowlerOversMap[p.publicId] ?? 0;
            const hasQuota = maxOvers <= 0 || oversUsed < maxOvers;
            const isLastBowler = p.publicId === lastBowlerPublicId;
            const validForNextOver = bowlingPlayers.filter((other) => {
              if (other.publicId === p.publicId) return false;
              const otherOversUsed = bowlerOversMap[other.publicId] ?? 0;
              return maxOvers <= 0 || otherOversUsed < maxOvers;
            });
            const wouldDeadlock =
              hasQuota &&
              !isLastBowler &&
              oversRemaining > 1 &&
              validForNextOver.length === 0;
            const wouldWarn =
              hasQuota &&
              !isLastBowler &&
              oversRemaining > 1 &&
              validForNextOver.length === 1;
            return {
              ...p,
              oversUsed,
              isMaxed: !hasQuota,
              isLastBowler,
              wouldDeadlock,
              wouldWarn,
            };
          });

          return (
            <div className="fixed inset-0 z-[60] bg-black/70 flex items-end">
              <div className="w-full bg-gray-900 rounded-t-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-800">
                  <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-white text-center">
                    Select Bowler
                  </h3>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    Max {maxOvers} over{maxOvers !== 1 ? "s" : ""} per bowler
                  </p>
                  <input
                    autoFocus
                    type="text"
                    className="mt-3 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
                    placeholder="Search..."
                    value={showPlayerSearch}
                    onChange={(e) => setShowPlayerSearch(e.target.value)}
                  />
                </div>
                <div className="overflow-y-auto flex-1 p-3 space-y-2">
                  {bowlersWithStatus
                    .filter((p) =>
                      (p.displayName ?? "")
                        .toLowerCase()
                        .includes(showPlayerSearch.toLowerCase()),
                    )
                    .map((p) => {
                      const hardDisabled =
                        p.isMaxed || p.isLastBowler || p.wouldDeadlock;
                      const reason = p.isMaxed
                        ? `Quota full (${p.oversUsed}/${maxOvers} ov)`
                        : p.isLastBowler
                          ? "Bowled last over"
                          : p.wouldDeadlock
                            ? "⚠ No bowler left for next over"
                            : p.wouldWarn
                              ? `⚠ Only 1 bowler left after this`
                              : `${p.oversUsed}/${maxOvers} ov`;
                      const reasonColor =
                        p.isMaxed || p.isLastBowler || p.wouldDeadlock
                          ? "text-red-400"
                          : p.wouldWarn
                            ? "text-yellow-400"
                            : "text-gray-500";
                      return (
                        <button
                          key={p.publicId}
                          disabled={hardDisabled}
                          onClick={() => {
                            if (hardDisabled) return;
                            setBowler(p);
                            setOverJustEnded(false);
                            setShowBowlerSelect(false);
                            setShowPlayerSearch("");
                          }}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                            hardDisabled
                              ? "bg-gray-800/50 opacity-40 cursor-not-allowed"
                              : "bg-gray-800 hover:bg-gray-700 active:scale-95"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                              {p.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">
                                {p.displayName}
                              </div>
                              {p.bowlingStyle && (
                                <div className="text-xs text-gray-400">
                                  {p.bowlingStyle}
                                </div>
                              )}
                            </div>
                          </div>
                          <div
                            className={`text-xs flex-shrink-0 ${reasonColor}`}
                          >
                            {reason}
                          </div>
                        </button>
                      );
                    })}
                </div>
                <div className="p-3 border-t border-gray-800">
                  <button
                    onClick={closeSelector}
                    className="w-full py-3 text-sm text-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Fielder selector */}
      {showFielderSelect && (
        <PlayerSelector
          title="Select Fielder"
          players={bowlingPlayers}
          exclude={[bowler?.publicId ?? ""].filter(Boolean)}
          searchValue={showPlayerSearch}
          onSearchChange={setShowPlayerSearch}
          onClose={closeSelector}
          onSelect={(p) => {
            setFielder(p);
            setShowFielderSelect(false);
            setShowPlayerSearch("");
          }}
        />
      )}

      {/* Wicket modal */}
      {showWicket && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800">
              <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white text-center">
                How was the wicket taken?
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">
                  Dismissal type
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DISMISSALS.map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setDismissalType(d);
                        if (d === "Stumped") {
                          const wk = bowlingPlayers.find(
                            (p) => p.isWicketkeeper,
                          );
                          if (wk) setFielder(wk);
                        } else if (dismissalType === "Stumped") {
                          setFielder(null);
                          setIsWideDelivery(false);
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all active:scale-95 ${
                        dismissalType === d
                          ? "bg-red-900 border-red-600 text-red-200"
                          : "bg-gray-800 border-gray-700 text-gray-300"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">
                  Batter out
                </div>
                <div className="flex gap-2">
                  {[striker, nonStriker].filter(Boolean).map((p) => (
                    <button
                      key={p!.publicId}
                      onClick={() => setDismissedPlayer(p!)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-sm border transition-all active:scale-95 ${
                        dismissedPlayer?.publicId === p!.publicId
                          ? "bg-red-900 border-red-600 text-red-200"
                          : "bg-gray-800 border-gray-700 text-gray-300"
                      }`}
                    >
                      {p!.displayName}
                      {p === striker ? " *" : ""}
                    </button>
                  ))}
                </div>
              </div>
              {["Caught", "Stumped", "Run Out"].includes(dismissalType) && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-2">
                    Fielder
                    {dismissalType === "Stumped" && fielder && (
                      <span className="ml-2 text-green-400 normal-case">
                        (auto: WK)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowFielderSelect(true)}
                    className={`w-full py-2.5 px-3 border rounded-xl text-sm text-left transition-all ${
                      fielder
                        ? dismissalType === "Stumped"
                          ? "bg-green-900/30 border-green-700 text-green-300"
                          : "bg-gray-800 border-gray-600 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-300"
                    }`}
                  >
                    {fielder?.displayName ?? "Tap to select fielder →"}
                  </button>
                  {dismissalType === "Stumped" && (
                    <button
                      onClick={() => setIsWideDelivery((prev) => !prev)}
                      className={`mt-2 w-full py-2.5 px-3 border rounded-xl text-sm text-left transition-all flex items-center gap-3 ${isWideDelivery ? "bg-amber-900/30 border-amber-700 text-amber-300" : "bg-gray-800 border-gray-700 text-gray-500"}`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isWideDelivery ? "bg-amber-500 border-amber-500" : "border-gray-600"}`}
                      >
                        {isWideDelivery && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                      Wide ball (stumped off wide)
                    </button>
                  )}
                  {dismissalType === "Run Out" &&
                    dismissedPlayer?.publicId === nonStriker?.publicId && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 uppercase mb-2">
                          Run out at which end?
                        </div>
                        <div className="flex gap-2">
                          {["striker", "nonstriker"].map((end) => (
                            <button
                              key={end}
                              onClick={() =>
                                setRunOutEnd(end as "striker" | "nonstriker")
                              }
                              className={`flex-1 py-2.5 rounded-xl text-sm border transition-all active:scale-95 ${runOutEnd === end ? "bg-blue-700 border-blue-500 text-white" : "bg-gray-800 border-gray-700 text-gray-300"}`}
                            >
                              {end === "striker"
                                ? "Striker end"
                                : "Non-striker end"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">
                  Runs scored on this ball
                </div>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map((r) => (
                    <button
                      key={r}
                      onClick={() => setPendingRuns(r)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                        pendingRuns === r
                          ? "bg-blue-700 border-blue-500 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-300"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <button
                disabled={!dismissalType || !dismissedPlayer || posting}
                onClick={confirmWicket}
                className="w-full py-3.5 bg-red-700 text-white rounded-xl font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
              >
                Confirm Wicket
              </button>
              <button
                onClick={() => {
                  setShowWicket(false);
                  setDismissalType("");
                  setFielder(null);
                  setRunOutEnd(null);
                  setIsWideDelivery(false);
                }}
                className="w-full py-2 text-gray-500 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Over summary */}
      {showOverSummary && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-700 p-5 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-4">
              <div className="text-3xl mb-1">🏏</div>
              <h3 className="text-base font-bold text-white">Over Complete!</h3>
              <p className="text-sm text-gray-400 mt-1">
                Over {lastOverNumber} · {lastOverRuns} runs ·{" "}
                {lastOverBalls.filter((b) => b.isWicket).length} wicket(s)
              </p>
            </div>
            <div className="flex gap-1.5 justify-center mb-5 flex-wrap">
              {lastOverBalls.map((b, i) => (
                <BallCircle
                  key={i}
                  label={b.displayLabel}
                  cls={b.displayClass}
                />
              ))}
            </div>
            <button
              onClick={() => setShowOverSummary(false)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm active:scale-95"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Close innings */}
      {showCloseInnings && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl p-5 border-t border-gray-800">
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-white text-center mb-1">
              Match Controls
            </h3>
            <p className="text-xs text-gray-500 text-center mb-4">
              {totalRuns}/{totalWickets} ·{" "}
              {fmtOvers(totalBalls, match?.ballsPerOver)} overs
            </p>
            <div className="space-y-2">
              <button
                onClick={handleCloseInnings}
                disabled={posting}
                className="w-full py-3.5 bg-yellow-700 text-white rounded-xl font-semibold text-sm active:scale-95 disabled:opacity-40"
              >
                Close Innings
              </button>
              <button
                onClick={() => {
                  setShowCloseInnings(false);
                  setShowResult(true);
                }}
                className="w-full py-3.5 bg-green-700 text-white rounded-xl font-semibold text-sm active:scale-95"
              >
                End Match & Record Result
              </button>
              <button
                onClick={() => {
                  setShowPenalty(true);
                  setShowCloseInnings(false);
                }}
                className="w-full py-3.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl font-semibold text-sm active:scale-95"
              >
                Award Penalty Runs
              </button>
              <button
                onClick={() => {
                  setShowCloseInnings(false);
                  loadBallHistory();
                }}
                className="w-full py-3.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl font-semibold text-sm active:scale-95"
              >
                Edit Past Ball
              </button>
              <button
                onClick={() => setShowCloseInnings(false)}
                className="w-full py-2 text-gray-500 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record result */}
      {showResult && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto border-t border-gray-800">
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-white text-center mb-3">
              Match Result
            </h3>
            {autoResult && (
              <div className="mb-4 px-4 py-3 bg-green-900/30 border border-green-700 rounded-xl text-center">
                <div className="text-xs text-green-400 uppercase tracking-wide mb-1">
                  Auto-calculated
                </div>
                <div className="text-base font-bold text-white">
                  {autoResult.resultDescription}
                </div>
                <div className="text-xs text-green-500 mt-1">
                  Override below if needed
                </div>
              </div>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  "WON_BY_RUNS",
                  "WON_BY_WICKETS",
                  "TIE",
                  "DRAW",
                  "NO_RESULT",
                  "ABANDONED",
                ].map((rt) => (
                  <button
                    key={rt}
                    onClick={() => {
                      setResultType(rt);
                      if (rt !== autoResult?.resultType) {
                        setResultDesc("");
                        setResultMargin("");
                      } else if (autoResult) {
                        setResultDesc(autoResult.resultDescription);
                        setResultMargin(String(autoResult.resultMargin));
                      }
                    }}
                    className={`py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                      resultType === rt
                        ? "bg-green-800 border-green-500 text-green-200"
                        : "bg-gray-800 border-gray-700 text-gray-400"
                    }`}
                  >
                    {rt.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
              {(resultType === "WON_BY_RUNS" ||
                resultType === "WON_BY_WICKETS") && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    {resultType === "WON_BY_RUNS"
                      ? "Winning margin (runs)"
                      : "Winning margin (wickets)"}
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
                    placeholder="Enter margin"
                    value={resultMargin}
                    onChange={(e) => setResultMargin(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Result description
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
                  placeholder='e.g. "Team A won by 25 runs"'
                  value={resultDesc}
                  onChange={(e) => setResultDesc(e.target.value)}
                />
              </div>
              <button
                disabled={!resultType || posting}
                onClick={handleResult}
                className="w-full py-3.5 bg-green-700 text-white rounded-xl font-bold text-sm disabled:opacity-40 active:scale-95"
              >
                {posting ? "Saving..." : "Confirm Result"}
              </button>
              <button
                onClick={() => setShowResult(false)}
                className="w-full py-2 text-gray-500 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correct bowler — only valid when ballInOver == 0 */}
      {showCorrectBowler && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-800">
              <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white text-center">
                Correct Bowler
              </h3>
              <p className="text-xs text-gray-500 text-center mt-1">
                No ball bowled yet this over — select the correct bowler
              </p>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {bowlingPlayers
                .filter((p) => p.publicId !== lastBowlerPublicId)
                .map((p) => (
                  <button
                    key={p.publicId}
                    onClick={() => handleCorrectBowler(p)}
                    className="w-full flex items-center gap-3 px-3 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-left active:scale-95 transition-all"
                  >
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {p.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-sm font-medium text-white">
                      {p.displayName}
                    </div>
                  </button>
                ))}
            </div>
            <div className="p-3 border-t border-gray-800">
              <button
                onClick={() => setShowCorrectBowler(false)}
                className="w-full py-3 text-sm text-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ball history — recent deliveries for edit selection */}
      {showBallHistory && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-800">
              <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white text-center">
                Edit Past Ball
              </h3>
              <p className="text-xs text-gray-500 text-center mt-1">
                Tap a delivery to correct it · Full innings replay runs after save
              </p>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
              {historyDeliveries.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-500">
                  No deliveries yet
                </div>
              )}
              {historyDeliveries.map((d) => (
                <button
                  key={d.publicId}
                  onClick={() => openEditDelivery(d)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-left active:scale-95 transition-all"
                >
                  <BallCircle label={d.displayLabel} cls={d.displayClass} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-400">
                      Ov {d.overNumber + 1}.{d.ballNumber}
                    </span>
                    <span className="ml-2 text-xs text-gray-300">
                      {d.runsBatsman + d.runsExtras} run{d.runsBatsman + d.runsExtras !== 1 ? "s" : ""}
                      {d.extraType ? ` · ${d.extraType}` : ""}
                      {d.isWicket ? " · W" : ""}
                    </span>
                    {d.bowlerName && (
                      <span className="ml-2 text-xs text-gray-500">
                        {d.bowlerName}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-600 text-xs">Edit →</span>
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-gray-800">
              <button
                onClick={() => setShowBallHistory(false)}
                className="w-full py-3 text-sm text-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit delivery sheet */}
      {editingDelivery && (
        <div className="fixed inset-0 z-[65] bg-black/80 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-800">
              <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white text-center">
                Edit Delivery — Ov {editingDelivery.overNumber + 1}.
                {editingDelivery.ballNumber}
              </h3>
              <p className="text-xs text-gray-500 text-center mt-1">
                All stats rebuild from ball 1 after save
              </p>
            </div>
            <div className="p-4 space-y-4">
              {/* Runs off bat */}
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">
                  Runs off bat
                </div>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4, 6].map((r) => (
                    <button
                      key={r}
                      onClick={() => setEditRuns(r)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                        editRuns === r
                          ? "bg-blue-700 border-blue-500 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-300"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {/* Extra type */}
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">
                  Extra type
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["", "WIDE", "NO_BALL", "BYE", "LEG_BYE"].map((et) => (
                    <button
                      key={et || "none"}
                      onClick={() => setEditExtraType(et)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                        editExtraType === et
                          ? "bg-blue-700 border-blue-500 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-300"
                      }`}
                    >
                      {et || "None"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Extra runs (shown only when extra type set) */}
              {editExtraType && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-2">
                    Extra runs (incl. 1 for Wd/Nb)
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6].map((r) => (
                      <button
                        key={r}
                        onClick={() => setEditExtraRuns(r)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                          editExtraRuns === r
                            ? "bg-blue-700 border-blue-500 text-white"
                            : "bg-gray-800 border-gray-700 text-gray-300"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Dismissal type (only if original delivery was a wicket) */}
              {editingDelivery.isWicket && (
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-2">
                    Dismissal type
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {DISMISSALS.map((d) => (
                      <button
                        key={d}
                        onClick={() =>
                          setEditDismissalType(
                            d.toUpperCase().replace(/ /g, "_"),
                          )
                        }
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                          editDismissalType ===
                          d.toUpperCase().replace(/ /g, "_")
                            ? "bg-red-800 border-red-600 text-red-200"
                            : "bg-gray-800 border-gray-700 text-gray-300"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Bowler */}
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">
                  Bowler
                </div>
                <button
                  onClick={() => setShowEditBowlerPicker(true)}
                  className="w-full py-2.5 px-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-left text-gray-200 active:scale-95 transition-all"
                >
                  {editBowlerName || editingDelivery.bowlerName || "Select bowler"}
                </button>
              </div>
              {/* Free hit */}
              <button
                onClick={() => setEditIsFreeHit((v) => !v)}
                className={`w-full py-2.5 px-3 border rounded-xl text-sm text-left flex items-center gap-3 transition-all ${
                  editIsFreeHit
                    ? "bg-orange-900/30 border-orange-700 text-orange-300"
                    : "bg-gray-800 border-gray-700 text-gray-500"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    editIsFreeHit
                      ? "bg-orange-500 border-orange-500"
                      : "border-gray-600"
                  }`}
                >
                  {editIsFreeHit && (
                    <span className="text-white text-xs">✓</span>
                  )}
                </div>
                Free hit delivery
              </button>
              <button
                disabled={posting}
                onClick={handleEditDeliverySave}
                className="w-full py-3.5 bg-blue-700 text-white rounded-xl font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
              >
                {posting ? "Saving & replaying..." : "Save & Rebuild Stats"}
              </button>
              <button
                onClick={() => {
                  setEditingDelivery(null);
                  setShowBallHistory(true);
                }}
                className="w-full py-2 text-gray-500 text-sm"
              >
                ← Back to history
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bowler picker for edit delivery */}
      {showEditBowlerPicker && (
        <PlayerSelector
          title="Select Bowler (for this delivery)"
          players={bowlingPlayers}
          exclude={[]}
          searchValue={showPlayerSearch}
          onSearchChange={setShowPlayerSearch}
          onClose={() => {
            setShowEditBowlerPicker(false);
            setShowPlayerSearch("");
          }}
          onSelect={(p) => {
            setEditBowlerPid(p.publicId);
            setEditBowlerName(p.displayName);
            setShowEditBowlerPicker(false);
            setShowPlayerSearch("");
          }}
        />
      )}

      {/* Wagon Wheel Modal — z-[80] above all other modals */}
      {showWagonWheel && striker && (
        <WagonWheelModal
          strikerName={striker.displayName}
          strikerBattingStyle={striker.battingStyle}
          runs={lastBallRuns}
          deliveryPublicId={lastDeliveryPublicId ?? ""}
          onSave={saveShotZone}
          onSkip={() => {
            setShowWagonWheel(false);
            setLastDeliveryPublicId(null);
          }}
        />
      )}

      {/* Pause match modal */}
      {showPauseModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
            <h3 className="text-base font-semibold text-white text-center mb-4">
              Pause Match
            </h3>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Reason
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {PAUSE_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setPauseReasonInput(r)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all active:scale-95 ${
                    pauseReasonInput === r
                      ? "bg-amber-600 border-amber-500 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Or type a custom reason…"
              value={pauseReasonInput}
              onChange={(e) => setPauseReasonInput(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 mb-4 outline-none focus:border-amber-600"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPauseModal(false);
                  setPauseReasonInput("");
                }}
                className="flex-1 h-11 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 text-sm font-semibold active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                disabled={posting}
                onClick={handlePauseMatch}
                className="flex-1 h-11 rounded-xl bg-amber-600 text-white text-sm font-semibold active:scale-95 transition-all disabled:opacity-40"
              >
                ⏸ Pause Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 border border-green-600 text-green-400 text-sm font-semibold px-6 py-2.5 rounded-full shadow-xl pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
