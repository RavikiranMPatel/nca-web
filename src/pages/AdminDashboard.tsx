import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Calendar,
  ClipboardList,
  Globe,
  Power,
  Settings,
  TrendingUp,
} from "lucide-react";
import {
  Users,
  UserCheck,
  UserX,
  Sun,
  Moon,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Image,
  UserPlus,
  List,
  Trophy,
  BarChart,
  MessageCircle,
} from "lucide-react";
import StatCard from "../components/StatCard";
import api from "../api/axios";

type DashboardSummary = {
  totalPlayers: number;
  activePlayers: number;
  inactivePlayers: number;
  malePlayers: number;
  femalePlayers: number;
  otherGenderPlayers: number;
  morningBatch: number;
  eveningBatch: number;
  bothBatch: number;
  todayPresent: number;
  todayAbsent: number;
  feesDueToday: number;
  overdueFees: number;
};

type FeesDueRow = {
  playerPublicId: string;
  playerName: string;
  phone: string | null;
  parentsPhone: string | null;
  feePlanName: string;
  feeStatus: "DUE" | "OVERDUE";
  planAmount: number;
  nextDueOn: string | null;
};

// ─── Action card — full-color on mobile, same on desktop ───────
function ActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  gradient,
  textLight,
}: {
  icon: any;
  title: string;
  description: string;
  onClick: () => void;
  gradient: string;
  textLight: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`${gradient} p-4 md:p-6 rounded-xl cursor-pointer active:scale-95 md:hover:scale-105 transition-transform shadow-sm md:shadow-lg`}
    >
      <div className="flex items-center gap-3 mb-1.5 md:mb-3">
        <Icon size={22} className="text-white flex-shrink-0" />
        <h3 className="text-sm md:text-base font-semibold text-white leading-tight">
          {title}
        </h3>
      </div>
      <p className={`text-xs ${textLight} leading-relaxed hidden md:block`}>
        {description}
      </p>
      {/* Mobile: show shorter description inline */}
      <p className={`text-xs ${textLight} leading-relaxed md:hidden`}>
        {description.length > 48 ? description.slice(0, 48) + "…" : description}
      </p>
    </div>
  );
}

// ─── Plain card (white bg, used in Other Management) ───────────
function PlainCard({
  icon: Icon,
  title,
  description,
  onClick,
  iconColor = "text-blue-600",
}: {
  icon: any;
  title: string;
  description: string;
  onClick: () => void;
  iconColor?: string;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white p-4 md:p-6 rounded-xl shadow-sm hover:shadow-md cursor-pointer active:scale-95 transition-all border border-gray-100"
    >
      <div className="flex items-center gap-3 mb-1">
        <Icon size={20} className={`${iconColor} flex-shrink-0`} />
        <h3 className="text-sm md:text-base font-semibold text-gray-800">
          {title}
        </h3>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed ml-8">
        {description}
      </p>
    </div>
  );
}

// ─── Section header ─────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
  iconColor = "text-blue-600",
}: {
  icon?: any;
  title: string;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon size={18} className={iconColor} />}
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        {title}
      </h2>
    </div>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feesDue, setFeesDue] = useState<FeesDueRow[]>([]);
  const [flags, setFlags] = useState<Record<string, string>>({});
  const role = localStorage.getItem("userRole");
  const isSuperAdmin = role === "ROLE_SUPER_ADMIN";

  const showTournaments = flags["MODULE_TOURNAMENTS_ENABLED"] === "true";
  const showSlotBooking = flags["MODULE_SLOT_BOOKING_ENABLED"] === "true";

  useEffect(() => {
    api.get("/admin/settings/feature-flags")
      .then((res) => setFlags(res.data || {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/admin/dashboard/summary"),
      api.get("/admin/fees/collection-summary").catch(() => ({ data: [] })),
    ])
      .then(([summaryRes, feeSummaryRes]) => {
        setSummary(summaryRes.data);
        const rows: FeesDueRow[] = (feeSummaryRes.data || [])
          .filter((r: any) => r.feeStatus === "OVERDUE" || r.feeStatus === "DUE")
          .map((r: any) => ({
            playerPublicId: r.playerPublicId,
            playerName: r.playerName,
            phone: r.phone,
            parentsPhone: r.parentsPhone,
            feePlanName: r.feePlanName,
            feeStatus: r.feeStatus,
            planAmount: r.planAmount,
            nextDueOn: r.nextDueOn,
          }))
          .sort((a: FeesDueRow, b: FeesDueRow) => {
            if (a.feeStatus === b.feeStatus) return 0;
            return a.feeStatus === "OVERDUE" ? -1 : 1;
          });
        setFeesDue(rows);
        setError(null);
      })
      .catch((err) => {
        if (err.response?.status === 403) {
          setError("Access denied. Please log in as an admin.");
        } else {
          setError("Failed to load dashboard data");
        }
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-sm w-full">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-4">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-base font-semibold text-red-900 mb-1">
              {error}
            </h2>
            <p className="text-xs text-red-600">
              Please check your login status and permissions.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
            >
              Retry
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700 transition"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12 text-sm text-slate-500">
        No dashboard data available
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      {/* ── PAGE TITLE — mobile compact, desktop full ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
          Admin Dashboard
        </h1>
      </div>

      {/* ═══════════════ OVERVIEW ═══════════════ */}
      <section>
        <SectionHeader title="Overview" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Players"
            value={summary.totalPlayers}
            icon={Users}
            onClick={() => navigate("/admin/players")}
          />
          <StatCard
            label="Active Players"
            value={summary.activePlayers}
            icon={UserCheck}
            color="green"
            onClick={() => navigate("/admin/players?status=active")}
          />
          <StatCard
            label="Inactive"
            value={summary.inactivePlayers}
            icon={UserX}
            color="red"
            onClick={() => navigate("/admin/players?status=inactive")}
          />
          <StatCard label="Boys" value={summary.malePlayers} icon={Users} />
          <StatCard label="Girls" value={summary.femalePlayers} icon={Users} />
          <StatCard
            label="Morning Batch"
            value={summary.morningBatch}
            icon={Sun}
            color="orange"
            onClick={() => navigate("/admin/batches")}
          />
          <StatCard
            label="Evening Batch"
            value={summary.eveningBatch}
            icon={Moon}
            onClick={() => navigate("/admin/batches")}
          />
          <StatCard
            label="Both Batches"
            value={summary.bothBatch}
            icon={Users}
            onClick={() => navigate("/admin/batches")}
          />
          <StatCard
            label="Present Today"
            value={summary.todayPresent}
            icon={CheckCircle}
            color="green"
            onClick={() => navigate("/admin/attendance")}
          />
          <StatCard
            label="Absent Today"
            value={summary.todayAbsent}
            icon={XCircle}
            color="red"
            onClick={() => navigate("/admin/attendance")}
          />
          <StatCard
            label="Fees Due"
            value={summary.feesDueToday}
            icon={Clock}
            color="orange"
          />
          <StatCard
            label="Overdue Fees"
            value={summary.overdueFees}
            icon={AlertTriangle}
            color="red"
          />
        </div>
      </section>

      {/* ═══════════════ FEES DUE ═══════════════ */}
      {feesDue.length > 0 && (
        <section>
          <SectionHeader
            icon={AlertTriangle}
            title={`Fees Due (${feesDue.length})`}
            iconColor="text-amber-500"
          />
          <div className="space-y-2">
            {feesDue.map((row) => {
              const phone = row.parentsPhone || row.phone || "";
              const cleanPhone = phone.replace(/\D/g, "").replace(/^91/, "");
              const dueLabel = row.nextDueOn
                ? new Date(row.nextDueOn).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—";
              const waText = encodeURIComponent(
                `Hi, the fees of ₹${row.planAmount.toLocaleString("en-IN")} for ${row.playerName}'s ${row.feePlanName} are ${row.feeStatus === "OVERDUE" ? "overdue" : "due"} (${dueLabel}). Please pay at the earliest. Thank you.`,
              );
              const waHref = `https://wa.me/91${cleanPhone}?text=${waText}`;
              return (
                <div
                  key={row.playerPublicId}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                    row.feeStatus === "OVERDUE"
                      ? "bg-red-50 border-red-200"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() =>
                      navigate(`/admin/players/${row.playerPublicId}/fees`)
                    }
                  >
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {row.playerName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {row.feePlanName} ·{" "}
                      <span
                        className={`font-semibold ${
                          row.feeStatus === "OVERDUE"
                            ? "text-red-600"
                            : "text-amber-700"
                        }`}
                      >
                        ₹{row.planAmount.toLocaleString("en-IN")}
                      </span>{" "}
                      · {dueLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        row.feeStatus === "OVERDUE"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {row.feeStatus}
                    </span>
                    {cleanPhone.length === 10 && (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white text-[11px] font-semibold rounded-lg hover:bg-emerald-700 transition"
                        title={`WhatsApp reminder to ${phone}`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="w-3 h-3 fill-current"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.098.546 4.07 1.5 5.785L0 24l6.435-1.635A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.887 0-3.655-.487-5.194-1.344l-.372-.22-3.818.97.994-3.71-.242-.383A9.938 9.938 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                        </svg>
                        Remind
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════ CRICKET MANAGEMENT ═══════════════ */}
      <section>
        <SectionHeader
          icon={Trophy}
          title="Cricket Management"
          iconColor="text-blue-600"
        />
        {/* Mobile: 2-col compact grid | Desktop: 4-col */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionCard
            icon={UserPlus}
            title="Register Player"
            description="Add a new player with complete profile and photo"
            onClick={() => navigate("/admin/players/register")}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            textLight="text-blue-100"
          />
          <ActionCard
            icon={List}
            title="View Players"
            description="Browse, search, and manage player profiles"
            onClick={() => navigate("/admin/players")}
            gradient="bg-gradient-to-br from-green-500 to-green-600"
            textLight="text-green-100"
          />
          <ActionCard
            icon={ClipboardList}
            title="Performance"
            description="Assess player skills, fitness, diet & mental performance"
            onClick={() => navigate("/admin/player-assessment")}
            gradient="bg-gradient-to-br from-teal-500 to-teal-600"
            textLight="text-teal-100"
          />
          <ActionCard
            icon={BarChart}
            title="Cricket Stats"
            description="Record match performance for players"
            onClick={() => navigate("/admin/cricket-stats/add")}
            gradient="bg-gradient-to-br from-orange-500 to-orange-600"
            textLight="text-orange-100"
          />
          <ActionCard
            icon={Clock}
            title="Batches"
            description="Create and manage training batches with custom timings"
            onClick={() => navigate("/admin/batches")}
            gradient="bg-gradient-to-br from-purple-500 to-purple-600"
            textLight="text-purple-100"
          />
          <ActionCard
            icon={MessageCircle}
            title="Enquiries"
            description="Track and manage player enquiries and follow-ups"
            onClick={() => navigate("/admin/enquiries")}
            gradient="bg-gradient-to-br from-pink-500 to-pink-600"
            textLight="text-pink-100"
          />
          <ActionCard
            icon={UserCheck}
            title="1-on-1 Coaching"
            description="Track practice, goals & match performance for individual players"
            onClick={() => navigate("/admin/coaching")}
            gradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
            textLight="text-indigo-100"
          />
          <ActionCard
            icon={Activity}
            title="Matches & Scoring"
            description="Score live matches, view scorecards and share with players"
            onClick={() => navigate("/admin/cricket/matches")}
            gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
            textLight="text-cyan-100"
          />
          {showTournaments && (
            <ActionCard
              icon={Trophy}
              title="Tournaments"
              description="Create and manage tournaments, fixtures and standings"
              onClick={() => navigate("/admin/cricket/tournaments")}
              gradient="bg-gradient-to-br from-yellow-500 to-orange-500"
              textLight="text-yellow-100"
            />
          )}
          <PlainCard
            icon={Users}
            title="Clubs"
            description="Manage club members, alumni and honors"
            onClick={() => navigate("/admin/clubs")}
            iconColor="text-blue-600"
          />
        </div>
      </section>

      {/* ═══════════════ SLOT & BOOKING ═══════════════ */}
      {showSlotBooking && (
        <section>
          <SectionHeader
            icon={Calendar}
            title="Slot & Booking Management"
            iconColor="text-purple-600"
          />
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <ActionCard
              icon={Clock}
              title="Slot Templates"
              description="Configure slot timings and pricing for different schedules"
              onClick={() => navigate("/admin/slot-templates")}
              gradient="bg-gradient-to-br from-purple-500 to-purple-600"
              textLight="text-purple-100"
            />
            <ActionCard
              icon={List}
              title="All Bookings"
              description="See all user bookings and payments"
              onClick={() => navigate("/admin/bookings")}
              gradient="bg-gradient-to-br from-green-500 to-green-600"
              textLight="text-green-100"
            />
            <ActionCard
              icon={UserCheck}
              title="BM Members"
              description="Manage bowling machine subscribers, logged-in users and guests"
              onClick={() => navigate("/admin/members")}
              gradient="bg-gradient-to-br from-teal-500 to-teal-600"
              textLight="text-teal-100"
            />
            <ActionCard
              icon={Calendar}
              title="Calendar View"
              description="Override specific dates for holidays and events"
              onClick={() => navigate("/admin/date-overrides")}
              gradient="bg-gradient-to-br from-orange-500 to-orange-600"
              textLight="text-orange-100"
            />
            <ActionCard
              icon={Power}
              title="Resources"
              description="Enable/disable wickets and courts"
              onClick={() => navigate("/admin/resources")}
              gradient="bg-gradient-to-br from-blue-500 to-blue-600"
              textLight="text-blue-100"
            />
          </div>
        </section>
      )}

      {/* ═══════════════ OTHER MANAGEMENT ═══════════════ */}
      <section>
        <SectionHeader title="Other Management" />
        {/* Plain white cards — 2-col on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <PlainCard
            icon={Image}
            title="Home Slider"
            description="Manage homepage banners and announcements"
            onClick={() => navigate("/admin/slider")}
            iconColor="text-blue-600"
          />
          <PlainCard
            icon={Users}
            title="Users"
            description="Manage players, parents and admins"
            onClick={() => navigate("/admin/users")}
            iconColor="text-blue-600"
          />
          <PlainCard
            icon={CheckCircle}
            title="Attendance"
            description="Take and manage daily attendance"
            onClick={() => navigate("/admin/attendance")}
            iconColor="text-green-600"
          />
          <ActionCard
            icon={Calendar}
            title="Camps"
            description="Manage camp programs and enrollments"
            onClick={() => navigate("/admin/summer-camps")}
            gradient="bg-gradient-to-br from-orange-500 to-orange-600"
            textLight="text-orange-100"
          />
          <PlainCard
            icon={Globe}
            title="Homepage Sections"
            description="Configure public homepage section order and visibility"
            onClick={() => navigate("/admin/settings/homepage")}
            iconColor="text-purple-600"
          />
          {isSuperAdmin && (
            <PlainCard
              icon={Settings}
              title="Academy Settings"
              description="Configure academy info, branding, and home page"
              onClick={() => navigate("/admin/settings")}
              iconColor="text-indigo-600"
            />
          )}
          {isSuperAdmin && (
            <ActionCard
              icon={TrendingUp}
              title="Revenue"
              description="View combined fees & booking payments"
              onClick={() => navigate("/admin/revenue")}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
              textLight="text-emerald-100"
            />
          )}
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
