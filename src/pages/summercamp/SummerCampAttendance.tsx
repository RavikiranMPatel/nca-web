import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../auth/useAuth";
import {
  ArrowLeft,
  Calendar,
  Save,
  CheckCircle,
  XCircle,
  Users,
  Filter,
  GitBranch,
  History,
  ChevronRight,
  ChevronLeft,
  Shield,
  Lock,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { summerCampService } from "../../api/summerCampService";
import { getCampBatches } from "../../api/summerCampBatchService";
import { getAdminBranches } from "../../api/branch.api";
import AttendanceOverrideModal from "../../components/attendance-component/AttendanceOverrideModal";
import api from "../../api/axios";
import type {
  SummerCamp,
  SummerCampEnrollment,
  SummerCampAttendanceBulkRequest,
  BulkAttendanceItem,
} from "../../types/summercamp";
import type { Branch } from "../../api/branch.api";
import type { Batch } from "../../types/batch.types";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type AttendanceRow = {
  enrollmentId: string;
  publicId: string;
  playerName: string;
  status: "PRESENT" | "ABSENT" | "NOT_MARKED";
};

type MainTab = "mark" | "history";
type HistorySubView = "sessions" | "detail" | "students";

type SessionSummary = {
  sessionPublicId: string;
  attendanceDate: string;
  dayNumber: number;
  batchId: string;
  batchName: string;
  batchTime: string;
  present: number;
  absent: number;
  total: number;
  locked: boolean;
  editableByAdmin: boolean;
  editableBySuperAdmin: boolean;
};

type StudentRow = {
  attendanceRecordId: string;
  enrollmentPublicId: string;
  playerName: string;
  status: "PRESENT" | "ABSENT";
  overridden: boolean;
  overrideReason?: string;
};

type SessionDetail = {
  sessionPublicId: string;
  attendanceDate: string;
  dayNumber: number;
  batchName: string;
  present: number;
  absent: number;
  total: number;
  locked: boolean;
  students: StudentRow[];
};

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE % RING
// ─────────────────────────────────────────────────────────────────────────────

function AttendanceRing({ pct, size = 52 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  const color = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} className="-rotate-90 flex-shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={5}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION LIST VIEW
// ─────────────────────────────────────────────────────────────────────────────

function SessionListView({
  batches,
  sessions,
  loading,
  onDrillDown,
  onStudentView,
}: {
  batches: Batch[];
  sessions: SessionSummary[];
  loading: boolean;
  onDrillDown: (session: SessionSummary) => void;
  onStudentView: () => void;
}) {
  const [filterBatch, setFilterBatch] = useState("");

  const filtered = useMemo(
    () =>
      filterBatch
        ? sessions.filter((s) => s.batchId === filterBatch)
        : sessions,
    [sessions, filterBatch],
  );

  // Group by date so same-day multi-batch sessions are visually grouped
  const grouped = useMemo(() => {
    const map = new Map<string, SessionSummary[]>();
    filtered.forEach((s) => {
      if (!map.has(s.attendanceDate)) map.set(s.attendanceDate, []);
      map.get(s.attendanceDate)!.push(s);
    });
    return Array.from(map.entries());
  }, [filtered]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Filter size={14} className="text-slate-400 flex-shrink-0" />
          <select
            value={filterBatch}
            onChange={(e) => setFilterBatch(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 flex-1 min-w-0"
          >
            <option value="">All batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onStudentView}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition flex-shrink-0"
        >
          <BarChart3 size={14} /> By Student
        </button>
        <span className="text-xs text-slate-400 flex-shrink-0">
          {filtered.length} session{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <ClipboardList size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-500">
            No attendance records yet
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Mark attendance to see history here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(([date, daySessions], gi) => (
            <div key={date}>
              {daySessions.length > 1 && (
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                  {new Date(date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              )}
              {daySessions.map((session, i) => {
                const pct =
                  session.total > 0
                    ? Math.round((session.present / session.total) * 100)
                    : 0;
                return (
                  <motion.button
                    key={session.sessionPublicId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (gi * 2 + i) * 0.03 }}
                    onClick={() => onDrillDown(session)}
                    className="no-min-h w-full text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <AttendanceRing pct={pct} size={50} />
                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-slate-700">
                          {pct}%
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">
                            {daySessions.length === 1
                              ? new Date(date).toLocaleDateString("en-IN", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : session.batchName}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-semibold">
                            Day {session.dayNumber}
                          </span>
                          {session.locked && (
                            <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full flex items-center gap-0.5">
                              <Lock size={9} /> Locked
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {daySessions.length === 1
                            ? `${session.batchName}${session.batchTime ? ` · ${session.batchTime}` : ""}`
                            : new Date(date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs font-semibold text-emerald-600">
                            ✓ {session.present}
                          </span>
                          <span className="text-xs font-semibold text-red-500">
                            ✗ {session.absent}
                          </span>
                          <span className="text-xs text-slate-400">
                            / {session.total}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={15}
                        className="text-slate-300 group-hover:text-blue-400 transition flex-shrink-0"
                      />
                    </div>
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 75
                            ? "bg-emerald-400"
                            : pct >= 50
                              ? "bg-amber-400"
                              : "bg-red-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION DETAIL VIEW
// ─────────────────────────────────────────────────────────────────────────────

function SessionDetailView({
  campId,
  session,
  isSuperAdmin,
  onBack,
}: {
  campId: string;
  session: SessionSummary;
  isSuperAdmin: boolean;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrideTarget, setOverrideTarget] = useState<StudentRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/admin/summer-camps/${campId}/attendance/history/session`,
        {
          params: {
            date: session.attendanceDate,
            batchId: session.batchId,
          },
        },
      );
      setDetail(res.data);
    } catch {
      toast.error("Failed to load session records");
    } finally {
      setLoading(false);
    }
  }, [campId, session.sessionPublicId]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmOverride = async (reason: string) => {
    if (!overrideTarget) return;
    try {
      await api.post(`/admin/summer-camps/${campId}/attendance/bulk-override`, {
        date: session.attendanceDate,
        batchId: session.batchId,
        items: [
          {
            enrollmentPublicId: overrideTarget.enrollmentPublicId,
            newStatus:
              overrideTarget.status === "PRESENT" ? "ABSENT" : "PRESENT",
            reason,
          },
        ],
      });
      toast.success("Attendance overridden");
      setOverrideTarget(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Override failed");
    }
  };

  if (loading || !detail)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );

  const pct =
    detail.total > 0 ? Math.round((detail.present / detail.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition font-medium"
      >
        <ChevronLeft size={15} /> Back to sessions
      </button>

      {/* Dark summary card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              Day {detail.dayNumber} · {detail.batchName}
            </p>
            <p className="text-xl font-black mt-1 leading-tight">
              {new Date(detail.attendanceDate).toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <div className="relative flex-shrink-0">
            <AttendanceRing pct={pct} size={58} />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">
              {pct}%
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            {
              label: "Present",
              val: detail.present,
              color: "text-emerald-400",
            },
            { label: "Absent", val: detail.absent, color: "text-red-400" },
            { label: "Total", val: detail.total, color: "text-slate-300" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white/10 rounded-xl p-3 text-center"
            >
              <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        {detail.locked && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <Lock size={11} />
            {isSuperAdmin
              ? "Locked — you can still override as Super Admin"
              : "Locked — editing disabled"}
          </div>
        )}
      </div>

      {/* Student rows */}
      <div className="space-y-2">
        {detail.students.map((student, i) => (
          <motion.div
            key={student.attendanceRecordId}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.025 }}
            className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3"
          >
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-slate-500">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900 text-sm truncate">
                  {student.playerName}
                </p>
                {student.overridden && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-200 flex items-center gap-0.5 flex-shrink-0">
                    <Shield size={9} /> Overridden
                  </span>
                )}
              </div>
              {student.overrideReason && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {student.overrideReason}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`text-xs font-bold px-2.5 py-1.5 rounded-lg ${
                  student.status === "PRESENT"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {student.status === "PRESENT" ? "✓ Present" : "✗ Absent"}
              </span>
              {isSuperAdmin && (
                <button
                  onClick={() => setOverrideTarget(student)}
                  className="p-2.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition"
                  title="Override attendance"
                >
                  <Shield size={15} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Reuse existing modal — no new component needed */}
      <AttendanceOverrideModal
        open={!!overrideTarget}
        playerName={overrideTarget?.playerName || ""}
        onClose={() => setOverrideTarget(null)}
        onConfirm={confirmOverride}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT HISTORY VIEW  (day-dot calendar like PlayerAttendanceHistoryPage)
// ─────────────────────────────────────────────────────────────────────────────

function StudentHistoryView({
  campId,
  sessions,
  onBack,
}: {
  campId: string;
  sessions: SessionSummary[];
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Build student map by fetching all session details in parallel
  type DayDot = {
    dayNumber: number;
    date: string;
    batchName: string;
    status: "PRESENT" | "ABSENT";
  };
  type StudentEntry = { name: string; days: DayDot[] };

  const [studentMap, setStudentMap] = useState<Map<string, StudentEntry>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    // We need enrollmentPublicIds — derive from sessions by fetching enrollments
    // Instead use the per-enrollment history endpoint for each enrollment
    const loadStudentHistory = async () => {
      if (sessions.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoadProgress({ done: 0, total: sessions.length });
        const sessionDetails = await Promise.all(
          sessions.map((s) =>
            api
              .get(`/admin/summer-camps/${campId}/attendance/history/session`, {
                params: { date: s.attendanceDate, batchId: s.batchId },
              })
              .then((res) => {
                setLoadProgress((p) => ({ ...p, done: p.done + 1 }));
                return res.data as SessionDetail;
              })
              .catch(() => {
                setLoadProgress((p) => ({ ...p, done: p.done + 1 }));
                return null;
              }),
          ),
        );

        // Collect unique enrollmentPublicIds across all sessions
        const enrollmentIds = new Set<string>();
        sessionDetails.forEach((detail) => {
          if (!detail) return;
          detail.students.forEach((s) =>
            enrollmentIds.add(s.enrollmentPublicId),
          );
        });

        // Fetch per-enrollment history for each enrollment (has summary + daily breakdown)
        const enrollmentHistories = await Promise.all(
          Array.from(enrollmentIds).map((enrollmentId) =>
            api
              .get(
                `/admin/summer-camps/${campId}/enrollments/${enrollmentId}/attendance-history`,
              )
              .then((res) => res.data)
              .catch(() => null),
          ),
        );

        // Build student map from enrollment histories
        const map = new Map<string, StudentEntry>();
        enrollmentHistories.forEach((history) => {
          if (!history) return;
          const days: DayDot[] = history.dailyHistory
            .filter((d: any) => d.status !== "NOT_TAKEN")
            .map((d: any) => ({
              dayNumber: d.dayNumber,
              date: d.date,
              batchName: d.batchName,
              status: d.status as "PRESENT" | "ABSENT",
            }));
          map.set(history.enrollmentPublicId, {
            name: history.playerName,
            days,
          });
        });

        setStudentMap(map);
      } catch {
        toast.error("Failed to load student history");
      } finally {
        setLoading(false);
      }
    };

    loadStudentHistory();
  }, [sessions, campId]);

  const filtered = useMemo(() => {
    const entries = Array.from(studentMap.entries());
    if (!search) return entries;
    return entries.filter(([, v]) =>
      v.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [studentMap, search]);

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-7 h-7 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        {loadProgress.total > 0 && (
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-xs text-slate-400">
              Loading {loadProgress.done}/{loadProgress.total} sessions…
            </p>
            <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-300"
                style={{
                  width: `${loadProgress.total > 0 ? (loadProgress.done / loadProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    );

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition font-medium"
      >
        <ChevronLeft size={15} /> Back to sessions
      </button>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search student…"
        className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Users size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-500">No students found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(([enrollmentPublicId, { name, days }], i) => {
            const presentCount = days.filter(
              (d) => d.status === "PRESENT",
            ).length;
            const pct =
              days.length > 0
                ? Math.round((presentCount / days.length) * 100)
                : 0;
            const isOpen = expanded === enrollmentPublicId;

            return (
              <motion.div
                key={enrollmentPublicId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpanded(isOpen ? null : enrollmentPublicId)
                  }
                  className="no-min-h w-full text-left p-4 flex items-center gap-3 hover:bg-slate-50 transition"
                >
                  <div className="relative flex-shrink-0">
                    <AttendanceRing pct={pct} size={46} />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-700">
                      {pct}%
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">
                      {name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-emerald-600 font-semibold">
                        {presentCount}P
                      </span>
                      <span className="text-xs text-red-500 font-semibold">
                        {days.length - presentCount}A
                      </span>
                      <span className="text-xs text-slate-400">
                        / {days.length} days
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-lg border flex-shrink-0 ${
                      pct >= 75
                        ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                        : pct >= 50
                          ? "text-amber-600 bg-amber-50 border-amber-200"
                          : "text-red-600 bg-red-50 border-red-200"
                    }`}
                  >
                    {pct >= 75 ? "Good" : pct >= 50 ? "Avg" : "Low"}
                  </span>
                  <ChevronRight
                    size={14}
                    className={`text-slate-300 transition-transform flex-shrink-0 ${isOpen ? "rotate-90" : ""}`}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Day-by-day attendance
                        </p>
                        {/* Day dots — same style as PlayerAttendanceHistoryPage calendar */}
                        <div className="flex flex-wrap gap-1.5">
                          {days.map((day) => (
                            <div
                              key={`${day.date}-${day.batchName}`}
                              className="relative group"
                            >
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-transform hover:scale-110 ${
                                  day.status === "PRESENT"
                                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                    : "bg-red-100 text-red-700 border border-red-200"
                                }`}
                              >
                                {day.dayNumber}
                              </div>
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-800 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                                {new Date(day.date).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "numeric",
                                    month: "short",
                                  },
                                )}{" "}
                                · {day.batchName} · {day.status}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-emerald-200 inline-block" />{" "}
                            Present
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-red-200 inline-block" />{" "}
                            Absent
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY TAB
// ─────────────────────────────────────────────────────────────────────────────

function HistoryTab({
  campId,
  batches,
  isSuperAdmin,
}: {
  campId: string;
  batches: Batch[];
  isSuperAdmin: boolean;
}) {
  const [subView, setSubView] = useState<HistorySubView>("sessions");
  const [drillSession, setDrillSession] = useState<SessionSummary | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetched, setFetched] = useState(false);

  const loadSessions = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/admin/summer-camps/${campId}/attendance/history`,
      );
      setSessions(res.data);
      setFetched(true);
    } catch {
      toast.error("Failed to load attendance history");
    } finally {
      setLoading(false);
    }
  }, [campId, fetched]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  if (subView === "detail" && drillSession) {
    return (
      <SessionDetailView
        campId={campId}
        session={drillSession}
        isSuperAdmin={isSuperAdmin}
        onBack={() => {
          setSubView("sessions");
          setDrillSession(null);
        }}
      />
    );
  }

  if (subView === "students") {
    return (
      <StudentHistoryView
        campId={campId}
        sessions={sessions}
        onBack={() => setSubView("sessions")}
      />
    );
  }

  return (
    <SessionListView
      batches={batches}
      sessions={sessions}
      loading={loading}
      onDrillDown={(s) => {
        setDrillSession(s);
        setSubView("detail");
      }}
      onStudentView={() => setSubView("students")}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK ATTENDANCE TAB  (original logic, no logic changes)
// ─────────────────────────────────────────────────────────────────────────────

function MarkAttendanceTab({
  campId,
  camp,
  enrollments,
  batches,
}: {
  campId: string;
  camp: SummerCamp;
  enrollments: SummerCampEnrollment[];
  batches: Batch[];
}) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedBatch, setSelectedBatch] = useState<string>(
    batches[0]?.id ?? "",
  );
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [existingAttendance, setExistingAttendance] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const isPastDate = selectedDate < today;
  const { userRole } = useAuth();
  const isSuperAdmin = userRole === "ROLE_SUPER_ADMIN";
  const canEdit = isSuperAdmin || !isPastDate;

  useEffect(() => {
    if (selectedDate && selectedBatch) loadAttendanceData();
  }, [selectedDate, selectedBatch]);

  const loadAttendanceData = async () => {
    try {
      const batchEnrollments = enrollments.filter((e) =>
        e.batchIds?.includes(selectedBatch),
      );
      try {
        const existingRecords = await summerCampService.getAttendanceRecords(
          campId,
          selectedDate,
          selectedBatch,
        );
        setAttendanceRows(
          batchEnrollments.map((enrollment) => {
            const existing = existingRecords.find(
              (r) => r.enrollmentId === enrollment.id,
            );
            return {
              enrollmentId: enrollment.id,
              publicId: enrollment.publicId,
              playerName: enrollment.playerName,
              status: existing ? existing.status : "NOT_MARKED",
            };
          }),
        );
        setExistingAttendance(existingRecords.map((r) => r.enrollmentId));
      } catch {
        setAttendanceRows(
          batchEnrollments.map((e) => ({
            enrollmentId: e.id,
            publicId: e.publicId,
            playerName: e.playerName,
            status: "NOT_MARKED" as const,
          })),
        );
        setExistingAttendance([]);
      }
    } catch {
      toast.error("Failed to load attendance data");
    }
  };

  const toggleAttendance = (enrollmentId: string) =>
    setAttendanceRows((prev) =>
      prev.map((row) =>
        row.enrollmentId === enrollmentId
          ? { ...row, status: row.status === "PRESENT" ? "ABSENT" : "PRESENT" }
          : row,
      ),
    );

  const handleSubmit = async () => {
    if (!selectedBatch) {
      toast.error("Please select a batch");
      return;
    }
    if (attendanceRows.length === 0) {
      toast.error("No students to mark");
      return;
    }
    setSaving(true);
    try {
      const records: BulkAttendanceItem[] = attendanceRows
        .filter((row) => row.status !== "NOT_MARKED")
        .map((row) => ({
          enrollmentId: row.publicId,
          status: row.status as "PRESENT" | "ABSENT",
        }));
      if (records.length === 0) {
        toast.error("Mark at least one student");
        setSaving(false);
        return;
      }
      const request: SummerCampAttendanceBulkRequest = {
        date: selectedDate,
        batchId: selectedBatch,
        records,
      };
      await summerCampService.submitBulkAttendance(campId, request);
      toast.success("Attendance saved!");
      loadAttendanceData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = attendanceRows.filter(
    (r) => r.status === "PRESENT",
  ).length;
  const absentCount = attendanceRows.filter(
    (r) => r.status === "ABSENT",
  ).length;
  const hasExisting = existingAttendance.length > 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={camp.startDate}
              max={camp.endDate}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Batch <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <option value="">Select batch…</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.startTime} - {b.endTime})
                </option>
              ))}
            </select>
          </div>
        </div>
        {batches.length === 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-700 font-medium">
              ⚠️ No batches found. Add batches first.
            </p>
          </div>
        )}
        {hasExisting && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-700 font-medium">
              ℹ️ Attendance already marked — saving will update existing
              records.
            </p>
          </div>
        )}
        {!canEdit && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-sm text-slate-600 font-medium">
              📅 Past date — editing disabled.
            </p>
          </div>
        )}
        {isSuperAdmin && isPastDate && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-700 font-medium">
              ⚠️ Editing past attendance as Super Admin.
            </p>
          </div>
        )}
      </div>

      {/* Summary + actions */}
      {attendanceRows.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-5">
              {[
                {
                  label: "Total",
                  val: attendanceRows.length,
                  color: "text-slate-900",
                },
                {
                  label: "Present",
                  val: presentCount,
                  color: "text-emerald-700",
                },
                { label: "Absent", val: absentCount, color: "text-red-700" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {s.label}
                  </p>
                  <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                disabled={!canEdit}
                onClick={() =>
                  setAttendanceRows((p) =>
                    p.map((r) => ({ ...r, status: "PRESENT" })),
                  )
                }
                className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition text-xs font-bold disabled:opacity-50"
              >
                All Present
              </button>
              <button
                disabled={!canEdit}
                onClick={() =>
                  setAttendanceRows((p) =>
                    p.map((r) => ({ ...r, status: "ABSENT" })),
                  )
                }
                className="px-3 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition text-xs font-bold disabled:opacity-50"
              >
                All Absent
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !canEdit}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-bold text-xs disabled:opacity-50 shadow transition-all hover:shadow-md"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={13} />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student list */}
      {!selectedBatch ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Filter size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-500">
            Select a batch to mark attendance
          </p>
        </div>
      ) : attendanceRows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Users size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-500">
            No students in this batch
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["#", "Student Name", "Status", "Action"].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider ${h === "Student Name" ? "text-left" : "text-center"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceRows.map((row, index) => (
                  <tr
                    key={row.enrollmentId}
                    className="hover:bg-slate-50 transition"
                  >
                    <td className="px-4 py-3 text-center text-slate-400 text-sm">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {row.playerName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                          row.status === "PRESENT"
                            ? "bg-emerald-100 text-emerald-700"
                            : row.status === "ABSENT"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {row.status === "PRESENT" ? (
                          <>
                            <CheckCircle size={12} /> Present
                          </>
                        ) : row.status === "ABSENT" ? (
                          <>
                            <XCircle size={12} /> Absent
                          </>
                        ) : (
                          "Not Marked"
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleAttendance(row.enrollmentId)}
                        disabled={!canEdit}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          row.status === "PRESENT"
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        }`}
                      >
                        Mark {row.status === "PRESENT" ? "Absent" : "Present"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {attendanceRows.map((row, index) => (
              <div
                key={row.enrollmentId}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 flex items-center gap-3"
              >
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-slate-500">
                    {index + 1}
                  </span>
                </div>
                <p className="flex-1 font-semibold text-slate-900 text-sm truncate">
                  {row.playerName}
                </p>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ${
                    row.status === "PRESENT"
                      ? "bg-emerald-100 text-emerald-700"
                      : row.status === "ABSENT"
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {row.status === "PRESENT"
                    ? "✓"
                    : row.status === "ABSENT"
                      ? "✗"
                      : "—"}
                </span>
                <button
                  onClick={() => toggleAttendance(row.enrollmentId)}
                  disabled={!canEdit}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                    row.status === "PRESENT"
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  }`}
                >
                  {row.status === "PRESENT" ? "Absent" : "Present"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

function SummerCampAttendance() {
  const navigate = useNavigate();
  const { campId } = useParams<{ campId: string }>();
  const { userRole } = useAuth();
  const isSuperAdmin = userRole === "ROLE_SUPER_ADMIN";

  const [camp, setCamp] = useState<SummerCamp | null>(null);
  const [enrollments, setEnrollments] = useState<SummerCampEnrollment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [campBranch, setCampBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTab>("mark");

  useEffect(() => {
    if (campId) loadInitialData();
  }, [campId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [campData, enrollmentsData, batchesData, branchesData] =
        await Promise.all([
          summerCampService.getCampById(campId!),
          summerCampService.getEnrollments(campId!),
          getCampBatches(campId!),
          getAdminBranches(),
        ]);
      setCamp(campData);
      setEnrollments(enrollmentsData.filter((e) => e.status === "ACTIVE"));
      setBatches(batchesData.filter((b) => b.active));
      if ((campData as any).branchId) {
        const matched = branchesData.find(
          (b) => b.id === (campData as any).branchId,
        );
        setCampBranch(matched ?? null);
      }
    } catch {
      toast.error("Failed to load camp data");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-20">
      {/* STICKY HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm"
      >
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/admin/summer-camps/${campId}`)}
              className="p-2 hover:bg-slate-100 rounded-full transition flex-shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black text-slate-900 flex items-center gap-2 leading-tight">
                <Calendar
                  className="text-emerald-600 flex-shrink-0"
                  size={20}
                />
                Attendance
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-slate-500 truncate">{camp?.name}</p>
                {campBranch && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full flex-shrink-0">
                    <GitBranch size={9} className="text-slate-400" />
                    <span className="text-[10px] text-slate-600 font-medium">
                      {campBranch.name}
                      {campBranch.isMainBranch && " · Main"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MAIN TABS */}
          <div className="flex gap-1 mt-3 bg-slate-100 p-1 rounded-xl w-fit">
            {(
              [
                { id: "mark", label: "Mark Attendance", icon: ClipboardList },
                { id: "history", label: "History", icon: History },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* CONTENT */}
      <div className="max-w-4xl mx-auto px-4 py-5">
        <AnimatePresence mode="wait">
          {activeTab === "mark" ? (
            <motion.div
              key="mark"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {camp && (
                <MarkAttendanceTab
                  campId={campId!}
                  camp={camp}
                  enrollments={enrollments}
                  batches={batches}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <HistoryTab
                campId={campId!}
                batches={batches}
                isSuperAdmin={isSuperAdmin}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default SummerCampAttendance;
