import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Calendar,
  ClipboardList,
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
  const role = localStorage.getItem("userRole");
  const isSuperAdmin = role === "ROLE_SUPER_ADMIN";

  useEffect(() => {
    setLoading(true);
    api
      .get("/admin/dashboard/summary")
      .then((res) => {
        setSummary(res.data);
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
          />
          <StatCard
            label="Active Players"
            value={summary.activePlayers}
            icon={UserCheck}
            color="green"
          />
          <StatCard
            label="Inactive"
            value={summary.inactivePlayers}
            icon={UserX}
            color="red"
          />
          <StatCard label="Boys" value={summary.malePlayers} icon={Users} />
          <StatCard label="Girls" value={summary.femalePlayers} icon={Users} />
          <StatCard
            label="Morning Batch"
            value={summary.morningBatch}
            icon={Sun}
            color="orange"
          />
          <StatCard
            label="Evening Batch"
            value={summary.eveningBatch}
            icon={Moon}
          />
          <StatCard
            label="Both Batches"
            value={summary.bothBatch}
            icon={Users}
          />
          <StatCard
            label="Present Today"
            value={summary.todayPresent}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            label="Absent Today"
            value={summary.todayAbsent}
            icon={XCircle}
            color="red"
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
        </div>
      </section>

      {/* ═══════════════ SLOT & BOOKING ═══════════════ */}
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
