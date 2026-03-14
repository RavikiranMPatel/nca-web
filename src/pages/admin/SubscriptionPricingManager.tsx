import { useEffect, useState } from "react";
import {
  Plus,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Save,
  X,
  IndianRupee,
  Zap,
} from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────

type SubscriptionPlan = {
  id: string;
  publicId: string;
  sessionsPerMonth: number;
  months: number;
  totalSessions: number;
  price: number;
  registrationFee: number;
  active: boolean;
  description: string;
};

type PlanFormData = {
  sessionsPerMonth: string;
  months: string;
  price: string;
  registrationFee: string;
  description: string;
};

const EMPTY_FORM: PlanFormData = {
  sessionsPerMonth: "",
  months: "",
  price: "",
  registrationFee: "1000",
  description: "",
};

const SESSION_OPTIONS = [10, 20];
const MONTH_OPTIONS = [1, 3, 6, 12];

// ── Component ─────────────────────────────────────────────────────────────

function SubscriptionPricingManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPublicId, setEditingPublicId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await api.get("/admin/subscriptions/plans");
      setPlans(res.data);
    } catch {
      toast.error("Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingPublicId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPublicId(plan.publicId);
    setForm({
      sessionsPerMonth: String(plan.sessionsPerMonth),
      months: String(plan.months),
      price: String(plan.price),
      registrationFee: String(plan.registrationFee),
      description: plan.description || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.sessionsPerMonth || !form.months || !form.price) {
      toast.error("Sessions, months and price are required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        sessionsPerMonth: parseInt(form.sessionsPerMonth),
        months: parseInt(form.months),
        price: parseFloat(form.price),
        registrationFee: parseFloat(form.registrationFee || "1000"),
        description: form.description,
      };

      if (editingPublicId) {
        await api.put(`/admin/subscriptions/plans/${editingPublicId}`, payload);
        toast.success("Plan updated");
      } else {
        await api.post("/admin/subscriptions/plans", payload);
        toast.success("Plan created");
      }

      setShowForm(false);
      loadPlans();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to save plan";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (publicId: string) => {
    try {
      await api.put(`/admin/subscriptions/plans/${publicId}/toggle`);
      loadPlans();
      toast.success("Plan status updated");
    } catch {
      toast.error("Failed to toggle plan");
    }
  };

  // ── Group plans by sessionsPerMonth for display ────────────────────────
  const grouped = plans.reduce(
    (acc, plan) => {
      const key = plan.sessionsPerMonth;
      if (!acc[key]) acc[key] = [];
      acc[key].push(plan);
      return acc;
    },
    {} as Record<number, SubscriptionPlan[]>,
  );

  // ── Check if a combination already exists ─────────────────────────────
  const combinationExists = (sessions: string, months: string) => {
    return plans.some(
      (p) =>
        p.sessionsPerMonth === parseInt(sessions) &&
        p.months === parseInt(months) &&
        p.publicId !== editingPublicId,
    );
  };

  const isDuplicate =
    form.sessionsPerMonth &&
    form.months &&
    combinationExists(form.sessionsPerMonth, form.months);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Subscription Plans</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure bowling machine membership pricing. Registration fee is
            charged only once per user.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2
                     rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          <Plus size={16} />
          Add Plan
        </button>
      </div>

      {/* Registration Fee Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <span className="text-amber-500 text-lg mt-0.5">ℹ️</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Registration Fee (One-time)
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Registration fee is charged only on the user's first ever
            subscription. Returning subscribers are never charged again,
            regardless of the plan they choose.
          </p>
        </div>
      </div>

      {/* Plans Grid — grouped by sessions */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <IndianRupee size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">
            No subscription plans configured
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Add your first plan to start managing subscriptions
          </p>
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([sessions, groupPlans]) => (
            <div key={sessions}>
              {/* Group Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Zap size={16} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-800">
                  {sessions} Sessions / Month
                </h3>
                <span className="text-xs text-slate-400">
                  ({groupPlans.length} plan
                  {groupPlans.length > 1 ? "s" : ""})
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
                {groupPlans
                  .sort((a, b) => a.months - b.months)
                  .map((plan) => (
                    <PlanCard
                      key={plan.publicId}
                      plan={plan}
                      onEdit={handleEdit}
                      onToggle={handleToggle}
                    />
                  ))}
              </div>
            </div>
          ))
      )}

      {/* ── ADD / EDIT MODAL ──────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50 rounded-t-xl">
              <h3 className="font-bold text-lg">
                {editingPublicId ? "Edit Plan" : "New Subscription Plan"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Sessions per Month */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-2 block">
                  Sessions per Month *
                </label>
                <div className="flex gap-2">
                  {SESSION_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        setForm({ ...form, sessionsPerMonth: String(s) })
                      }
                      className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition ${
                        form.sessionsPerMonth === String(s)
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:border-blue-300"
                      }`}
                    >
                      {s} sessions
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-2 block">
                  Duration *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {MONTH_OPTIONS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setForm({ ...form, months: String(m) })}
                      className={`py-2.5 rounded-lg border-2 text-sm font-semibold transition ${
                        form.months === String(m)
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:border-blue-300"
                      }`}
                    >
                      {m}M
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Sessions Preview */}
              {form.sessionsPerMonth && form.months && (
                <div className="bg-blue-50 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-blue-700 font-medium">
                    Total Sessions
                  </span>
                  <span className="text-xl font-bold text-blue-700">
                    {parseInt(form.sessionsPerMonth) * parseInt(form.months)}
                  </span>
                </div>
              )}

              {/* Duplicate warning */}
              {isDuplicate && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-red-700 font-medium">
                    ⚠️ A plan with {form.sessionsPerMonth} sessions ×{" "}
                    {form.months} months already exists.
                  </p>
                </div>
              )}

              {/* Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Plan Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    placeholder="e.g. 2500"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Registration Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={form.registrationFee}
                    onChange={(e) =>
                      setForm({ ...form, registrationFee: e.target.value })
                    }
                    placeholder="1000"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Price Preview */}
              {form.price && (
                <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    What user pays:
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">
                      First time (with reg. fee)
                    </span>
                    <span className="font-bold text-slate-800">
                      ₹
                      {(
                        parseFloat(form.price || "0") +
                        parseFloat(form.registrationFee || "0")
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Returning subscriber</span>
                    <span className="font-bold text-green-700">
                      ₹{parseFloat(form.price || "0").toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Description{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="e.g. Best value plan!"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600
                             bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !!isDuplicate}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600
                             rounded-lg hover:bg-blue-700 transition flex items-center
                             justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

// ── Plan Card ─────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  onEdit,
  onToggle,
}: {
  plan: SubscriptionPlan;
  onEdit: (plan: SubscriptionPlan) => void;
  onToggle: (publicId: string) => void;
}) {
  const monthLabel =
    plan.months === 1
      ? "1 Month"
      : plan.months === 12
        ? "1 Year"
        : `${plan.months} Months`;

  return (
    <div
      className={`relative bg-white rounded-xl border-2 p-4 transition ${
        plan.active
          ? "border-slate-200 hover:border-blue-200 hover:shadow-md"
          : "border-dashed border-slate-200 opacity-60"
      }`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`px-2 py-0.5 text-xs font-bold rounded-full ${
            plan.active
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {plan.active ? "Active" : "Disabled"}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(plan)}
            className="p-1.5 text-slate-400 hover:text-blue-600
                       hover:bg-blue-50 rounded-lg transition"
            title="Edit"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onToggle(plan.publicId)}
            className={`p-1.5 rounded-lg transition ${
              plan.active
                ? "text-green-600 hover:bg-green-50"
                : "text-slate-400 hover:bg-slate-100"
            }`}
            title={plan.active ? "Disable" : "Enable"}
          >
            {plan.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
        </div>
      </div>

      {/* Duration */}
      <p className="text-base font-bold text-slate-900">{monthLabel}</p>
      <p className="text-xs text-slate-500 mb-3">
        {plan.totalSessions} total sessions
      </p>

      {/* Pricing */}
      <div className="bg-slate-50 rounded-lg p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Plan price</span>
          <span className="text-lg font-bold text-blue-700">
            ₹{plan.price.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            + Reg. fee (first time)
          </span>
          <span className="text-xs font-medium text-slate-600">
            ₹{plan.registrationFee.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="border-t border-slate-200 pt-1 flex items-center justify-between">
          <span className="text-xs text-slate-500">First-time total</span>
          <span className="text-sm font-bold text-slate-700">
            ₹{(plan.price + plan.registrationFee).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {plan.description && (
        <p className="text-xs text-slate-500 mt-2 italic">{plan.description}</p>
      )}
    </div>
  );
}

export default SubscriptionPricingManager;
