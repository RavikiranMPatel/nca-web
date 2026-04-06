import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  User,
  CreditCard,
  Calendar,
  Phone,
  Mail,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  GitBranch,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  summerCampService,
  getPaymentStatusColor,
} from "../../api/summerCampService";
import type {
  SummerCampEnrollment,
  SummerCampEnrollmentAttendanceDTO,
} from "../../types/summercamp";
import PaymentRecordModal from "../../components/summercamp/PaymentRecordModal";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type DetailTab = "info" | "payment" | "attendance";

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE RING
// ─────────────────────────────────────────────────────────────────────────────

function AttendanceRing({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
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
        strokeWidth={6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE TAB
// ─────────────────────────────────────────────────────────────────────────────

function AttendanceTab({
  campId,
  enrollmentId,
}: {
  campId: string;
  enrollmentId: string;
}) {
  const [data, setData] = useState<SummerCampEnrollmentAttendanceDTO | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await summerCampService.getEnrollmentAttendanceHistory(
        campId,
        enrollmentId,
      );
      setData(res);
    } catch {
      toast.error("Failed to load attendance history");
    } finally {
      setLoading(false);
    }
  }, [campId, enrollmentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const pct = data.attendancePercentage;
  const pctColor =
    pct >= 75
      ? "text-emerald-600"
      : pct >= 50
        ? "text-amber-600"
        : "text-red-600";
  const pctBg =
    pct >= 75
      ? "bg-emerald-50 border-emerald-200"
      : pct >= 50
        ? "bg-amber-50 border-amber-200"
        : "bg-red-50 border-red-200";

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Attendance Summary
        </p>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <AttendanceRing pct={pct} size={80} />
            <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-white">
              {Math.round(pct)}%
            </span>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-2">
            {[
              {
                label: "Present",
                val: data.presentCount,
                color: "text-emerald-400",
              },
              { label: "Absent", val: data.absentCount, color: "text-red-400" },
              {
                label: "Total",
                val: data.totalSessions,
                color: "text-slate-300",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white/10 rounded-xl p-2.5 text-center"
              >
                <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Status pill */}
        <div
          className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${pctBg} ${pctColor}`}
        >
          {pct >= 75 ? (
            <CheckCircle size={11} />
          ) : pct >= 50 ? (
            <Clock size={11} />
          ) : (
            <XCircle size={11} />
          )}
          {pct >= 75
            ? "Good attendance"
            : pct >= 50
              ? "Average attendance"
              : "Low attendance — needs attention"}
        </div>
      </div>

      {/* Day-by-day breakdown */}
      {data.totalSessions === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Calendar size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-500">No sessions held yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Attendance will appear here once sessions are marked
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Day-by-day attendance
          </p>
          <div className="flex flex-wrap gap-2">
            {data.dailyHistory.map((day) => {
              const isPresent = day.status === "PRESENT";
              const isAbsent = day.status === "ABSENT";

              return (
                <div
                  key={`${day.date}-${day.batchName}`}
                  className="relative group"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-transform hover:scale-110 cursor-default ${
                      isPresent
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : isAbsent
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    <span className="text-xs font-black leading-none">
                      {day.dayNumber}
                    </span>
                    <span className="text-[8px] leading-none mt-0.5">
                      {isPresent ? "✓" : isAbsent ? "✗" : "—"}
                    </span>
                  </div>
                  {/* Override indicator */}
                  {day.overridden && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center">
                      <Shield size={8} className="text-white" />
                    </div>
                  )}
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 bg-slate-800 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 text-center">
                    <p className="font-semibold">
                      {new Date(day.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    <p className="text-slate-300">{day.batchName}</p>
                    <p
                      className={
                        isPresent
                          ? "text-emerald-400"
                          : isAbsent
                            ? "text-red-400"
                            : "text-slate-400"
                      }
                    >
                      {day.status}
                    </p>
                    {day.overridden && day.overrideReason && (
                      <p className="text-amber-400 mt-0.5 max-w-[120px] truncate">
                        Override: {day.overrideReason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
            {[
              { color: "bg-emerald-200", label: "Present" },
              { color: "bg-red-200", label: "Absent" },
              { color: "bg-slate-200", label: "Not taken" },
            ].map((l) => (
              <span
                key={l.label}
                className="flex items-center gap-1 text-[10px] text-slate-400"
              >
                <span className={`w-3 h-3 rounded ${l.color} inline-block`} />
                {l.label}
              </span>
            ))}
            <span className="flex items-center gap-1 text-[10px] text-slate-400 ml-auto">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
              Overridden
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INFO TAB
// ─────────────────────────────────────────────────────────────────────────────

function InfoTab({ enrollment }: { enrollment: SummerCampEnrollment }) {
  const rows = [
    { icon: User, label: "Student Name", value: enrollment.playerName },
    {
      icon: Phone,
      label: "Student Phone",
      value: enrollment.playerPhone || "—",
    },
    {
      icon: Mail,
      label: "Student Email",
      value: enrollment.playerEmail || "—",
    },
    {
      icon: User,
      label: "Guardian Name",
      value: (enrollment as any).guardianName || enrollment.parentName || "—",
    },
    {
      icon: Phone,
      label: "Guardian Phone",
      value: (enrollment as any).guardianPhone || "—",
    },
    {
      icon: Calendar,
      label: "Enrolled On",
      value: new Date(enrollment.enrolledAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
  ];

  return (
    <div className="space-y-3">
      {/* Batches */}
      {enrollment.batchNames && enrollment.batchNames.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Enrolled Batches
          </p>
          <div className="flex flex-wrap gap-2">
            {enrollment.batchNames.map((name, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1"
              >
                <GitBranch size={10} /> {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Details */}
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Icon size={14} className="text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {label}
              </p>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Status */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Enrollment Status
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
              enrollment.status === "ACTIVE"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : enrollment.status === "CONVERTED"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-slate-50 text-slate-700 border-slate-200"
            }`}
          >
            {enrollment.status}
          </span>
          {enrollment.status === "CONVERTED" && (
            <span className="text-xs text-slate-500">
              Converted to regular coaching
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT TAB
// ─────────────────────────────────────────────────────────────────────────────

function PaymentTab({
  enrollment,
  campId,
  onPaymentSuccess,
}: {
  enrollment: SummerCampEnrollment;
  campId: string;
  onPaymentSuccess: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const paymentColor = getPaymentStatusColor(enrollment.paymentStatus);
  const paidPct =
    enrollment.totalFee > 0
      ? Math.round((enrollment.paidAmount / enrollment.totalFee) * 100)
      : 0;

  return (
    <div className="space-y-3">
      {/* Payment overview card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Payment Overview
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "Total Fee",
              val: `₹${enrollment.totalFee?.toLocaleString() ?? 0}`,
              color: "text-slate-300",
            },
            {
              label: "Paid",
              val: `₹${enrollment.paidAmount?.toLocaleString() ?? 0}`,
              color: "text-emerald-400",
            },
            {
              label: "Balance",
              val: `₹${enrollment.balanceAmount?.toLocaleString() ?? 0}`,
              color:
                enrollment.balanceAmount > 0
                  ? "text-red-400"
                  : "text-emerald-400",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white/10 rounded-xl p-3 text-center"
            >
              <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Payment progress</span>
            <span>{paidPct}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${paidPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Status + mode */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Payment Status
          </p>
          <span
            className={`px-3 py-1 rounded-lg text-xs font-bold border ${paymentColor.bg} ${paymentColor.text} ${paymentColor.border}`}
          >
            {enrollment.paymentStatus}
          </span>
        </div>

        {(enrollment as any).paymentMode && (
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Payment Mode
            </p>
            <span className="text-sm font-semibold text-slate-700">
              {(enrollment as any).paymentMode}
            </span>
          </div>
        )}

        {(enrollment as any).paidAt && (
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Paid On
            </p>
            <span className="text-sm font-semibold text-slate-700">
              {new Date((enrollment as any).paidAt).toLocaleDateString(
                "en-IN",
                { day: "numeric", month: "short", year: "numeric" },
              )}
            </span>
          </div>
        )}
      </div>

      {/* Record payment button */}
      {enrollment.paymentStatus !== "PAID" && (
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl font-bold text-sm shadow hover:shadow-md transition-all"
        >
          <CreditCard size={16} />
          Record Payment
          <ChevronRight size={14} />
        </button>
      )}

      {showModal && (
        <PaymentRecordModal
          campId={campId}
          enrollment={enrollment}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            onPaymentSuccess();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

function SummerCampEnrollmentDetail() {
  const navigate = useNavigate();
  const { campId, enrollmentId } = useParams<{
    campId: string;
    enrollmentId: string;
  }>();

  const location = useLocation();

  const [enrollment, setEnrollment] = useState<SummerCampEnrollment | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>("info");

  const load = useCallback(async () => {
    if (!campId || !enrollmentId) return;

    // Use router state if available — instant load, no extra API call
    if (location.state?.enrollment) {
      setEnrollment(location.state.enrollment);
      setLoading(false);
      return;
    }

    // Fallback: fetch from backend (direct URL access or page refresh)
    try {
      setLoading(true);
      const data = await summerCampService.getEnrollmentById(
        campId,
        enrollmentId,
      );
      setEnrollment(data);
    } catch {
      toast.error("Failed to load enrollment");
      navigate(`/admin/summer-camps/${campId}/enrollments`);
    } finally {
      setLoading(false);
    }
  }, [campId, enrollmentId, location.state]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!enrollment) return null;

  const tabs: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
    { id: "info", label: "Info", icon: <User size={14} /> },
    { id: "payment", label: "Payment", icon: <CreditCard size={14} /> },
    { id: "attendance", label: "Attendance", icon: <Calendar size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-20">
      {/* STICKY HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm"
      >
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                navigate(`/admin/summer-camps/${campId}/enrollments`)
              }
              className="p-2 hover:bg-slate-100 rounded-full transition flex-shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-black text-slate-900 leading-tight truncate">
                {enrollment.playerName}
              </h1>
              <p className="text-xs text-slate-500 truncate">
                {enrollment.campName}
              </p>
            </div>
            {/* Attendance % pill in header */}
            {activeTab !== "attendance" && (
              <button
                onClick={() => setActiveTab("attendance")}
                className="flex-shrink-0 px-2.5 py-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition flex items-center gap-1"
              >
                <Calendar size={11} />
                Attendance
              </button>
            )}
          </div>

          {/* TABS */}
          <div className="flex gap-1 mt-3 bg-slate-100 p-1 rounded-xl">
            {tabs.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* CONTENT */}
      <div className="max-w-2xl mx-auto px-4 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "info" && <InfoTab enrollment={enrollment} />}
            {activeTab === "payment" && (
              <PaymentTab
                enrollment={enrollment}
                campId={campId!}
                onPaymentSuccess={load}
              />
            )}
            {activeTab === "attendance" && (
              <AttendanceTab campId={campId!} enrollmentId={enrollmentId!} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default SummerCampEnrollmentDetail;
