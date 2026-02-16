import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import { summerCampService } from "../../api/summerCampService";
import type {
  SummerCampUpdateRequest,
  FeeRuleCreateRequest,
} from "../../types/summercamp";
import Button from "../../components/Button";

type FeeRuleForm = {
  id: string;
  batchCount: string;
  feeAmount: string;
  isNew: boolean;
};

function SummerCampEdit() {
  const navigate = useNavigate();
  const { campId } = useParams<{ campId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Camp types
  const [campTypes, setCampTypes] = useState<string[]>([]);

  const [formData, setFormData] = useState<SummerCampUpdateRequest>({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
    maxEnrollments: undefined,
    isActive: true,
    campType: "",
  });

  const [feeRules, setFeeRules] = useState<FeeRuleForm[]>([]);

  useEffect(() => {
    loadCampTypes();
    if (campId) {
      loadCampData();
    }
  }, [campId]);

  const loadCampTypes = async () => {
    try {
      const response = await api.get("/admin/settings/camp-types");
      setCampTypes(response.data || []);
    } catch (error) {
      console.error("Failed to load camp types:", error);
    }
  };

  const loadCampData = async () => {
    try {
      setLoading(true);
      const [camp, existingFeeRules] = await Promise.all([
        summerCampService.getCampById(campId!),
        summerCampService.getFeeRules(campId!),
      ]);

      setFormData({
        name: camp.name,
        startDate: camp.startDate,
        endDate: camp.endDate,
        description: camp.description,
        maxEnrollments: camp.maxEnrollments,
        isActive: camp.isActive,
        campType: camp.campType,
      });

      setFeeRules(
        existingFeeRules.map((rule) => ({
          id: rule.publicId,
          batchCount: rule.batchCount.toString(),
          feeAmount: rule.feeAmount.toString(),
          isNew: false,
        })),
      );
    } catch (error) {
      console.error("Error loading camp data:", error);
      toast.error("Failed to load camp data");
      navigate("/admin/summer-camps");
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayName = (type: string): string => {
    return type
      .replace(/_CAMP$/, "")
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]:
          name === "maxEnrollments"
            ? value
              ? parseInt(value)
              : undefined
            : value,
      }));
    }
  };

  // Fee Rules Management
  const addFeeRule = () => {
    setFeeRules((prev) => [
      ...prev,
      {
        id: `new_${Date.now()}`,
        batchCount: "",
        feeAmount: "",
        isNew: true,
      },
    ]);
  };

  const removeFeeRule = (id: string) => {
    setFeeRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const updateFeeRule = (
    id: string,
    field: keyof FeeRuleForm,
    value: string,
  ) => {
    setFeeRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, [field]: value } : rule)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name?.trim()) {
      toast.error("Camp name is required");
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

    // Validate fee rules
    const invalidFeeRule = feeRules.find(
      (rule) =>
        !rule.batchCount ||
        !rule.feeAmount ||
        parseInt(rule.batchCount) <= 0 ||
        parseFloat(rule.feeAmount) <= 0,
    );
    if (invalidFeeRule) {
      toast.error("All fee rules must have valid batch count and amount");
      return;
    }

    // Check for duplicate batch counts
    const batchCounts = feeRules.map((r) => parseInt(r.batchCount));
    const hasDuplicates = batchCounts.some(
      (count, index) => batchCounts.indexOf(count) !== index,
    );
    if (hasDuplicates) {
      toast.error("Duplicate batch counts are not allowed");
      return;
    }

    setSaving(true);

    try {
      // Update camp
      await summerCampService.updateCamp(campId!, formData);

      // Replace all fee rules
      const feeRulesData: FeeRuleCreateRequest[] = feeRules.map((rule) => ({
        batchCount: parseInt(rule.batchCount),
        feeAmount: parseFloat(rule.feeAmount),
      }));

      await summerCampService.setFeeRules(campId!, feeRulesData);

      toast.success("Camp updated successfully!");
      navigate(`/admin/summer-camps/${campId}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update camp");
    } finally {
      setSaving(false);
    }
  };

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
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/admin/summer-camps/${campId}`)}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Edit Camp</h1>
              <p className="text-sm text-slate-600 mt-1">
                Update camp details and fees
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FORM */}
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
            {/* Camp Type - READ ONLY */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Camp Type
              </label>
              <select
                name="campType"
                value={formData.campType || ""}
                disabled
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-slate-50 cursor-not-allowed text-slate-600"
              >
                {campTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatDisplayName(type)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Camp type cannot be changed after creation
              </p>
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
                placeholder="e.g., Camp 2026"
              />
            </div>

            {/* Max Enrollments */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Max Enrollments (Optional)
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

            {/* Active Status */}
            <div className="flex items-center gap-3 pt-7">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-100"
              />
              <label
                htmlFor="isActive"
                className="text-sm font-medium text-slate-700"
              >
                Active Camp
              </label>
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
                Description (Optional)
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

        {/* FEE RULES */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Fee Structure
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Update or add new pricing rules
              </p>
            </div>
            <button
              type="button"
              onClick={addFeeRule}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
            >
              <Plus size={16} />
              Add Fee Rule
            </button>
          </div>

          {feeRules.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
              <p className="text-slate-500 text-sm">
                No fee rules configured. Click "Add Fee Rule" to set pricing.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {feeRules.map((rule, index) => (
                <div
                  key={rule.id}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Batch Count */}
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

                    {/* Fee Amount */}
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

                    {/* Remove Button */}
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeFeeRule(rule.id)}
                        className="w-full md:w-auto px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all text-sm flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Helper text */}
                  <p className="text-xs text-slate-500 mt-2">
                    {rule.batchCount && rule.feeAmount
                      ? `Students attending ${rule.batchCount} ${parseInt(rule.batchCount) === 1 ? "session" : "sessions"} per day will pay ₹${parseFloat(rule.feeAmount).toLocaleString()}`
                      : "Set the fee for students attending this many sessions per day"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/admin/summer-camps/${campId}`)}
          >
            Cancel
          </Button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SummerCampEdit;
