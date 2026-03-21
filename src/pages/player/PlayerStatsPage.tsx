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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "../../api/axios";
import { getImageUrl } from "../../utils/imageUrl";
import { toast } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

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
    { month: "short", year: "numeric" },
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

function normalizeFormat(f?: string): string {
  if (!f) return "Other";
  return FORMAT_LABELS[f.trim()] ?? f.trim();
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
  return {
    matches: stats.length,
    innings,
    runs,
    balls,
    highest,
    avg: innings > 0 ? (runs / innings).toFixed(2) : "-",
    sr: balls > 0 ? ((runs * 100) / balls).toFixed(2) : "-",
    notOut: 0,
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
  return {
    matches: stats.length,
    innings: bowled.length,
    balls: totalBalls,
    runs,
    wickets,
    avg: wickets > 0 ? (runs / wickets).toFixed(2) : "-",
    econ: overs > 0 ? (runs / overs).toFixed(2) : "-",
    sr: wickets > 0 ? (totalBalls / wickets).toFixed(1) : "-",
    dots,
    fours,
    sixes,
    wides,
    noBalls,
    fourW: bowled.filter((s) => (s.wicketsTaken ?? 0) === 4).length,
    fiveW: bowled.filter((s) => (s.wicketsTaken ?? 0) >= 5).length,
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
  // Mobile: profile card collapsed by default
  const [profileExpanded, setProfileExpanded] = useState(false);

  useEffect(() => {
    loadAll();
  }, [playerPublicId]);

  const loadAll = async () => {
    if (!playerPublicId) return;
    try {
      setLoading(true);
      const [statsRes, infoRes] = await Promise.all([
        api.get(`/admin/cricket-stats/${playerPublicId}`),
        api.get(`/admin/players/${playerPublicId}/info`),
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
          <p className="text-sm text-gray-500">Loading stats…</p>
        </div>
      </div>
    );
  }

  const months = Object.keys(stats);
  const allStats = months.flatMap((m) => stats[m]);
  const byFormat = groupByFormat(allStats);
  const selectedStats = selectedMonth ? (stats[selectedMonth] ?? []) : [];

  return (
    <div className="space-y-4">
      {/* ── MOBILE: collapsible profile strip ── */}
      <div className="lg:hidden">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Always-visible strip */}
          <button
            onClick={() => setProfileExpanded((p) => !p)}
            className="w-full flex items-center gap-3 px-4 py-3"
          >
            {player?.photoUrl ? (
              <img
                src={getImageUrl(player.photoUrl) || ""}
                alt={player?.displayName}
                className="w-10 h-10 rounded-full object-cover border-2 border-blue-400 flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User size={20} className="text-blue-400" />
              </div>
            )}
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {player?.displayName ?? "—"}
              </p>
              <p className="text-xs text-gray-500">
                {allStats.length} matches · tap to{" "}
                {profileExpanded ? "hide" : "view"} profile
              </p>
            </div>
            {profileExpanded ? (
              <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
            )}
          </button>

          {/* Expanded profile content */}
          {profileExpanded && (
            <div className="border-t border-gray-100 px-4 py-3 space-y-2">
              <ProfileInfoGrid
                player={player}
                allStats={allStats}
                byFormat={byFormat}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP: sidebar + main layout ── */}
      <div className="hidden lg:flex gap-4 items-start">
        <aside className="w-72 flex-shrink-0">
          <PlayerProfileCard
            player={player}
            allStats={allStats}
            byFormat={byFormat}
          />
        </aside>
        <main className="flex-1 min-w-0 space-y-4">
          <StatsContent
            months={months}
            stats={stats}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedStats={selectedStats}
          />
        </main>
      </div>

      {/* ── MOBILE: stats below profile ── */}
      <div className="lg:hidden">
        <StatsContent
          months={months}
          stats={stats}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedStats={selectedStats}
        />
      </div>
    </div>
  );
}

// ─── Stats Content (shared between mobile and desktop) ───────────────────────

function StatsContent({
  months,
  stats,
  selectedMonth,
  setSelectedMonth,
  selectedStats,
}: {
  months: string[];
  stats: StatsGroupedByMonth;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  selectedStats: PlayerStat[];
}) {
  if (months.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-10 text-center">
        <Trophy size={40} className="text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-700 mb-1">
          No Stats Yet
        </h3>
        <p className="text-sm text-gray-500">
          Statistics will appear once matches are recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={14} className="text-blue-600" />
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Filter by Month
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {months.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
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
    </div>
  );
}

// ─── Profile info grid — used in both sidebar and mobile expanded ─────────────

function ProfileInfoGrid({
  player,
  allStats,
  byFormat,
}: {
  player: PlayerInfo | null;
  allStats: PlayerStat[];
  byFormat: Record<string, PlayerStat[]>;
}) {
  const age = getAge(player?.dob);
  const formatOrder = ["T20", "50 Over", "Test"];
  const presentFormats = formatOrder.filter((f) => byFormat[f]?.length > 0);
  Object.keys(byFormat).forEach((f) => {
    if (!formatOrder.includes(f) && byFormat[f].length > 0)
      presentFormats.push(f);
  });
  const hasBatting = allStats.some(
    (s) => s.runs !== null && s.runs !== undefined,
  );
  const hasBowling = allStats.some(
    (s) => s.oversBowled !== null && s.oversBowled !== undefined,
  );

  return (
    <>
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

      {hasBatting && presentFormats.length > 0 && (
        <>
          <hr className="border-gray-100" />
          <CareerSummaryTable
            title="Batting Career"
            accentClass="bg-green-500"
            formats={presentFormats}
            byFormat={byFormat}
            type="batting"
          />
        </>
      )}
      {hasBowling && presentFormats.length > 0 && (
        <>
          <hr className="border-gray-100" />
          <CareerSummaryTable
            title="Bowling Career"
            accentClass="bg-red-500"
            formats={presentFormats}
            byFormat={byFormat}
            type="bowling"
          />
        </>
      )}
      <hr className="border-gray-100" />
      <div className="text-center py-1">
        <p className="text-2xl font-bold text-blue-700">{allStats.length}</p>
        <p className="text-[11px] text-gray-400 uppercase tracking-wide">
          Total Matches
        </p>
      </div>
    </>
  );
}

// ─── Desktop sidebar card ─────────────────────────────────────────────────────

function PlayerProfileCard({
  player,
  allStats,
  byFormat,
}: {
  player: PlayerInfo | null;
  allStats: PlayerStat[];
  byFormat: Record<string, PlayerStat[]>;
}) {
  const photoSrc = player?.photoUrl ? getImageUrl(player.photoUrl) : null;

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
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
          className={`w-24 h-24 rounded-full bg-blue-500/40 border-4 border-white/20 flex items-center justify-center ${photoSrc ? "hidden" : ""}`}
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
      <div className="px-3 pt-3 pb-4 space-y-2.5">
        <hr className="border-gray-100" />
        <ProfileInfoGrid
          player={player}
          allStats={allStats}
          byFormat={byFormat}
        />
      </div>
    </div>
  );
}

// ─── Career Summary Table ─────────────────────────────────────────────────────

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
      label: "Mat",
      getValue: (f) => computeBatting(byFormat[f] ?? []).matches,
    },
    {
      label: "Inn",
      getValue: (f) => computeBatting(byFormat[f] ?? []).innings,
    },
    { label: "Runs", getValue: (f) => computeBatting(byFormat[f] ?? []).runs },
    { label: "HS", getValue: (f) => computeBatting(byFormat[f] ?? []).highest },
    { label: "Avg", getValue: (f) => computeBatting(byFormat[f] ?? []).avg },
    { label: "SR", getValue: (f) => computeBatting(byFormat[f] ?? []).sr },
    { label: "4s", getValue: (f) => computeBatting(byFormat[f] ?? []).fours },
    { label: "6s", getValue: (f) => computeBatting(byFormat[f] ?? []).sixes },
    {
      label: "50s",
      getValue: (f) => computeBatting(byFormat[f] ?? []).fifties,
    },
    {
      label: "100s",
      getValue: (f) => computeBatting(byFormat[f] ?? []).hundreds,
    },
    { label: "0s", getValue: (f) => computeBatting(byFormat[f] ?? []).ducks },
  ];

  const bowlingRows: RowDef[] = [
    {
      label: "Mat",
      getValue: (f) => computeBowling(byFormat[f] ?? []).matches,
    },
    {
      label: "Inn",
      getValue: (f) => computeBowling(byFormat[f] ?? []).innings,
    },
    {
      label: "Wkts",
      getValue: (f) => computeBowling(byFormat[f] ?? []).wickets,
    },
    { label: "Runs", getValue: (f) => computeBowling(byFormat[f] ?? []).runs },
    { label: "Avg", getValue: (f) => computeBowling(byFormat[f] ?? []).avg },
    { label: "Econ", getValue: (f) => computeBowling(byFormat[f] ?? []).econ },
    { label: "SR", getValue: (f) => computeBowling(byFormat[f] ?? []).sr },
    { label: "Dots", getValue: (f) => computeBowling(byFormat[f] ?? []).dots },
    { label: "4w", getValue: (f) => computeBowling(byFormat[f] ?? []).fourW },
    { label: "5w", getValue: (f) => computeBowling(byFormat[f] ?? []).fiveW },
    { label: "Wd", getValue: (f) => computeBowling(byFormat[f] ?? []).wides },
    { label: "Nb", getValue: (f) => computeBowling(byFormat[f] ?? []).noBalls },
  ];

  const rows = type === "batting" ? battingRows : bowlingRows;
  const highlightLabel = type === "batting" ? "Runs" : "Wkts";
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
      {/* Scrollable table — no overflow on mobile */}
      <div className="overflow-x-auto rounded-lg">
        <table className="w-full text-xs border-collapse min-w-0">
          <thead>
            <tr className="bg-gray-50 border-y border-gray-100">
              <th className="py-1.5 pl-2 pr-2 text-left text-[10px] font-semibold text-gray-500 sticky left-0 bg-gray-50 z-10 w-12" />
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
                  className={`py-1.5 pl-2 pr-2 text-[10px] font-semibold text-gray-500 sticky left-0 z-10 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                >
                  {row.label}
                </td>
                {formats.map((f) => {
                  const val = byFormat[f] ? row.getValue(f) : "-";
                  return (
                    <td
                      key={f}
                      className={`py-1.5 px-2 text-center text-xs ${
                        row.label === highlightLabel
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
    <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a3a5c] to-[#1e4d7b] text-white px-4 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">vs {stat.opponentName}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
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
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
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
              <span className="px-2 py-0.5 bg-blue-500/50 text-white text-xs rounded border border-blue-400/30 max-w-[120px] truncate">
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
              <span className="w-1 h-3.5 bg-green-500 rounded-full" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Batting
              </span>
            </div>
            {/* Mobile-friendly: grid instead of wide table */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-2">
              {[
                { label: "Runs", value: stat.runs ?? "-", highlight: true },
                { label: "Balls", value: stat.ballsFaced ?? "-" },
                { label: "Mins", value: stat.minutesFaced ?? "-" },
                { label: "4s", value: stat.fours ?? "-" },
                { label: "6s", value: stat.sixes ?? "-" },
                {
                  label: "SR",
                  value: stat.battingStrikeRate?.toFixed(1) ?? "-",
                },
              ].map(({ label, value, highlight }) => (
                <div key={label}>
                  <p className="text-[10px] text-gray-400 uppercase">{label}</p>
                  <p
                    className={`text-sm font-bold ${highlight ? "text-blue-700" : "text-gray-700"}`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasBowling && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1 h-3.5 bg-red-500 rounded-full" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Bowling
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-x-4 gap-y-2">
              {[
                { label: "Overs", value: stat.oversBowled ?? "-" },
                { label: "Mdns", value: stat.maidens ?? "-" },
                { label: "Runs", value: stat.runsConceded ?? "-" },
                {
                  label: "Wkts",
                  value: stat.wicketsTaken ?? "-",
                  highlight: true,
                },
                {
                  label: "Econ",
                  value: stat.bowlingEconomy?.toFixed(2) ?? "-",
                },
                { label: "Dots", value: stat.dotBallsBowled ?? "-" },
                { label: "Wd", value: stat.widesConceded ?? "-" },
                { label: "Nb", value: stat.noBallsConceded ?? "-" },
              ].map(({ label, value, highlight }) => (
                <div key={label}>
                  <p className="text-[10px] text-gray-400 uppercase">{label}</p>
                  <p
                    className={`text-sm font-bold ${highlight ? "text-red-600" : "text-gray-700"}`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasFielding && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1 h-3.5 bg-orange-500 rounded-full" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Fielding
              </span>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Catches</p>
              <p className="text-sm font-bold text-orange-600">
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
