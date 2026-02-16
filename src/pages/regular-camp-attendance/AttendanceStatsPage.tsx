import { useEffect, useState, Fragment } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

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
      const res = await api.get("/admin/batches", {
        params: { activeOnly: true },
      });

      setBatches(res.data);

      // Auto-select if only 1 batch
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
        // 1️⃣ Attendance stats
        const data = await fetchAttendanceStats(range, selectedBatchId);
        setStats(data);

        // 2️⃣ Today attendance
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
        {
          params: {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
          },
        },
      );

      setMonthDetails(res.data);
      setExpandedPlayer(playerPublicId);
    } catch (err) {
      console.error("Failed loading month details:", err);
    }
  };

  if (!selectedBatchId) return <div className="p-6">Loading batches...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* ===== PAGE HEADER ===== */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 🔙 BACK BUTTON */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-slate-100 transition text-sm font-medium"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Attendance Analytics
              </h1>
              <p className="text-slate-500 mt-1">
                Track player attendance performance
              </p>
            </div>
          </div>

          {batches.length > 1 && (
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-200"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ===== RANGE SELECTOR ===== */}
        <div className="flex gap-3">
          {(["LAST_7", "LAST_30", "YEAR"] as StatsRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                range === r
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {r.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* ===== SUMMARY CARDS ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">Total Players</p>
            <p className="text-2xl font-bold text-slate-900">{stats.length}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-xl border border-emerald-200 shadow-sm">
            <p className="text-sm text-emerald-700">Average Attendance</p>
            <p className="text-2xl font-bold text-emerald-700">
              {stats.length
                ? (
                    stats.reduce((sum, p) => sum + Number(p.percentage), 0) /
                    stats.length
                  ).toFixed(1)
                : 0}
              %
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-5 rounded-xl border border-amber-200 shadow-sm">
            <p className="text-sm text-amber-700">Top Performer</p>
            <p className="text-lg font-semibold text-amber-800">
              {stats
                .slice()
                .sort((a, b) => Number(b.percentage) - Number(a.percentage))[0]
                ?.playerName || "-"}
            </p>
          </div>
        </div>

        {/* ===== TABLE CARD ===== */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                      {/* NAME */}
                      <td className="px-6 py-4 font-medium text-slate-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPlayerHistory(p.playerPublicId);
                          }}
                          className="hover:text-blue-600 underline-offset-2 hover:underline"
                        >
                          {p.playerName}
                        </button>
                      </td>

                      {/* TODAY STATUS */}
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

                      {/* SESSIONS */}
                      <td className="text-center px-4">
                        {p.presentSessions}/{p.totalSessions}
                      </td>

                      {/* ATTENDANCE PROGRESS */}
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
      </div>
    </div>
  );
};

export default AttendanceStatsPage;
