import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ClipboardList, Power, Settings } from "lucide-react";
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

function AdminDashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/admin/dashboard/summary")
      .then((res) => {
        setSummary(res.data);
        setError(null);
      })
      .catch((err) => {
        console.error("Dashboard error:", err);
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-red-900 mb-2">{error}</h2>
            <p className="text-sm text-red-700 mb-4">
              Please check your login status and permissions.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition mr-2"
          >
            Retry
          </button>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* TITLE */}
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* ================= OVERVIEW ================= */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Overview</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
            label="Inactive Players"
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
            label="Fees Due Today"
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

      {/* ================= CRICKET MANAGEMENT ================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy size={24} className="text-blue-600" />
          <h2 className="text-lg font-semibold">Cricket Management</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* REGISTER NEW PLAYER */}
          <div
            onClick={() => navigate("/admin/players/register")}
            className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105"
          >
            <div className="flex items-center gap-3 mb-3">
              <UserPlus size={28} className="text-white" />
              <h3 className="text-lg font-bold text-white">
                Register New Player
              </h3>
            </div>
            <p className="text-sm text-blue-100">
              Add a new player with complete profile and photo
            </p>
          </div>

          {/* VIEW ALL PLAYERS */}
          <div
            onClick={() => navigate("/admin/players")}
            className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105"
          >
            <div className="flex items-center gap-3 mb-3">
              <List size={28} className="text-white" />
              <h3 className="text-lg font-bold text-white">View All Players</h3>
            </div>
            <p className="text-sm text-green-100">
              Browse, search, and manage player profiles
            </p>
          </div>

          {/* PERFORMANCE ANALYSIS */}
          <div
            onClick={() => navigate("/admin/player-assessment")}
            className="bg-gradient-to-br from-teal-500 to-teal-600 p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105"
          >
            <div className="flex items-center gap-3 mb-3">
              <ClipboardList size={28} className="text-white" />
              <h3 className="text-lg font-bold text-white">
                Performance Analysis
              </h3>
            </div>
            <p className="text-sm text-teal-100">
              Assess player skills, fitness, diet & mental performance
            </p>
          </div>

          {/* ADD CRICKET STATS */}
          <div
            onClick={() => navigate("/admin/cricket-stats/add")}
            className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105"
          >
            <div className="flex items-center gap-3 mb-3">
              <BarChart size={28} className="text-white" />
              <h3 className="text-lg font-bold text-white">
                Add Cricket Stats
              </h3>
            </div>
            <p className="text-sm text-orange-100">
              Record match performance for players
            </p>
          </div>

          {/* BATCH MANAGEMENT */}
          <div
            onClick={() => navigate("/admin/batches")}
            className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105"
          >
            <div className="flex items-center gap-3 mb-3">
              <Clock size={28} className="text-white" />
              <h3 className="text-lg font-bold text-white">Batch Management</h3>
            </div>
            <p className="text-sm text-purple-100">
              Create and manage training batches with custom timings
            </p>
          </div>

          {/* ✅ NEW: ENQUIRY MANAGEMENT */}
          <div
            onClick={() => navigate("/admin/enquiries")}
            className="bg-gradient-to-br from-pink-500 to-pink-600 p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105"
          >
            <div className="flex items-center gap-3 mb-3">
              <MessageCircle size={28} className="text-white" />
              <h3 className="text-lg font-bold text-white">
                Enquiry Management
              </h3>
            </div>
            <p className="text-sm text-pink-100">
              Track and manage player enquiries and follow-ups
            </p>
          </div>
        </div>
      </section>

      {/* ================= SLOT & BOOKING MANAGEMENT ================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar size={24} className="text-purple-600" />
          <h2 className="text-lg font-semibold">Slot & Booking Management</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* MANAGE SLOT TEMPLATES */}
          <div
            onClick={() => navigate("/admin/slot-templates")}
            className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105"
          >
            <div className="flex items-center gap-3 mb-3">
              <Clock size={28} className="text-white" />
              <h3 className="text-lg font-bold text-white">
                Manage Slot Templates
              </h3>
            </div>
            <p className="text-sm text-purple-100">
              Configure slot timings and pricing for different schedules
            </p>
          </div>

          {/* VIEW ALL BOOKINGS */}
          <div
            onClick={() => navigate("/admin/bookings")}
            className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105"
          >
            <div className="flex items-center gap-3 mb-3">
              <List size={28} className="text-white" />
              <h3 className="text-lg font-bold text-white">
                View All Bookings
              </h3>
            </div>
            <p className="text-sm text-green-100">
              See all user bookings and payments
            </p>
          </div>

          {/* CALENDAR VIEW */}
          <div
            onClick={() => navigate("/admin/date-overrides")}
            className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105"
          >
            <div className="flex items-center gap-3 mb-3">
              <Calendar size={28} className="text-white" />
              <h3 className="text-lg font-bold text-white">Calendar View</h3>
            </div>
            <p className="text-sm text-orange-100">
              Override specific dates for holidays and events
            </p>
          </div>

          {/* MANAGE RESOURCES */}
          <div
            onClick={() => navigate("/admin/resources")}
            className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105"
          >
            <div className="flex items-center gap-3 mb-3">
              <Power size={28} className="text-white" />
              <h3 className="text-lg font-bold text-white">Manage Resources</h3>
            </div>
            <p className="text-sm text-blue-100">
              Enable/disable wickets and courts
            </p>
          </div>
        </div>
      </section>

      {/* ================= OTHER MANAGEMENT ================= */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Other Management</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* HOME SLIDER */}
          <div
            onClick={() => navigate("/admin/slider")}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg cursor-pointer transition"
          >
            <div className="flex items-center gap-3 mb-3">
              <Image size={24} className="text-blue-600" />
              <h3 className="text-lg font-semibold">Home Slider</h3>
            </div>
            <p className="text-sm text-gray-600">
              Manage homepage banners and announcements
            </p>
          </div>

          {/* USERS */}
          <div
            onClick={() => navigate("/admin/users")}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg cursor-pointer transition"
          >
            <div className="flex items-center gap-3 mb-3">
              <Users size={24} className="text-blue-600" />
              <h3 className="text-lg font-semibold">Users</h3>
            </div>
            <p className="text-sm text-gray-600">
              Manage players, parents and admins
            </p>
          </div>

          {/* ATTENDANCE */}
          <div
            onClick={() => navigate("/admin/attendance")}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg cursor-pointer transition"
          >
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle size={24} className="text-green-600" />
              <h3 className="text-lg font-semibold">Attendance</h3>
            </div>
            <p className="text-sm text-gray-600">
              Take and manage daily attendance
            </p>
          </div>

          {/* SUMMER CAMP MANAGEMENT */}
          <div
            onClick={() => navigate("/admin/summer-camps")}
            className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105"
          >
            <div className="flex items-center gap-3 mb-3">
              <Calendar size={28} className="text-white" />
              <h3 className="text-lg font-bold text-white">Camps</h3>
            </div>
            <p className="text-sm text-orange-100">
              Manage camp programs and enrollments
            </p>
          </div>

          {/* ACADEMY SETTINGS */}
          <div
            onClick={() => navigate("/admin/settings")}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg cursor-pointer transition"
          >
            <div className="flex items-center gap-3 mb-3">
              <Settings size={24} className="text-indigo-600" />
              <h3 className="text-lg font-semibold">Academy Settings</h3>
            </div>
            <p className="text-sm text-gray-600">
              Configure academy info, branding, and home page
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
