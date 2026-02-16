import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Calendar,
  Users,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  summerCampService,
  formatCampDateRange,
} from "../../api/summerCampService";
import type { SummerCamp } from "../../types/summercamp";

function SummerCampList() {
  const navigate = useNavigate();
  const [camps, setCamps] = useState<SummerCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  useEffect(() => {
    loadCamps();
  }, []);

  const loadCamps = async () => {
    try {
      setLoading(true);
      const data = await summerCampService.getAllCamps();
      setCamps(data);
    } catch (error) {
      console.error("Error loading summer camps:", error);
      toast.error("Failed to load summer camps");
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const formatDisplayName = (type: string): string => {
    if (!type) return "Summer";
    return type
      .replace(/_CAMP$/, "")
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  const getCampTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      SUMMER_CAMP: "#F97316",
      BATTING_CAMP: "#3B82F6",
      BOWLING_CAMP: "#10B981",
      ALL_ROUNDER_CAMP: "#8B5CF6",
      WICKET_KEEPING_CAMP: "#EC4899",
      FITNESS_CAMP: "#EF4444",
      ADVANCED_CAMP: "#F59E0B",
    };
    return colors[type] || "#6B7280";
  };

  // Filter camps
  const filteredCamps = camps.filter((camp) => {
    const matchesSearch =
      camp.name.toLowerCase().includes(search.toLowerCase()) ||
      camp.year.toString().includes(search);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && camp.isActive) ||
      (statusFilter === "inactive" && !camp.isActive);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-20">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm"
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/admin")}
                className="p-2 hover:bg-gray-100 rounded-full transition"
                title="Back to Admin Dashboard"
              >
                <ArrowLeft size={20} />
              </button>

              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="text-blue-600" size={28} />
                  Camps
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Manage camp programs and enrollments
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/admin/summer-camps/create")}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Create Camp</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* FILTERS & SEARCH */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              placeholder="Search by camp name or year..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3">
            {/* Status Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              >
                <option value="all">All Camps</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Reset Filters */}
            {(search || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="self-end px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
          >
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">
              Total Camps
            </p>
            <p className="text-3xl font-bold text-slate-900">{camps.length}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4 shadow-sm"
          >
            <p className="text-xs text-emerald-700 uppercase tracking-wide mb-1">
              Active Camps
            </p>
            <p className="text-3xl font-bold text-emerald-700">
              {camps.filter((c) => c.isActive).length}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 shadow-sm"
          >
            <p className="text-xs text-blue-700 uppercase tracking-wide mb-1">
              Total Enrollments
            </p>
            <p className="text-3xl font-bold text-blue-700">
              {camps.reduce((sum, c) => sum + c.currentEnrollments, 0)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-4 shadow-sm"
          >
            <p className="text-xs text-purple-700 uppercase tracking-wide mb-1">
              This Year
            </p>
            <p className="text-3xl font-bold text-purple-700">
              {camps.filter((c) => c.year === new Date().getFullYear()).length}
            </p>
          </motion.div>
        </div>

        {/* CAMP CARDS */}
        {filteredCamps.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-slate-400 mb-4">
              <Calendar size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No camps found
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by creating your first camp"}
            </p>
            {!search && statusFilter === "all" && (
              <button
                onClick={() => navigate("/admin/summer-camps/create")}
                className="text-blue-600 font-medium hover:underline"
              >
                Create your first camp
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredCamps.map((camp, index) => (
              <motion.div
                key={camp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/admin/summer-camps/${camp.publicId}`)}
                className={`bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                  camp.isActive
                    ? "border-slate-200 hover:border-blue-300"
                    : "border-red-200 bg-red-50/30"
                }`}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-lg">
                          {camp.name}
                        </h3>

                        {/* Camp Type Badge */}
                        {camp.campType && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor:
                                getCampTypeColor(camp.campType) + "20",
                              color: getCampTypeColor(camp.campType),
                              border: `1px solid ${getCampTypeColor(camp.campType)}40`,
                            }}
                          >
                            {formatDisplayName(camp.campType)}
                          </span>
                        )}

                        {!camp.isActive && (
                          <span className="text-xs text-red-600 font-medium bg-red-100 px-2 py-0.5 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">Year {camp.year}</p>
                    </div>

                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        camp.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {camp.isActive ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle size={12} /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <XCircle size={12} /> Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                    <Calendar size={16} />
                    <span className="font-medium">
                      {formatCampDateRange(camp.startDate, camp.endDate)}
                    </span>
                  </div>

                  {/* Description */}
                  {camp.description && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                      {camp.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-sm">
                      <Users size={16} className="text-slate-400" />
                      <span className="text-slate-700 font-medium">
                        {camp.currentEnrollments}
                        {camp.maxEnrollments && ` / ${camp.maxEnrollments}`}
                      </span>
                      <span className="text-slate-500 text-xs">enrolled</span>
                    </div>

                    {camp.maxEnrollments && (
                      <div className="flex-1">
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                (camp.currentEnrollments /
                                  camp.maxEnrollments) *
                                  100,
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SummerCampList;
