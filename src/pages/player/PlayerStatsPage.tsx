import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Trophy, Calendar } from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-hot-toast";

type PlayerStat = {
  id: string;
  matchDate: string;
  opponentName: string;
  groundName?: string;
  place?: string;
  tournamentName?: string;
  format?: string;

  // Batting
  runs?: number;
  ballsFaced?: number;
  minutesFaced?: number;
  fours?: number;
  sixes?: number;
  battingStrikeRate?: number;

  // Bowling
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

  // Fielding
  catchesTaken?: number;
};

type StatsGroupedByMonth = {
  [monthYear: string]: PlayerStat[];
};

function PlayerStatsPage() {
  const { playerPublicId } = useParams();
  const [stats, setStats] = useState<StatsGroupedByMonth>({});
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    loadStats();
  }, [playerPublicId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/cricket-stats/${playerPublicId}`);
      setStats(res.data);

      const months = Object.keys(res.data);
      if (months.length > 0) {
        setSelectedMonth(months[0]);
      }
    } catch (error) {
      toast.error("Failed to load cricket stats");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading stats...</p>
        </div>
      </div>
    );
  }

  const months = Object.keys(stats);

  if (months.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <Trophy size={40} className="text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-700 mb-1">
          No Cricket Stats Yet
        </h3>
        <p className="text-sm text-gray-500">
          Statistics will appear once matches are recorded
        </p>
      </div>
    );
  }

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const selectedStats = selectedMonth ? stats[selectedMonth] : [];

  return (
    <div className="space-y-4">
      {/* COMPACT MONTH SELECTOR */}
      <div className="bg-white rounded-lg border p-3">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={16} className="text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">
            Filter by Month
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {months.map((month) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(month)}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                selectedMonth === month
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {formatMonthYear(month)} ({stats[month].length})
            </button>
          ))}
        </div>
      </div>

      {/* COMPACT STATS TABLE */}
      {selectedStats.length > 0 && (
        <div className="space-y-3">
          {selectedStats.map((stat) => (
            <CompactStatCard key={stat.id} stat={stat} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= COMPACT STAT CARD (ESPN-STYLE) ================= */

function CompactStatCard({ stat }: { stat: PlayerStat }) {
  const hasBatting = stat.runs !== null && stat.runs !== undefined;
  const hasBowling =
    stat.oversBowled !== null && stat.oversBowled !== undefined;
  const hasFielding =
    stat.catchesTaken !== null &&
    stat.catchesTaken !== undefined &&
    stat.catchesTaken > 0;

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* COMPACT HEADER */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              vs {stat.opponentName}
            </span>
            <span className="text-xs text-blue-200">
              {new Date(stat.matchDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {stat.format && (
              <span className="px-2 py-0.5 bg-blue-500 rounded text-white">
                {stat.format}
              </span>
            )}
            {stat.tournamentName && (
              <span className="px-2 py-0.5 bg-blue-500 rounded text-white">
                {stat.tournamentName}
              </span>
            )}
          </div>
        </div>

        {(stat.groundName || stat.place) && (
          <p className="text-xs text-blue-200 mt-1">
            📍 {stat.groundName}
            {stat.place && `, ${stat.place}`}
          </p>
        )}
      </div>

      {/* COMPACT STATS BODY */}
      <div className="p-3 space-y-3">
        {/* BATTING TABLE */}
        {hasBatting && (
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <div className="w-0.5 h-3 bg-green-500"></div>
              <h5 className="text-xs font-semibold text-gray-700">Batting</h5>
            </div>

            {/* Mobile-friendly scrollable wrapper with visual indicator */}
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium text-gray-600 sticky left-0 bg-gray-50 z-10">
                      R
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">
                      B
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">
                      M
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">
                      4s
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">
                      6s
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">
                      SR
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-2 py-1.5 font-semibold text-blue-600 sticky left-0 bg-white z-10">
                      {stat.runs ?? "-"}
                    </td>
                    <td className="px-2 py-1.5">{stat.ballsFaced ?? "-"}</td>
                    <td className="px-2 py-1.5">{stat.minutesFaced ?? "-"}</td>
                    <td className="px-2 py-1.5">{stat.fours ?? "-"}</td>
                    <td className="px-2 py-1.5">{stat.sixes ?? "-"}</td>
                    <td className="px-2 py-1.5 font-medium">
                      {stat.battingStrikeRate?.toFixed(2) ?? "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Swipe indicator for mobile */}
            <p className="text-xs text-gray-400 mt-1 md:hidden">
              ← Swipe to see all stats →
            </p>
          </div>
        )}

        {/* BOWLING TABLE */}
        {hasBowling && (
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <div className="w-0.5 h-3 bg-red-500"></div>
              <h5 className="text-xs font-semibold text-gray-700">Bowling</h5>
            </div>

            {/* Mobile-friendly scrollable wrapper */}
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium text-gray-600 sticky left-0 bg-gray-50 z-10">
                      O
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">
                      M
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">
                      R
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">
                      W
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">
                      Econ
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">
                      0s
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">
                      Wd
                    </th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">
                      Nb
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-2 py-1.5 sticky left-0 bg-white z-10">
                      {stat.oversBowled ?? "-"}
                    </td>
                    <td className="px-2 py-1.5">{stat.maidens ?? "-"}</td>
                    <td className="px-2 py-1.5">{stat.runsConceded ?? "-"}</td>
                    <td className="px-2 py-1.5 font-semibold text-red-600">
                      {stat.wicketsTaken ?? "-"}
                    </td>
                    <td className="px-2 py-1.5 font-medium">
                      {stat.bowlingEconomy?.toFixed(2) ?? "-"}
                    </td>
                    <td className="px-2 py-1.5">
                      {stat.dotBallsBowled ?? "-"}
                    </td>
                    <td className="px-2 py-1.5">{stat.widesConceded ?? "-"}</td>
                    <td className="px-2 py-1.5">
                      {stat.noBallsConceded ?? "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Swipe indicator for mobile */}
            <p className="text-xs text-gray-400 mt-1 md:hidden">
              ← Swipe to see all stats →
            </p>
          </div>
        )}

        {/* FIELDING TABLE */}
        {hasFielding && (
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <div className="w-0.5 h-3 bg-orange-500"></div>
              <h5 className="text-xs font-semibold text-gray-700">Fielding</h5>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">
                      Catches
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-2 py-1.5 font-semibold text-orange-600">
                      {stat.catchesTaken}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!hasBatting && !hasBowling && !hasFielding && (
          <p className="text-xs text-gray-500 text-center py-2">
            No performance stats recorded
          </p>
        )}
      </div>
    </div>
  );
}

export default PlayerStatsPage;
