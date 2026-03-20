import { useEffect, useState } from "react";
import {
  Plus,
  Building2,
  Phone,
  MapPin,
  Mail,
  Star,
  X,
  Loader2,
  CheckCircle,
  PowerOff,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  getAdminBranches,
  createBranch,
  toggleBranchActive,
  type Branch,
} from "../../api/branch.api";
import PresenceBanner from "../../components/PresenceBanner";
import { useAuth } from "../../auth/useAuth";

// ── Create Branch Modal ───────────────────────────────────────────────────────

type CreateModalProps = {
  onClose: () => void;
  onCreated: (branch: Branch) => void;
};

function CreateBranchModal({ onClose, onCreated }: CreateModalProps) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    email: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [loading, setLoading] = useState(false);

  const set =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setErrors((err) => ({ ...err, [field]: undefined }));
    };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const autoCode = name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 8);
    setForm((f) => ({
      ...f,
      name,
      code:
        f.code === "" ||
        f.code ===
          f.name
            .split(" ")
            .filter(Boolean)
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 8)
          ? autoCode
          : f.code,
    }));
    setErrors((err) => ({ ...err, name: undefined }));
  };

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.code.trim()) e.code = "Required";
    if (form.code.trim().length > 10) e.code = "Max 10 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const branch = await createBranch({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      toast.success(`Branch "${branch.name}" created`);
      onCreated(branch);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create branch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">New Branch</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch Name *
            </label>
            <input
              value={form.name}
              onChange={handleNameChange}
              placeholder="e.g. JP Nagar Branch"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                errors.name ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch Code *
            </label>
            <input
              value={form.code}
              onChange={set("code")}
              placeholder="e.g. JPN"
              maxLength={10}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                errors.code ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.code ? (
              <p className="text-red-500 text-xs mt-1">{errors.code}</p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                Used for IDs — max 10 characters
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                value={form.address}
                onChange={set("address")}
                placeholder="Branch address"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                value={form.phone}
                onChange={set("phone")}
                placeholder="Branch phone"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="branch@academy.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle size={15} />
                  Create Branch
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Branches Tab ──────────────────────────────────────────────────────────────

export default function BranchesTab() {
  const { academyId } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const data = await getAdminBranches();
      setBranches(data);
    } catch {
      toast.error("Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (branch: Branch) => {
    if (branch.isMainBranch && branch.active) {
      toast.error("Cannot disable the main branch");
      return;
    }
    setTogglingId(branch.id);
    try {
      const updated = await toggleBranchActive(branch.id);
      setBranches((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b)),
      );
      toast.success(
        updated.active
          ? `"${updated.name}" enabled`
          : `"${updated.name}" disabled`,
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update branch");
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading branches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PresenceBanner entity="branches-tab" id={academyId ?? undefined} />{" "}
      {/* Tab Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Branches</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {branches.length} branch{branches.length !== 1 ? "es" : ""}{" "}
            configured
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
        >
          <Plus size={15} />
          Add Branch
        </button>
      </div>
      {/* Branch cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {branches.map((branch) => (
          <div
            key={branch.id}
            className={`bg-slate-50 rounded-xl border p-4 transition-all ${
              branch.active ? "border-slate-200" : "border-slate-200 opacity-60"
            }`}
          >
            {/* Card Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    branch.active
                      ? "bg-blue-100 text-blue-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <Building2 size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 text-sm">
                      {branch.name}
                    </h3>
                    {branch.isMainBranch && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                        <Star size={9} />
                        Main
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {branch.publicId}
                  </span>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                  branch.active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {branch.active ? "Active" : "Inactive"}
              </span>
            </div>

            {/* Details */}
            <div className="space-y-1.5 mb-3">
              {branch.address && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">{branch.address}</span>
                </div>
              )}
              {branch.phone && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Phone size={11} className="text-slate-400 flex-shrink-0" />
                  <span>{branch.phone}</span>
                </div>
              )}
              {branch.email && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Mail size={11} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">{branch.email}</span>
                </div>
              )}
              {!branch.address && !branch.phone && !branch.email && (
                <p className="text-xs text-slate-400 italic">
                  No contact details added
                </p>
              )}
            </div>

            {/* Toggle — hidden for main branch */}
            {!branch.isMainBranch && (
              <button
                onClick={() => handleToggleActive(branch)}
                disabled={togglingId === branch.id}
                className={`w-full py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                  branch.active
                    ? "border border-red-200 text-red-600 hover:bg-red-50"
                    : "border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                } disabled:opacity-50`}
              >
                {togglingId === branch.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <PowerOff size={12} />
                )}
                {branch.active ? "Disable Branch" : "Enable Branch"}
              </button>
            )}
          </div>
        ))}
      </div>
      {/* Empty state */}
      {branches.length === 0 && (
        <div className="border border-dashed border-slate-300 rounded-xl p-10 text-center">
          <Building2 size={36} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-600 mb-1">
            No branches yet
          </h3>
          <p className="text-slate-400 text-xs mb-4">
            Add your first branch to get started
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
          >
            <Plus size={13} />
            Add Branch
          </button>
        </div>
      )}
      {showModal && (
        <CreateBranchModal
          onClose={() => setShowModal(false)}
          onCreated={(branch) => {
            setBranches((prev) => [...prev, branch]);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
