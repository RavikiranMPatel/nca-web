import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { toast } from "react-hot-toast";

import api from "../../api/axios";
import {
  fetchPlayerAttendanceSummary,
  type PlayerAttendanceSummary,
} from "../../api/attendance";

import AttendanceSummaryCards from "../../components/attendance-component/AttendanceSummaryCards";

/* ---------------- TYPES ---------------- */

type AttendanceSession = {
  date: string;
  batchName: string;
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
};

type GroupedData = {
  label: string;
  key: string;
  days: AttendanceDay[];
  presentCount: number;
  totalCount: number;
  calendar?: {
    date: string;
    status: "PRESENT" | "ABSENT" | "MIXED" | "NONE";
    tooltip?: string;
  }[];
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
    const calendar = generateMonthCalendar(monthKey, days);

    return {
      label: getMonthYear(days[0].date),
      key: monthKey,
      days,
      presentCount,
      totalCount,
      calendar,
    };
  });
}

function generateMonthCalendar(
  monthKey: string,
  days: AttendanceDay[],
): {
  date: string;
  status: "PRESENT" | "ABSENT" | "MIXED" | "NONE";
  tooltip?: string;
}[] {
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const calendar = [];
  const dayMap = new Map(days.map((d) => [d.date, d]));

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${monthKey}-${String(day).padStart(2, "0")}`;
    const dayData = dayMap.get(dateStr);

    let status: "PRESENT" | "ABSENT" | "MIXED" | "NONE" = "NONE";
    if (dayData) {
      const statuses = dayData.sessions.map((s) => s.status);
      const markedByUsers = [
        ...new Set(dayData.sessions.map((s) => s.markedBy)),
      ].join(", ");
      if (statuses.every((s) => s === "PRESENT")) status = "PRESENT";
      else if (statuses.every((s) => s === "ABSENT")) status = "ABSENT";
      else status = "MIXED";
      calendar.push({
        date: dateStr,
        status,
        tooltip: `Marked by: ${markedByUsers}`,
      });
      continue;
    }

    calendar.push({ date: dateStr, status });
  }

  return calendar;
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

  const [player, setPlayer] = useState<PlayerSummary | null>(null);
  const [summary, setSummary] = useState<PlayerAttendanceSummary | null>(null);
  const [history, setHistory] = useState<AttendanceDay[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div className="flex-1 min-w-0">
          <h1 className="text-base md:text-xl font-semibold text-gray-900 truncate">
            {player.displayName}
          </h1>
          <p className="text-xs text-gray-500">
            Attendance History • {player.batchNames}
          </p>
        </div>
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

      {/* ── HISTORY CALENDAR ── */}
      <div className="space-y-4">
        {history.length === 0 && (
          <p className="text-sm text-gray-500">No attendance records found</p>
        )}

        {groupedData.map((group) => {
          const monthPct =
            group.totalCount > 0
              ? Math.round((group.presentCount / group.totalCount) * 100)
              : 0;

          return (
            <div
              key={group.key}
              className="bg-white rounded-2xl shadow-sm p-4 md:p-6"
            >
              {/* Month header with attendance % */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  📅 {group.label}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {group.presentCount}/{group.totalCount}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      monthPct >= 90
                        ? "bg-emerald-100 text-emerald-700"
                        : monthPct >= 75
                          ? "bg-blue-100 text-blue-700"
                          : monthPct >= 50
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                    }`}
                  >
                    {monthPct}%
                  </span>
                </div>
              </div>

              {/* Legend — compact on mobile */}
              <div className="flex flex-wrap gap-2 md:gap-4 text-[10px] md:text-xs font-medium text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />{" "}
                  Present
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />{" "}
                  Absent
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />{" "}
                  Mixed
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Not
                  Marked
                </div>
              </div>

              {group.calendar && (
                <div className="max-w-xs">
                  <div className="grid grid-cols-7 gap-0.5 text-xs">
                    {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                      <div
                        key={i}
                        className="text-center font-medium text-gray-400 py-0.5 text-[10px]"
                      >
                        {day}
                      </div>
                    ))}

                    {(() => {
                      const firstDay = new Date(group.calendar![0].date);
                      const dayOfWeek = (firstDay.getDay() + 6) % 7;
                      return Array(dayOfWeek)
                        .fill(null)
                        .map((_, i) => <div key={`empty-${i}`} />);
                    })()}

                    {group.calendar.map((cal) => {
                      const day = new Date(cal.date).getDate();
                      let bgColor = "bg-gray-50 text-gray-500";
                      if (cal.status === "PRESENT")
                        bgColor = "bg-green-400 text-white";
                      else if (cal.status === "ABSENT")
                        bgColor = "bg-red-400 text-white";
                      else if (cal.status === "MIXED")
                        bgColor = "bg-yellow-400 text-white";

                      return (
                        <button
                          key={cal.date}
                          title={cal.tooltip || ""}
                          onClick={() => openDayHistory(cal.date)}
                          disabled={cal.status === "NONE"}
                          className={`w-8 h-8 rounded text-[11px] font-semibold ${bgColor} ${
                            cal.status !== "NONE"
                              ? "hover:scale-105 cursor-pointer"
                              : "opacity-30 cursor-default"
                          } transition-all flex items-center justify-center`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PlayerAttendanceHistoryPage;
