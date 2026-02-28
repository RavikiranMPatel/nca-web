import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  Users,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { summerCampService, formatCampDate } from "../../api/summerCampService";
import { getRegularBatches } from "../../api/summerCampBatchService";
import type {
  SummerCamp,
  SummerCampEnrollment,
  ConversionRequest,
} from "../../types/summercamp";
import type { Batch } from "../../types/batch.types";

function SummerCampConversion() {
  const navigate = useNavigate();
  const { campId } = useParams<{ campId: string }>();

  const [camp, setCamp] = useState<SummerCamp | null>(null);
  const [enrollments, setEnrollments] = useState<SummerCampEnrollment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected enrollment for conversion
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<SummerCampEnrollment | null>(null);
  const [converting, setConverting] = useState(false);

  // Conversion form
  const [joiningDate, setJoiningDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (campId) {
      loadData();
    }
  }, [campId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [campData, enrollmentsData, batchesData] = await Promise.all([
        summerCampService.getCampById(campId!),
        summerCampService.getEnrollments(campId!),
        getRegularBatches(),
      ]);

      setCamp(campData);
      // Only show active enrollments that haven't been converted
      setEnrollments(
        enrollmentsData.filter(
          (e) => e.status === "ACTIVE" || e.status === "INACTIVE",
        ),
      );
      setBatches(batchesData.filter((b) => b.active));
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const selectEnrollment = (enrollment: SummerCampEnrollment) => {
    setSelectedEnrollment(enrollment);
    // Pre-select the same batches they had in summer camp
    setSelectedBatchIds(enrollment.batchIds ?? []);

    setNotes("");
  };

  const toggleBatch = (batchId: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(batchId)
        ? prev.filter((id) => id !== batchId)
        : [...prev, batchId],
    );
  };

  const handleConversion = async () => {
    if (!selectedEnrollment) return;

    // Validation
    if (selectedBatchIds.length === 0) {
      toast.error("Please select at least one batch");
      return;
    }

    if (!joiningDate) {
      toast.error("Please select a joining date");
      return;
    }

    setConverting(true);

    try {
      const request: ConversionRequest = {
        batchIds: selectedBatchIds,
        joiningDate,
        notes: notes || undefined,
      };

      const response = await summerCampService.convertToRegular(
        campId!,
        selectedEnrollment.publicId,
        request,
      );

      toast.success(
        `${response.playerName} converted to regular player successfully!`,
      );

      // Reload data and reset form
      setSelectedEnrollment(null);
      setSelectedBatchIds([]);
      setNotes("");
      loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to convert student",
      );
    } finally {
      setConverting(false);
    }
  };

  const activeEnrollments = enrollments.filter((e) => e.status === "ACTIVE");
  const convertedCount = enrollments.filter(
    (e) => e.status === "CONVERTED",
  ).length;

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
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/admin/summer-camps/${campId}`)}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="text-purple-600" size={28} />
                Convert to Regular Coaching
              </h1>
              <p className="text-sm text-slate-600 mt-1">{camp?.name}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Student List */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Users size={20} />
                Select Student ({activeEnrollments.length} available)
              </h2>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700 uppercase tracking-wide">
                    Available
                  </p>
                  <p className="text-2xl font-bold text-blue-700">
                    {activeEnrollments.length}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-700 uppercase tracking-wide">
                    Converted
                  </p>
                  <p className="text-2xl font-bold text-purple-700">
                    {convertedCount}
                  </p>
                </div>
              </div>

              {activeEnrollments.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                  <Users size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-slate-600 text-sm">
                    No students available for conversion
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {activeEnrollments.map((enrollment) => (
                    <div
                      key={enrollment.publicId}
                      onClick={() => selectEnrollment(enrollment)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedEnrollment?.publicId === enrollment.publicId
                          ? "border-purple-600 bg-purple-100 shadow-md ring-2 ring-purple-300"
                          : "border-slate-200 hover:border-purple-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">
                            {enrollment.playerName}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            Enrolled: {formatCampDate(enrollment.enrolledAt)}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(enrollment.batchNames ?? []).map(
                              (name, index) => (
                                <span
                                  key={index}
                                  className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded"
                                >
                                  {name}
                                </span>
                              ),
                            )}
                          </div>
                        </div>

                        {selectedEnrollment?.publicId ===
                          enrollment.publicId && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-purple-600 text-white rounded-full font-semibold">
                              SELECTED
                            </span>
                            <CheckCircle
                              className="text-purple-600"
                              size={24}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Conversion Form */}
          <div className="space-y-4">
            {!selectedEnrollment ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <AlertCircle
                  size={48}
                  className="mx-auto text-slate-400 mb-4"
                />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  No student selected
                </h3>
                <p className="text-slate-500 text-sm">
                  Select a student from the left panel to begin conversion
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                {/* Student Info */}
                <div className="pb-4 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-purple-700 mb-2">
                    Converting: {selectedEnrollment.playerName}
                  </h2>

                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold mb-3">
                    <CheckCircle size={16} />
                    Selected Player
                  </div>

                  <p className="text-sm text-slate-600">
                    This student will be added to regular coaching with their
                    camp attendance history preserved.
                  </p>
                </div>

                {/* Joining Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Joining Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                {/* Batch Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Assign to Batches <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-600 mb-3">
                    Pre-selected batches are from camp enrollment
                  </p>

                  {batches.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                      <p className="text-slate-600 text-sm">
                        No active batches available
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {batches.map((batch) => (
                        <label
                          key={batch.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedBatchIds.includes(batch.id)
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedBatchIds.includes(batch.id)}
                            onChange={() => toggleBatch(batch.id)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-100"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">
                              {batch.name}
                            </p>
                            <p className="text-xs text-slate-600">
                              {batch.startTime} - {batch.endTime}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {selectedBatchIds.length > 0 && (
                    <p className="text-sm text-blue-600 mt-2">
                      {selectedBatchIds.length} batch
                      {selectedBatchIds.length > 1 ? "es" : ""} selected
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    placeholder="Any additional notes about this conversion..."
                  />
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex gap-3">
                    <AlertCircle
                      className="text-blue-600 flex-shrink-0"
                      size={20}
                    />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">What happens next:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Student will be added to regular coaching</li>
                        <li>Camp attendance history will be preserved</li>
                        <li>Enrollment status will change to "CONVERTED"</li>
                        <li>Student will appear in regular players list</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setSelectedEnrollment(null);
                      setSelectedBatchIds([]);
                      setNotes("");
                    }}
                    className="flex-1 px-6 py-2.5 rounded-lg font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConversion}
                    disabled={converting || selectedBatchIds.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                  >
                    {converting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Converting...
                      </>
                    ) : (
                      <>
                        <TrendingUp size={18} />
                        Convert Student
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SummerCampConversion;
