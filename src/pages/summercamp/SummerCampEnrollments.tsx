import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Plus, Users, CreditCard } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  summerCampService,
  getEnrollmentStatusColor,
  getPaymentStatusColor,
  formatCampDate,
} from "../../api/summerCampService";
import type { SummerCamp, SummerCampEnrollment } from "../../types/summercamp";
import EnrollmentFormModal from "../../components/summercamp/EnrollmentFormModal";
import PaymentRecordModal from "../../components/summercamp/PaymentRecordModal";

function SummerCampEnrollments() {
  const navigate = useNavigate();
  const { campId } = useParams<{ campId: string }>();

  const [camp, setCamp] = useState<SummerCamp | null>(null);
  const [enrollments, setEnrollments] = useState<SummerCampEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  // Modals
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<SummerCampEnrollment | null>(null);

  useEffect(() => {
    if (campId) {
      loadData();
    }
  }, [campId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [campData, enrollmentsData] = await Promise.all([
        summerCampService.getCampById(campId!),
        summerCampService.getEnrollments(campId!),
      ]);
      setCamp(campData);
      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error("Error loading enrollments:", error);
      toast.error("Failed to load enrollments");
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollmentSuccess = () => {
    setShowEnrollmentForm(false);
    loadData();
    toast.success("Student enrolled successfully!");
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedEnrollment(null);
    loadData();
    toast.success("Payment recorded successfully!");
  };

  const openPaymentModal = (enrollment: SummerCampEnrollment) => {
    setSelectedEnrollment(enrollment);
    setShowPaymentModal(true);
  };

  // Filter enrollments
  const filteredEnrollments = enrollments.filter((enrollment) => {
    const matchesSearch =
      enrollment.playerName.toLowerCase().includes(search.toLowerCase()) ||
      enrollment.playerPhone?.toLowerCase().includes(search.toLowerCase()) ||
      enrollment.parentName?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || enrollment.status === statusFilter;

    const matchesPayment =
      paymentFilter === "all" || enrollment.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Summary stats
  const activeCount = enrollments.filter((e) => e.status === "ACTIVE").length;
  const paidCount = enrollments.filter(
    (e) => e.paymentStatus === "PAID",
  ).length;
  const totalRevenue = enrollments.reduce((sum, e) => sum + e.paidAmount, 0);

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
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/admin/summer-camps/${campId}`)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Enrollments
                </h1>
                <p className="text-sm text-slate-600 mt-1">{camp?.name}</p>
              </div>
            </div>

            <button
              onClick={() => setShowEnrollmentForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Enroll Student</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* SUMMARY STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
          >
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">
              Total Enrolled
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {enrollments.length}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4 shadow-sm"
          >
            <p className="text-xs text-emerald-700 uppercase tracking-wide mb-1">
              Active
            </p>
            <p className="text-3xl font-bold text-emerald-700">{activeCount}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 shadow-sm"
          >
            <p className="text-xs text-blue-700 uppercase tracking-wide mb-1">
              Paid in Full
            </p>
            <p className="text-3xl font-bold text-blue-700">{paidCount}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-4 shadow-sm"
          >
            <p className="text-xs text-purple-700 uppercase tracking-wide mb-1">
              Revenue
            </p>
            <p className="text-3xl font-bold text-purple-700">
              ₹{totalRevenue.toLocaleString()}
            </p>
          </motion.div>
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              placeholder="Search by name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-3">
            {/* Status Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Enrollment Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="CONVERTED">Converted</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </div>

            {/* Payment Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Payment Status
              </label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              >
                <option value="all">All Payments</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="PENDING">Pending</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>

            {/* Reset */}
            {(search || statusFilter !== "all" || paymentFilter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setPaymentFilter("all");
                }}
                className="self-end px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* ENROLLMENTS LIST */}
        {filteredEnrollments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Users size={48} className="mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No enrollments found
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              {search || statusFilter !== "all" || paymentFilter !== "all"
                ? "Try adjusting your filters"
                : "Start by enrolling your first student"}
            </p>
            {!search && statusFilter === "all" && paymentFilter === "all" && (
              <button
                onClick={() => setShowEnrollmentForm(true)}
                className="text-blue-600 font-medium hover:underline"
              >
                Enroll first student
              </button>
            )}
          </div>
        ) : (
          <>
            {/* MOBILE: Cards */}
            <div className="md:hidden space-y-3">
              {filteredEnrollments.map((enrollment, index) => {
                const statusColor = getEnrollmentStatusColor(enrollment.status);
                const paymentColor = getPaymentStatusColor(
                  enrollment.paymentStatus,
                );

                return (
                  <motion.div
                    key={enrollment.publicId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
                  >
                    {/* Student Name */}
                    <h3 className="font-bold text-slate-900 mb-2">
                      {enrollment.playerName}
                    </h3>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}
                      >
                        {enrollment.status}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${paymentColor.bg} ${paymentColor.text} border ${paymentColor.border}`}
                      >
                        {enrollment.paymentStatus}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm mb-3">
                      {enrollment.playerPhone && (
                        <p className="text-slate-600">
                          📞 {enrollment.playerPhone}
                        </p>
                      )}
                      {enrollment.parentName && (
                        <p className="text-slate-600">
                          👤 {enrollment.parentName}
                        </p>
                      )}
                      <p className="text-slate-600">
                        📅 {formatCampDate(enrollment.enrolledAt)}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-slate-600">Paid:</span>
                        <span className="font-bold text-emerald-700">
                          ₹{enrollment.paidAmount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Balance:</span>
                        <span className="font-bold text-orange-700">
                          ₹{enrollment.balanceAmount}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openPaymentModal(enrollment)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                      >
                        <CreditCard size={16} />
                        Payment
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* DESKTOP: Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Fees
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEnrollments.map((enrollment) => {
                      const statusColor = getEnrollmentStatusColor(
                        enrollment.status,
                      );
                      const paymentColor = getPaymentStatusColor(
                        enrollment.paymentStatus,
                      );

                      return (
                        <tr
                          key={enrollment.publicId}
                          className="hover:bg-slate-50 transition"
                        >
                          {/* Student */}
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {enrollment.playerName}
                              </p>
                              <p className="text-xs text-slate-500">
                                Enrolled:{" "}
                                {formatCampDate(enrollment.enrolledAt)}
                              </p>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-600">
                              {enrollment.playerPhone && (
                                <p>{enrollment.playerPhone}</p>
                              )}
                              {enrollment.parentName && (
                                <p className="text-xs">
                                  {enrollment.parentName}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}
                            >
                              {enrollment.status}
                            </span>
                          </td>

                          {/* Payment */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${paymentColor.bg} ${paymentColor.text} border ${paymentColor.border}`}
                            >
                              {enrollment.paymentStatus}
                            </span>
                          </td>

                          {/* Fees */}
                          <td className="px-4 py-3 text-right">
                            <div className="text-sm">
                              <p className="font-semibold text-emerald-700">
                                ₹{enrollment.paidAmount}
                              </p>
                              <p className="text-xs text-slate-500">
                                / ₹{enrollment.totalFee}
                              </p>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openPaymentModal(enrollment)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Record Payment"
                              >
                                <CreditCard size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODALS */}
      {showEnrollmentForm && campId && (
        <EnrollmentFormModal
          campId={campId}
          onClose={() => setShowEnrollmentForm(false)}
          onSuccess={handleEnrollmentSuccess}
        />
      )}

      {showPaymentModal && selectedEnrollment && campId && (
        <PaymentRecordModal
          campId={campId}
          enrollment={selectedEnrollment}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedEnrollment(null);
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

export default SummerCampEnrollments;
