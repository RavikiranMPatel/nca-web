import { useEffect, useState, useMemo, Fragment } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { getImageUrl } from "../../utils/imageUrl";

import api from "../../api/axios";
import {
  fetchPlayerAttendanceSummary,
  type PlayerAttendanceSummary,
} from "../../api/attendance";

import AttendanceSummaryCards from "../../components/attendance-component/AttendanceSummaryCards";

/* ---------------- TYPES ---------------- */

type AttendanceSession = {
  date: string;
  batch: string;
  status: "PRESENT" | "ABSENT" | "OVERRIDDEN";
  markedAt: string;
  markedBy: string;
  oldStatus?: string;
  newStatus?: string;
  reason?: string;
  overriddenBy?: string;
  overriddenAt?: string;
};

type AttendanceDay = {
  date: string;
  sessions: AttendanceSession[];
};

type PlayerSummary = {
  publicId: string;
  displayName: string;
  gender: string;
  batchNames: string;
  joiningDate: string;
  active: boolean;
  photoUrl?: string;
};

type GroupedData = {
  label: string;
  key: string;
  days: AttendanceDay[];
  presentCount: number;
  totalCount: number;
};

/* ---------------- HELPERS ---------------- */

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getMonthYear(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function groupHistoryByMonth(history: AttendanceDay[]): GroupedData[] {
  const monthMap: Record<string, AttendanceDay[]> = {};

  history.forEach((day) => {
    const monthKey = day.date.substring(0, 7);
    if (!monthMap[monthKey]) monthMap[monthKey] = [];
    monthMap[monthKey].push(day);
  });

  return Object.entries(monthMap).map(([monthKey, days]) => {
    const presentCount = days.reduce(
      (sum, day) =>
        sum + day.sessions.filter((s) => s.status === "PRESENT").length,
      0,
    );
    const totalCount = days.reduce((sum, day) => sum + day.sessions.length, 0);

    return {
      label: getMonthYear(days[0].date),
      key: monthKey,
      days,
      presentCount,
      totalCount,
    };
  });
}

// ── Calculate current streak from history ─────────────────────────
function calculateStreak(history: AttendanceDay[]): {
  currentStreak: number;
  longestStreak: number;
  streakType: "PRESENT" | "ABSENT" | "NONE";
} {
  if (history.length === 0)
    return { currentStreak: 0, longestStreak: 0, streakType: "NONE" };

  // Sort descending by date
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));

  // Determine each day's overall status
  const dayStatuses = sorted.map((day) => {
    const statuses = day.sessions.map((s) => s.status);
    if (statuses.every((s) => s === "PRESENT")) return "PRESENT";
    if (statuses.every((s) => s === "ABSENT")) return "ABSENT";
    return "MIXED";
  });

  // Current streak — count from most recent day
  const firstStatus = dayStatuses[0] === "MIXED" ? "PRESENT" : dayStatuses[0];
  let currentStreak = 0;
  for (const status of dayStatuses) {
    const normalized = status === "MIXED" ? "PRESENT" : status;
    if (normalized === firstStatus) currentStreak++;
    else break;
  }

  // Longest present streak
  let longestStreak = 0;
  let tempStreak = 0;
  for (const status of dayStatuses) {
    if (status === "PRESENT" || status === "MIXED") {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return {
    currentStreak,
    longestStreak,
    streakType: firstStatus as "PRESENT" | "ABSENT",
  };
}

// ── Month-over-month trend ─────────────────────────────────────────
function calculateMonthTrend(groupedData: GroupedData[]): {
  direction: "UP" | "DOWN" | "SAME";
  diff: number;
} {
  if (groupedData.length < 2) return { direction: "SAME", diff: 0 };

  const latest = groupedData[0];
  const prev = groupedData[1];

  const latestPct =
    latest.totalCount > 0 ? (latest.presentCount / latest.totalCount) * 100 : 0;
  const prevPct =
    prev.totalCount > 0 ? (prev.presentCount / prev.totalCount) * 100 : 0;

  const diff = Math.round(latestPct - prevPct);
  if (diff > 0) return { direction: "UP", diff };
  if (diff < 0) return { direction: "DOWN", diff: Math.abs(diff) };
  return { direction: "SAME", diff: 0 };
}

/* ---------------- COMPONENT ---------------- */

function PlayerAttendanceHistoryPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();

  const openDayHistory = (date: string) => {
    navigate(`/admin/attendance/day/${date}`);
  };

  const handleDownloadReport = async () => {
    if (!playerId) return;
    setDownloading(true);
    try {
      const res = await api.get(
        `/admin/players/${playerId}/attendance/report.pdf`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${playerId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download attendance report");
    } finally {
      setDownloading(false);
    }
  };

  const [player, setPlayer] = useState<PlayerSummary | null>(null);
  const [summary, setSummary] = useState<PlayerAttendanceSummary | null>(null);
  const [history, setHistory] = useState<AttendanceDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    if (!playerId) return;

    Promise.all([
      api.get(`/admin/players/${playerId}`),
      api.get(`/admin/players/${playerId}/attendance`),
      fetchPlayerAttendanceSummary(playerId),
    ])
      .then(([playerRes, historyRes, summaryRes]) => {
        setPlayer(playerRes.data);
        setHistory(historyRes.data);
        setSummary(summaryRes);
      })
      .catch(() => {
        toast.error("Failed to load attendance data");
      })
      .finally(() => setLoading(false));
  }, [playerId]);

  /* ---------------- DERIVED DATA ---------------- */
  const groupedData = useMemo(() => groupHistoryByMonth(history), [history]);
  const streak = useMemo(() => calculateStreak(history), [history]);
  const trend = useMemo(() => calculateMonthTrend(groupedData), [groupedData]);

  /* ---------------- STATES ---------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!player || !summary) {
    return (
      <div className="text-center py-10 text-red-600">
        Player data not found
      </div>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-4 md:space-y-8">
      {/* ── HEADER ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        {player.photoUrl ? (
          <img
            src={getImageUrl(player.photoUrl) || undefined}
            alt={player.displayName}
            className="w-10 h-10 rounded-full object-cover object-center border-2 border-slate-200 flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-2 border-slate-200 flex-shrink-0">
            <span className="text-sm font-bold text-blue-600">
              {player.displayName.charAt(0)}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base md:text-xl font-semibold text-gray-900 truncate">
            {player.displayName}
          </h1>
          <p className="text-xs text-gray-500">
            Attendance History • {player.batchNames}
          </p>
        </div>
        <button
          onClick={handleDownloadReport}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
        >
          <Download size={14} className={downloading ? "animate-bounce" : ""} />
          {downloading ? "Generating…" : "Download Report"}
        </button>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <AttendanceSummaryCards summary={summary} />

      {/* ── STREAK + TREND CARDS ── */}
      {history.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {/* Current Streak */}
          <div
            className={`rounded-xl p-4 border ${
              streak.streakType === "PRESENT"
                ? "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200"
                : streak.streakType === "ABSENT"
                  ? "bg-gradient-to-br from-red-50 to-rose-50 border-red-200"
                  : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Flame
                size={14}
                className={
                  streak.streakType === "PRESENT"
                    ? "text-orange-500"
                    : "text-red-400"
                }
              />
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                Current Streak
              </p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {streak.currentStreak}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {streak.streakType === "PRESENT"
                ? "days present 🔥"
                : streak.streakType === "ABSENT"
                  ? "days absent"
                  : "days"}
            </p>
            {streak.longestStreak > 0 && (
              <p className="text-[10px] text-gray-400 mt-1">
                Best: {streak.longestStreak} days
              </p>
            )}
          </div>

          {/* Month trend */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-1.5 mb-1">
              {trend.direction === "UP" ? (
                <TrendingUp size={14} className="text-emerald-500" />
              ) : trend.direction === "DOWN" ? (
                <TrendingDown size={14} className="text-red-400" />
              ) : (
                <Minus size={14} className="text-gray-400" />
              )}
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                vs Last Month
              </p>
            </div>
            <p
              className={`text-2xl font-bold ${
                trend.direction === "UP"
                  ? "text-emerald-600"
                  : trend.direction === "DOWN"
                    ? "text-red-500"
                    : "text-gray-500"
              }`}
            >
              {trend.direction === "UP"
                ? `+${trend.diff}%`
                : trend.direction === "DOWN"
                  ? `-${trend.diff}%`
                  : "—"}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {trend.direction === "UP"
                ? "Improved 📈"
                : trend.direction === "DOWN"
                  ? "Dropped 📉"
                  : groupedData.length < 2
                    ? "Need more data"
                    : "No change"}
            </p>
          </div>
        </div>
      )}

      {/* ── BATCH DETAIL TABLE ── */}
      {history.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-sm text-gray-400">
          No attendance records found
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">
            Session Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-6 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    Date
                  </th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Batch / Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...groupedData]
                  .sort((a, b) => b.key.localeCompare(a.key))
                  .map((group, gi) => (
                    <Fragment key={group.key}>
                      {gi > 0 && (
                        <tr>
                          <td colSpan={2} className="pt-2" />
                        </tr>
                      )}
                      <tr>
                        <td
                          colSpan={2}
                          className="py-2 px-3 bg-slate-50 border-y border-slate-200 rounded"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                              {group.label}
                            </span>
                            <span
                              className={`text-xs font-medium ${
                                group.totalCount > 0 &&
                                group.presentCount / group.totalCount >= 0.75
                                  ? "text-green-600"
                                  : group.totalCount > 0 &&
                                      group.presentCount / group.totalCount >=
                                        0.5
                                    ? "text-amber-600"
                                    : "text-red-500"
                              }`}
                            >
                              {group.presentCount}/{group.totalCount} sessions
                              {group.totalCount > 0
                                ? ` · ${Math.round((group.presentCount / group.totalCount) * 100)}%`
                                : ""}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {[...group.days]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((day) => (
                          <tr
                            key={day.date}
                            className="hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50"
                            onClick={() => openDayHistory(day.date)}
                          >
                            <td className="py-2.5 pr-6 text-xs text-gray-500 whitespace-nowrap">
                              {formatDate(day.date)}
                            </td>
                            <td className="py-2.5">
                              <div className="flex flex-wrap gap-1.5">
                                {day.sessions.map((s, i) => (
                                  <span
                                    key={i}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                      s.status === "PRESENT"
                                        ? "bg-green-100 text-green-700"
                                        : s.status === "ABSENT"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-yellow-100 text-yellow-700"
                                    }`}
                                  >
                                    <span className="text-gray-500 font-normal">
                                      {s.batch.replace(/^Regular\s+/i, "")}:
                                    </span>
                                    {s.status === "PRESENT"
                                      ? "Present"
                                      : s.status === "ABSENT"
                                        ? "Absent"
                                        : "Override"}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </Fragment>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerAttendanceHistoryPage;
