import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Trophy,
  Calendar,
  MapPin,
  User,
  Zap,
  Target,
  Shield,
} from "lucide-react";
import api from "../../api/axios";
import { getImageUrl } from "../../utils/imageUrl";
import { toast } from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

type PlayerStat = {
  id: string;
  matchDate: string;
  opponentName: string;
  groundName?: string;
  place?: string;
  tournamentName?: string;
  format?: string;
  runs?: number;
  ballsFaced?: number;
  minutesFaced?: number;
  fours?: number;
  sixes?: number;
  battingStrikeRate?: number;
  oversBowled?: number;
  maidens?: number;
  runsConceded?: number;
  wicketsTaken?: number;
  bowlingEconomy?: number;
  dotBallsBowled?: number;
  foursConceded?: number;
  sixesConceded?: number;
  widesConceded?: number;
  noBallsConceded?: number;
  catchesTaken?: number;
};

type PlayerInfo = {
  displayName: string;
  photoUrl?: string;
  publicId?: string;
  dob?: string;
  gender?: string;
  profession?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  skillLevel?: string;
  schoolOrCollege?: string;
  batch?: string;
  active?: boolean;
  status?: string;
};

type StatsGroupedByMonth = { [monthYear: string]: PlayerStat[] };

// Format canonical names shown as column headers
const FORMAT_LABELS: Record<string, string> = {
  T20: "T20",
  ODI: "50 Over",
  "50 Over": "50 Over",
  "50over": "50 Over",
  Test: "Test",
  TEST: "Test",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonthYear(monthYear: string) {
  const [year, month] = monthYear.split("-");
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
    "en-US",
    {
      month: "short",
      year: "numeric",
    },
  );
}

function formatDOB(dob?: string) {
  if (!dob) return null;
  return new Date(dob).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getAge(dob?: string) {
  if (!dob) return null;
  return Math.floor(
    (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25),
  );
}

// Normalize raw format strings → canonical key
function normalizeFormat(f?: string): string {
  if (!f) return "Other";
  const trimmed = f.trim();
  return FORMAT_LABELS[trimmed] ?? trimmed;
}

// ─── Career Aggregates ────────────────────────────────────────────────────────

type BattingRow = {
  matches: number;
  innings: number;
  runs: number;
  balls: number;
  highest: number;
  avg: string;
  sr: string;
  notOut: number;
  fours: number;
  sixes: number;
  ducks: number;
  fifties: number;
  hundreds: number;
};

type BowlingRow = {
  matches: number;
  innings: number;
  balls: number;
  runs: number;
  wickets: number;
  avg: string;
  econ: string;
  sr: string;
  dots: number;
  fours: number;
  sixes: number;
  wides: number;
  noBalls: number;
  fourW: number;
  fiveW: number;
};

function computeBatting(stats: PlayerStat[]): BattingRow {
  const batted = stats.filter((s) => s.runs !== null && s.runs !== undefined);
  const runs = batted.reduce((a, s) => a + (s.runs ?? 0), 0);
  const balls = batted.reduce((a, s) => a + (s.ballsFaced ?? 0), 0);
  const fours = batted.reduce((a, s) => a + (s.fours ?? 0), 0);
  const sixes = batted.reduce((a, s) => a + (s.sixes ?? 0), 0);
  const highest = batted.length
    ? Math.max(...batted.map((s) => s.runs ?? 0))
    : 0;
  const innings = batted.length;
  const ducks = batted.filter((s) => (s.runs ?? 0) === 0).length;
  const fifties = batted.filter(
    (s) => (s.runs ?? 0) >= 50 && (s.runs ?? 0) < 100,
  ).length;
  const hundreds = batted.filter((s) => (s.runs ?? 0) >= 100).length;
  const avg = innings > 0 ? (runs / innings).toFixed(2) : "-";
  const sr = balls > 0 ? ((runs * 100) / balls).toFixed(2) : "-";

  return {
    matches: stats.length,
    innings,
    runs,
    balls,
    highest,
    avg,
    sr,
    notOut: 0, // not tracked in current model
    fours,
    sixes,
    ducks,
    fifties,
    hundreds,
  };
}

function computeBowling(stats: PlayerStat[]): BowlingRow {
  const bowled = stats.filter(
    (s) => s.oversBowled !== null && s.oversBowled !== undefined,
  );
  const overs = bowled.reduce((a, s) => a + (s.oversBowled ?? 0), 0);
  // Convert overs to balls (e.g. 4.3 overs = 4*6+3 = 27 balls)
  const totalBalls = bowled.reduce((a, s) => {
    const o = s.oversBowled ?? 0;
    const full = Math.floor(o);
    const partial = Math.round((o - full) * 10);
    return a + full * 6 + partial;
  }, 0);
  const runs = bowled.reduce((a, s) => a + (s.runsConceded ?? 0), 0);
  const wickets = bowled.reduce((a, s) => a + (s.wicketsTaken ?? 0), 0);
  const dots = bowled.reduce((a, s) => a + (s.dotBallsBowled ?? 0), 0);
  const fours = bowled.reduce((a, s) => a + (s.foursConceded ?? 0), 0);
  const sixes = bowled.reduce((a, s) => a + (s.sixesConceded ?? 0), 0);
  const wides = bowled.reduce((a, s) => a + (s.widesConceded ?? 0), 0);
  const noBalls = bowled.reduce((a, s) => a + (s.noBallsConceded ?? 0), 0);

  const avg = wickets > 0 ? (runs / wickets).toFixed(2) : "-";
  const econ = overs > 0 ? (runs / overs).toFixed(2) : "-";
  const sr = wickets > 0 ? (totalBalls / wickets).toFixed(1) : "-";
  const fourW = bowled.filter((s) => (s.wicketsTaken ?? 0) === 4).length;
  const fiveW = bowled.filter((s) => (s.wicketsTaken ?? 0) >= 5).length;

  return {
    matches: stats.length,
    innings: bowled.length,
    balls: totalBalls,
    runs,
    wickets,
    avg,
    econ,
    sr,
    dots,
    fours,
    sixes,
    wides,
    noBalls,
    fourW,
    fiveW,
  };
}

function groupByFormat(allStats: PlayerStat[]): Record<string, PlayerStat[]> {
  const grouped: Record<string, PlayerStat[]> = {};
  for (const s of allStats) {
    const key = normalizeFormat(s.format);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }
  return grouped;
}

// ─── Main Component ───────────────────────────────────────────────────────────

function PlayerStatsPage() {
  const { playerPublicId } = useParams();
  const [stats, setStats] = useState<StatsGroupedByMonth>({});
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    loadAll();
  }, [playerPublicId]);

  const loadAll = async () => {
    if (!playerPublicId) return;
    try {
      setLoading(true);
      const [statsRes, infoRes] = await Promise.all([
        api.get(`/admin/cricket-stats/${playerPublicId}`),
        api.get(`/admin/players/${playerPublicId}/info`), // same endpoint as PlayerInfoPage ✅
      ]);
      setStats(statsRes.data);
      setPlayer(infoRes.data);
      const months = Object.keys(statsRes.data);
      if (months.length > 0) setSelectedMonth(months[0]);
    } catch {
      toast.error("Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading stats...</p>
        </div>
      </div>
    );
  }

  const months = Object.keys(stats);
  const allStats = months.flatMap((m) => stats[m]);
  const byFormat = groupByFormat(allStats);
  const selectedStats = selectedMonth ? (stats[selectedMonth] ?? []) : [];

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
      <aside className="w-full lg:w-72 flex-shrink-0">
        <PlayerProfileCard
          player={player}
          allStats={allStats}
          byFormat={byFormat}
        />
      </aside>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 space-y-4">
        {months.length === 0 ? (
          <div className="bg-white rounded-lg border p-10 text-center">
            <Trophy size={40} className="text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">
              No Stats Yet
            </h3>
            <p className="text-sm text-gray-500">
              Statistics will appear once matches are recorded.
            </p>
          </div>
        ) : (
          <>
            {/* Month filter */}
            <div className="bg-white rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <Calendar size={15} className="text-blue-600" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Filter by Month
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {months.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      selectedMonth === m
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {formatMonthYear(m)}{" "}
                    <span className="opacity-70">({stats[m].length})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Match cards */}
            <div className="space-y-3">
              {selectedStats.map((stat) => (
                <MatchStatCard key={stat.id} stat={stat} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Player Profile Card ──────────────────────────────────────────────────────

function PlayerProfileCard({
  player,
  allStats,
  byFormat,
}: {
  player: PlayerInfo | null;
  allStats: PlayerStat[];
  byFormat: Record<string, PlayerStat[]>;
}) {
  const age = getAge(player?.dob);
  const photoSrc = player?.photoUrl ? getImageUrl(player.photoUrl) : null;

  // Determine which formats exist (preserve T20 → 50 Over → Test order)
  const formatOrder = ["T20", "50 Over", "Test"];
  const presentFormats = formatOrder.filter(
    (f) => byFormat[f] && byFormat[f].length > 0,
  );
  // Add any unknown formats at the end
  Object.keys(byFormat).forEach((f) => {
    if (!formatOrder.includes(f) && byFormat[f].length > 0)
      presentFormats.push(f);
  });

  // Has any batting / bowling across all formats?
  const hasBatting = allStats.some(
    (s) => s.runs !== null && s.runs !== undefined,
  );
  const hasBowling = allStats.some(
    (s) => s.oversBowled !== null && s.oversBowled !== undefined,
  );

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Photo header */}
      <div className="bg-gradient-to-b from-blue-700 to-blue-900 px-6 pt-6 pb-8 flex flex-col items-center">
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={player?.displayName}
            className="w-24 h-24 rounded-full object-cover border-4 border-white/30 shadow-lg"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              (
                e.currentTarget.nextElementSibling as HTMLElement
              )?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div
          className={`w-24 h-24 rounded-full bg-blue-500/40 border-4 border-white/20 flex items-center justify-center ${
            photoSrc ? "hidden" : ""
          }`}
        >
          <User size={40} className="text-white/60" />
        </div>

        <h2 className="mt-3 text-white font-bold text-lg leading-tight text-center">
          {player?.displayName ?? "—"}
        </h2>
        {player?.status && (
          <span
            className={`mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              player.active
                ? "bg-green-400/20 text-green-300"
                : "bg-red-400/20 text-red-300"
            }`}
          >
            {player.active ? "Active" : "Inactive"}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 pt-3 pb-4 space-y-2.5">
        <hr className="border-gray-100" />

        {/* Bio */}
        <InfoRow
          label="Born"
          value={
            player?.dob
              ? `${formatDOB(player.dob)}${age ? ` (${age} yrs)` : ""}`
              : null
          }
        />
        <InfoRow label="Gender" value={player?.gender} />
        <InfoRow label="Profession" value={player?.profession} />
        <InfoRow
          label="Batting"
          value={player?.battingStyle}
          icon={<Target size={11} />}
        />
        <InfoRow
          label="Bowling"
          value={player?.bowlingStyle}
          icon={<Zap size={11} />}
        />
        <InfoRow
          label="Skill"
          value={player?.skillLevel}
          icon={<Shield size={11} />}
        />
        <InfoRow
          label="School"
          value={player?.schoolOrCollege}
          icon={<MapPin size={11} />}
        />

        {/* ── BATTING CAREER SUMMARY ── */}
        {hasBatting && presentFormats.length > 0 && (
          <>
            <hr className="border-gray-100" />
            <CareerSummaryTable
              title="Batting Career Summary"
              accentClass="bg-green-500"
              formats={presentFormats}
              byFormat={byFormat}
              type="batting"
            />
          </>
        )}

        {/* ── BOWLING CAREER SUMMARY ── */}
        {hasBowling && presentFormats.length > 0 && (
          <>
            <hr className="border-gray-100" />
            <CareerSummaryTable
              title="Bowling Career Summary"
              accentClass="bg-red-500"
              formats={presentFormats}
              byFormat={byFormat}
              type="bowling"
            />
          </>
        )}

        {/* Total matches */}
        <hr className="border-gray-100" />
        <div className="text-center py-0.5">
          <p className="text-2xl font-bold text-blue-700">{allStats.length}</p>
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">
            Total Matches
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Cricbuzz-style Career Summary Table ──────────────────────────────────────

function CareerSummaryTable({
  title,
  accentClass,
  formats,
  byFormat,
  type,
}: {
  title: string;
  accentClass: string;
  formats: string[];
  byFormat: Record<string, PlayerStat[]>;
  type: "batting" | "bowling";
}) {
  type RowDef = { label: string; getValue: (f: string) => string | number };

  const battingRows: RowDef[] = [
    {
      label: "Matches",
      getValue: (f) => computeBatting(byFormat[f] ?? []).matches,
    },
    {
      label: "Innings",
      getValue: (f) => computeBatting(byFormat[f] ?? []).innings,
    },
    { label: "Runs", getValue: (f) => computeBatting(byFormat[f] ?? []).runs },
    {
      label: "Balls",
      getValue: (f) => computeBatting(byFormat[f] ?? []).balls,
    },
    {
      label: "Highest",
      getValue: (f) => computeBatting(byFormat[f] ?? []).highest,
    },
    {
      label: "Average",
      getValue: (f) => computeBatting(byFormat[f] ?? []).avg,
    },
    { label: "SR", getValue: (f) => computeBatting(byFormat[f] ?? []).sr },
    {
      label: "Fours",
      getValue: (f) => computeBatting(byFormat[f] ?? []).fours,
    },
    {
      label: "Sixes",
      getValue: (f) => computeBatting(byFormat[f] ?? []).sixes,
    },
    {
      label: "Ducks",
      getValue: (f) => computeBatting(byFormat[f] ?? []).ducks,
    },
    {
      label: "50s",
      getValue: (f) => computeBatting(byFormat[f] ?? []).fifties,
    },
    {
      label: "100s",
      getValue: (f) => computeBatting(byFormat[f] ?? []).hundreds,
    },
  ];

  const bowlingRows: RowDef[] = [
    {
      label: "Matches",
      getValue: (f) => computeBowling(byFormat[f] ?? []).matches,
    },
    {
      label: "Innings",
      getValue: (f) => computeBowling(byFormat[f] ?? []).innings,
    },
    {
      label: "Balls",
      getValue: (f) => computeBowling(byFormat[f] ?? []).balls,
    },
    { label: "Runs", getValue: (f) => computeBowling(byFormat[f] ?? []).runs },
    {
      label: "Wickets",
      getValue: (f) => computeBowling(byFormat[f] ?? []).wickets,
    },
    {
      label: "Average",
      getValue: (f) => computeBowling(byFormat[f] ?? []).avg,
    },
    {
      label: "Economy",
      getValue: (f) => computeBowling(byFormat[f] ?? []).econ,
    },
    { label: "SR", getValue: (f) => computeBowling(byFormat[f] ?? []).sr },
    {
      label: "Dot Balls",
      getValue: (f) => computeBowling(byFormat[f] ?? []).dots,
    },
    { label: "4w", getValue: (f) => computeBowling(byFormat[f] ?? []).fourW },
    { label: "5w", getValue: (f) => computeBowling(byFormat[f] ?? []).fiveW },
    {
      label: "Wides",
      getValue: (f) => computeBowling(byFormat[f] ?? []).wides,
    },
    {
      label: "No Balls",
      getValue: (f) => computeBowling(byFormat[f] ?? []).noBalls,
    },
  ];

  const rows = type === "batting" ? battingRows : bowlingRows;
  // Key highlight rows for coloring
  const highlightLabel = type === "batting" ? "Runs" : "Wickets";
  const highlightClass =
    type === "batting" ? "text-blue-700 font-bold" : "text-red-600 font-bold";

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className={`w-1 h-3.5 ${accentClass} rounded-full inline-block`}
        />
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-y border-gray-100">
              <th className="py-1.5 pl-2 pr-3 text-left text-[10px] font-semibold text-gray-500 sticky left-0 bg-gray-50 z-10 w-20">
                {/* stat name column */}
              </th>
              {formats.map((f) => (
                <th
                  key={f}
                  className="py-1.5 px-2 text-center text-[10px] font-bold text-gray-600 whitespace-nowrap"
                >
                  {f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.label}
                className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
              >
                <td
                  className={`py-1.5 pl-2 pr-3 text-[10px] font-semibold text-gray-500 sticky left-0 z-10 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                >
                  {row.label}
                </td>
                {formats.map((f) => {
                  const val = byFormat[f] ? row.getValue(f) : "-";
                  const isHighlight = row.label === highlightLabel;
                  return (
                    <td
                      key={f}
                      className={`py-1.5 px-2 text-center text-xs ${
                        isHighlight
                          ? highlightClass
                          : "text-gray-700 font-medium"
                      }`}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-[11px] text-gray-400 w-16 flex-shrink-0 pt-0.5 flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className="text-xs font-medium text-gray-700 flex-1">{value}</span>
    </div>
  );
}

// ─── Match Stat Card ──────────────────────────────────────────────────────────

function MatchStatCard({ stat }: { stat: PlayerStat }) {
  const hasBatting = stat.runs !== null && stat.runs !== undefined;
  const hasBowling =
    stat.oversBowled !== null && stat.oversBowled !== undefined;
  const hasFielding =
    stat.catchesTaken !== null &&
    stat.catchesTaken !== undefined &&
    stat.catchesTaken > 0;

  const formatLabel = normalizeFormat(stat.format);

  return (
    <div className="bg-white rounded-lg border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a3a5c] to-[#1e4d7b] text-white px-4 py-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-bold text-sm tracking-wide">
              vs {stat.opponentName}
            </p>
            <div className="flex items-center gap-3 mt-0.5">
              {(stat.groundName || stat.place) && (
                <span className="text-blue-200 text-xs flex items-center gap-1">
                  <MapPin size={10} />
                  {[stat.groundName, stat.place].filter(Boolean).join(", ")}
                </span>
              )}
              <span className="text-blue-300 text-xs">
                {new Date(stat.matchDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {stat.format && (
              <span
                className={`px-2 py-0.5 text-white text-xs font-bold rounded ${
                  formatLabel === "T20"
                    ? "bg-purple-600"
                    : formatLabel === "50 Over"
                      ? "bg-orange-500"
                      : formatLabel === "Test"
                        ? "bg-red-700"
                        : "bg-gray-600"
                }`}
              >
                {formatLabel}
              </span>
            )}
            {stat.tournamentName && (
              <span className="px-2 py-0.5 bg-blue-500/50 text-white text-xs rounded border border-blue-400/30">
                {stat.tournamentName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Body */}
      <div className="divide-y divide-gray-100">
        {hasBatting && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1 h-3.5 bg-green-500 rounded-full inline-block" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Batting
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-gray-400 text-[11px] border-b border-gray-100">
                    {["R", "B", "M", "4s", "6s", "SR"].map((h) => (
                      <th key={h} className="pb-1 pr-8 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-gray-700">
                    <td className="py-1.5 pr-8 font-bold text-blue-700 text-sm">
                      {stat.runs ?? "-"}
                    </td>
                    <td className="py-1.5 pr-8">{stat.ballsFaced ?? "-"}</td>
                    <td className="py-1.5 pr-8">{stat.minutesFaced ?? "-"}</td>
                    <td className="py-1.5 pr-8">{stat.fours ?? "-"}</td>
                    <td className="py-1.5 pr-8">{stat.sixes ?? "-"}</td>
                    <td className="py-1.5 pr-8 font-semibold text-gray-600">
                      {stat.battingStrikeRate?.toFixed(2) ?? "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {hasBowling && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1 h-3.5 bg-red-500 rounded-full inline-block" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Bowling
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-gray-400 text-[11px] border-b border-gray-100">
                    {["O", "M", "R", "W", "Econ", "0s", "Wd", "Nb"].map((h) => (
                      <th key={h} className="pb-1 pr-6 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-gray-700">
                    <td className="py-1.5 pr-6">{stat.oversBowled ?? "-"}</td>
                    <td className="py-1.5 pr-6">{stat.maidens ?? "-"}</td>
                    <td className="py-1.5 pr-6">{stat.runsConceded ?? "-"}</td>
                    <td className="py-1.5 pr-6 font-bold text-red-600 text-sm">
                      {stat.wicketsTaken ?? "-"}
                    </td>
                    <td className="py-1.5 pr-6 font-semibold text-gray-600">
                      {stat.bowlingEconomy?.toFixed(2) ?? "-"}
                    </td>
                    <td className="py-1.5 pr-6">
                      {stat.dotBallsBowled ?? "-"}
                    </td>
                    <td className="py-1.5 pr-6">{stat.widesConceded ?? "-"}</td>
                    <td className="py-1.5 pr-6">
                      {stat.noBallsConceded ?? "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {hasFielding && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1 h-3.5 bg-orange-500 rounded-full inline-block" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Fielding
              </span>
            </div>
            <div className="text-xs">
              <p className="text-gray-400 text-[11px]">Catches</p>
              <p className="font-bold text-orange-600 text-sm mt-0.5">
                {stat.catchesTaken}
              </p>
            </div>
          </div>
        )}

        {!hasBatting && !hasBowling && !hasFielding && (
          <div className="px-4 py-4 text-center text-xs text-gray-400">
            No performance stats recorded
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerStatsPage;
