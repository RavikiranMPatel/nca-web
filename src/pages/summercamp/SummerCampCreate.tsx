import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Clock } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import { summerCampService } from "../../api/summerCampService";
import { createCampBatch } from "../../api/summerCampBatchService";
import type {
  SummerCampCreateRequest,
  FeeRuleCreateRequest,
} from "../../types/summercamp";

type FeeRuleForm = {
  id: string;
  batchCount: string;
  feeAmount: string;
};

type CampBatchForm = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

function SummerCampCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [campTypes, setCampTypes] = useState<string[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  const [formData, setFormData] = useState<SummerCampCreateRequest>({
    name: "",
    year: new Date().getFullYear(),
    startDate: "",
    endDate: "",
    description: "",
    maxEnrollments: undefined,
    campType: "",
  });

  const [feeRules, setFeeRules] = useState<FeeRuleForm[]>([]);
  const [campBatches, setCampBatches] = useState<CampBatchForm[]>([]);

  useEffect(() => {
    loadCampTypes();
  }, []);

  const loadCampTypes = async () => {
    try {
      setLoadingTypes(true);
      const response = await api.get("/admin/settings/camp-types");
      const types = response.data || [];
      setCampTypes(types);
      if (types.length > 0) {
        setFormData((prev) => ({ ...prev, campType: types[0] }));
      }
    } catch {
      toast.error("Failed to load camp types");
      setCampTypes(["SUMMER_CAMP", "BATTING_CAMP", "BOWLING_CAMP"]);
      setFormData((prev) => ({ ...prev, campType: "SUMMER_CAMP" }));
    } finally {
      setLoadingTypes(false);
    }
  };

  const formatDisplayName = (type: string): string =>
    type
      .replace(/_CAMP$/, "")
      .replace(/_/g, " ")
      .split(" ")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "year" || name === "maxEnrollments"
          ? value
            ? parseInt(value)
            : undefined
          : value,
    }));
  };

  // ── Fee Rules ─────────────────────────────────────────────────────────────
  const addFeeRule = () =>
    setFeeRules((prev) => [
      ...prev,
      { id: Date.now().toString(), batchCount: "", feeAmount: "" },
    ]);

  const removeFeeRule = (id: string) =>
    setFeeRules((prev) => prev.filter((r) => r.id !== id));

  const updateFeeRule = (id: string, field: keyof FeeRuleForm, value: string) =>
    setFeeRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );

  // ── Camp Batches ──────────────────────────────────────────────────────────
  const addCampBatch = () =>
    setCampBatches((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", startTime: "", endTime: "" },
    ]);

  const removeCampBatch = (id: string) =>
    setCampBatches((prev) => prev.filter((b) => b.id !== id));

  const updateCampBatch = (
    id: string,
    field: keyof CampBatchForm,
    value: string,
  ) =>
    setCampBatches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
    );

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Camp name is required");
      return;
    }
    if (!formData.campType) {
      toast.error("Camp type is required");
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error("Start and end dates are required");
      return;
    }
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast.error("End date must be after start date");
      return;
    }

    const invalidFeeRule = feeRules.find(
      (r) =>
        !r.batchCount ||
        !r.feeAmount ||
        parseInt(r.batchCount) <= 0 ||
        parseFloat(r.feeAmount) <= 0,
    );
    if (invalidFeeRule) {
      toast.error("All fee rules must have valid batch count and amount");
      return;
    }

    const batchCounts = feeRules.map((r) => parseInt(r.batchCount));
    if (batchCounts.some((c, i) => batchCounts.indexOf(c) !== i)) {
      toast.error("Duplicate batch counts in fee rules");
      return;
    }

    const invalidBatch = campBatches.find(
      (b) => !b.name.trim() || !b.startTime || !b.endTime,
    );
    if (invalidBatch) {
      toast.error("All batches must have name, start time, and end time");
      return;
    }

    setLoading(true);
    try {
      // 1. Create camp
      const camp = await summerCampService.createCamp(formData);

      // 2. Create fee rules
      if (feeRules.length > 0) {
        const feeRulesData: FeeRuleCreateRequest[] = feeRules.map((r) => ({
          batchCount: parseInt(r.batchCount),
          feeAmount: parseFloat(r.feeAmount),
        }));
        await summerCampService.setFeeRules(camp.publicId, feeRulesData);
      }

      // 3. Create camp batches
      if (campBatches.length > 0) {
        await Promise.all(
          campBatches.map((b) =>
            createCampBatch(camp.publicId, {
              name: b.name,
              startTime: b.startTime + ":00",
              endTime: b.endTime + ":00",
            }),
          ),
        );
      }

      toast.success("Camp created successfully!");
      navigate(`/admin/summer-camps/${camp.publicId}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create camp");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-20">
      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/summer-camps")}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Create Camp</h1>
              <p className="text-sm text-slate-600 mt-1">
                Set up a new camp program
              </p>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-4xl mx-auto px-4 py-6 space-y-6"
      >
        {/* BASIC INFO */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Camp Type */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Camp Type <span className="text-red-500">*</span>
              </label>
              {loadingTypes ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-slate-50">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                  <span className="text-sm text-slate-500">
                    Loading camp types...
                  </span>
                </div>
              ) : (
                <select
                  name="campType"
                  value={formData.campType || ""}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <option value="">Select camp type...</option>
                  {campTypes.map((type) => (
                    <option key={type} value={type}>
                      {formatDisplayName(type)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Camp Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Camp Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="e.g., Bowlers Camp 2026"
              />
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                required
                min={2020}
                max={2100}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Max Enrollments */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Max Enrollments{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                name="maxEnrollments"
                value={formData.maxEnrollments || ""}
                onChange={handleChange}
                min={1}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="Leave empty for unlimited"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="Brief description of the camp program..."
              />
            </div>
          </div>
        </div>

        {/* CAMP BATCHES */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Camp Batches
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Define the sessions for this camp (e.g., Morning 6–7 AM, Evening
                4–5 PM)
              </p>
            </div>
            <button
              type="button"
              onClick={addCampBatch}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
            >
              <Plus size={16} />
              Add Batch
            </button>
          </div>

          {campBatches.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <Clock size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm font-medium">
                No batches added yet
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Add at least one batch so students can be enrolled
              </p>
              <button
                type="button"
                onClick={addCampBatch}
                className="mt-3 inline-flex items-center gap-2 text-blue-600 font-medium text-sm hover:underline"
              >
                <Plus size={14} /> Add first batch
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {campBatches.map((batch, index) => (
                <div
                  key={batch.id}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                      Batch {index + 1}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Batch Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={batch.name}
                        onChange={(e) =>
                          updateCampBatch(batch.id, "name", e.target.value)
                        }
                        placeholder="e.g., Morning, Evening"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Start Time <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="time"
                        value={batch.startTime}
                        onChange={(e) =>
                          updateCampBatch(batch.id, "startTime", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        End Time <span className="text-red-400">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={batch.endTime}
                          onChange={(e) =>
                            updateCampBatch(batch.id, "endTime", e.target.value)
                          }
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeCampBatch(batch.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {batch.startTime && batch.endTime && (
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                      🕐 {batch.name || "Batch"}: {batch.startTime} –{" "}
                      {batch.endTime}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FEE STRUCTURE */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Fee Structure
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Set fees based on number of sessions per day (optional)
              </p>
            </div>
            <button
              type="button"
              onClick={addFeeRule}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
            >
              <Plus size={16} /> Add Fee Rule
            </button>
          </div>

          {feeRules.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <p className="text-slate-500 text-sm">No fee rules configured.</p>
              <p className="text-xs text-slate-400 mt-1">
                Example: 1 session = ₹5,000 | 2 sessions = ₹7,500
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {feeRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Number of Sessions
                      </label>
                      <input
                        type="number"
                        value={rule.batchCount}
                        onChange={(e) =>
                          updateFeeRule(rule.id, "batchCount", e.target.value)
                        }
                        min="1"
                        max="10"
                        placeholder="1, 2, 3..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Fee Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={rule.feeAmount}
                        onChange={(e) =>
                          updateFeeRule(rule.id, "feeAmount", e.target.value)
                        }
                        min="0"
                        step="100"
                        placeholder="5000, 7500..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeFeeRule(rule.id)}
                        className="w-full px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all text-sm flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} /> Remove
                      </button>
                    </div>
                  </div>
                  {rule.batchCount && rule.feeAmount && (
                    <p className="text-xs text-slate-500 mt-2">
                      {`${rule.batchCount} ${
                        parseInt(rule.batchCount) === 1 ? "session" : "sessions"
                      } per day → ₹${parseFloat(rule.feeAmount).toLocaleString()}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate("/admin/summer-camps")}
            className="px-6 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save size={18} />
                Create Camp
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SummerCampCreate;
