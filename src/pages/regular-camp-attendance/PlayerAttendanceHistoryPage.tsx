import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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

function groupHistoryByRecent(history: AttendanceDay[]): GroupedData[] {
  return history.map((day) => ({
    label: formatDate(day.date),
    key: day.date,
    days: [day],
    presentCount: day.sessions.filter((s) => s.status === "PRESENT").length,
    totalCount: day.sessions.length,
  }));
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

  /* ---------------- GROUPING LOGIC ---------------- */

  const groupedData = useMemo(() => {
    return groupHistoryByMonth(history);
  }, [history]);

  /* ---------------- STATES ---------------- */

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-500">
        Loading attendance history…
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
    <div className="max-w-5xl mx-auto px-4 space-y-8">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1 rounded hover:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <h1 className="text-xl font-semibold">{player.displayName}</h1>
          <p className="text-sm text-gray-500">
            Attendance History • {player.batchNames}
          </p>
        </div>
      </div>

      {/* SUMMARY */}
      <AttendanceSummaryCards summary={summary} />

      {/* EXPAND/COLLAPSE CONTROLS */}

      {/* HISTORY */}
      <div className="space-y-4">
        {history.length === 0 && (
          <p className="text-sm text-gray-500">No attendance records found</p>
        )}

        {groupedData.map((group) => (
          <div key={group.key} className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              📅 {group.label}
            </h3>

            <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-600 mb-5">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-400"></span> All
                Present
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-400"></span> All
                Absent
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow-400"></span>{" "}
                Present in one batch, Absent in another
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-gray-300"></span> Not
                Marked
              </div>
            </div>

            {group.calendar && (
              <div className="max-w-xs">
                <div className="grid grid-cols-7 gap-0.5 text-xs">
                  {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                    <div
                      key={i}
                      className="text-center font-medium text-gray-500 py-0.5 text-[10px]"
                    >
                      {day}
                    </div>
                  ))}

                  {(() => {
                    const firstDay = new Date(group.calendar[0].date);
                    const dayOfWeek = (firstDay.getDay() + 6) % 7;
                    return Array(dayOfWeek)
                      .fill(null)
                      .map((_, i) => <div key={`empty-${i}`} />);
                  })()}

                  {group.calendar.map((cal) => {
                    const day = new Date(cal.date).getDate();
                    let bgColor = "bg-gray-50";

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
        ))}
      </div>
    </div>
  );
}

export default PlayerAttendanceHistoryPage;
