import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../auth/useAuth";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  ChevronRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserFormData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
};

type RoleOption = {
  value: string;
  label: string;
  description: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
};

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLES: RoleOption[] = [
  {
    value: "ROLE_PLAYER",
    label: "Player",
    description: "Can view schedule & personal stats",
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    dotColor: "bg-emerald-600",
  },
  {
    value: "ROLE_USER",
    label: "User",
    description: "Basic access — parent / guardian",
    textColor: "text-sky-700",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-300",
    dotColor: "bg-sky-600",
  },
  {
    value: "ROLE_ADMIN",
    label: "Admin",
    description: "Manage players, batches & bookings",
    textColor: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-300",
    dotColor: "bg-violet-600",
  },
  {
    value: "ROLE_SUPER_ADMIN",
    label: "Super Admin",
    description: "Full access including settings & users",
    textColor: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-300",
    dotColor: "bg-rose-600",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

function UserFormPage() {
  const navigate = useNavigate();
  const { publicId } = useParams<{ publicId: string }>();
  const isEdit = Boolean(publicId);

  // Guard: only SUPER_ADMIN should ever reach this page.
  // ProtectedRoute in App.tsx already blocks it at the route level,
  // but this is a second layer of safety.
  const { userRole, branchId } = useAuth();
  useEffect(() => {
    if (userRole && userRole !== "ROLE_SUPER_ADMIN") {
      navigate("/admin", { replace: true });
    }
  }, [userRole]);

  const [form, setForm] = useState<UserFormData>({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "ROLE_USER",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const [touched, setTouched] = useState<
    Partial<Record<keyof UserFormData, boolean>>
  >({});

  // ── Validation ──────────────────────────────────────────────────────────────
  const errors: Partial<Record<keyof UserFormData, string>> = {};
  if (touched.name && !form.name.trim()) errors.name = "Name is required";
  if (touched.email) {
    if (!form.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = "Enter a valid email";
  }
  if (touched.phone && form.phone && !/^\d{10}$/.test(form.phone))
    errors.phone = "Enter a valid 10-digit number";
  if (!isEdit && touched.password) {
    if (!form.password) errors.password = "Password is required";
    else if (form.password.length < 6) errors.password = "Minimum 6 characters";
  }

  const isFormValid =
    !!form.name.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    (isEdit || form.password.length >= 6) &&
    (!form.phone || /^\d{10}$/.test(form.phone));

  // ── Load user for edit ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/admin/users/${encodeURIComponent(publicId!)}`)
      .then((res) => {
        const u = res.data;
        setForm({
          name: u.name ?? "",
          email: u.email ?? "",
          phone: u.phone ?? "",
          password: "",
          role: u.role ?? "ROLE_USER",
        });
      })
      .catch(() => showToast("Failed to load user", "error"))
      .finally(() => setLoading(false));
  }, [publicId]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const touch = (field: keyof UserFormData) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const change = (field: keyof UserFormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setTouched({ name: true, email: true, phone: true, password: true });
    if (!isFormValid) return;

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/admin/users/${encodeURIComponent(publicId!)}`, {
          name: form.name,
          phone: form.phone,
          role: form.role,
        });
        showToast("User updated successfully", "success");
      } else {
        await api.post("/admin/users", {
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: form.role,
          branchId: branchId,
        });
        showToast("User created successfully", "success");
      }
      setTimeout(() => navigate("/admin/users"), 1000);
    } catch (e: any) {
      showToast(
        e?.response?.data?.message ??
          (isEdit ? "Update failed" : "Create failed"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const selectedRole = ROLES.find((r) => r.value === form.role)!;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/users")}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition"
          >
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-slate-900 truncate">
              {isEdit ? "Edit User" : "New User"}
            </h1>
            {isEdit && (
              <p className="text-xs text-slate-500 font-mono truncate">
                {publicId}
              </p>
            )}
          </div>
          {/* Desktop save button */}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </header>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border whitespace-nowrap ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-red-600 shrink-0" />
          )}
          {toast.msg}
        </div>
      )}

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 pb-28 space-y-5">
        {/* Basic info card */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Basic Info
            </p>
          </div>

          <FieldRow
            icon={<User size={17} />}
            label="Full Name"
            error={errors.name}
          >
            <input
              type="text"
              placeholder="Enter full name"
              value={form.name}
              onChange={(e) => change("name", e.target.value)}
              onBlur={() => touch("name")}
              className={inputCls(!!errors.name)}
            />
          </FieldRow>

          <FieldRow
            icon={<Mail size={17} />}
            label="Email"
            error={errors.email}
            divider
          >
            <input
              type="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={(e) => change("email", e.target.value)}
              onBlur={() => touch("email")}
              disabled={isEdit}
              className={inputCls(!!errors.email, isEdit)}
            />
            {isEdit && (
              <p className="mt-1 text-xs text-slate-400">
                Email cannot be changed after creation
              </p>
            )}
          </FieldRow>

          <FieldRow
            icon={<Phone size={17} />}
            label="Phone"
            optional
            error={errors.phone}
            divider
          >
            <input
              type="tel"
              placeholder="10-digit mobile number"
              value={form.phone}
              onChange={(e) =>
                change("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              onBlur={() => touch("phone")}
              className={inputCls(!!errors.phone)}
            />
          </FieldRow>

          {/* Password — create only */}
          {!isEdit && (
            <FieldRow
              icon={<Lock size={17} />}
              label="Password"
              error={errors.password}
              divider
            >
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={(e) => change("password", e.target.value)}
                  onBlur={() => touch("password")}
                  className={inputCls(!!errors.password) + " pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FieldRow>
          )}
        </section>

        {/* Role card */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center gap-2">
            <Shield size={15} className="text-slate-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Role & Permissions
            </p>
          </div>

          <div className="px-4 pb-4 space-y-2">
            {ROLES.map((r) => {
              const isSelected = form.role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => change("role", r.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? `${r.bgColor} ${r.borderColor} shadow-sm`
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {/* Radio dot */}
                  <span
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? r.borderColor : "border-slate-300"
                    }`}
                  >
                    {isSelected && (
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${r.dotColor}`}
                      />
                    )}
                  </span>

                  <span className="flex-1 min-w-0">
                    <span
                      className={`block text-sm font-semibold ${
                        isSelected ? r.textColor : "text-slate-700"
                      }`}
                    >
                      {r.label}
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      {r.description}
                    </span>
                  </span>

                  {isSelected && (
                    <CheckCircle2 size={18} className={r.textColor} />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Selected role summary */}
        <div
          className={`flex items-start gap-2 px-4 py-3 rounded-xl ${selectedRole.bgColor} border ${selectedRole.borderColor}`}
        >
          <Shield
            size={15}
            className={`${selectedRole.textColor} mt-0.5 shrink-0`}
          />
          <span className={`text-xs font-medium ${selectedRole.textColor}`}>
            This user will be assigned <strong>{selectedRole.label}</strong>{" "}
            role — {selectedRole.description.toLowerCase()}
          </span>
        </div>
      </main>

      {/* ── Mobile sticky bottom bar ────────────────────────────────────────── */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-4 py-3">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-200"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isEdit ? (
            <>
              Save Changes <ChevronRight size={18} />
            </>
          ) : (
            <>
              Create User <ChevronRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldRow({
  icon,
  label,
  optional,
  error,
  divider,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  optional?: boolean;
  error?: string;
  divider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={divider ? "border-t border-slate-100" : ""}>
      <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
        <span className="text-slate-400">{icon}</span>
        <label className="text-xs font-medium text-slate-500">{label}</label>
        {optional && (
          <span className="text-xs text-slate-400 ml-auto">Optional</span>
        )}
      </div>
      <div className="px-4 pb-3">
        {children}
        {error && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        )}
      </div>
    </div>
  );
}

function inputCls(hasError: boolean, disabled = false): string {
  return [
    "w-full px-3 py-2.5 rounded-lg border text-sm transition-all outline-none",
    hasError
      ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50"
      : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white",
    disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default UserFormPage;
