import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  postBall,
  undoLastBall,
  getScoringState,
  getThisOver,
  recordResult,
  awardPenalty,
} from "../../api/scoring/scoringApi";
import { getMatch, getTeams } from "../../api/scoring/matchApi";
import type {
  BallResponse,
  InningsState,
  BallDTO,
  ScoringPlayer,
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

const shouldRotateMidOver = (
  runs: number,
  isLegalBall: boolean,
  extra?: string,
): boolean => {
  if (extra === "WIDE") return runs % 2 !== 0;
  if (extra === "NO_BALL") return runs % 2 !== 0;
  if (!isLegalBall) return false;
  return runs % 2 !== 0;
};

const shouldRotateEndOfOver = (runs: number): boolean => {
  return runs % 2 === 0;
};

// At module level — not inside any function
const needsWagonWheel = (runs: number, extra?: string): boolean => {
  if (extra === "WIDE") return false;
  if (extra === "NO_BALL" && runs === 0) return false;
  return runs > 0;
};

interface BatterStats {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
}
const emptyStats = (): BatterStats => ({
  runs: 0,
  balls: 0,
  fours: 0,
  sixes: 0,
});

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
  const [showPenalty, setShowPenalty] = useState(false);
  const [overJustEnded, setOverJustEnded] = useState(false);
  const [isWideDelivery, setIsWideDelivery] = useState(false);
  const [dismissedPlayerIds, setDismissedPlayerIds] = useState<Set<string>>(
    new Set(),
  );

  const [nbPickerRuns, setNbPickerRuns] = useState<number | null>(null);
  const [showNbSubPicker, setShowNbSubPicker] = useState(false);
  const [showFiveSevenPicker, setShowFiveSevenPicker] = useState(false);

  // Missing — add with other useState declarations:
  const [runOutEnd, setRunOutEnd] = useState<"striker" | "nonstriker" | null>(
    null,
  );

  // ── Wagon wheel — read from localStorage (set during match setup) ──────────
  const wagonWheelEnabled = localStorage.getItem("nca_ww_enabled") !== "false";
  const [showWagonWheel, setShowWagonWheel] = useState(false);
  const [pendingExtra, setPendingExtra] = useState<
    | "BYE"
    | "LEG_BYE"
    | "WIDE"
    | "NO_BALL_BYE"
    | "NO_BALL_LB"
    | "NO_BALL_RUNS"
    | null
  >(null);
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
    Record<string, BatterStats>
  >({});
  const [bowlerBalls, setBowlerBalls] = useState(0);
  const [bowlerRuns, setBowlerRuns] = useState(0);
  const [bowlerWickets, setBowlerWickets] = useState(0);
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

  const loadingRef = useRef(false);

  const battingPlayersRef = useRef<ScoringPlayer[]>([]);
  const bowlingPlayersRef = useRef<ScoringPlayer[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
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
    try {
      const [m, ts] = await Promise.all([getMatch(matchId), getTeams(matchId)]);
      setMatch(m);
      setTeams(ts as CricketTeam[]);

      const teamPlayers: Record<string, ScoringPlayer[]> = {};
      for (const team of ts as CricketTeam[]) {
        const xi = await api
          .get(
            `/admin/cricket/matches/${matchId}/teams/${team.publicId}/players`,
          )
          .then((r) => r.data as Record<string, unknown>[]);

        teamPlayers[team.publicId] = xi
          .filter((mtp) => mtp.playerPublicId && mtp.displayName)
          .map((mtp) => {
            return {
              id: mtp.playerId as string | undefined,
              publicId: mtp.playerPublicId as string,
              displayName: mtp.displayName as string,
              battingStyle: mtp.battingStyle as string | undefined,
              bowlingStyle: mtp.bowlingStyle as string | undefined,
              isWicketkeeper: !!mtp.isWicketkeeper,
              isCaptain: !!mtp.isCaptain,
              playerRole: mtp.playerRole as string | undefined,
            };
          });
      }

      const inningsList = await api
        .get(`/admin/cricket/matches/${matchId}/innings`)
        .then((r) => r.data as Record<string, unknown>[])
        .catch(() => [] as Record<string, unknown>[]);

      const currentInnings = inningsList.find(
        (i) => i.status === "IN_PROGRESS",
      );
      if (currentInnings) {
        const batTeamId = currentInnings.battingTeamPublicId as string;
        const bowlTeamId = currentInnings.bowlingTeamPublicId as string;
        setBattingTeamId(batTeamId);
        setBowlingTeamId(bowlTeamId);
        setBattingPlayers(teamPlayers[batTeamId] ?? []);
        battingPlayersRef.current = teamPlayers[batTeamId] ?? [];
        setBowlingPlayers(teamPlayers[bowlTeamId] ?? []);
        bowlingPlayersRef.current = teamPlayers[bowlTeamId] ?? [];
      } else {
        const t0 = (ts as CricketTeam[])[0]?.publicId;
        const t1 = (ts as CricketTeam[])[1]?.publicId;
        setBattingTeamId(t0 ?? null);
        setBowlingTeamId(t1 ?? null);
        setBattingPlayers(teamPlayers[t0] ?? []);
        battingPlayersRef.current = teamPlayers[t0] ?? [];
        setBowlingPlayers(teamPlayers[t1] ?? []);
        bowlingPlayersRef.current = teamPlayers[t1] ?? [];
      }

      try {
        const state = await getScoringState(matchId);
        setInnings(state.inningsState);

        const deliveries = await api
          .get(`/admin/cricket/matches/${matchId}/scoring/deliveries`)
          .then((r) => r.data as Record<string, unknown>[])
          .catch(() => [] as Record<string, unknown>[]);

        const ballsPerOver = m.ballsPerOver ?? 6;
        const currentOverIndex = Math.floor(
          state.inningsState.totalBalls / ballsPerOver,
        );

        const overBowlers: Record<number, string> = {};
        deliveries.forEach((d) => {
          const overNum = d.overNumber as number;
          const bowlerInternalId = (d.bowler as Record<string, unknown>)
            ?.id as string;
          if (bowlerInternalId) overBowlers[overNum] = bowlerInternalId;
        });

        // Build oversMap keyed by publicId for bowler quota display
        const oversMap: Record<string, number> = {};
        Object.entries(overBowlers).forEach(([overIdx, bowlerInternalId]) => {
          if (Number(overIdx) < currentOverIndex) {
            const bowlerPlayer = bowlingPlayersRef.current.find(
              (p) => p.id === bowlerInternalId,
            );
            if (bowlerPlayer) {
              oversMap[bowlerPlayer.publicId] =
                (oversMap[bowlerPlayer.publicId] ?? 0) + 1;
            }
          }
        });
        setBowlerOversMap(oversMap);

        // lastBowlerPublicId — bowler of previous over
        const prevOverBowlerInternalId = overBowlers[currentOverIndex - 1];
        const prevOverBowlerPlayer = prevOverBowlerInternalId
          ? bowlingPlayersRef.current.find(
              (p) => p.id === prevOverBowlerInternalId,
            )
          : null;
        setLastBowlerPublicId(prevOverBowlerPlayer?.publicId ?? null);

        // ── Restore current bowler's in-progress over stats ──────────────────────
        const currentBowlerInternalId = overBowlers[currentOverIndex];
        if (currentBowlerInternalId) {
          const currentOverDeliveries = deliveries.filter((d) => {
            const overNum = d.overNumber as number;
            const bowlerInternalId = (d.bowler as Record<string, unknown>)
              ?.id as string;
            return (
              overNum === currentOverIndex &&
              bowlerInternalId === currentBowlerInternalId
            );
          });
          setBowlerBalls(
            currentOverDeliveries.filter((d) => d.isLegalBall as boolean)
              .length,
          );
          setBowlerRuns(
            currentOverDeliveries.reduce(
              (s, d) =>
                s +
                ((d.runsBatsman as number) ?? 0) +
                ((d.runsExtras as number) ?? 0),
              0,
            ),
          );
          setBowlerWickets(
            currentOverDeliveries.filter((d) => d.isWicket as boolean).length,
          );
        }

        const statsMap: Record<string, BatterStats> = {};
        deliveries.forEach((d) => {
          const batsmanInternalId = (d.batsman as Record<string, unknown>)
            ?.id as string;
          if (!batsmanInternalId) return;
          const batsmanPlayer = battingPlayersRef.current.find(
            (p) => p.id === batsmanInternalId,
          );
          const batsmanPid = batsmanPlayer?.publicId;
          if (!batsmanPid) return;
          if (!statsMap[batsmanPid]) statsMap[batsmanPid] = emptyStats();
          const runs = (d.runsBatsman as number) ?? 0;
          const isLegal = d.isLegalBall as boolean;
          const isWicket = d.isWicket as boolean;
          if (!isWicket) {
            statsMap[batsmanPid].runs += runs;
            if (isLegal) statsMap[batsmanPid].balls += 1;
            if (runs === 4) statsMap[batsmanPid].fours += 1;
            if (runs === 6) statsMap[batsmanPid].sixes += 1;
          }
        });
        setBatterStatsMap(statsMap);

        if (deliveries.length > 0 && currentInnings) {
          const last = deliveries[deliveries.length - 1];

          const batTeamId = currentInnings.battingTeamPublicId as string;
          const bowlTeamId = currentInnings.bowlingTeamPublicId as string;
          const allBatters = teamPlayers[batTeamId] ?? [];
          const allBowlers = teamPlayers[bowlTeamId] ?? [];

          const batsmanId = (last.batsman as Record<string, unknown>)
            ?.id as string;

          const nonStrikerId = (last.nonStriker as Record<string, unknown>)
            ?.id as string;
          const bowlerId = (last.bowler as Record<string, unknown>)
            ?.id as string;

          setStriker(allBatters.find((p) => p.id === batsmanId) ?? null);
          setNonStriker(allBatters.find((p) => p.id === nonStrikerId) ?? null);
          setBowler(allBowlers.find((p) => p.id === bowlerId) ?? null);

          // If we're at the start of a new over (no balls yet in current over),
          // clear bowler and require re-selection
          const ballsInCurrentOver =
            state.inningsState.totalBalls % (m.ballsPerOver ?? 6);
          if (ballsInCurrentOver === 0 && state.inningsState.totalBalls > 0) {
            setBowler(null);
            setOverJustEnded(true);
          }

          // Restore partnership — balls/runs since last wicket
          const lastWicketIndex = deliveries.reduce(
            (lastIdx, d, idx) => (d.isWicket ? idx : lastIdx),
            -1,
          );
          const partnershipDeliveries = deliveries.slice(lastWicketIndex + 1);
          const pRuns = partnershipDeliveries.reduce((s, d) => {
            const extraType = d.extraType as string | undefined;
            const byeRuns =
              extraType === "BYE" || extraType === "LEG_BYE"
                ? ((d.runsExtras as number) ?? 0)
                : 0;
            return s + ((d.runsBatsman as number) ?? 0) + byeRuns;
          }, 0);
          const pBalls = partnershipDeliveries.filter(
            (d) => d.isLegalBall as boolean,
          ).length;
          setPartnershipRuns(pRuns);
          setPartnershipBalls(pBalls);

          // Restore free hit — last ball was a no ball?
          const lastDel = deliveries[deliveries.length - 1];
          const lastExtra = (lastDel?.extraType as string) ?? null;
          setIsFreeHit(lastExtra === "NO_BALL");

          const dismissed = new Set<string>();
          deliveries.forEach((d) => {
            if (d.isWicket) {
              const dismissedPid =
                (d.dismissedPlayerPublicId as string) ??
                ((d.dismissedPlayer as Record<string, unknown>)
                  ?.publicId as string);
              if (dismissedPid) dismissed.add(dismissedPid);
            }
          });
          setDismissedPlayerIds(dismissed);
        }

        await refreshOver();
      } catch {
        /* no innings yet */
      }
    } catch {
      setError("Failed to load match");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const applyState = (state: BallResponse) => {
    setInnings(state.inningsState);
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
    console.log(
      "[score] called — bowler:",
      bowler?.displayName ?? "null",
      "overJustEnded:",
      overJustEnded,
    );

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

    const currentStriker = striker;
    const currentNonStriker = nonStriker;

    const isLegalBall = !extra || !["WIDE", "NO_BALL"].includes(extra);
    const nextFreeHit = extra === "NO_BALL";
    const totalRunsScored = runs + (extra ? extraRuns : 0);

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

      if (isLegalBall || runs > 0) {
        setBatterStatsMap((prev) => {
          const existing = prev[currentStriker.publicId] ?? emptyStats();
          return {
            ...prev,
            [currentStriker.publicId]: {
              runs: existing.runs + runs,
              balls: existing.balls + (isLegalBall ? 1 : 0),
              fours: existing.fours + (runs === 4 ? 1 : 0),
              sixes: existing.sixes + (runs === 6 ? 1 : 0),
            },
          };
        });
      }

      if (isLegalBall) setBowlerBalls((b) => b + 1);
      setBowlerRuns((r) => r + runs + (extra ? extraRuns : 0));
      setIsFreeHit(nextFreeHit);

      if (isLegalBall) {
        setPartnershipBalls((b) => b + 1);
        setPartnershipRuns(
          (r) =>
            r +
            runs +
            (["BYE", "LEG_BYE"].includes(extra ?? "") ? extraRuns : 0),
        );
      }

      setThisOver((prev) => [...prev, currentBallForSummary]);
      applyState(state);
      showToast("✓ Ball saved");

      // Gate wagon wheel on the pre-match setting
      if (
        wagonWheelEnabled &&
        state.lastDeliveryPublicId &&
        needsWagonWheel(runs, extra)
      ) {
        setLastDeliveryPublicId(state.lastDeliveryPublicId);
        setLastBallRuns(runs);
        setShowWagonWheel(true);
      }

      if (state.overComplete) {
        console.log("[score] overComplete=true, clearing bowler");
        const rotateEndOfOver = shouldRotateEndOfOver(totalRunsScored);
        if (rotateEndOfOver) {
          setStriker(currentNonStriker);
          setNonStriker(currentStriker);
        }

        setLastOverNumber(innings?.overNumber ?? 1);
        const overSnap = [...thisOver, currentBallForSummary];
        setLastOverBalls(overSnap);
        setLastOverRuns(
          overSnap.reduce((s, b) => s + b.runsBatsman + b.runsExtras, 0),
        );
        setBowlerBalls(0);
        setBowlerRuns(0);
        setBowlerWickets(0);
        setThisOver([]);
        setShowOverSummary(true);
        if (bowler) {
          setBowlerOversMap((prev) => ({
            ...prev,
            [bowler.publicId]: (prev[bowler.publicId] ?? 0) + 1,
          }));
          setLastBowlerPublicId(bowler.publicId);
        }
        setShowBowlerSelect(true);
        setBowler(null);
        setOverJustEnded(true);
      } else {
        const physicalRunsCrossed =
          extra === "WIDE"
            ? extraRuns - 1
            : extra === "NO_BALL" && runs === 0
              ? extraRuns - 1
              : extra === "BYE" || extra === "LEG_BYE"
                ? extraRuns
                : runs;
        const rotateMidOver = shouldRotateMidOver(
          physicalRunsCrossed,
          isLegalBall,
          extra,
        );
        if (rotateMidOver) {
          setStriker(currentNonStriker);
          setNonStriker(currentStriker);
        }
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
    if (!dismissalType) {
      setError("Select dismissal type");
      return;
    }
    if (!striker || !nonStriker) {
      setError("Select striker and non-striker first");
      return;
    }
    if (!bowler) {
      setError("Select bowler first");
      return;
    }
    if (!matchId) return;

    const capturedStriker = striker;
    const capturedNonStriker = nonStriker;
    const capturedDismissedPlayer = dismissedPlayer;

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

      if (pendingRuns > 0 && !isWideDelivery) {
        setBatterStatsMap((prev) => {
          const pid = capturedStriker.publicId;
          const existing = prev[pid] ?? emptyStats();
          return {
            ...prev,
            [pid]: {
              ...existing,
              runs: existing.runs + pendingRuns,
              balls: existing.balls + 1,
            },
          };
        });
      } else if (!isWideDelivery) {
        setBatterStatsMap((prev) => {
          const pid = capturedStriker.publicId;
          const existing = prev[pid] ?? emptyStats();
          return { ...prev, [pid]: { ...existing, balls: existing.balls + 1 } };
        });
      }
      // Wide delivery — no balls faced, no runs credited to batter

      if (!isWideDelivery) setBowlerBalls((b) => b + 1);
      setBowlerWickets((w) => w + 1);
      setBowlerRuns((r) => r + (isWideDelivery ? 1 : pendingRuns)); // wide penalty goes to bowler's runs
      setShowWicket(false);

      setPartnershipRuns(0);
      setPartnershipBalls(0);

      // Wagon wheel for runs on wicket ball
      if (wagonWheelEnabled && state.lastDeliveryPublicId && pendingRuns > 0) {
        setLastDeliveryPublicId(state.lastDeliveryPublicId);
        setLastBallRuns(pendingRuns);
        setShowWagonWheel(true);
      }

      setDismissalType("");
      setDismissedPlayer(null);
      setFielder(null);
      setRunOutEnd(null);
      setIsFreeHit(false);
      setIsWideDelivery(false);

      setThisOver((prev) => [...prev, wicketBallForSummary]);
      applyState(state);
      showToast("✓ Wicket saved");

      const nonStrikerWasOut =
        capturedDismissedPlayer?.publicId === capturedNonStriker?.publicId;

      if (state.overComplete) {
        setStriker(capturedNonStriker);
        setNonStriker(null);

        setLastOverNumber(innings?.overNumber ?? 1);
        const overSnap = [...thisOver, wicketBallForSummary];
        setLastOverBalls(overSnap);
        setLastOverRuns(
          overSnap.reduce((s, b) => s + b.runsBatsman + b.runsExtras, 0),
        );
        setBowlerBalls(0);
        setBowlerRuns(0);
        setBowlerWickets(0);
        setThisOver([]);
        setShowOverSummary(true);
        if (bowler) {
          setBowlerOversMap((prev) => ({
            ...prev,
            [bowler.publicId]: (prev[bowler.publicId] ?? 0) + 1,
          }));
          setLastBowlerPublicId(bowler.publicId);
        }
        setShowBowlerSelect(true);
        setBowler(null);
        setOverJustEnded(true);
      } else {
        if (nonStrikerWasOut) {
          if (runOutEnd === "nonstriker") {
            // Out at non-striker end — Rahul crossed, now at striker end
            setStriker(capturedStriker);
            setNonStriker(null);
          } else {
            // Out at striker end — no crossing, Rahul stays at non-striker end
            setStriker(null);
            setNonStriker(capturedStriker);
          }
        } else {
          // Striker was out
          if (pendingRuns % 2 !== 0) {
            setNonStriker(capturedNonStriker);
          }
        }
      }

      const nextDismissedIds = new Set(dismissedPlayerIds);
      if (capturedDismissedPlayer?.publicId)
        nextDismissedIds.add(capturedDismissedPlayer.publicId);
      setDismissedPlayerIds(nextDismissedIds);

      const availableBatters = battingPlayers.filter(
        (p) =>
          !nextDismissedIds.has(p.publicId) &&
          p.publicId !== capturedNonStriker?.publicId,
      );

      if (!state.inningsComplete && availableBatters.length > 0) {
        if (nonStrikerWasOut && runOutEnd === "nonstriker") {
          setShowBatterSelect("nonstriker");
        } else {
          setShowBatterSelect("striker");
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
      setInnings(state.inningsState);

      const deliveries = await api
        .get(`/admin/cricket/matches/${matchId}/scoring/deliveries`)
        .then((r) => r.data as Record<string, unknown>[])
        .catch(() => [] as Record<string, unknown>[]);
      const statsMap: Record<string, BatterStats> = {};
      deliveries.forEach((d) => {
        const batsmanInternalId = (d.batsman as Record<string, unknown>)
          ?.id as string;
        if (!batsmanInternalId) return;
        const batsmanPlayer = battingPlayersRef.current.find(
          (p) => p.id === batsmanInternalId,
        );
        const batsmanPid = batsmanPlayer?.publicId;
        if (!batsmanPid) return;
        if (!statsMap[batsmanPid]) statsMap[batsmanPid] = emptyStats();
        const runs = (d.runsBatsman as number) ?? 0;
        const isLegal = d.isLegalBall as boolean;
        const isWicket = d.isWicket as boolean;
        if (!isWicket) {
          statsMap[batsmanPid].runs += runs;
          if (isLegal) statsMap[batsmanPid].balls += 1;
          if (runs === 4) statsMap[batsmanPid].fours += 1;
          if (runs === 6) statsMap[batsmanPid].sixes += 1;
        } else {
          if (isLegal) statsMap[batsmanPid].balls += 1;
          statsMap[batsmanPid].runs += runs;
        }
      });
      setBatterStatsMap(statsMap);
      // Restore partnership after undo
      const lastWicketIndex = deliveries.reduce(
        (lastIdx, d, idx) => ((d.isWicket as boolean) ? idx : lastIdx),
        -1,
      );
      const partnershipDeliveries = deliveries.slice(lastWicketIndex + 1);
      setPartnershipRuns(
        partnershipDeliveries.reduce((s, d) => {
          const extraType = d.extraType as string | undefined;
          const byeRuns =
            extraType === "BYE" || extraType === "LEG_BYE"
              ? ((d.runsExtras as number) ?? 0)
              : 0;
          return s + ((d.runsBatsman as number) ?? 0) + byeRuns;
        }, 0),
      );
      setPartnershipBalls(
        partnershipDeliveries.filter((d) => d.isLegalBall as boolean).length,
      );
      // Restore free hit flag after undo
      if (deliveries.length > 0) {
        const lastDel = deliveries[deliveries.length - 1];
        setIsFreeHit((lastDel?.extraType as string) === "NO_BALL");
      } else {
        setIsFreeHit(false);
      }
      // Restore bowler current over stats after undo
      if (deliveries.length > 0) {
        const last = deliveries[deliveries.length - 1];

        const lastBowlerInternalId = (last.bowler as Record<string, unknown>)
          ?.id as string;
        const lastOverNum = last.overNumber as number;

        if (lastBowlerInternalId && lastOverNum !== undefined) {
          const currentOverDeliveries = deliveries.filter((d) => {
            const overNum = d.overNumber as number;
            const bowlerInternalId = (d.bowler as Record<string, unknown>)
              ?.id as string;
            return (
              overNum === lastOverNum &&
              bowlerInternalId === lastBowlerInternalId
            );
          });
          setBowlerBalls(
            currentOverDeliveries.filter((d) => d.isLegalBall as boolean)
              .length,
          );
          setBowlerRuns(
            currentOverDeliveries.reduce(
              (s, d) =>
                s +
                ((d.runsBatsman as number) ?? 0) +
                ((d.runsExtras as number) ?? 0),
              0,
            ),
          );
          setBowlerWickets(
            currentOverDeliveries.filter((d) => d.isWicket as boolean).length,
          );
        }
      }
      // Restore striker/nonStriker/bowler from deliveries after undo
      if (deliveries.length > 0) {
        const last = deliveries[deliveries.length - 1];
        const batsmanId = (last.batsman as Record<string, unknown>)
          ?.id as string;

        const nonStrikerId = (last.nonStriker as Record<string, unknown>)
          ?.id as string;
        const bowlerId = (last.bowler as Record<string, unknown>)?.id as string;
        setStriker(
          battingPlayersRef.current.find((p) => p.id === batsmanId) ?? null,
        );
        setNonStriker(
          battingPlayersRef.current.find((p) => p.id === nonStrikerId) ?? null,
        );
        setBowler(
          bowlingPlayersRef.current.find((p) => p.id === bowlerId) ?? null,
        );
      } else {
        setStriker(null);
        setNonStriker(null);
        setBowler(null);
      }
      const dismissedAfterUndo = new Set<string>();
      deliveries.forEach((d) => {
        if (d.isWicket) {
          const pid =
            (d.dismissedPlayerPublicId as string) ??
            ((d.dismissedPlayer as Record<string, unknown>)
              ?.publicId as string);
          if (pid) dismissedAfterUndo.add(pid);
        }
      });
      setDismissedPlayerIds(dismissedAfterUndo);
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
      battingPlayersRef.current = bowlingPlayers;
      setBowlingPlayers(battingPlayers);
      bowlingPlayersRef.current = battingPlayers;
      setStriker(null);
      setNonStriker(null);
      setBowler(null);
      setBowlerBalls(0);
      setBowlerRuns(0);
      setBowlerWickets(0);
      setThisOver([]);
      setIsFreeHit(false);
      setInnings(null);
      setDismissedPlayerIds(new Set());
      setBowlerOversMap({});
      setLastBowlerPublicId(null);
      setBatterStatsMap({});
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
  const strikerStats = batterStatsMap[striker?.publicId ?? ""] ?? emptyStats();
  const nonStrikerStats =
    batterStatsMap[nonStriker?.publicId ?? ""] ?? emptyStats();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col select-none">
      {/* ── MATCH HEADER ── */}
      <div className="bg-white border-b border-gray-200 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            {match?.title} · {match?.totalOvers} Ov
          </span>
          <button
            onClick={() => setShowCloseInnings(true)}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 active:scale-95"
          >
            ⚙
          </button>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold tracking-tight text-gray-900">
            {totalRuns}/{totalWickets}
          </span>
          <span className="text-xl text-gray-400 font-medium">
            ({Math.floor(totalBalls / (match?.ballsPerOver ?? 6))}.
            {totalBalls % (match?.ballsPerOver ?? 6)} ov)
          </span>
        </div>
        <div className="flex gap-4 mt-1 text-xs text-gray-500">
          <span>
            CRR <b className="text-gray-700">{crr}</b>
          </span>
          {innings?.target && (
            <>
              <span>
                Target <b className="text-gray-700">{innings.target}</b>
              </span>
              <span className="text-orange-500 font-semibold">
                Need {innings.requiredRuns}
              </span>
            </>
          )}
          {isFreeHit && (
            <span className="text-orange-500 font-bold animate-pulse">
              FREE HIT
            </span>
          )}
        </div>
      </div>

      {/* ── BATTERS ── */}
      <div className="bg-white px-4 py-2 border-b border-gray-200 space-y-1">
        {[
          { player: striker, stats: strikerStats, isStriker: true },
          { player: nonStriker, stats: nonStrikerStats, isStriker: false },
        ].map(({ player, stats, isStriker }) => (
          <button
            key={isStriker ? "striker" : "ns"}
            onClick={() =>
              setShowBatterSelect(isStriker ? "striker" : "nonstriker")
            }
            className="w-full flex items-center justify-between py-1 active:bg-gray-50 rounded-lg px-1 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${isStriker ? "bg-teal-500" : "bg-transparent border border-gray-300"}`}
              />
              <span
                className={`text-sm font-medium ${player ? "text-gray-900" : "text-gray-400"}`}
              >
                {player?.displayName ??
                  (isStriker ? "Select striker" : "Select non-striker")}
              </span>
              {isStriker && player && (
                <span className="text-teal-500 text-xs font-bold">*</span>
              )}
            </div>
            {player && (
              <span className="text-xs text-gray-500">
                <b className="text-gray-900">{stats.runs}</b>
                <span className="text-gray-400">({stats.balls})</span>
                {stats.fours > 0 && (
                  <span className="ml-1 text-green-600">4s:{stats.fours}</span>
                )}
                {stats.sixes > 0 && (
                  <span className="ml-1 text-purple-600">6s:{stats.sixes}</span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── PARTNERSHIP + BOWLER ── */}
      <div className="bg-white border-b border-gray-200 divide-y divide-gray-100">
        {striker && nonStriker && (
          <div className="px-4 py-1.5 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Partnership: <b className="text-gray-600">{partnershipRuns}</b> (
              {partnershipBalls}b)
            </span>
            {partnershipBalls > 0 && (
              <span className="text-xs text-gray-400">
                RR:{" "}
                <b className="text-gray-600">
                  {((partnershipRuns / partnershipBalls) * 6).toFixed(2)}
                </b>
              </span>
            )}
          </div>
        )}
        <button
          onClick={() => setShowBowlerSelect(true)}
          className="w-full px-4 py-2 flex justify-between items-center active:bg-gray-50 transition-colors"
        >
          <span className="text-xs text-gray-500">
            <span className="text-gray-400">Bowling </span>
            <b className="text-gray-900">
              {bowler?.displayName ?? "Select bowler"}
            </b>
          </span>
          <span className="text-xs text-gray-400 font-mono">
            {Math.floor(bowlerBalls / (match?.ballsPerOver ?? 6))}-0-
            {bowlerRuns}-{bowlerWickets}
          </span>
        </button>
      </div>

      {/* ── OVER STRIP ── */}
      <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 uppercase min-w-[48px]">
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

      {/* ── ALERTS ── */}
      {error && (
        <div className="mx-3 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
          {error}
        </div>
      )}
      {overJustEnded && !bowler && (
        <div className="mx-3 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center justify-between">
          <span>⚠ Over complete — select a new bowler</span>
          <button
            onClick={() => setShowBowlerSelect(true)}
            className="ml-2 px-3 py-1 bg-teal-600 text-white rounded-lg text-xs font-semibold active:scale-95"
          >
            Select
          </button>
        </div>
      )}

      {/* ── SCORING PAD ── */}
      <div className="flex-1 bg-gray-100 px-3 pt-3 pb-2">
        {/* Run buttons: 3 cols + right column */}
        <div className="flex gap-2 mb-2">
          {/* Left: 3x2 run grid */}
          <div className="flex-1 grid grid-cols-3 gap-2">
            {[0, 1, 2, 3].map((r) => (
              <button
                key={r}
                disabled={posting}
                onClick={() => score(r)}
                className="h-14 rounded-xl text-2xl font-bold bg-white border border-gray-200 text-gray-800 active:bg-gray-50 active:scale-95 transition-all disabled:opacity-40 shadow-sm"
              >
                {r}
              </button>
            ))}
            <button
              disabled={posting}
              onClick={() => score(4)}
              className="h-14 rounded-xl text-xl font-bold bg-white border border-green-200 text-green-700 active:scale-95 transition-all disabled:opacity-40 shadow-sm"
            >
              4<div className="text-xs font-normal text-green-500">Four</div>
            </button>
            <button
              disabled={posting}
              onClick={() => score(6)}
              className="h-14 rounded-xl text-xl font-bold bg-white border border-purple-200 text-purple-700 active:scale-95 transition-all disabled:opacity-40 shadow-sm"
            >
              6<div className="text-xs font-normal text-purple-500">Six</div>
            </button>
          </div>

          {/* Right column: UNDO, 5/7, OUT */}
          <div className="flex flex-col gap-2 w-16">
            <button
              disabled={posting}
              onClick={handleUndo}
              className="h-14 rounded-xl text-xs font-bold text-teal-600 bg-white border border-gray-200 active:scale-95 transition-all disabled:opacity-40 shadow-sm"
            >
              ↩<div>UNDO</div>
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
              className="h-14 rounded-xl text-xs font-bold text-gray-600 bg-white border border-gray-200 active:scale-95 transition-all disabled:opacity-40 shadow-sm"
            >
              5, 7
            </button>
            <button
              disabled={posting}
              onClick={() => openWicket(0)}
              className="h-14 rounded-xl text-sm font-bold text-red-600 bg-white border border-red-200 active:scale-95 transition-all disabled:opacity-40 shadow-sm"
            >
              OUT
            </button>
          </div>
        </div>

        {/* Extras row: WD, NB, BYE, LB */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "WD", key: "WIDE" },
            { label: "NB", key: "NO_BALL" },
            { label: "BYE", key: "BYE" },
            { label: "LB", key: "LEG_BYE" },
          ].map(({ label, key }) => (
            <button
              key={key}
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
                if (key === "NO_BALL") {
                  setPendingExtra("NO_BALL_RUNS"); // trigger NB picker
                } else {
                  setPendingExtra(key as typeof pendingExtra);
                }
              }}
              className="h-11 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-600 active:scale-95 transition-all disabled:opacity-40 shadow-sm"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── BATTER SELECTOR ── */}
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
          ].filter(Boolean)}
          searchValue={showPlayerSearch}
          onSearchChange={setShowPlayerSearch}
          onClose={closeSelector}
          onSelect={(p) => {
            if (showBatterSelect === "striker") setStriker(p);
            else setNonStriker(p);
            setShowBatterSelect(null);
            setShowPlayerSearch("");
          }}
        />
      )}

      {/* ── BOWLER SELECTOR ── */}
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
            <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
              <div className="w-full bg-white rounded-t-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100">
                  <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-900 text-center">
                    Select Bowler
                  </h3>
                  <p className="text-xs text-gray-400 text-center mt-1">
                    Max {maxOvers} over{maxOvers !== 1 ? "s" : ""} per bowler
                  </p>
                  <input
                    autoFocus
                    type="text"
                    className="mt-3 w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none"
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
                            ? "⚠ No bowler left"
                            : p.wouldWarn
                              ? `⚠ Only 1 left after`
                              : `${p.oversUsed}/${maxOvers} ov`;
                      const reasonColor =
                        p.isMaxed || p.isLastBowler || p.wouldDeadlock
                          ? "text-red-500"
                          : p.wouldWarn
                            ? "text-amber-500"
                            : "text-gray-400";
                      return (
                        <button
                          key={p.publicId}
                          disabled={hardDisabled}
                          onClick={() => {
                            if (hardDisabled) return;
                            setBowler(p);
                            setBowlerBalls(0);
                            setBowlerRuns(0);
                            setBowlerWickets(0);
                            setOverJustEnded(false);
                            setShowBowlerSelect(false);
                            setShowPlayerSearch("");
                          }}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-left transition-all ${hardDisabled ? "bg-gray-50 opacity-40 cursor-not-allowed" : "bg-gray-50 hover:bg-gray-100 active:scale-95"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {p.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
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
                <div className="p-3 border-t border-gray-100">
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

      {/* ── FIELDER SELECTOR ── */}
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

      {/* ── WICKET MODAL ── */}
      {showWicket && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-900 text-center">
                How out?
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs text-gray-400 uppercase mb-2">
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
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all active:scale-95 ${dismissalType === d ? "bg-red-500 border-red-500 text-white" : "bg-gray-50 border-gray-200 text-gray-700"}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase mb-2">
                  Batter out
                </div>
                <div className="flex gap-2">
                  {[striker, nonStriker].filter(Boolean).map((p) => (
                    <button
                      key={p!.publicId}
                      onClick={() => setDismissedPlayer(p!)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-sm border transition-all active:scale-95 ${dismissedPlayer?.publicId === p!.publicId ? "bg-red-500 border-red-500 text-white" : "bg-gray-50 border-gray-200 text-gray-700"}`}
                    >
                      {p!.displayName}
                      {p === striker ? " *" : ""}
                    </button>
                  ))}
                </div>
              </div>
              {["Caught", "Stumped", "Run Out"].includes(dismissalType) && (
                <div>
                  <div className="text-xs text-gray-400 uppercase mb-2">
                    Fielder{" "}
                    {dismissalType === "Stumped" && fielder && (
                      <span className="ml-1 text-teal-500 normal-case">
                        (auto: WK)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowFielderSelect(true)}
                    className={`w-full py-2.5 px-3 border rounded-xl text-sm text-left transition-all ${fielder ? "bg-teal-50 border-teal-200 text-teal-800" : "bg-gray-50 border-gray-200 text-gray-400"}`}
                  >
                    {fielder?.displayName ?? "Tap to select fielder →"}
                  </button>
                  {dismissalType === "Stumped" && (
                    <button
                      onClick={() => setIsWideDelivery((prev) => !prev)}
                      className={`mt-2 w-full py-2.5 px-3 border rounded-xl text-sm text-left transition-all flex items-center gap-3 ${isWideDelivery ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-gray-50 border-gray-200 text-gray-500"}`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isWideDelivery ? "bg-amber-500 border-amber-500" : "border-gray-300"}`}
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
                        <div className="text-xs text-gray-400 uppercase mb-2">
                          Run out at which end?
                        </div>
                        <div className="flex gap-2">
                          {["striker", "nonstriker"].map((end) => (
                            <button
                              key={end}
                              onClick={() =>
                                setRunOutEnd(end as "striker" | "nonstriker")
                              }
                              className={`flex-1 py-2.5 rounded-xl text-sm border transition-all active:scale-95 ${runOutEnd === end ? "bg-teal-600 border-teal-600 text-white" : "bg-gray-50 border-gray-200 text-gray-700"}`}
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
                <div className="text-xs text-gray-400 uppercase mb-2">
                  Runs on this ball
                </div>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map((r) => (
                    <button
                      key={r}
                      onClick={() => setPendingRuns(r)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 ${pendingRuns === r ? "bg-teal-600 border-teal-600 text-white" : "bg-gray-50 border-gray-200 text-gray-700"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <button
                disabled={!dismissalType || !dismissedPlayer || posting}
                onClick={confirmWicket}
                className="w-full py-3.5 bg-red-500 text-white rounded-xl font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
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
                className="w-full py-2 text-gray-400 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WIDE PICKER ── */}
      {pendingExtra === "WIDE" && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 text-center mb-1">
              Wide ball{" "}
              <span className="text-gray-400 font-normal text-sm">(WD=1)</span>
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
                  className="h-14 rounded-xl text-sm font-bold bg-gray-50 border border-gray-200 text-gray-800 active:bg-teal-50 active:border-teal-300 active:scale-95 transition-all disabled:opacity-40"
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

      {/* ── NB PICKER (step 1: runs) ── */}
      {pendingExtra === "NO_BALL_RUNS" && nbPickerRuns === null && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 text-center mb-1">
              No ball{" "}
              <span className="text-gray-400 font-normal text-sm">(NB=1)</span>
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
                  className="h-14 rounded-xl text-sm font-bold bg-gray-50 border border-gray-200 text-gray-800 active:bg-teal-50 active:border-teal-300 active:scale-95 transition-all disabled:opacity-40"
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

      {/* ── NB PICKER (step 2: run type) ── */}
      {showNbSubPicker && nbPickerRuns !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 text-center mb-1">
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
                className="py-4 rounded-xl text-sm font-bold bg-gray-50 border border-gray-200 text-gray-800 active:bg-teal-50 active:border-teal-300 active:scale-95 transition-all"
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
                className="py-4 rounded-xl text-sm font-bold bg-gray-50 border border-gray-200 text-gray-800 active:bg-teal-50 active:border-teal-300 active:scale-95 transition-all"
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
                className="py-4 rounded-xl text-sm font-bold bg-gray-50 border border-gray-200 text-gray-800 active:bg-teal-50 active:border-teal-300 active:scale-95 transition-all"
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

      {/* ── BYE PICKER ── */}
      {pendingExtra === "BYE" && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 text-center mb-4">
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
                  className="flex-1 h-14 rounded-xl text-xl font-bold bg-gray-50 border border-gray-200 text-gray-800 active:bg-teal-50 active:border-teal-300 active:scale-95 transition-all disabled:opacity-40"
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

      {/* ── LEG BYE PICKER ── */}
      {pendingExtra === "LEG_BYE" && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 text-center mb-4">
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
                  className="flex-1 h-14 rounded-xl text-xl font-bold bg-gray-50 border border-gray-200 text-gray-800 active:bg-teal-50 active:border-teal-300 active:scale-95 transition-all disabled:opacity-40"
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

      {/* ── 5/7 PICKER ── */}
      {showFiveSevenPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 text-center mb-4">
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
                  className="flex-1 h-16 rounded-xl text-3xl font-bold bg-gray-50 border border-gray-200 text-gray-800 active:bg-teal-50 active:border-teal-300 active:scale-95 transition-all disabled:opacity-40"
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

      {/* ── PENALTY MODAL ── */}
      {showPenalty && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-gray-900 text-center mb-1">
              Penalty Runs
            </h3>
            <p className="text-xs text-gray-400 text-center mb-5">
              5 runs — select which side is facing the penalty
            </p>
            <div className="space-y-2 mb-3">
              <button
                disabled={posting}
                onClick={async () => {
                  if (!matchId) return;
                  setPosting(true);
                  try {
                    const state = await awardPenalty(matchId, "FIELDING");
                    setInnings(state.inningsState);
                    showToast("✓ 5 penalty runs awarded");
                    setShowPenalty(false);
                  } catch {
                    setError("Failed to award penalty");
                  } finally {
                    setPosting(false);
                  }
                }}
                className="w-full py-3.5 bg-gray-50 border border-gray-200 text-gray-800 rounded-xl text-sm font-semibold active:scale-95 disabled:opacity-40"
              >
                🏏 Batting side gets 5 runs
                <div className="text-xs text-gray-400 font-normal mt-0.5">
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
                    setInnings(state.inningsState);
                    showToast("✓ 5 penalty runs awarded");
                    setShowPenalty(false);
                  } catch {
                    setError("Failed to award penalty");
                  } finally {
                    setPosting(false);
                  }
                }}
                className="w-full py-3.5 bg-gray-50 border border-gray-200 text-gray-800 rounded-xl text-sm font-semibold active:scale-95 disabled:opacity-40"
              >
                🏏 Batting side gets 5 runs
                <div className="text-xs text-gray-400 font-normal mt-0.5">
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

      {/* ── OVER SUMMARY ── */}
      {showOverSummary && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-5 shadow-xl">
            <div className="text-center mb-4">
              <div className="text-3xl mb-1">🏏</div>
              <h3 className="text-base font-bold text-gray-900">
                Over Complete!
              </h3>
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
              className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold text-sm active:scale-95"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── MATCH CONTROLS ── */}
      {showCloseInnings && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-gray-900 text-center mb-1">
              Match Controls
            </h3>
            <p className="text-xs text-gray-400 text-center mb-4">
              {totalRuns}/{totalWickets} ·{" "}
              {fmtOvers(totalBalls, match?.ballsPerOver)} overs
            </p>
            <div className="space-y-2">
              <button
                onClick={handleCloseInnings}
                disabled={posting}
                className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-semibold text-sm active:scale-95 disabled:opacity-40"
              >
                Close Innings
              </button>
              <button
                onClick={() => {
                  setShowCloseInnings(false);
                  setShowResult(true);
                }}
                className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-semibold text-sm active:scale-95"
              >
                End Match & Record Result
              </button>
              <button
                onClick={() => {
                  setShowPenalty(true);
                  setShowCloseInnings(false);
                }}
                className="w-full py-3.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm active:scale-95"
              >
                Award Penalty Runs
              </button>
              <button
                onClick={() => setShowCloseInnings(false)}
                className="w-full py-2 text-gray-400 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECORD RESULT ── */}
      {showResult && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-gray-900 text-center mb-3">
              Match Result
            </h3>
            {autoResult && (
              <div className="mb-4 px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-center">
                <div className="text-xs text-teal-600 uppercase tracking-wide mb-1">
                  Auto-calculated
                </div>
                <div className="text-base font-bold text-gray-900">
                  {autoResult.resultDescription}
                </div>
                <div className="text-xs text-teal-500 mt-1">
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
                    className={`py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${resultType === rt ? "bg-teal-600 border-teal-600 text-white" : "bg-gray-50 border-gray-200 text-gray-600"}`}
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
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none"
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
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none"
                  placeholder='e.g. "Team A won by 25 runs"'
                  value={resultDesc}
                  onChange={(e) => setResultDesc(e.target.value)}
                />
              </div>
              <button
                disabled={!resultType || posting}
                onClick={handleResult}
                className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-bold text-sm disabled:opacity-40 active:scale-95"
              >
                {posting ? "Saving..." : "Confirm Result"}
              </button>
              <button
                onClick={() => setShowResult(false)}
                className="w-full py-2 text-gray-400 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WAGON WHEEL ── */}
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

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-xl pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
