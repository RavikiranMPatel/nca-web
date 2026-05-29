import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import publicApi from "../api/publicApi";

type StatPlayer = {
  playerPublicId: string;
  playerName: string;
  photoUrl?: string;
  runs?: number;
  wickets?: number;
  matches?: number;
  highScore?: number;
  bestFigures?: string;
  average?: number;
  strikeRate?: number;
  economy?: number;
  fifties?: number;
  hundreds?: number;
  sixes?: number;
};

type TopPerformers = {
  topBatters: StatPlayer[];
  topBowlers: StatPlayer[];
};

export default function CricketStatsPage() {
  const navigate = useNavigate();

  const [period, setPeriod] = useState<"alltime" | "season">("alltime");
  const [subTab, setSubTab] = useState<"batting" | "bowling">("batting");
  const [topPerformers, setTopPerformers] = useState<TopPerformers | null>(
    null,
  );
  const [battingList, setBattingList] = useState<StatPlayer[]>([]);
  const [bowlingList, setBowlingList] = useState<StatPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#2563eb");

  useEffect(() => {
    publicApi
      .get("/settings/public")
      .then((r) => {
        setPrimaryColor(r.data.PRIMARY_COLOR || "#2563eb");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    publicApi
      .get("/settings/public")
      .then((r) => {
        setPrimaryColor(r.data.PRIMARY_COLOR || "#2563eb");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      publicApi.get(`/public/cricket-stats/top-performers?period=${period}`),
      publicApi.get(
        `/public/cricket-stats/leaderboard/batting?period=${period}`,
      ),
      publicApi.get(
        `/public/cricket-stats/leaderboard/bowling?period=${period}`,
      ),
    ])
      .then(([top, bat, bowl]) => {
        if (top.status === "fulfilled") setTopPerformers(top.value.data);
        if (bat.status === "fulfilled") setBattingList(bat.value.data);
        if (bowl.status === "fulfilled") setBowlingList(bowl.value.data);
      })
      .finally(() => setLoading(false));
  }, [period]);

  const periodYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/home")}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900">
              🏏 Cricket Stats
            </h1>
            <p className="text-xs text-gray-400">Academy leaderboards</p>
          </div>
          {/* Period toggle */}
          <div className="ml-auto flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setPeriod("alltime")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${period === "alltime" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
            >
              All Time
            </button>
            <button
              onClick={() => setPeriod("season")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${period === "season" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
            >
              {periodYear}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-5 space-y-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{
                borderColor: `${primaryColor}40`,
                borderTopColor: primaryColor,
              }}
            />
          </div>
        ) : (
          <>
            {/* Top Performers Widget */}
            {topPerformers &&
              (topPerformers.topBatters.length > 0 ||
                topPerformers.topBowlers.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Top Batter */}
                  {topPerformers.topBatters[0] && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div
                        className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-2"
                        style={{ background: `${primaryColor}08` }}
                      >
                        <span className="text-lg">🏏</span>
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Top Batter
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center"
                            style={{ background: `${primaryColor}15` }}
                          >
                            {topPerformers.topBatters[0].photoUrl ? (
                              <img
                                src={topPerformers.topBatters[0].photoUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span
                                className="text-lg font-bold"
                                style={{ color: primaryColor }}
                              >
                                {topPerformers.topBatters[0].playerName.charAt(
                                  0,
                                )}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              {topPerformers.topBatters[0].playerName}
                            </div>
                            <div className="text-xs text-gray-400">
                              {topPerformers.topBatters[0].matches} matches
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {
                              label: "Runs",
                              value:
                                period === "season"
                                  ? topPerformers.topBatters[0].runs
                                  : topPerformers.topBatters[0].runs,
                            },
                            {
                              label: "HS",
                              value: topPerformers.topBatters[0].highScore,
                            },
                            {
                              label: "Avg",
                              value: topPerformers.topBatters[0].average,
                            },
                          ].map(({ label, value }) => (
                            <div
                              key={label}
                              className="text-center p-2 rounded-xl"
                              style={{ background: `${primaryColor}08` }}
                            >
                              <div
                                className="text-base font-black"
                                style={{ color: primaryColor }}
                              >
                                {value ?? "—"}
                              </div>
                              <div className="text-xs text-gray-400">
                                {label}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top Bowler */}
                  {topPerformers.topBowlers[0] && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div
                        className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-2"
                        style={{ background: `${primaryColor}08` }}
                      >
                        <span className="text-lg">⚾</span>
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Top Bowler
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                            style={{ background: `${primaryColor}15` }}
                          >
                            {topPerformers.topBowlers[0].photoUrl ? (
                              <img
                                src={topPerformers.topBowlers[0].photoUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span
                                className="text-lg font-bold"
                                style={{ color: primaryColor }}
                              >
                                {topPerformers.topBowlers[0].playerName.charAt(
                                  0,
                                )}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              {topPerformers.topBowlers[0].playerName}
                            </div>
                            <div className="text-xs text-gray-400">
                              {topPerformers.topBowlers[0].matches} matches
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {
                              label: "Wkts",
                              value: topPerformers.topBowlers[0].wickets,
                            },
                            {
                              label: "Best",
                              value: topPerformers.topBowlers[0].bestFigures,
                            },
                            {
                              label: "Econ",
                              value: topPerformers.topBowlers[0].economy,
                            },
                          ].map(({ label, value }) => (
                            <div
                              key={label}
                              className="text-center p-2 rounded-xl"
                              style={{ background: `${primaryColor}08` }}
                            >
                              <div
                                className="text-base font-black"
                                style={{ color: primaryColor }}
                              >
                                {value ?? "—"}
                              </div>
                              <div className="text-xs text-gray-400">
                                {label}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* Sub-tab selector */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setSubTab("batting")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${subTab === "batting" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
              >
                🏏 Batting
              </button>
              <button
                onClick={() => setSubTab("bowling")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${subTab === "bowling" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
              >
                ⚾ Bowling
              </button>
            </div>

            {/* Batting Leaderboard */}
            {subTab === "batting" &&
              (battingList.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <div className="text-3xl mb-2">🏏</div>
                  <p className="text-sm text-gray-400">No batting stats yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Batting Leaderboard
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {battingList.map((p, i) => (
                      <div
                        key={p.playerPublicId}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition active:bg-gray-100 cursor-pointer"
                        onClick={() =>
                          navigate(`/players/${p.playerPublicId}/profile`)
                        }
                      >
                        {/* Rank */}
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            i === 0
                              ? "bg-yellow-100 text-yellow-700"
                              : i === 1
                                ? "bg-gray-100 text-gray-600"
                                : i === 2
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-blue-50 text-blue-500"
                          }`}
                        >
                          {i === 0
                            ? "🥇"
                            : i === 1
                              ? "🥈"
                              : i === 2
                                ? "🥉"
                                : i + 1}
                        </div>
                        {/* Avatar */}
                        <div
                          className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                          style={{ background: `${primaryColor}` }}
                        >
                          {p.photoUrl ? (
                            <img
                              src={p.photoUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            p.playerName.charAt(0)
                          )}
                        </div>
                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {p.playerName}
                          </div>
                          <div className="text-xs text-gray-400">
                            {p.matches} matches · HS {p.highScore}
                          </div>
                        </div>
                        {/* Key stats */}
                        <div className="flex items-center gap-3 text-right flex-shrink-0">
                          <div>
                            <div
                              className="text-base font-black"
                              style={{ color: primaryColor }}
                            >
                              {period === "season" ? p.runs : p.runs}
                            </div>
                            <div className="text-xs text-gray-400">runs</div>
                          </div>
                          {period === "alltime" && (
                            <div className="hidden sm:block">
                              <div className="text-sm font-semibold text-gray-700">
                                {p.average}
                              </div>
                              <div className="text-xs text-gray-400">avg</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            {/* Bowling Leaderboard */}
            {subTab === "bowling" &&
              (bowlingList.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <div className="text-3xl mb-2">⚾</div>
                  <p className="text-sm text-gray-400">No bowling stats yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Bowling Leaderboard
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {bowlingList.map((p, i) => (
                      <div
                        key={p.playerPublicId}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition active:bg-gray-100 cursor-pointer"
                        onClick={() =>
                          navigate(`/players/${p.playerPublicId}/profile`)
                        }
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            i === 0
                              ? "bg-yellow-100 text-yellow-700"
                              : i === 1
                                ? "bg-gray-100 text-gray-600"
                                : i === 2
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-blue-50 text-blue-500"
                          }`}
                        >
                          {i === 0
                            ? "🥇"
                            : i === 1
                              ? "🥈"
                              : i === 2
                                ? "🥉"
                                : i + 1}
                        </div>
                        <div
                          className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                          style={{ background: `${primaryColor}` }}
                        >
                          {p.photoUrl ? (
                            <img
                              src={p.photoUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            p.playerName.charAt(0)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {p.playerName}
                          </div>
                          <div className="text-xs text-gray-400">
                            {p.matches} matches · Best {p.bestFigures}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-right flex-shrink-0">
                          <div>
                            <div
                              className="text-base font-black"
                              style={{ color: primaryColor }}
                            >
                              {period === "season" ? p.wickets : p.wickets}
                            </div>
                            <div className="text-xs text-gray-400">wkts</div>
                          </div>
                          {period === "alltime" && (
                            <div className="hidden sm:block">
                              <div className="text-sm font-semibold text-gray-700">
                                {p.economy}
                              </div>
                              <div className="text-xs text-gray-400">econ</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
