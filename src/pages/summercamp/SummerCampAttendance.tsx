import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Save,
  CheckCircle,
  XCircle,
  Users,
  Filter,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { summerCampService } from "../../api/summerCampService";
import { getAllBatches } from "../../api/summerCampBatchService";
import type {
  SummerCamp,
  SummerCampEnrollment,
  SummerCampAttendanceBulkRequest,
  BulkAttendanceItem,
} from "../../types/summercamp";
import type { Batch } from "../../types/batch.types";

type AttendanceRow = {
  enrollmentId: string;
  playerName: string;
  status: "PRESENT" | "ABSENT" | "NOT_MARKED";
};

function SummerCampAttendance() {
  const navigate = useNavigate();
  const { campId } = useParams<{ campId: string }>();

  const [camp, setCamp] = useState<SummerCamp | null>(null);
  const [enrollments, setEnrollments] = useState<SummerCampEnrollment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedBatch, setSelectedBatch] = useState<string>("");

  // Attendance data
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [existingAttendance, setExistingAttendance] = useState<string[]>([]); // IDs with existing attendance

  useEffect(() => {
    if (campId) {
      loadInitialData();
    }
  }, [campId]);

  useEffect(() => {
    if (selectedDate && selectedBatch) {
      loadAttendanceData();
    }
  }, [selectedDate, selectedBatch]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [campData, enrollmentsData, batchesData] = await Promise.all([
        summerCampService.getCampById(campId!),
        summerCampService.getEnrollments(campId!),
        getAllBatches("SUMMER_CAMP"),
      ]);

      setCamp(campData);
      setEnrollments(enrollmentsData.filter((e) => e.status === "ACTIVE"));
      setBatches(batchesData.filter((b) => b.active));

      // Auto-select first batch if available
      if (batchesData.length > 0) {
        setSelectedBatch(batchesData[0].id);
      }
    } catch (error) {
      console.error("Error loading enrollments:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceData = async () => {
    try {
      // Get enrollments for selected batch
      const batchEnrollments = enrollments.filter((e) =>
        e.batchIds?.includes(selectedBatch),
      );

      // Try to load existing attendance
      try {
        const existingRecords = await summerCampService.getAttendanceRecords(
          campId!,
          selectedDate,
          selectedBatch,
        );

        // Create attendance rows from existing records
        const rows: AttendanceRow[] = batchEnrollments.map((enrollment) => {
          const existingRecord = existingRecords.find(
            (r) => r.enrollmentId === enrollment.publicId, // ✅ FIXED: Use publicId
          );

          return {
            enrollmentId: enrollment.publicId, // ✅ FIXED: Use publicId
            playerName: enrollment.playerName,
            status: existingRecord ? existingRecord.status : "PRESENT",
          };
        });

        setAttendanceRows(rows);
        setExistingAttendance(existingRecords.map((r) => r.enrollmentId));
      } catch (error) {
        console.error(
          "Error loading existing attendance, defaulting to all present:",
          error,
        );
        // No existing attendance, create fresh rows
        const rows: AttendanceRow[] = batchEnrollments.map((enrollment) => ({
          enrollmentId: enrollment.publicId, // ✅ FIXED: Use publicId
          playerName: enrollment.playerName,
          status: "NOT_MARKED" as const,
        }));

        setAttendanceRows(rows);
        setExistingAttendance([]);
      }
    } catch (error) {
      console.error("Error loading attendance data:", error);
      toast.error("Failed to load attendance data");
    }
  };

  const toggleAttendance = (enrollmentId: string) => {
    setAttendanceRows((prev) =>
      prev.map((row) =>
        row.enrollmentId === enrollmentId
          ? {
              ...row,
              status: row.status === "PRESENT" ? "ABSENT" : "PRESENT",
            }
          : row,
      ),
    );
  };

  const markAllPresent = () => {
    setAttendanceRows((prev) =>
      prev.map((row) => ({ ...row, status: "PRESENT" })),
    );
  };

  const markAllAbsent = () => {
    setAttendanceRows((prev) =>
      prev.map((row) => ({ ...row, status: "ABSENT" })),
    );
  };

  const handleSubmit = async () => {
    if (!selectedBatch) {
      toast.error("Please select a batch");
      return;
    }

    if (attendanceRows.length === 0) {
      toast.error("No students to mark attendance for");
      return;
    }

    setSaving(true);

    try {
      const records: BulkAttendanceItem[] = attendanceRows
        .filter((row) => row.status !== "NOT_MARKED")
        .map((row) => ({
          enrollmentId: row.enrollmentId,
          status: row.status as "PRESENT" | "ABSENT",
        }));

      const request: SummerCampAttendanceBulkRequest = {
        date: selectedDate,
        batchId: selectedBatch,
        records,
      };

      await summerCampService.submitBulkAttendance(campId!, request);

      toast.success("Attendance saved successfully!");
      loadAttendanceData(); // Reload to show as existing
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to save attendance",
      );
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
  const hasExistingAttendance = existingAttendance.length > 0;

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
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/admin/summer-camps/${campId}`)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="text-emerald-600" size={28} />
                  Attendance
                </h1>
                <p className="text-sm text-slate-600 mt-1">{camp?.name}</p>
              </div>
            </div>

            {attendanceRows.length > 0 && (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span className="hidden sm:inline">Save Attendance</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* FILTERS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={camp?.startDate}
                max={camp?.endDate}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Batch Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Batch <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="">Select batch...</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} ({batch.startTime} - {batch.endTime})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasExistingAttendance && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">
                ℹ️ Attendance already marked for this date and batch. You can
                update it below.
              </p>
            </div>
          )}
        </div>

        {/* SUMMARY & QUICK ACTIONS */}
        {attendanceRows.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Summary */}
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide">
                    Total Students
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {attendanceRows.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600 uppercase tracking-wide">
                    Present
                  </p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {presentCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-red-600 uppercase tracking-wide">
                    Absent
                  </p>
                  <p className="text-2xl font-bold text-red-700">
                    {absentCount}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button
                  onClick={markAllPresent}
                  className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition text-sm font-medium"
                >
                  Mark All Present
                </button>
                <button
                  onClick={markAllAbsent}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm font-medium"
                >
                  Mark All Absent
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ATTENDANCE ROWS */}
        {!selectedBatch ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Filter size={48} className="mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Select a batch to mark attendance
            </h3>
            <p className="text-slate-500 text-sm">
              Choose a date and batch from the filters above
            </p>
          </div>
        ) : attendanceRows.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Users size={48} className="mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No students enrolled
            </h3>
            <p className="text-slate-500 text-sm">
              No active students are enrolled in this batch
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceRows.map((row, index) => (
                    <motion.tr
                      key={row.enrollmentId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-slate-50 transition"
                    >
                      {/* Index */}
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {index + 1}
                      </td>

                      {/* Student Name */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {row.playerName}
                        </p>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                            row.status === "PRESENT"
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              : row.status === "ABSENT"
                                ? "bg-red-100 text-red-700 border border-red-200"
                                : "bg-gray-100 text-gray-700 border border-gray-200"
                          }`}
                        >
                          {row.status === "PRESENT" ? (
                            <>
                              <CheckCircle size={14} /> Present
                            </>
                          ) : row.status === "ABSENT" ? (
                            <>
                              <XCircle size={14} /> Absent
                            </>
                          ) : (
                            <>Not Marked</>
                          )}
                        </span>
                      </td>

                      {/* Toggle Button */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleAttendance(row.enrollmentId)}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            row.status === "PRESENT"
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          }`}
                        >
                          Mark {row.status === "PRESENT" ? "Absent" : "Present"}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MOBILE VIEW - Cards */}
        {selectedBatch && attendanceRows.length > 0 && (
          <div className="md:hidden space-y-3">
            {attendanceRows.map((row, index) => (
              <motion.div
                key={row.enrollmentId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900">{row.playerName}</h3>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                      row.status === "PRESENT"
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : row.status === "ABSENT"
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "bg-gray-100 text-gray-700 border border-gray-200"
                    }`}
                  >
                    {row.status === "PRESENT" ? (
                      <>
                        <CheckCircle size={14} /> Present
                      </>
                    ) : row.status === "ABSENT" ? (
                      <>
                        <XCircle size={14} /> Absent
                      </>
                    ) : (
                      <>Not Marked</>
                    )}
                  </span>
                </div>

                <button
                  onClick={() => toggleAttendance(row.enrollmentId)}
                  className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    row.status === "PRESENT"
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  }`}
                >
                  Mark {row.status === "PRESENT" ? "Absent" : "Present"}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SummerCampAttendance;
