import { useState, useEffect, useCallback } from "react";
import { getPublicScorecard } from "../../api/scoring/publicApi";
import publicApi from "../../api/publicApi";
import { FieldSVG, ZONES } from "./WagonWheelModal";
import { useParams, useNavigate } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────────────
interface BattingLine {
  playerPublicId: string;
  playerName: string;
  battingOrder: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isStriker: boolean;
  isDismissed: boolean;
  dismissed: boolean;
  howOut: string;
  battingStyle?: string;
}

interface BowlingLine {
  playerPublicId: string;
  playerName: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
  dotBalls: number;
}

interface FallOfWicket {
  wicketNumber: number;
  playerName: string;
  scoreAtFall: number;
  overBall: string;
}

interface OverSummary {
  overNumber: number;
  runs: number;
  wickets: number;
  dotBalls: number;
  fours: number;
  sixes: number;
  cumulativeRuns: number;
}

interface InningsScorecard {
  inningsNumber: number;
  isSuperOver: boolean;
  battingTeamName: string;
  bowlingTeamName: string;
  status: string;
  totalRuns: number;
  totalWickets: number;
  totalBalls: number;
  target?: number;
  extrasTotal: number;
  extrasWide: number;
  extrasNoBall: number;
  extrasBye: number;
  extrasLegBye: number;
  runRate: number;
  battingCard: BattingLine[];
  didNotBat: string[];
  fallOfWickets: FallOfWicket[];
  bowlingCard: BowlingLine[];
  overBreakdown: OverSummary[];
}

interface PlayingXIPlayer {
  playerPublicId: string;
  playerName: string;
  battingOrder: number;
  isCaptain: boolean;
  isWicketkeeper: boolean;
  isForeign: boolean;
}

interface PlayingXITeam {
  teamId: string;
  teamName: string;
  players: PlayingXIPlayer[];
}

interface Scorecard {
  matchPublicId: string;
  title: string;
  matchType: string;
  status: string;
  matchDate: string;
  venue?: string;
  totalOvers: number;
  resultType?: string;
  resultDescription?: string;
  tossWinnerTeamName?: string;
  tossDecision?: string;
  playerOfMatchName?: string;
  playerOfMatchPublicId?: string;
  tournamentName?: string;
  tournamentPublicId?: string;
  ballName?: string;
  officials: { role: string; name: string; kscaId?: string }[];
  innings: InningsScorecard[];
  playingXI: PlayingXITeam[];
}

interface Shot {
  zone: string;
  runs: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtOvers = (balls: number, perOver = 6) =>
  `${Math.floor(balls / perOver)}.${balls % perOver}`;

const matchTypeBadge = (t: string) => {
  const map: Record<string, string> = {
    INTERNAL: "Practice",
    INTER_ACADEMY: "Inter-Academy",
    KSCA_TOURNAMENT: "KSCA",
  };
  return map[t] ?? t;
};

const statusColor = (s: string) => {
  if (s === "IN_PROGRESS")
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (s === "COMPLETED")
    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
};

const roleLabel: Record<string, string> = {
  UMPIRE_1: "Umpire",
  UMPIRE_2: "Umpire",
  TV_UMPIRE: "TV Umpire",
  RESERVE_UMPIRE: "Reserve",
  REFEREE: "Referee",
  SCORER: "Scorer",
};

// ── Playing XI Tab ────────────────────────────────────────────────────────────
const PlayingXITab = ({ playingXI }: { playingXI: PlayingXITeam[] }) => {
  if (!playingXI || playingXI.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-gray-400 text-sm">
        Playing XI not yet announced
      </div>
    );
  }

  const renderPlayerName = (p: PlayingXIPlayer) => (
    <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
      {p.playerName}
      {p.isCaptain && (
        <span className="text-gray-500 dark:text-gray-400 font-normal">
          {" "}
          (c)
        </span>
      )}
      {p.isWicketkeeper && (
        <span className="text-gray-500 dark:text-gray-400 font-normal"> †</span>
      )}
      {p.isForeign && <span className="text-orange-500 ml-1 text-xs">✈</span>}
    </span>
  );

  // Two columns side by side like Cricinfo
  if (playingXI.length >= 2) {
    const home = playingXI[0];
    const away = playingXI[1];
    const maxLen = Math.max(home.players.length, away.players.length);

    return (
      <div className="px-4 py-4">
        {/* Header row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {home.teamName}
          </div>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {away.teamName}
          </div>
        </div>

        {/* Player rows */}
        <div className="space-y-0 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
          {Array.from({ length: maxLen }).map((_, idx) => {
            const hp = home.players[idx];
            const ap = away.players[idx];
            return (
              <div
                key={idx}
                className={`grid grid-cols-2 gap-0 ${
                  idx % 2 === 0
                    ? "bg-white dark:bg-gray-900"
                    : "bg-gray-50/60 dark:bg-gray-800/40"
                }`}
              >
                {/* Home player */}
                <div className="px-3 py-2.5 border-r border-gray-100 dark:border-gray-800">
                  {hp ? (
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400 w-4 flex-shrink-0">
                          {hp.battingOrder}.
                        </span>
                        {renderPlayerName(hp)}
                      </div>
                    </div>
                  ) : null}
                </div>
                {/* Away player */}
                <div className="px-3 py-2.5">
                  {ap ? (
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400 w-4 flex-shrink-0">
                          {ap.battingOrder}.
                        </span>
                        {renderPlayerName(ap)}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-3 text-xs text-gray-400">
          <span>(c) Captain</span>
          <span>† Wicket-keeper</span>
          <span>✈ Overseas</span>
        </div>
      </div>
    );
  }

  // Single team fallback
  return (
    <div className="px-4 py-4">
      {playingXI.map((team) => (
        <div key={team.teamId} className="mb-6">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {team.teamName}
          </div>
          <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
            {team.players.map((p, idx) => (
              <div
                key={p.playerPublicId}
                className={`flex items-center gap-2 px-3 py-2.5 ${
                  idx % 2 === 0
                    ? "bg-white dark:bg-gray-900"
                    : "bg-gray-50/60 dark:bg-gray-800/40"
                } ${idx < team.players.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}`}
              >
                <span className="text-xs text-gray-400 w-5">
                  {p.battingOrder}.
                </span>
                {renderPlayerName(p)}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex gap-4 mt-2 text-xs text-gray-400">
        <span>(c) Captain</span>
        <span>† Wicket-keeper</span>
        <span>✈ Overseas</span>
      </div>
    </div>
  );
};

// ── Wagon Wheel Modal ─────────────────────────────────────────────────────────
const WagonWheelModal = ({
  batter,
  matchId,
  inningsNumber,
  onClose,
}: {
  batter: BattingLine;
  matchId: string;
  inningsNumber: number;
  onClose: () => void;
}) => {
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const isLHB = batter.battingStyle?.toLowerCase().includes("left") ?? false;
  const [isLHBView, setIsLHBView] = useState(isLHB);

  useEffect(() => {
    const fetch = async () => {
      try {
        const academyPublicId = localStorage.getItem("academyPublicId");
        if (!academyPublicId) { setShots([]); setLoading(false); return; }
        const res = await publicApi.get(
          `/public/scorecard/${matchId}/shots/${batter.playerPublicId}?innings=${inningsNumber}&academyPublicId=${academyPublicId}`,
        );
        setShots(res.data ?? []);
      } catch {
        setShots([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [matchId, batter.playerPublicId, inningsNumber]);

  const fours = shots.filter((s) => s.runs === 4).length;
  const sixes = shots.filter((s) => s.runs === 6).length;
  const singles = shots.filter((s) => s.runs === 1 || s.runs === 3).length;
  const twos = shots.filter((s) => s.runs === 2).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-gray-900 rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mt-3 mb-2 md:hidden" />
        <div className="px-4 pb-3 pt-2 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">
                {batter.playerName}
              </p>
              <p className="text-xs text-gray-400">
                {batter.runs}({batter.ballsFaced}) · {batter.fours}×4 ·{" "}
                {batter.sixes}×6
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">View as:</span>
            <div className="flex bg-gray-800 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setIsLHBView(false)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${!isLHBView ? "bg-blue-600 text-white" : "text-gray-400"}`}
              >
                RHB
              </button>
              <button
                onClick={() => setIsLHBView(true)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${isLHBView ? "bg-blue-600 text-white" : "text-gray-400"}`}
              >
                LHB
              </button>
            </div>
          </div>
        </div>
        <div className="px-4 py-3 bg-gray-900">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : shots.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <p className="text-2xl mb-2">🏏</p>
              <p className="text-sm">No shot zones recorded yet</p>
            </div>
          ) : (
            <>
              <FieldSVG isLHB={isLHBView} interactive={false} shots={shots} />
              <div className="flex gap-3 mt-2 justify-center flex-wrap">
                {[
                  { color: "bg-white", label: `1s/3s (${singles})` },
                  { color: "bg-blue-500", label: `2s (${twos})` },
                  { color: "bg-green-500", label: `4s (${fours})` },
                  { color: "bg-purple-500", label: `6s (${sixes})` },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className={`w-3 h-0.5 ${color} rounded-full`} />
                    <span className="text-xs text-gray-400">{label}</span>
                  </div>
                ))}
              </div>
              {shots.length > 0 && (
                <div className="mt-3 bg-gray-800 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-700">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Shot zones
                    </p>
                  </div>
                  <div className="divide-y divide-gray-700/50 max-h-40 overflow-y-auto">
                    {Object.entries(
                      shots.reduce(
                        (acc, s) => {
                          acc[s.zone] = (acc[s.zone] ?? 0) + s.runs;
                          return acc;
                        },
                        {} as Record<string, number>,
                      ),
                    )
                      .sort((a, b) => b[1] - a[1])
                      .map(([zone, runs]) => (
                        <div
                          key={zone}
                          className="flex justify-between items-center px-3 py-1.5"
                        >
                          <span className="text-xs text-gray-300">
                            {ZONES.find((z) => z.id === zone)?.label ?? zone}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {runs} runs
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div
          className="px-4 pb-5 pt-1"
          style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-800 text-gray-400 text-sm font-semibold rounded-xl active:scale-95 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Worm chart ────────────────────────────────────────────────────────────────
const WormChart = ({ innings }: { innings: InningsScorecard[] }) => {
  const allOvers = innings.flatMap((i) => i.overBreakdown);
  if (allOvers.length === 0) return null;

  const W = 560,
    H = 180,
    PAD = 36;
  const maxOvers = Math.max(...innings.map((i) => i.overBreakdown.length), 1);
  const maxRuns = Math.max(...allOvers.map((o) => o.cumulativeRuns), 1);
  const toX = (over: number) => PAD + (over / maxOvers) * (W - PAD * 2);
  const toY = (runs: number) => H - PAD - (runs / maxRuns) * (H - PAD * 2);
  const colors = ["#3b82f6", "#f97316"];

  const makePath = (overs: OverSummary[]) => {
    if (!overs.length) return "";
    const pts = [
      { x: toX(0), y: toY(0) },
      ...overs.map((o) => ({ x: toX(o.overNumber), y: toY(o.cumulativeRuns) })),
    ];
    return pts
      .map(
        (p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
      )
      .join(" ");
  };

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[320px]"
        style={{ maxHeight: 180 }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const y = toY(maxRuns * r);
          return (
            <g key={r}>
              <line
                x1={PAD}
                y1={y}
                x2={W - PAD}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeWidth={1}
              />
              <text
                x={PAD - 4}
                y={y + 4}
                fontSize={9}
                textAnchor="end"
                fill="currentColor"
                opacity={0.4}
              >
                {Math.round(maxRuns * r)}
              </text>
            </g>
          );
        })}
        {innings[0]?.overBreakdown
          .filter((_, i) => i % 5 === 4)
          .map((o) => (
            <text
              key={o.overNumber}
              x={toX(o.overNumber)}
              y={H - 6}
              fontSize={9}
              textAnchor="middle"
              fill="currentColor"
              opacity={0.4}
            >
              {o.overNumber}
            </text>
          ))}
        {innings.map((inn, i) => (
          <path
            key={i}
            d={makePath(inn.overBreakdown)}
            fill="none"
            stroke={colors[i]}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {innings.map((inn, i) => (
          <g key={i} transform={`translate(${PAD + i * 140}, 10)`}>
            <rect width={12} height={3} y={4} rx={1.5} fill={colors[i]} />
            <text x={16} y={12} fontSize={10} fill="currentColor" opacity={0.7}>
              {inn.battingTeamName}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// ── Over breakdown ────────────────────────────────────────────────────────────
const OverBreakdown = ({ overs }: { overs: OverSummary[] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm min-w-[360px]">
      <thead>
        <tr className="border-b border-gray-100 dark:border-gray-800">
          {["Over", "Runs", "Wkts", "Dots", "4s", "6s", "Total"].map((h) => (
            <th
              key={h}
              className="py-2 px-3 text-xs font-medium text-gray-400 text-right first:text-left"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {overs.map((o) => (
          <tr
            key={o.overNumber}
            className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30"
          >
            <td className="py-2 px-3 text-gray-500 dark:text-gray-400 text-left">
              {o.overNumber}
            </td>
            <td className="py-2 px-3 text-right font-medium text-gray-900 dark:text-gray-100">
              {o.runs}
            </td>
            <td className="py-2 px-3 text-right text-red-500">
              {o.wickets > 0 ? o.wickets : "—"}
            </td>
            <td className="py-2 px-3 text-right text-gray-400">{o.dotBalls}</td>
            <td className="py-2 px-3 text-right text-green-600 dark:text-green-400">
              {o.fours > 0 ? o.fours : "—"}
            </td>
            <td className="py-2 px-3 text-right text-purple-600 dark:text-purple-400">
              {o.sixes > 0 ? o.sixes : "—"}
            </td>
            <td className="py-2 px-3 text-right text-gray-500 dark:text-gray-400">
              {o.cumulativeRuns}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Innings scorecard ─────────────────────────────────────────────────────────
const InningsCard = ({
  inn,
  totalOvers,
  matchId,
  onBatterClick,
}: {
  inn: InningsScorecard;
  totalOvers: number;
  matchId: string;
  onBatterClick: (batter: BattingLine) => void;
}) => (
  <div className="space-y-0">
    <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/30">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
          {inn.battingTeamName}
          {inn.isSuperOver && (
            <span className="ml-2 text-xs text-orange-500">Super Over</span>
          )}
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          ({totalOvers} ovs max)
        </span>
      </div>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[460px]">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="py-2.5 px-4 text-xs font-medium text-gray-400 text-left w-[40%]">
              BATTING
            </th>
            <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-right">
              R
            </th>
            <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-right">
              B
            </th>
            <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-right">
              M
            </th>
            <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-right">
              4s
            </th>
            <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-right">
              6s
            </th>
            <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-right pr-4">
              SR
            </th>
          </tr>
        </thead>
        <tbody>
          {inn.battingCard.map((b) => (
            <tr
              key={b.playerPublicId}
              onClick={() => onBatterClick(b)}
              className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer active:bg-blue-100 transition-colors"
            >
              <td className="py-2.5 px-4">
                <div className="flex items-center gap-1.5">
                  <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    {b.playerName}
                    {b.isStriker && (
                      <span className="ml-1 text-green-600 dark:text-green-400 text-xs">
                        *
                      </span>
                    )}
                  </div>
                  <span className="text-gray-300 dark:text-gray-600 text-xs">
                    🎯
                  </span>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {b.howOut}
                </div>
              </td>
              <td className="py-2.5 px-2 text-right font-bold text-gray-900 dark:text-gray-100">
                {b.runs}
              </td>
              <td className="py-2.5 px-2 text-right text-gray-500 dark:text-gray-400">
                {b.ballsFaced}
              </td>
              <td className="py-2.5 px-2 text-right text-gray-400">—</td>
              <td className="py-2.5 px-2 text-right text-gray-600 dark:text-gray-300">
                {b.fours}
              </td>
              <td className="py-2.5 px-2 text-right text-gray-600 dark:text-gray-300">
                {b.sixes}
              </td>
              <td className="py-2.5 px-2 text-right pr-4 text-gray-500 dark:text-gray-400">
                {b.strikeRate.toFixed(2)}
              </td>
            </tr>
          ))}

          <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
            <td
              className="py-2 px-4 text-xs text-gray-500 dark:text-gray-400"
              colSpan={2}
            >
              Extras &nbsp;
              <span className="text-gray-400">
                (lb {inn.extrasLegBye}, w {inn.extrasWide}, nb{" "}
                {inn.extrasNoBall}, b {inn.extrasBye})
              </span>
            </td>
            <td
              className="py-2 px-2 text-right text-sm font-medium text-gray-700 dark:text-gray-300"
              colSpan={5}
            >
              {inn.extrasTotal}
            </td>
          </tr>

          <tr className="bg-gray-50 dark:bg-gray-900/40">
            <td className="py-2.5 px-4 font-semibold text-gray-900 dark:text-white text-sm">
              Total
              <span className="ml-2 text-xs font-normal text-gray-400">
                {fmtOvers(inn.totalBalls)} Ov (RR: {inn.runRate.toFixed(2)})
              </span>
            </td>
            <td
              colSpan={6}
              className="py-2.5 px-2 text-right pr-4 font-bold text-gray-900 dark:text-white"
            >
              {inn.totalRuns}/{inn.totalWickets}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="px-4 py-2 bg-blue-50/50 dark:bg-blue-950/10 border-t border-blue-100 dark:border-blue-900/20">
      <p className="text-xs text-blue-500 dark:text-blue-400">
        🎯 Tap any batter to view wagon wheel
      </p>
    </div>

    {inn.didNotBat.length > 0 && (
      <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Did Not Bat &nbsp;
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-300">
          {inn.didNotBat.join(", ")}
        </span>
      </div>
    )}

    {inn.fallOfWickets.length > 0 && (
      <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Fall of Wickets &nbsp;
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          {inn.fallOfWickets
            .map(
              (f) =>
                `${f.wicketNumber}-${f.scoreAtFall} (${f.playerName}, ${f.overBall} ov)`,
            )
            .join(", ")}
        </span>
      </div>
    )}

    <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-800">
      <table className="w-full text-sm min-w-[460px]">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="py-2.5 px-4 text-xs font-medium text-gray-400 text-left w-[35%]">
              BOWLING
            </th>
            <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-right">
              O
            </th>
            <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-right">
              M
            </th>
            <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-right">
              R
            </th>
            <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-right">
              W
            </th>
            <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-right">
              ECON
            </th>
            <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-right">
              WD
            </th>
            <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-right pr-4">
              NB
            </th>
          </tr>
        </thead>
        <tbody>
          {inn.bowlingCard.map((b) => (
            <tr
              key={b.playerPublicId}
              className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/20"
            >
              <td className="py-2.5 px-4 font-medium text-gray-900 dark:text-gray-100">
                {b.playerName}
              </td>
              <td className="py-2.5 px-2 text-right text-gray-500 dark:text-gray-400">
                {b.overs}
              </td>
              <td className="py-2.5 px-2 text-right text-gray-500 dark:text-gray-400">
                {b.maidens}
              </td>
              <td className="py-2.5 px-2 text-right text-gray-600 dark:text-gray-300">
                {b.runs}
              </td>
              <td className="py-2.5 px-2 text-right font-bold text-gray-900 dark:text-gray-100">
                {b.wickets}
              </td>
              <td className="py-2.5 px-2 text-right text-gray-500 dark:text-gray-400">
                {b.economy.toFixed(2)}
              </td>
              <td className="py-2.5 px-2 text-right text-gray-400">
                {b.wides}
              </td>
              <td className="py-2.5 px-2 text-right pr-4 text-gray-400">
                {b.noBalls}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function PublicScorecardPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<number | "xi" | "flow" | "info">(
    0,
  );
  const [copied, setCopied] = useState(false);
  const [selectedBatter, setSelectedBatter] = useState<BattingLine | null>(
    null,
  );
  const [selectedBatterInnings, setSelectedBatterInnings] = useState<number>(1);

  const load = useCallback(async () => {
    if (!matchId) return;
    try {
      const data = await getPublicScorecard(matchId);
      setScorecard(data);
    } catch {
      setError("Scorecard not found or match is not yet started.");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!scorecard) return;
    const liveIndex = scorecard.innings.findIndex(
      (inn) => inn.status === "IN_PROGRESS",
    );
    if (liveIndex !== -1) setActiveTab(liveIndex);
  }, [scorecard?.innings.length]);

  useEffect(() => {
    if (scorecard?.status !== "IN_PROGRESS") return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [scorecard?.status, load]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!scorecard) return;
    const summary = scorecard.innings
      .map(
        (i) =>
          `${i.battingTeamName}: ${i.totalRuns}/${i.totalWickets} (${fmtOvers(i.totalBalls)} ov)`,
      )
      .join("\n");
    const text = encodeURIComponent(
      `🏏 ${scorecard.title}\n${summary}\n${scorecard.resultDescription ?? ""}\n\n📊 Full scorecard: ${window.location.href}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleBatterClick = (batter: BattingLine, inningsNumber: number) => {
    setSelectedBatter(batter);
    setSelectedBatterInnings(inningsNumber);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading scorecard...</p>
        </div>
      </div>
    );

  if (error || !scorecard)
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-4xl mb-3">🏏</div>
          <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            Scorecard unavailable
          </p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );

  const isLive = scorecard.status === "IN_PROGRESS";

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* NCA header */}
      <div className="bg-blue-700 dark:bg-blue-900 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="text-white/80 hover:text-white transition p-1 -ml-1 active:scale-95"
            >
              ←
            </button>
            <div>
              <div className="text-white font-bold text-sm">NCA Mysuru</div>
              <div className="text-blue-200 text-xs">
                NextGen Cricket Academy
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg active:scale-95 transition-all"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.565 4.135 1.548 5.868L0 24l6.3-1.52A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.702-.508-5.25-1.395l-.375-.224-3.9.94.986-3.808-.244-.393A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
              </svg>
              Share
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg active:scale-95 transition-all"
            >
              {copied ? "✓ Copied!" : "🔗 Copy link"}
            </button>
          </div>
        </div>
      </div>

      {/* Match header */}
      <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-4 max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(scorecard.status)}`}
          >
            {isLive ? "🔴 LIVE" : scorecard.status.replace("_", " ")}
          </span>
          <span className="text-xs text-gray-400">
            {matchTypeBadge(scorecard.matchType)} · {scorecard.matchDate}
          </span>
          {scorecard.venue && (
            <span className="text-xs text-gray-400">📍 {scorecard.venue}</span>
          )}
          {scorecard.tournamentName && (
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {scorecard.tournamentName}
            </span>
          )}
        </div>

        <h1 className="text-base font-bold text-gray-900 dark:text-white mb-1">
          {scorecard.title}
        </h1>

        <div className="flex flex-col gap-1 mt-2">
          {scorecard.innings.map((inn) => (
            <div key={inn.inningsNumber} className="flex items-baseline gap-2">
              <span
                className={`text-lg font-bold ${inn.status === "IN_PROGRESS" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}
              >
                {inn.battingTeamName}
              </span>
              <span
                className={`text-2xl font-black tracking-tight ${inn.status === "IN_PROGRESS" ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}
              >
                {inn.totalRuns}/{inn.totalWickets}
              </span>
              <span className="text-sm text-gray-400">
                ({fmtOvers(inn.totalBalls)} ov)
                {inn.target && <span className="ml-1">T:{inn.target}</span>}
              </span>
            </div>
          ))}
        </div>

        {scorecard.resultDescription && (
          <div className="mt-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
            {scorecard.resultDescription}
          </div>
        )}
        {scorecard.tossWinnerTeamName && (
          <div className="mt-1 text-xs text-gray-400">
            {scorecard.tossWinnerTeamName} won the toss and elected to{" "}
            {scorecard.tossDecision?.toLowerCase()} first
          </div>
        )}
        {scorecard.playerOfMatchName && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-400">Player of the Match</span>
            <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
              🏅 {scorecard.playerOfMatchName}
            </span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-950 z-10">
        <div className="max-w-4xl mx-auto flex overflow-x-auto scrollbar-none">
          {scorecard.innings.map((inn, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === i
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              {inn.battingTeamName} Innings
            </button>
          ))}
          {/* Playing XI tab */}
          <button
            onClick={() => setActiveTab("xi")}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "xi"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
            }`}
          >
            Playing XI
          </button>
          <button
            onClick={() => setActiveTab("flow")}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "flow"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
            }`}
          >
            Match Flow
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "info"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
            }`}
          >
            Info
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-4xl mx-auto">
        {typeof activeTab === "number" && scorecard.innings[activeTab] && (
          <div className="border border-gray-100 dark:border-gray-800 rounded-b-xl overflow-hidden">
            <InningsCard
              inn={scorecard.innings[activeTab]}
              totalOvers={scorecard.totalOvers}
              matchId={matchId!}
              onBatterClick={(b) =>
                handleBatterClick(b, scorecard.innings[activeTab].inningsNumber)
              }
            />
          </div>
        )}

        {/* ── Playing XI tab ─────────────────────────────────────────────────── */}
        {activeTab === "xi" && (
          <PlayingXITab playingXI={scorecard.playingXI ?? []} />
        )}

        {/* ── Match Flow tab ──────────────────────────────────────────────────── */}
        {activeTab === "flow" && (
          <div className="px-4 py-5 space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Run Progression
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                <WormChart innings={scorecard.innings} />
              </div>
            </div>
            {scorecard.innings.map(
              (inn, i) =>
                inn.overBreakdown.length > 0 && (
                  <div key={i}>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      {inn.battingTeamName} — Over by Over
                    </h3>
                    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                      <OverBreakdown overs={inn.overBreakdown} />
                    </div>
                  </div>
                ),
            )}
          </div>
        )}

        {/* ── Info tab ─────────────────────────────────────────────────────────── */}
        {activeTab === "info" && (
          <div className="px-4 py-5">
            <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
              {[
                { label: "Date", value: scorecard.matchDate },
                { label: "Venue", value: scorecard.venue ?? "—" },
                {
                  label: "Format",
                  value: `${scorecard.totalOvers} overs · ${matchTypeBadge(scorecard.matchType)}`,
                },
                {
                  label: "Toss",
                  value: scorecard.tossWinnerTeamName
                    ? `${scorecard.tossWinnerTeamName}, elected to ${scorecard.tossDecision?.toLowerCase()} first`
                    : "—",
                },
                { label: "Result", value: scorecard.resultDescription ?? "—" },
                {
                  label: "Player of the Match",
                  value: scorecard.playerOfMatchName ?? "—",
                },
                // Ball name — only shown if tournament has flag set
                ...(scorecard.ballName
                  ? [{ label: "Ball Used", value: scorecard.ballName }]
                  : []),
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between items-start px-4 py-3"
                >
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-1/3">
                    {label}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-200 text-right w-2/3">
                    {value}
                  </span>
                </div>
              ))}

              {/* Officials section */}
              {scorecard.officials.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Match Officials
                    </span>
                  </div>
                  {scorecard.officials.map((o, i) => (
                    <div key={i} className="flex justify-between px-4 py-2.5">
                      <span className="text-xs text-gray-400">
                        {roleLabel[o.role] ?? o.role}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-200">
                        {o.name}
                        {o.kscaId ? ` (${o.kscaId})` : ""}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-300 dark:text-gray-700">
                Powered by NCA Mysuru · ncamysuru.com
              </p>
            </div>
          </div>
        )}
      </div>

      {isLive && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-green-400 text-xs px-4 py-2 rounded-full border border-green-800 shadow-lg">
          🔴 Live · refreshing every 15s
        </div>
      )}

      {selectedBatter && matchId && (
        <WagonWheelModal
          batter={selectedBatter}
          matchId={matchId}
          inningsNumber={selectedBatterInnings}
          onClose={() => setSelectedBatter(null)}
        />
      )}
    </div>
  );
}
