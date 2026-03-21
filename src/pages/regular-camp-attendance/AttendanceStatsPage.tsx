import { useEffect, useState, Fragment } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  TrendingUp,
  AlertTriangle,
  Trophy,
  Users,
  BarChart2,
} from "lucide-react";

import {
  fetchAttendanceStats,
  fetchTodayRecords,
} from "../../api/attendance.api";

import type {
  PlayerAttendancePercentage,
  StatsRange,
} from "../../api/attendanceStats";

type Batch = {
  id: string;
  name: string;
};

// ── Pure-CSS mini bar chart ───────────────────────────────────────
function MiniBarChart({ stats }: { stats: PlayerAttendancePercentage[] }) {
  if (stats.length === 0) return null;

  // Sort by name to keep consistent order
  const sorted = [...stats].sort((a, b) =>
    a.playerName.localeCompare(b.playerName),
  );
  const max = Math.max(...sorted.map((s) => s.percentage), 1);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 size={15} className="text-blue-600" />
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Attendance Overview
        </p>
      </div>
      <div className="space-y-2">
        {sorted.map((p) => {
          const barColor =
            p.percentage >= 90
              ? "bg-emerald-500"
              : p.percentage >= 75
                ? "bg-blue-500"
                : p.percentage >= 50
                  ? "bg-amber-500"
                  : "bg-red-500";
          return (
            <div key={p.playerPublicId} className="flex items-center gap-2">
              <p className="text-xs text-slate-600 w-24 truncate flex-shrink-0">
                {p.playerName}
              </p>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: `${(p.percentage / max) * 100}%` }}
                />
              </div>
              <p className="text-[10px] font-bold text-slate-500 w-10 text-right flex-shrink-0">
                {p.percentage.toFixed(0)}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const AttendanceStatsPage = () => {
  const today = new Date().toISOString().split("T")[0];
  const navigate = useNavigate();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [range, setRange] = useState<StatsRange>("LAST_7");

  const [stats, setStats] = useState<PlayerAttendancePercentage[]>([]);
  const [todayMap, setTodayMap] = useState<Record<string, string>>({});
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [monthDetails, setMonthDetails] = useState<any>(null);

  /* ===============================
     LOAD BATCHES (ONCE)
  =============================== */
  useEffect(() => {
    const loadBatches = async () => {
      const res = await api.get("/admin/batches/active", {
        params: { moduleType: "REGULAR" },
      });
      setBatches(res.data);
      if (res.data.length > 0) {
        setSelectedBatchId(res.data[0].id);
      }
    };
    loadBatches();
  }, []);

  /* ===============================
     LOAD STATS + TODAY DATA
  =============================== */
  useEffect(() => {
    if (!selectedBatchId) return;

    const loadData = async () => {
      try {
        const data = await fetchAttendanceStats(range, selectedBatchId);
        setStats(data);

        const records = await fetchTodayRecords(today, selectedBatchId);
        const map: Record<string, string> = {};
        records.forEach((r: any) => {
          map[r.playerId] = r.status;
        });
        setTodayMap(map);
      } catch (err) {
        console.error("Failed loading attendance stats:", err);
      }
    };

    loadData();
  }, [selectedBatchId, range, today]);

  const openPlayerHistory = (playerPublicId: string) => {
    navigate(`/admin/players/${playerPublicId}/attendance-history`);
  };

  /* ===============================
     TOGGLE MONTH DETAILS
  =============================== */
  const toggleMonth = async (playerPublicId: string) => {
    if (expandedPlayer === playerPublicId) {
      setExpandedPlayer(null);
      return;
    }
    try {
      const now = new Date();
      const res = await api.get(
        `/admin/players/${playerPublicId}/attendance/month-details`,
        { params: { year: now.getFullYear(), month: now.getMonth() + 1 } },
      );
      setMonthDetails(res.data);
      setExpandedPlayer(playerPublicId);
    } catch (err) {
      console.error("Failed loading month details:", err);
    }
  };

  if (!selectedBatchId)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );

  // ── Derived stats ──────────────────────────────────────────────
  const avgAttendance = stats.length
    ? stats.reduce((sum, p) => sum + Number(p.percentage), 0) / stats.length
    : 0;
  const topPerformer = stats
    .slice()
    .sort((a, b) => Number(b.percentage) - Number(a.percentage))[0];
  const atRiskCount = stats.filter((p) => p.percentage < 75).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-6">
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
        {/* ── PAGE HEADER ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-slate-100 transition flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-3xl font-bold text-slate-900">
              Attendance Analytics
            </h1>
            <p className="text-xs md:text-sm text-slate-500">
              Track player attendance performance
            </p>
          </div>
          {batches.length > 1 && (
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-200 text-sm flex-shrink-0"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── RANGE SELECTOR ── */}
        <div className="flex gap-2">
          {(["LAST_7", "LAST_30", "YEAR"] as StatsRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all ${
                range === r
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {r.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* ── SUMMARY CARDS — always 3-col ── */}
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          {/* Total Players */}
          <div className="bg-white p-3 md:p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Users size={13} className="text-slate-400" />
              <p className="text-[10px] md:text-sm text-slate-500">Players</p>
            </div>
            <p className="text-xl md:text-2xl font-bold text-slate-900">
              {stats.length}
            </p>
            {atRiskCount > 0 && (
              <p className="text-[10px] text-red-500 mt-1 font-medium flex items-center gap-0.5">
                <AlertTriangle size={9} /> {atRiskCount} at risk
              </p>
            )}
          </div>

          {/* Average Attendance */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-3 md:p-5 rounded-xl border border-emerald-200 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={13} className="text-emerald-600" />
              <p className="text-[10px] md:text-sm text-emerald-700">Avg</p>
            </div>
            <p className="text-xl md:text-2xl font-bold text-emerald-700">
              {avgAttendance.toFixed(1)}%
            </p>
            {/* Simple trend indicator */}
            <p
              className={`text-[10px] mt-1 font-medium ${
                avgAttendance >= 80
                  ? "text-emerald-600"
                  : avgAttendance >= 60
                    ? "text-amber-600"
                    : "text-red-500"
              }`}
            >
              {avgAttendance >= 80
                ? "🟢 Good"
                : avgAttendance >= 60
                  ? "🟡 Average"
                  : "🔴 Low"}
            </p>
          </div>

          {/* Top Performer */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-3 md:p-5 rounded-xl border border-amber-200 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy size={13} className="text-amber-600" />
              <p className="text-[10px] md:text-sm text-amber-700">Top</p>
            </div>
            <p className="text-xs md:text-base font-semibold text-amber-800 leading-tight truncate">
              {topPerformer?.playerName || "—"}
            </p>
            {topPerformer && (
              <p className="text-[10px] text-amber-600 mt-1 font-bold">
                {topPerformer.percentage.toFixed(0)}%
              </p>
            )}
          </div>
        </div>

        {/* ── MINI BAR CHART ── */}
        {stats.length > 0 && <MiniBarChart stats={stats} />}

        {/* ── AT RISK ALERT ── */}
        {atRiskCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-800">
                {atRiskCount} player{atRiskCount > 1 ? "s" : ""} need attention
              </p>
              <p className="text-xs text-red-600">
                Below 75% attendance threshold
              </p>
            </div>
          </div>
        )}

        {/* ── PLAYER LIST — cards on mobile, table on desktop ── */}

        {/* Desktop table */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wider">
                <tr>
                  <th className="text-left px-6 py-4">Name</th>
                  <th className="text-center px-4 py-4">Today</th>
                  <th className="text-center px-4 py-4">Sessions</th>
                  <th className="text-center px-4 py-4">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((p) => (
                  <Fragment key={p.playerPublicId}>
                    <tr
                      className="border-t hover:bg-slate-50 transition cursor-pointer"
                      onClick={() => toggleMonth(p.playerPublicId)}
                    >
                      <td className="px-6 py-4 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openPlayerHistory(p.playerPublicId);
                            }}
                            className="hover:text-blue-600 underline-offset-2 hover:underline"
                          >
                            {p.playerName}
                          </button>
                          {p.percentage < 75 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full flex items-center gap-0.5">
                              <AlertTriangle size={9} /> At Risk
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-center px-4">
                        {todayMap[p.playerId] === "PRESENT" ? (
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                            Present
                          </span>
                        ) : todayMap[p.playerId] === "ABSENT" ? (
                          <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                            Absent
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="text-center px-4">
                        {p.presentSessions}/{p.totalSessions}
                      </td>
                      <td className="px-6 py-4 min-w-[180px]">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              p.percentage >= 90
                                ? "bg-green-500"
                                : p.percentage >= 70
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${p.percentage}%` }}
                          />
                        </div>
                        <div className="text-right text-xs mt-1 font-semibold text-slate-600">
                          {p.percentage.toFixed(1)}%
                        </div>
                      </td>
                    </tr>

                    {expandedPlayer === p.playerPublicId && monthDetails && (
                      <tr className="bg-slate-50 border-t">
                        <td colSpan={4} className="p-6">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <h3 className="font-semibold text-slate-800 mb-2">
                                {monthDetails.monthLabel}
                              </h3>
                              <p>Total: {monthDetails.totalSessions}</p>
                              <p>Present: {monthDetails.present}</p>
                              <p>Absent: {monthDetails.absent}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium text-emerald-600">
                                  Present Dates
                                </h4>
                                {monthDetails.presentDates.map(
                                  (d: string, index: number) => (
                                    <div key={`${d}-${index}`}>{d}</div>
                                  ),
                                )}
                              </div>
                              <div>
                                <h4 className="font-medium text-red-600">
                                  Absent Dates
                                </h4>
                                {monthDetails.absentDates.map(
                                  (d: string, index: number) => (
                                    <div key={`${d}-${index}`}>{d}</div>
                                  ),
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {stats.map((p) => {
            const todayStatus = todayMap[p.playerId];
            const isAtRisk = p.percentage < 75;
            const isExpanded = expandedPlayer === p.playerPublicId;

            return (
              <div key={p.playerPublicId}>
                <div
                  onClick={() => toggleMonth(p.playerPublicId)}
                  className={`bg-white rounded-xl border shadow-sm p-3 cursor-pointer active:bg-slate-50 transition ${
                    isAtRisk ? "border-red-200" : "border-slate-200"
                  }`}
                >
                  {/* Row 1: name + today badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openPlayerHistory(p.playerPublicId);
                        }}
                        className="font-semibold text-sm text-slate-800 hover:text-blue-600 truncate"
                      >
                        {p.playerName}
                      </button>
                      {isAtRisk && (
                        <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full flex items-center gap-0.5">
                          <AlertTriangle size={9} /> Risk
                        </span>
                      )}
                    </div>
                    {todayStatus === "PRESENT" ? (
                      <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                        Present
                      </span>
                    ) : todayStatus === "ABSENT" ? (
                      <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                        Absent
                      </span>
                    ) : (
                      <span className="flex-shrink-0 text-slate-400 text-[10px]">
                        Not marked
                      </span>
                    )}
                  </div>

                  {/* Row 2: progress bar + stats */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          p.percentage >= 90
                            ? "bg-emerald-500"
                            : p.percentage >= 70
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${p.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-600 w-10 text-right flex-shrink-0">
                      {p.percentage.toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {p.presentSessions}/{p.totalSessions}
                    </span>
                  </div>
                </div>

                {/* Expanded month details */}
                {isExpanded && monthDetails && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-1 space-y-3">
                    <h3 className="font-semibold text-slate-700 text-sm">
                      {monthDetails.monthLabel}
                    </h3>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded-lg p-2 border border-slate-200">
                        <p className="text-[10px] text-slate-500">Total</p>
                        <p className="font-bold text-slate-800">
                          {monthDetails.totalSessions}
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200">
                        <p className="text-[10px] text-emerald-600">Present</p>
                        <p className="font-bold text-emerald-700">
                          {monthDetails.present}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                        <p className="text-[10px] text-red-600">Absent</p>
                        <p className="font-bold text-red-700">
                          {monthDetails.absent}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-600 mb-1">
                          Present Dates
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {monthDetails.presentDates.map(
                            (d: string, i: number) => (
                              <span
                                key={`${d}-${i}`}
                                className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded"
                              >
                                {d}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-red-600 mb-1">
                          Absent Dates
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {monthDetails.absentDates.map(
                            (d: string, i: number) => (
                              <span
                                key={`${d}-${i}`}
                                className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded"
                              >
                                {d}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AttendanceStatsPage;
