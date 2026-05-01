import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPublicPlayerProfile } from "../../api/scoring/publicApi";

// ── Types ─────────────────────────────────────────────────────────────────────
interface BattingStats {
  matches: number;
  innings: number;
  totalRuns: number;
  highestScore: number;
  average: number;
  strikeRate: number;
  fifties: number;
  hundreds: number;
  fours: number;
  sixes: number;
  notOuts: number;
}

interface BowlingStats {
  matches: number;
  innings: number;
  wickets: number;
  runsConceded: number;
  bestFigures: string;
  average: number;
  economy: number;
  strikeRate: number;
  fourWicketHauls: number;
  fiveWicketHauls: number;
  dotBalls: number;
}

interface FieldingStats {
  catches: number;
  runOuts: number;
  stumpings: number;
}

interface RecentMatch {
  matchPublicId: string;
  matchTitle: string;
  matchDate: string;
  runs: string;
  wickets: string;
  result: string;
}

interface PlayerProfile {
  playerPublicId: string;
  displayName: string;
  battingStyle?: string;
  bowlingStyle?: string;
  photoUrl?: string;
  careerBatting?: BattingStats;
  careerBowling?: BowlingStats;
  careerFielding?: FieldingStats;
  recentMatches?: RecentMatch[];
}

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="flex justify-between items-center py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
      {value}
    </span>
  </div>
);

const StatGrid = ({
  stats,
}: {
  stats: { label: string; value: string | number }[];
}) => (
  <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
    {stats.map(({ label, value }) => (
      <div key={label} className="bg-white dark:bg-gray-900 px-4 py-3">
        <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
          {label}
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white">
          {value ?? "—"}
        </div>
      </div>
    ))}
  </div>
);

// ── Section header ────────────────────────────────────────────────────────────
const SectionHeader = ({ title, icon }: { title: string; icon: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="text-base">{icon}</span>
    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
      {title}
    </h2>
  </div>
);

export default function PublicPlayerProfilePage() {
  const { playerPublicId } = useParams<{ playerPublicId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "batting" | "bowling" | "fielding"
  >("batting");

  useEffect(() => {
    if (!playerPublicId) return;
    getPublicPlayerProfile(playerPublicId)
      .then(setProfile)
      .catch(() => setError("Player profile not found."))
      .finally(() => setLoading(false));
  }, [playerPublicId]);

  if (loading)
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (error || !profile)
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-4xl mb-3">🏏</div>
          <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            Player not found
          </p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );

  const bat = profile.careerBatting;
  const bowl = profile.careerBowling;
  const field = profile.careerFielding;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── NCA header ───────────────────────────────────────────────────── */}
      <div className="bg-blue-700 dark:bg-blue-900 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-white font-bold text-sm">NCA Mysuru</div>
            <div className="text-blue-200 text-xs">NextGen Cricket Academy</div>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="text-xs px-3 py-1.5 bg-white/20 text-white rounded-lg active:scale-95 transition-all"
          >
            🔗 Share
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* ── Player hero card ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profile.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {profile.displayName}
              </h1>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {profile.battingStyle && (
                  <span className="text-xs px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full border border-green-100 dark:border-green-900/30">
                    🏏 {profile.battingStyle}
                  </span>
                )}
                {profile.bowlingStyle && (
                  <span className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900/30">
                    ⚾ {profile.bowlingStyle}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick career summary strip */}
          {bat && (
            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              {[
                { label: "Matches", value: bat.matches },
                { label: "Runs", value: bat.totalRuns },
                { label: "Avg", value: bat.average?.toFixed(1) ?? "—" },
                { label: "Wkts", value: bowl?.wickets ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {value}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Stat tabs ────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
          <div className="flex">
            {(["batting", "bowling", "fielding"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-5 space-y-5">
          {/* ── Batting stats ─────────────────────────────────────────────── */}
          {activeTab === "batting" && (
            <>
              {bat ? (
                <>
                  <SectionHeader title="Batting Career" icon="🏏" />
                  <StatGrid
                    stats={[
                      { label: "Matches", value: bat.matches },
                      { label: "Innings", value: bat.innings },
                      { label: "Runs", value: bat.totalRuns },
                      { label: "Highest", value: bat.highestScore },
                      {
                        label: "Average",
                        value: bat.average?.toFixed(2) ?? "—",
                      },
                      {
                        label: "Strike Rate",
                        value: bat.strikeRate?.toFixed(2) ?? "—",
                      },
                      { label: "50s", value: bat.fifties ?? "—" },
                      { label: "100s", value: bat.hundreds ?? "—" },
                      { label: "4s", value: bat.fours },
                      { label: "6s", value: bat.sixes },
                      { label: "Not Outs", value: bat.notOuts },
                      {
                        label: "Dismissed",
                        value: (bat.innings ?? 0) - (bat.notOuts ?? 0),
                      },
                    ]}
                  />
                </>
              ) : (
                <EmptyState message="No batting stats recorded yet" />
              )}
            </>
          )}

          {/* ── Bowling stats ─────────────────────────────────────────────── */}
          {activeTab === "bowling" && (
            <>
              {bowl ? (
                <>
                  <SectionHeader title="Bowling Career" icon="⚾" />
                  <StatGrid
                    stats={[
                      { label: "Wickets", value: bowl.wickets },
                      { label: "Best", value: bowl.bestFigures ?? "—" },
                      {
                        label: "Average",
                        value: bowl.average?.toFixed(2) ?? "—",
                      },
                      {
                        label: "Economy",
                        value: bowl.economy?.toFixed(2) ?? "—",
                      },
                      {
                        label: "Strike Rate",
                        value: bowl.strikeRate?.toFixed(1) ?? "—",
                      },
                      { label: "Runs Given", value: bowl.runsConceded },
                      { label: "Dot Balls", value: bowl.dotBalls },
                      {
                        label: "4-wkt hauls",
                        value: bowl.fourWicketHauls ?? 0,
                      },
                      {
                        label: "5-wkt hauls",
                        value: bowl.fiveWicketHauls ?? 0,
                      },
                      { label: "Innings", value: bowl.innings },
                    ]}
                  />
                </>
              ) : (
                <EmptyState message="No bowling stats recorded yet" />
              )}
            </>
          )}

          {/* ── Fielding stats ────────────────────────────────────────────── */}
          {activeTab === "fielding" && (
            <>
              {field ? (
                <>
                  <SectionHeader title="Fielding Career" icon="🧤" />
                  <StatGrid
                    stats={[
                      { label: "Catches", value: field.catches },
                      { label: "Run Outs", value: field.runOuts },
                      { label: "Stumpings", value: field.stumpings },
                      {
                        label: "Total Dismissals",
                        value:
                          (field.catches ?? 0) +
                          (field.runOuts ?? 0) +
                          (field.stumpings ?? 0),
                      },
                    ]}
                  />
                </>
              ) : (
                <EmptyState message="No fielding stats recorded yet" />
              )}
            </>
          )}

          {/* ── Recent matches ────────────────────────────────────────────── */}
          {profile.recentMatches && profile.recentMatches.length > 0 && (
            <div>
              <SectionHeader title="Recent Matches" icon="📅" />
              <div className="space-y-2">
                {profile.recentMatches.map((m) => (
                  <button
                    key={m.matchPublicId}
                    onClick={() =>
                      navigate(`/match/${m.matchPublicId}/scorecard`)
                    }
                    className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-left active:scale-95 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate flex-1 mr-2">
                        {m.matchTitle}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {m.matchDate}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      {m.runs && (
                        <span className="text-green-600 dark:text-green-400">
                          🏏 {m.runs} runs
                        </span>
                      )}
                      {m.wickets && (
                        <span className="text-blue-600 dark:text-blue-400">
                          ⚾ {m.wickets} wkts
                        </span>
                      )}
                      {m.result && (
                        <span className="text-gray-400">{m.result}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-2 pb-4">
            <p className="text-xs text-gray-300 dark:text-gray-700">
              Powered by NCA Mysuru · ncamysuru.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-10">
    <div className="text-3xl mb-2">📊</div>
    <p className="text-sm text-gray-400">{message}</p>
  </div>
);
