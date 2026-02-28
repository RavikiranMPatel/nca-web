import { useEffect, useState } from "react";
import { X, Save, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import { summerCampService } from "../../api/summerCampService";
import { getCampBatches } from "../../api/summerCampBatchService";
import type { EnrollmentCreateRequest } from "../../types/summercamp";
import type { Batch } from "../../types/batch.types";

interface EnrollmentFormModalProps {
  campId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function EnrollmentFormModal({
  campId,
  onClose,
  onSuccess,
}: EnrollmentFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  const [formErrors, setFormErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState<EnrollmentCreateRequest>({
    playerName: "",
    playerPhone: "",
    playerEmail: "",
    guardianName: "",
    guardianPhone: "",
    batchIds: [],
    notes: "",
  });

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      setLoadingBatches(true);
      // ✅ CHANGED: fetch batches specific to this camp, not by moduleType
      const data = await getCampBatches(campId);
      setBatches(data.filter((b) => b.active));
    } catch (error) {
      console.error("Error loading batches:", error);
      toast.error("Failed to load batches");
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors.length > 0) setFormErrors([]);
  };

  const toggleBatch = (batchId: string) => {
    setFormData((prev) => ({
      ...prev,
      batchIds: prev.batchIds.includes(batchId)
        ? prev.batchIds.filter((id) => id !== batchId)
        : [...prev.batchIds, batchId],
    }));
    if (formErrors.length > 0) setFormErrors([]);
  };

  const validateIndianPhone = (phone: string) => {
    const cleaned = phone.replace(/\s+/g, "");
    // Accepts: 9876543210 or +919876543210 or 919876543210
    return /^(\+91|91)?[6-9]\d{9}$/.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];

    if (!formData.playerName.trim()) {
      errors.push("Player name is required");
    }

    if (formData.batchIds.length === 0) {
      errors.push("Please select at least one batch");
    }

    if (!formData.guardianName?.trim()) {
      errors.push("Parent/Guardian name is required");
    }

    if (!formData.guardianPhone?.trim()) {
      errors.push("Guardian phone number is required");
    } else if (!validateIndianPhone(formData.guardianPhone)) {
      errors.push(
        "Enter a valid Indian mobile number (e.g. 9876543210 or +919876543210)",
      );
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    setLoading(true);

    try {
      await summerCampService.createEnrollment(campId, formData);
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to enroll student");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Enroll Student
              </h2>
              <p className="text-sm text-slate-600">
                Add a new student to this camp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* STUDENT INFORMATION */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">
              Student Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="playerName"
                  value={formData.playerName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="Enter student's full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="playerPhone"
                  value={formData.playerPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="Student's phone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="playerEmail"
                  value={formData.playerEmail}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="Student's email"
                />
              </div>
            </div>
          </div>

          {/* PARENT/GUARDIAN INFORMATION */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">
              Parent/Guardian Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="guardianName"
                  value={formData.guardianName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="Parent/guardian name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="guardianPhone"
                  value={formData.guardianPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="Parent/guardian phone"
                />
              </div>
            </div>
          </div>

          {/* BATCH SELECTION */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">
              Assign Batches <span className="text-red-500">*</span>
            </h3>

            {loadingBatches ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                <p className="text-sm text-slate-600 mt-2">
                  Loading batches...
                </p>
              </div>
            ) : batches.length === 0 ? (
              <div className="text-center py-8 bg-amber-50 rounded-lg border-2 border-dashed border-amber-200">
                <p className="text-amber-700 text-sm font-medium">
                  No batches found for this camp
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Please add batches to this camp first before enrolling
                  students
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {batches.map((batch) => (
                  <label
                    key={batch.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.batchIds.includes(batch.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.batchIds.includes(batch.id)}
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

            {formData.batchIds.length > 0 && (
              <p className="text-sm text-blue-600">
                {formData.batchIds.length} batch
                {formData.batchIds.length > 1 ? "es" : ""} selected
              </p>
            )}
          </div>

          {/* NOTES */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              placeholder="Any additional notes about the enrollment..."
            />
          </div>

          {formErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
              <p className="text-sm font-semibold text-red-700 mb-2">
                Please fix the following:
              </p>
              <ul className="space-y-1">
                {formErrors.map((err, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-red-600"
                  >
                    <span className="mt-0.5 shrink-0">•</span>
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingBatches || batches.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enrolling...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Enroll Student
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EnrollmentFormModal;
