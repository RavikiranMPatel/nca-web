import { useEffect, useState } from "react";
import {
  Plus,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Save,
  X,
  IndianRupee,
  Calendar,
  Tag,
  Percent,
} from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-hot-toast";

type FeePlan = {
  id: string;
  publicId: string;
  name: string;
  amount: number;
  discountAmount: number;
  durationDays: number;
  durationLabel: string;
  campType: string;
  description: string;
  active: boolean;
};

type PlanFormData = {
  name: string;
  amount: string;
  discountAmount: string;
  durationDays: string;
  durationLabel: string;
  campType: string;
  description: string;
  active: boolean;
};

const EMPTY_FORM: PlanFormData = {
  name: "",
  amount: "",
  discountAmount: "0",
  durationDays: "",
  durationLabel: "",
  campType: "REGULAR",
  description: "",
  active: true,
};

function FeeSettingsManager() {
  const [plans, setPlans] = useState<FeePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await api.get("/admin/fees/plans");
      setPlans(res.data);
    } catch {
      toast.error("Failed to load fee plans");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plan: FeePlan) => {
    setEditingPlanId(plan.publicId);
    setForm({
      name: plan.name,
      amount: String(plan.amount),
      discountAmount: String(plan.discountAmount || 0),
      durationDays: String(plan.durationDays),
      durationLabel: plan.durationLabel || "",
      campType: plan.campType || "REGULAR",
      description: plan.description || "",
      active: plan.active,
    });
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingPlanId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.amount || !form.durationDays) {
      toast.error("Name, amount, and duration are required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        amount: parseFloat(form.amount),
        discountAmount: parseFloat(form.discountAmount || "0"),
        durationDays: parseInt(form.durationDays),
        durationLabel: form.durationLabel,
        campType: form.campType,
        description: form.description,
        active: form.active,
      };

      if (editingPlanId) {
        await api.put(`/admin/fees/plans/${editingPlanId}`, payload);
        toast.success("Plan updated");
      } else {
        await api.post("/admin/fees/plans", payload);
        toast.success("Plan created");
      }

      setShowForm(false);
      loadPlans();
    } catch {
      toast.error("Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (publicId: string) => {
    try {
      await api.put(`/admin/fees/plans/${publicId}/toggle`);
      loadPlans();
      toast.success("Plan status updated");
    } catch {
      toast.error("Failed to toggle plan");
    }
  };

  const getFinalAmount = (plan: FeePlan) => {
    return plan.amount - (plan.discountAmount || 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Fee Plans</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure training fee plans, durations, and discounts
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          <Plus size={16} />
          Add Plan
        </button>
      </div>

      {/* PLAN CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.publicId}
            className={`relative bg-white rounded-xl border-2 p-5 transition ${
              plan.active
                ? "border-slate-200 hover:border-blue-200 hover:shadow-md"
                : "border-dashed border-slate-200 opacity-60"
            }`}
          >
            {/* Badge */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                    plan.campType === "SUMMER_CAMP"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {plan.campType === "SUMMER_CAMP" ? "Summer Camp" : "Regular"}
                </span>
                {!plan.active && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-slate-200 text-slate-600 rounded-full">
                    Disabled
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(plan)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Edit"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => handleToggle(plan.publicId)}
                  className={`p-1.5 rounded-lg transition ${
                    plan.active
                      ? "text-green-600 hover:bg-green-50"
                      : "text-slate-400 hover:bg-slate-100"
                  }`}
                  title={plan.active ? "Disable" : "Enable"}
                >
                  {plan.active ? (
                    <ToggleRight size={20} />
                  ) : (
                    <ToggleLeft size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Plan Name */}
            <h3 className="font-bold text-slate-900 text-lg mb-2">
              {plan.name}
            </h3>

            {/* Duration */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
              <Calendar size={14} />
              <span>{plan.durationLabel || `${plan.durationDays} days`}</span>
            </div>

            {/* Pricing */}
            <div className="bg-slate-50 rounded-lg p-3 space-y-1">
              {plan.discountAmount > 0 ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Base Price:</span>
                    <span className="text-slate-500 line-through">
                      ₹{plan.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600 flex items-center gap-1">
                      <Percent size={12} />
                      Discount:
                    </span>
                    <span className="text-green-600 font-medium">
                      - ₹{plan.discountAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-1 flex items-center justify-between">
                    <span className="font-semibold text-slate-700">
                      Final Price:
                    </span>
                    <span className="text-xl font-bold text-blue-700">
                      ₹{getFinalAmount(plan).toLocaleString("en-IN")}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Price:</span>
                  <span className="text-xl font-bold text-blue-700">
                    ₹{plan.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>

            {plan.description && (
              <p className="text-xs text-slate-500 mt-3">{plan.description}</p>
            )}
          </div>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <IndianRupee size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No fee plans configured</p>
          <p className="text-sm text-slate-400 mt-1">
            Add your first plan to start managing fees
          </p>
        </div>
      )}

      {/* ADD/EDIT FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50 rounded-t-xl">
              <h3 className="font-bold text-lg">
                {editingPlanId ? "Edit Fee Plan" : "New Fee Plan"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Plan Name */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Plan Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., 6 Months Training"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Camp Type */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Camp Type *
                </label>
                <select
                  value={form.campType}
                  onChange={(e) =>
                    setForm({ ...form, campType: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="REGULAR">Regular Training</option>
                  <option value="SUMMER_CAMP">Summer Camp</option>
                </select>
              </div>

              {/* Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Duration (Days) *
                  </label>
                  <input
                    type="number"
                    value={form.durationDays}
                    onChange={(e) =>
                      setForm({ ...form, durationDays: e.target.value })
                    }
                    placeholder="e.g., 180"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Duration Label
                  </label>
                  <input
                    type="text"
                    value={form.durationLabel}
                    onChange={(e) =>
                      setForm({ ...form, durationLabel: e.target.value })
                    }
                    placeholder="e.g., 6 Months"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Amount & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Base Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    placeholder="e.g., 21000"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Discount (₹)
                  </label>
                  <input
                    type="number"
                    value={form.discountAmount}
                    onChange={(e) =>
                      setForm({ ...form, discountAmount: e.target.value })
                    }
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Preview */}
              {form.amount && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">
                    Price Preview
                  </p>
                  <div className="flex items-center gap-3">
                    {parseFloat(form.discountAmount || "0") > 0 && (
                      <span className="text-sm text-slate-400 line-through">
                        ₹{parseFloat(form.amount).toLocaleString("en-IN")}
                      </span>
                    )}
                    <span className="text-lg font-bold text-blue-700">
                      ₹
                      {(
                        parseFloat(form.amount || "0") -
                        parseFloat(form.discountAmount || "0")
                      ).toLocaleString("en-IN")}
                    </span>
                    {parseFloat(form.discountAmount || "0") > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        ₹
                        {parseFloat(form.discountAmount).toLocaleString(
                          "en-IN",
                        )}{" "}
                        off
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Optional description"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving ? "Saving..." : "Save Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeeSettingsManager;
