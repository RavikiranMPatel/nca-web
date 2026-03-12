import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  User,
  Building2,
  Mail,
  Phone,
  Shield,
  X,
  Loader2,
  CheckCircle,
  PowerOff,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  getAdminUsers,
  createAdminUser,
  toggleAdminActive,
  getAdminBranches,
  type AdminUser,
  type Branch,
} from "../api/branch.api";

// ── Create Admin Modal ────────────────────────────────────────────────────────

type CreateModalProps = {
  branches: Branch[];
  onClose: () => void;
  onCreated: (user: AdminUser) => void;
};

function CreateAdminModal({ branches, onClose, onCreated }: CreateModalProps) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    branchId: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setErrors((err) => ({ ...err, [field]: undefined }));
    };

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    if (!form.password) e.password = "Required";
    else if (form.password.length < 8) e.password = "Minimum 8 characters";
    if (!form.branchId) e.branchId = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const user = await createAdminUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        branchId: form.branchId,
      });
      toast.success(`Admin "${user.name}" created`);
      onCreated(user);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create admin");
    } finally {
      setLoading(false);
    }
  };

  const activeBranches = branches.filter((b) => b.active);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <User size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">New Admin</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="Admin's full name"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                errors.name ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="admin@academy.com"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                errors.email ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                placeholder="Min 8 chars, uppercase, number, symbol"
                className={`w-full border rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  errors.password
                    ? "border-red-400 bg-red-50"
                    : "border-gray-300"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              value={form.phone}
              onChange={set("phone")}
              placeholder="Admin's phone number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign Branch *
            </label>
            <select
              value={form.branchId}
              onChange={set("branchId")}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                errors.branchId ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            >
              <option value="">Select a branch</option>
              {activeBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.branchId ? (
              <p className="text-red-500 text-xs mt-1">{errors.branchId}</p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                This admin will only see data for the selected branch
              </p>
            )}
          </div>

          {/* Actions */}
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
                  Create Admin
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ManageUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, branchesData] = await Promise.all([
        getAdminUsers(),
        getAdminBranches(),
      ]);
      // Show only admins and super admins — filter out ROLE_USER players
      setUsers(
        usersData.filter((u) =>
          ["ROLE_ADMIN", "ROLE_SUPER_ADMIN"].includes(u.role),
        ),
      );
      setBranches(branchesData);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const getBranchName = (branchId: string) =>
    branches.find((b) => b.id === branchId)?.name ?? "—";

  const handleToggleActive = async (user: AdminUser) => {
    setTogglingId(user.publicId);
    try {
      const updated = await toggleAdminActive(user.publicId); // ✅ uses publicId
      setUsers((prev) =>
        prev.map((u) =>
          u.publicId === user.publicId ? { ...u, active: updated.active } : u,
        ),
      );
      toast.success(
        updated.active ? `"${user.name}" enabled` : `"${user.name}" disabled`,
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update user");
    } finally {
      setTogglingId(null);
    }
  };

  const roleLabel = (role: string) => {
    if (role === "ROLE_SUPER_ADMIN") return "Super Admin";
    if (role === "ROLE_ADMIN") return "Admin";
    return role;
  };

  const roleBadgeClass = (role: string) =>
    role === "ROLE_SUPER_ADMIN"
      ? "bg-purple-100 text-purple-700"
      : "bg-blue-100 text-blue-700";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Admin Users
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {users.length} user{users.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
          >
            <Plus size={16} />
            Add Admin
          </button>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr
                  key={user.publicId}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-blue-600">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {user.name}
                        </p>
                        {user.phone && (
                          <p className="text-xs text-slate-400">{user.phone}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Building2 size={13} className="text-slate-400" />
                      {getBranchName(user.branchId)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${roleBadgeClass(user.role)}`}
                    >
                      <Shield size={10} />
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        user.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {user.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user.role !== "ROLE_SUPER_ADMIN" && (
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={togglingId === user.publicId}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          user.active
                            ? "border border-red-200 text-red-600 hover:bg-red-50"
                            : "border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        } disabled:opacity-50`}
                      >
                        {togglingId === user.publicId ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <PowerOff size={12} />
                        )}
                        {user.active ? "Disable" : "Enable"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {users.map((user) => (
            <div
              key={user.publicId}
              className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 ${!user.active ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{user.name}</p>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${roleBadgeClass(user.role)}`}
                    >
                      <Shield size={9} />
                      {roleLabel(user.role)}
                    </span>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    user.active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {user.active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="space-y-1.5 mb-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-slate-400" />
                  {user.email}
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-slate-400" />
                    {user.phone}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Building2 size={13} className="text-slate-400" />
                  {getBranchName(user.branchId)}
                </div>
              </div>

              {user.role !== "ROLE_SUPER_ADMIN" && (
                <button
                  onClick={() => handleToggleActive(user)}
                  disabled={togglingId === user.publicId}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                    user.active
                      ? "border border-red-200 text-red-600 hover:bg-red-50"
                      : "border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                  } disabled:opacity-50`}
                >
                  {togglingId === user.publicId ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <PowerOff size={14} />
                  )}
                  {user.active ? "Disable" : "Enable"}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Empty state */}
        {users.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <User size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No admins yet
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              Create your first branch admin to get started
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <Plus size={16} />
              Add Admin
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <CreateAdminModal
          branches={branches}
          onClose={() => setShowModal(false)}
          onCreated={(user) => {
            setUsers((prev) => [...prev, user]);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
