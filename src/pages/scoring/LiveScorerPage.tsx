import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  postBall,
  undoLastBall,
  getScoringState,
  getThisOver,
  recordResult,
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

// ── PlayerSelector defined OUTSIDE component — prevents search losing focus ───
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
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
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
                {p.battingStyle && (
                  <div className="text-xs text-gray-400">{p.battingStyle}</div>
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

// ── Helper to build over snap from raw delivery data ──────────────────────────
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
        ? "Nb"
        : d.extraType === "LEG_BYE"
          ? "Lb"
          : d.extraType === "BYE"
            ? "B"
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

export default function LiveScorerPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<CricketMatch | null>(null);

  const [teams, setTeams] = useState<CricketTeam[]>([]);
  // FIX 1: teams declared but never read — removed, use ts directly in loadAll
  const [innings, setInnings] = useState<InningsState | null>(null);
  const [thisOver, setThisOver] = useState<BallDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [dismissedPlayerIds, setDismissedPlayerIds] = useState<Set<string>>(
    new Set(),
  );

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

  const [strikerRuns, setStrikerRuns] = useState(0);
  const [strikerBalls, setStrikerBalls] = useState(0);
  const [strikerFours, setStrikerFours] = useState(0);
  const [strikerSixes, setStrikerSixes] = useState(0);
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

  const loadingRef = useRef(false);

  // FIX 2: useEffect dependency — loadAll is stable (defined outside effect scope)
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
      // FIX 1: removed setTeams(ts) since teams state was unused

      const teamPlayers: Record<string, ScoringPlayer[]> = {};
      for (const team of ts as CricketTeam[]) {
        const xi = await api
          .get(
            `/admin/cricket/matches/${matchId}/teams/${team.publicId}/players`,
          )
          .then((r) => r.data as Record<string, unknown>[]);
        teamPlayers[team.publicId] = xi
          .filter((mtp) => mtp.playerPublicId && mtp.displayName)
          .map((mtp) => ({
            publicId: mtp.playerPublicId as string,
            displayName: mtp.displayName as string,
            battingStyle: mtp.battingStyle as string | undefined,
            bowlingStyle: mtp.bowlingStyle as string | undefined,
          }));
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
        setBowlingPlayers(teamPlayers[bowlTeamId] ?? []);
      } else {
        const t0 = (ts as CricketTeam[])[0]?.publicId;
        const t1 = (ts as CricketTeam[])[1]?.publicId;
        setBattingTeamId(t0 ?? null);
        setBowlingTeamId(t1 ?? null);
        setBattingPlayers(teamPlayers[t0] ?? []);
        setBowlingPlayers(teamPlayers[t1] ?? []);
      }

      try {
        const state = await getScoringState(matchId);
        setInnings(state.inningsState);
        await refreshOver();
      } catch {
        // no innings yet
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
    if (state.inningsComplete) setShowCloseInnings(true);
  };

  const refreshOver = useCallback(async () => {
    if (!matchId) return;
    try {
      const over = await getThisOver(matchId);
      setThisOver((over as Record<string, unknown>[]).map(mapToBallDTO));
    } catch {
      /* silent */
    }
  }, [matchId]);

  const getOverSnap = async (): Promise<BallDTO[]> => {
    if (!matchId) return [];
    try {
      const over = await getThisOver(matchId);
      return (over as Record<string, unknown>[]).map(mapToBallDTO);
    } catch {
      return [];
    }
  };

  const score = async (runs: number, extra?: string, extraRuns = 1) => {
    if (!matchId || !striker || !nonStriker || !bowler) {
      setError("Set striker, non-striker and bowler first");
      return;
    }
    if (posting) return;
    setPosting(true);
    setError("");
    const isLegalBall = !extra || !["WIDE", "NO_BALL"].includes(extra);
    const nextFreeHit = extra === "NO_BALL";
    try {
      const state = await postBall(matchId, {
        bowlerPublicId: bowler.publicId,
        batsmanPublicId: striker.publicId,
        nonStrikerPublicId: nonStriker.publicId,
        runsBatsman: runs,
        runsExtras: extra ? extraRuns : 0,
        // FIX 3: extraType must match the union type — cast correctly
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
      setStrikerRuns((r) => r + runs);
      if (isLegalBall) setStrikerBalls((b) => b + 1);
      if (runs === 4) setStrikerFours((f) => f + 1);
      if (runs === 6) setStrikerSixes((s) => s + 1);
      if (isLegalBall) setBowlerBalls((b) => b + 1);
      setBowlerRuns((r) => r + runs + (extra ? extraRuns : 0));
      setIsFreeHit(nextFreeHit);
      if (isLegalBall && runs % 2 !== 0) {
        setStriker(nonStriker);
        setNonStriker(striker);
      }
      await refreshOver();
      applyState(state);
      if (state.overComplete) {
        const overSnap = await getOverSnap();
        setLastOverBalls(overSnap);
        setLastOverRuns(
          overSnap.reduce((s, b) => s + b.runsBatsman + b.runsExtras, 0),
        );
        setStriker(nonStriker);
        setNonStriker(striker);
        setBowlerBalls(0);
        setBowlerRuns(0);
        setBowlerWickets(0);
        setThisOver([]);
        setShowOverSummary(true);
        // Record this bowler's over count and mark as last bowler
        if (bowler) {
          setBowlerOversMap((prev) => ({
            ...prev,
            [bowler.publicId]: (prev[bowler.publicId] ?? 0) + 1,
          }));
          setLastBowlerPublicId(bowler.publicId);
        }
        setShowBowlerSelect(true);
      }
    } catch (e: unknown) {
      // FIX 4: catch(e: any) → catch(e: unknown) with type guard
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

    setPosting(true);
    setError("");
    try {
      const state = await postBall(matchId, {
        bowlerPublicId: bowler.publicId,
        batsmanPublicId: striker.publicId,
        nonStrikerPublicId: nonStriker.publicId,
        runsBatsman: pendingRuns,
        runsExtras: 0,
        extraType: null,
        isWicket: true,
        dismissalType: dismissalType.toUpperCase().replace(/ /g, "_"),
        dismissedPlayerPublicId: dismissedPlayer?.publicId,
        fielderPublicId: fielder?.publicId || undefined,
        isFreeHit,
      });
      setStrikerBalls((b) => b + 1);
      setBowlerBalls((b) => b + 1);
      setStrikerRuns((r) => r + pendingRuns);
      setBowlerRuns((r) => r + pendingRuns);
      setBowlerWickets((w) => w + 1);
      setShowWicket(false);
      setDismissedPlayerIds((prev) => {
        const next = new Set(prev);
        if (dismissedPlayer?.publicId) next.add(dismissedPlayer.publicId);
        return next;
      });
      setDismissalType("");
      setDismissedPlayer(null);
      setFielder(null);
      setIsFreeHit(false);
      setStrikerRuns(0);
      setStrikerBalls(0);
      setStrikerFours(0);
      setStrikerSixes(0);
      await refreshOver();
      applyState(state);
      if (state.overComplete) {
        const overSnap = await getOverSnap();
        setLastOverBalls(overSnap);
        setLastOverRuns(
          overSnap.reduce((s, b) => s + b.runsBatsman + b.runsExtras, 0),
        );
        setStriker(nonStriker);
        setNonStriker(striker);
        setBowlerBalls(0);
        setBowlerRuns(0);
        setBowlerWickets(0);
        setThisOver([]);
        setShowOverSummary(true);
        setShowBowlerSelect(true);
      }
      setShowBatterSelect("striker");
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
      setDismissedPlayerIds(new Set());
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
      setStrikerRuns(0);
      setStrikerBalls(0);
      setStrikerFours(0);
      setStrikerSixes(0);
      setBowlerBalls(0);
      setBowlerRuns(0);
      setBowlerWickets(0);
      setThisOver([]);
      setIsFreeHit(false);
      setInnings(null);
      setDismissedPlayerIds(new Set());
      setBowlerOversMap({});
      setLastBowlerPublicId(null);
      await loadAll();
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
    if (!innings) return null;
    const { totalRuns, totalWickets, target, inningsNumber } = innings;
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
  }, [innings, battingTeamName, bowlingTeamName]);

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
  const overNum = innings?.overNumber ?? 1;
  const crr = innings
    ? fmtCRR(totalRuns, totalBalls, match?.ballsPerOver ?? 6)
    : "0.00";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col select-none">
      {/* Match header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-3 pb-2">
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

      {/* Batters */}
      <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 space-y-1.5">
        {[
          {
            player: striker,
            runs: strikerRuns,
            balls: strikerBalls,
            fours: strikerFours,
            sixes: strikerSixes,
            isStriker: true,
          },
          {
            player: nonStriker,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            isStriker: false,
          },
        ].map(({ player, runs, balls, fours, sixes, isStriker }) => (
          <button
            key={isStriker ? "striker" : "ns"}
            onClick={() =>
              setShowBatterSelect(isStriker ? "striker" : "nonstriker")
            }
            className="w-full flex items-center justify-between active:bg-gray-800 rounded-lg px-1 py-0.5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${isStriker ? "bg-green-400" : "bg-transparent border border-gray-600"}`}
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
                <b className="text-white">{runs}</b>({balls})
                {fours > 0 && (
                  <span className="ml-1 text-green-400">4s:{fours}</span>
                )}
                {sixes > 0 && (
                  <span className="ml-1 text-purple-400">6s:{sixes}</span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bowler */}
      <button
        onClick={() => setShowBowlerSelect(true)}
        className="bg-gray-950 px-4 py-2 border-b border-gray-800 flex justify-between items-center w-full active:bg-gray-900 transition-colors"
      >
        <span className="text-xs text-gray-600">
          BOWLING &nbsp;
          <b className="text-gray-300">
            {bowler?.displayName ?? "Select bowler"}
          </b>
        </span>
        <span className="text-xs text-gray-500">
          {Math.floor(bowlerBalls / (match?.ballsPerOver ?? 6))}-0-{bowlerRuns}-
          {bowlerWickets}
        </span>
      </button>

      {/* Over strip */}
      <div className="bg-gray-900 px-4 py-2.5 border-b border-gray-800 flex items-center gap-2 flex-wrap">
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

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-900/30 border border-red-800 rounded-xl text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Scoring pad */}
      <div className="flex-1 px-3 pt-4 pb-2">
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
          {[
            {
              label: "Wide",
              extra: "WIDE",
              cls: "text-amber-400 border-amber-900",
            },
            {
              label: "No Ball",
              extra: "NO_BALL",
              cls: "text-orange-400 border-orange-900",
            },
            {
              label: "Leg Bye",
              extra: "LEG_BYE",
              cls: "text-gray-400 border-gray-700",
            },
            {
              label: "Bye",
              extra: "BYE",
              cls: "text-gray-400 border-gray-700",
            },
            {
              label: "5 Runs",
              extra: undefined,
              cls: "text-gray-400 border-gray-700",
              runs: 5,
            },
            {
              label: "Penalty",
              extra: "PENALTY",
              cls: "text-gray-400 border-gray-700",
            },
          ].map(({ label, extra, cls, runs }) => (
            <button
              key={label}
              disabled={posting}
              onClick={() => score(runs ?? 0, extra)}
              className={`h-11 rounded-xl text-xs font-semibold bg-gray-900 border transition-all active:scale-90 disabled:opacity-40 ${cls}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-3 pb-6 flex gap-2">
        <button
          disabled={posting}
          onClick={handleUndo}
          className="flex-1 h-11 rounded-xl bg-gray-900 border border-red-900 text-red-400 text-sm font-semibold active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <span>↩</span> Undo Last Ball
        </button>
        <button
          onClick={() => setShowCloseInnings(true)}
          className="w-11 h-11 rounded-xl bg-gray-900 border border-gray-700 text-gray-500 flex items-center justify-center text-lg active:scale-95"
        >
          ⚙
        </button>
      </div>

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
          ].filter(Boolean)}
          searchValue={showPlayerSearch}
          onSearchChange={setShowPlayerSearch}
          onClose={closeSelector}
          onSelect={(p) => {
            if (showBatterSelect === "striker") {
              setStriker(p);
              setStrikerRuns(0);
              setStrikerBalls(0);
              setStrikerFours(0);
              setStrikerSixes(0);
            } else {
              setNonStriker(p);
            }
            setShowBatterSelect(null);
            setShowPlayerSearch("");
          }}
        />
      )}

      {/* Bowler selector */}
      {/* Bowler selector */}
      {showBowlerSelect &&
        (() => {
          const maxOvers = match ? Math.floor(match.totalOvers / 5) : 99;
          const bowlersWithStatus = bowlingPlayers.map((p) => {
            const oversUsed = bowlerOversMap[p.publicId] ?? 0;
            const isMaxed = maxOvers > 0 && oversUsed >= maxOvers;
            const isLastBowler = p.publicId === lastBowlerPublicId;
            return { ...p, oversUsed, isMaxed, isLastBowler };
          });

          return (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
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
                      const disabled = p.isMaxed || p.isLastBowler;
                      const reason = p.isMaxed
                        ? `Quota full (${p.oversUsed}/${maxOvers} ov)`
                        : p.isLastBowler
                          ? "Bowled last over"
                          : `${p.oversUsed}/${maxOvers} ov`;
                      return (
                        <button
                          key={p.publicId}
                          disabled={disabled}
                          onClick={() => {
                            if (disabled) return;
                            setBowler(p);
                            setBowlerBalls(0);
                            setBowlerRuns(0);
                            setBowlerWickets(0);
                            setShowBowlerSelect(false);
                            setShowPlayerSearch("");
                          }}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                            disabled
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
                            className={`text-xs flex-shrink-0 ${
                              p.isMaxed || p.isLastBowler
                                ? "text-red-400"
                                : "text-gray-500"
                            }`}
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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end">
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
                      onClick={() => setDismissalType(d)}
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
                  </div>
                  <button
                    onClick={() => setShowFielderSelect(true)}
                    className="w-full py-2.5 px-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-left text-gray-300"
                  >
                    {fielder?.displayName ?? "Tap to select fielder →"}
                  </button>
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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-700 p-5">
            <div className="text-center mb-4">
              <div className="text-3xl mb-1">🏏</div>
              <h3 className="text-base font-bold text-white">Over Complete!</h3>
              <p className="text-sm text-gray-400 mt-1">
                Over {overNum - 1} · {lastOverRuns} runs ·{" "}
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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end">
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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end">
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
    </div>
  );
}
