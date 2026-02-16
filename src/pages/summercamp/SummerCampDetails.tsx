import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Edit,
  Users,
  DollarSign,
  TrendingUp,
  ClipboardList,
  UserPlus,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  summerCampService,
  formatCampDateRange,
  calculateCampDuration,
} from "../../api/summerCampService";
import type {
  SummerCamp,
  SummerCampFeeRule,
  SummerCampStats,
} from "../../types/summercamp";

function SummerCampDetails() {
  const navigate = useNavigate();
  const { campId } = useParams<{ campId: string }>();
  const [camp, setCamp] = useState<SummerCamp | null>(null);
  const [feeRules, setFeeRules] = useState<SummerCampFeeRule[]>([]);
  const [stats, setStats] = useState<SummerCampStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (campId) {
      loadCampData();
    }
  }, [campId]);

  const loadCampData = async () => {
    try {
      setLoading(true);

      // Load camp and fee rules (required)
      const [campData, feeRulesData] = await Promise.all([
        summerCampService.getCampById(campId!),
        summerCampService.getFeeRules(campId!),
      ]);

      setCamp(campData);
      setFeeRules(feeRulesData);

      // Load stats (optional - don't fail if endpoint doesn't exist)
      try {
        const statsData = await summerCampService.getCampStats(campId!);
        setStats(statsData);
      } catch (statsError) {
        console.warn("Stats endpoint not available:", statsError);
        // Stats are optional, so we don't show error to user
      }
    } catch (error) {
      console.error("Error loading camp details:", error);
      toast.error("Failed to load camp details");
      navigate("/admin/summer-camps");
    } finally {
      setLoading(false);
    }
  };

  const toggleActiveStatus = async () => {
    if (!camp) return;

    try {
      const isActivating = !camp.isActive;

      const updated = await summerCampService.updateCamp(camp.publicId, {
        isActive: isActivating,
        status: isActivating ? "ACTIVE" : "DRAFT",
      });

      setCamp(updated);

      if (isActivating) {
        toast.success("Camp activated and ready for enrollments!");
      } else {
        toast.success("Camp deactivated");
      }
    } catch (error) {
      console.error("Error updating camp status:", error);
      toast.error("Failed to update camp status");
    }
  };

  // Helper functions
  const formatBatchCount = (count: number) => {
    return `${count} ${count === 1 ? "Session" : "Sessions"} per day`;
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!camp) {
    return null;
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/admin/summer-camps")}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  {camp.name}

                  {/* Camp Type Badge */}
                  {camp.campType && (
                    <span
                      className="text-sm px-3 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: getCampTypeColor(camp.campType) + "20",
                        color: getCampTypeColor(camp.campType),
                        border: `1px solid ${getCampTypeColor(camp.campType)}40`,
                      }}
                    >
                      {formatDisplayName(camp.campType)}
                    </span>
                  )}

                  {!camp.isActive && (
                    <span className="text-xs text-red-600 font-medium bg-red-100 px-2 py-1 rounded-full">
                      Inactive
                    </span>
                  )}
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Year {camp.year} •{" "}
                  {formatCampDateRange(camp.startDate, camp.endDate)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleActiveStatus}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  camp.isActive
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                }`}
              >
                {camp.isActive ? "Deactivate" : "Activate"}
              </button>

              <button
                onClick={() =>
                  navigate(`/admin/summer-camps/${camp.publicId}/edit`)
                }
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
              >
                <Edit size={16} />
                <span className="hidden sm:inline">Edit</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() =>
              navigate(`/admin/summer-camps/${camp.publicId}/enrollments`)
            }
            className="p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-left"
          >
            <Users className="text-blue-600 mb-2" size={24} />
            <p className="text-sm font-semibold text-slate-900">Enrollments</p>
            <p className="text-xs text-slate-600 mt-1">Manage students</p>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() =>
              navigate(`/admin/summer-camps/${camp.publicId}/attendance`)
            }
            className="p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all text-left"
          >
            <ClipboardList className="text-emerald-600 mb-2" size={24} />
            <p className="text-sm font-semibold text-slate-900">Attendance</p>
            <p className="text-xs text-slate-600 mt-1">Mark attendance</p>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() =>
              navigate(`/admin/summer-camps/${camp.publicId}/enroll`)
            }
            className="p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-purple-300 hover:shadow-md transition-all text-left"
          >
            <UserPlus className="text-purple-600 mb-2" size={24} />
            <p className="text-sm font-semibold text-slate-900">Enroll</p>
            <p className="text-xs text-slate-600 mt-1">Add new student</p>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={() =>
              navigate(`/admin/summer-camps/${camp.publicId}/convert`)
            }
            className="p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-orange-300 hover:shadow-md transition-all text-left"
          >
            <TrendingUp className="text-orange-600 mb-2" size={24} />
            <p className="text-sm font-semibold text-slate-900">Convert</p>
            <p className="text-xs text-slate-600 mt-1">To regular players</p>
          </motion.button>
        </div>

        {/* STATISTICS */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 shadow-sm"
            >
              <p className="text-xs text-blue-700 uppercase tracking-wide mb-1">
                Total Enrollments
              </p>
              <p className="text-3xl font-bold text-blue-700">
                {stats.totalEnrollments}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4 shadow-sm"
            >
              <p className="text-xs text-emerald-700 uppercase tracking-wide mb-1">
                Active Students
              </p>
              <p className="text-3xl font-bold text-emerald-700">
                {stats.activeEnrollments}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-4 shadow-sm"
            >
              <p className="text-xs text-purple-700 uppercase tracking-wide mb-1">
                Converted
              </p>
              <p className="text-3xl font-bold text-purple-700">
                {stats.convertedEnrollments}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4 shadow-sm"
            >
              <p className="text-xs text-amber-700 uppercase tracking-wide mb-1">
                Attendance Rate
              </p>
              <p className="text-3xl font-bold text-amber-700">
                {stats.attendanceRate.toFixed(1)}%
              </p>
            </motion.div>
          </div>
        )}

        {/* CAMP DETAILS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Camp Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">
                Duration
              </p>
              <p className="text-slate-900 font-medium">
                {calculateCampDuration(camp.startDate, camp.endDate)} days
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">
                Max Enrollments
              </p>
              <p className="text-slate-900 font-medium">
                {camp.maxEnrollments || "Unlimited"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">
                Current Enrollments
              </p>
              <p className="text-slate-900 font-medium">
                {camp.currentEnrollments}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">
                Status
              </p>
              <p
                className={`font-medium ${
                  camp.isActive ? "text-emerald-700" : "text-red-700"
                }`}
              >
                {camp.isActive ? "Active" : "Inactive"}
              </p>
            </div>

            {camp.description && (
              <div className="md:col-span-2">
                <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">
                  Description
                </p>
                <p className="text-slate-700">{camp.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* FEE RULES */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Fee Structure
            </h2>
            <button
              onClick={() =>
                navigate(`/admin/summer-camps/${camp.publicId}/edit`)
              }
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Edit Fees
            </button>
          </div>

          {feeRules.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
              <DollarSign size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-slate-500 text-sm">No fee rules configured</p>
              <button
                onClick={() =>
                  navigate(`/admin/summer-camps/${camp.publicId}/edit`)
                }
                className="mt-3 text-blue-600 font-medium hover:underline text-sm"
              >
                Add Fee Rules
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {feeRules.map((rule) => (
                <div
                  key={rule.publicId}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {formatBatchCount(rule.batchCount)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Students attending {rule.batchCount}{" "}
                      {rule.batchCount === 1 ? "session" : "sessions"} daily
                    </p>
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    ₹{rule.feeAmount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* REVENUE STATS */}
        {stats && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Revenue</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-xs text-emerald-700 uppercase tracking-wide mb-1">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-emerald-700">
                  ₹{stats.totalRevenue.toFixed(2)}
                </p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-xs text-orange-700 uppercase tracking-wide mb-1">
                  Pending Revenue
                </p>
                <p className="text-2xl font-bold text-orange-700">
                  ₹{stats.pendingRevenue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SummerCampDetails;
