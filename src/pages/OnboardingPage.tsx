import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { onboardingSetupApi } from "../api/auth.api";
import toast from "react-hot-toast";
import {
  Building2,
  User,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

type BranchInput = {
  name: string;
  address: string;
  phone: string;
};

type FormData = {
  academyName: string;
  academyCode: string;
  city: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
};

type BranchErrors = {
  name?: string;
};

const INITIAL: FormData = {
  academyName: "",
  academyCode: "",
  city: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  confirmPassword: "",
};

const EMPTY_BRANCH: BranchInput = { name: "", address: "", phone: "" };

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [branches, setBranches] = useState<BranchInput[]>([
    { ...EMPTY_BRANCH },
  ]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [branchErrors, setBranchErrors] = useState<BranchErrors[]>([{}]);

  const { login } = useAuth();
  const navigate = useNavigate();

  const set =
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setErrors((err) => ({ ...err, [field]: undefined }));
    };

  // Auto-generate academy code from name initials
  const handleAcademyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const autoCode = name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 6);
    setForm((f) => ({
      ...f,
      academyName: name,
      academyCode:
        f.academyCode === "" || f.academyCode === generateCode(f.academyName)
          ? autoCode
          : f.academyCode,
    }));
    setErrors((err) => ({ ...err, academyName: undefined }));
  };

  const generateCode = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 6);

  // ── Branch helpers ────────────────────────────────────

  const updateBranch = (
    index: number,
    field: keyof BranchInput,
    value: string,
  ) => {
    setBranches((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    );
    if (field === "name") {
      setBranchErrors((prev) =>
        prev.map((e, i) => (i === index ? { ...e, name: undefined } : e)),
      );
    }
  };

  const addBranch = () => {
    setBranches((prev) => [...prev, { ...EMPTY_BRANCH }]);
    setBranchErrors((prev) => [...prev, {}]);
  };

  const removeBranch = (index: number) => {
    // index 0 = main branch, cannot be removed
    if (index === 0) return;
    setBranches((prev) => prev.filter((_, i) => i !== index));
    setBranchErrors((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Validation ────────────────────────────────────────

  const validateStep1 = () => {
    const e: Partial<FormData> = {};
    if (!form.academyName.trim()) e.academyName = "Required";
    if (!form.academyCode.trim()) e.academyCode = "Required";
    if (form.academyCode.trim().length > 10)
      e.academyCode = "Max 10 characters";

    // Validate all branch names
    const be: BranchErrors[] = branches.map((b) => ({
      name: !b.name.trim() ? "Branch name is required" : undefined,
    }));
    const hasBranchError = be.some((b) => b.name);

    setErrors(e);
    setBranchErrors(be);

    return Object.keys(e).length === 0 && !hasBranchError;
  };

  const validateStep2 = () => {
    const e: Partial<FormData> = {};
    if (!form.adminName.trim()) e.adminName = "Required";
    if (!form.adminEmail.trim()) e.adminEmail = "Required";
    else if (!/\S+@\S+\.\S+/.test(form.adminEmail))
      e.adminEmail = "Invalid email";
    if (!form.adminPassword) e.adminPassword = "Required";
    else if (form.adminPassword.length < 8)
      e.adminPassword = "Minimum 8 characters";
    if (form.adminPassword !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    try {
      const res = await onboardingSetupApi({
        academyName: form.academyName.trim(),
        academyCode: form.academyCode.trim().toUpperCase(),
        city: form.city.trim(),
        branches: branches.map((b) => ({
          name: b.name.trim(),
          address: b.address.trim(),
          phone: b.phone.trim(),
        })),
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim().toLowerCase(),
        adminPassword: form.adminPassword,
      });

      login({
        token: res.token,
        role: res.role,
        userName: res.userName,
        userEmail: res.userEmail,
        userPublicId: res.userPublicId,
        academyId: res.academyId,
        academyName: res.academyName,
        branchId: res.branchId,
        branchName: res.branchName,
      });

      toast.success(`Welcome to ${res.academyName}! Setup complete.`);
      navigate("/admin");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Setup failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const field = (
    label: string,
    key: keyof FormData,
    opts?: {
      type?: string;
      placeholder?: string;
      hint?: string;
      maxLength?: number;
      onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    },
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={opts?.type || "text"}
        maxLength={opts?.maxLength}
        placeholder={opts?.placeholder}
        value={form[key]}
        onChange={opts?.onChange || set(key)}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
          errors[key] ? "border-red-400 bg-red-50" : "border-gray-300"
        }`}
      />
      {opts?.hint && !errors[key] && (
        <p className="text-xs text-gray-400 mt-1">{opts.hint}</p>
      )}
      {errors[key] && (
        <p className="text-red-500 text-xs mt-1">{errors[key]}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-200">
            <Building2 className="text-white" size={30} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Academy Setup</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Get your cricket academy running in under 2 minutes
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[
            { n: 1, label: "Academy & Branches" },
            { n: 2, label: "Admin Account" },
          ].map(({ n, label }, i) => (
            <div key={n} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-12 transition-all duration-300 ${step >= n ? "bg-blue-500" : "bg-gray-200"}`}
                />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300 ${
                    step > n
                      ? "bg-blue-600 border-blue-600 text-white"
                      : step === n
                        ? "border-blue-600 text-blue-600 bg-white"
                        : "border-gray-300 text-gray-400 bg-white"
                  }`}
                >
                  {step > n ? <CheckCircle size={14} /> : n}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:block transition-colors ${step >= n ? "text-gray-800" : "text-gray-400"}`}
                >
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800">
                  Academy Details
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Basic information about your cricket academy
                </p>
              </div>

              <div className="space-y-4">
                {field("Academy Name *", "academyName", {
                  placeholder: "e.g. NextGen Cricket Academy",
                  onChange: handleAcademyNameChange,
                })}

                <div className="grid grid-cols-2 gap-4">
                  {field("Academy Code *", "academyCode", {
                    placeholder: "e.g. NCA",
                    maxLength: 10,
                    hint: "Used for player IDs, e.g. PLY-NCA-001",
                  })}
                  {field("City", "city", { placeholder: "e.g. Mysuru" })}
                </div>

                {/* ── BRANCHES ── */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-gray-500" />
                      <span className="text-sm font-semibold text-gray-700">
                        Branches
                      </span>
                      <span className="text-xs text-gray-400">
                        ({branches.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={addBranch}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition"
                    >
                      <Plus size={13} />
                      Add Branch
                    </button>
                  </div>

                  <div className="space-y-3">
                    {branches.map((branch, index) => (
                      <div
                        key={index}
                        className={`rounded-xl border p-4 transition ${
                          index === 0
                            ? "border-blue-200 bg-blue-50/40"
                            : "border-gray-200 bg-gray-50/40"
                        }`}
                      >
                        {/* Branch header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-600">
                              {index === 0
                                ? "Main Branch"
                                : `Branch ${index + 1}`}
                            </span>
                            {index === 0 && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                Primary
                              </span>
                            )}
                          </div>
                          {index !== 0 && (
                            <button
                              type="button"
                              onClick={() => removeBranch(index)}
                              className="text-gray-400 hover:text-red-500 transition p-1 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        {/* Branch name */}
                        <div className="mb-3">
                          <input
                            type="text"
                            value={branch.name}
                            onChange={(e) =>
                              updateBranch(index, "name", e.target.value)
                            }
                            placeholder={
                              index === 0
                                ? "e.g. Bogadi Branch"
                                : "e.g. Vijayanagar Branch"
                            }
                            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                              branchErrors[index]?.name
                                ? "border-red-400 bg-red-50"
                                : "border-gray-300 bg-white"
                            }`}
                          />
                          {branchErrors[index]?.name && (
                            <p className="text-red-500 text-xs mt-1">
                              {branchErrors[index].name}
                            </p>
                          )}
                        </div>

                        {/* Address & Phone */}
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={branch.address}
                            onChange={(e) =>
                              updateBranch(index, "address", e.target.value)
                            }
                            placeholder="Address"
                            className="w-full border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                          />
                          <input
                            type="text"
                            value={branch.phone}
                            onChange={(e) =>
                              updateBranch(index, "phone", e.target.value)
                            }
                            placeholder="Phone"
                            className="w-full border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="mt-8 w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                Next: Admin Account
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800">
                  Admin Account
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Your Super Admin login credentials
                </p>
              </div>

              <div className="space-y-4">
                {field("Full Name *", "adminName", {
                  placeholder: "Your full name",
                })}
                {field("Email Address *", "adminEmail", {
                  type: "email",
                  placeholder: "admin@youracademy.com",
                })}
                {field("Password *", "adminPassword", {
                  type: "password",
                  placeholder: "Min 8 chars, uppercase, number, symbol",
                })}
                {field("Confirm Password *", "confirmPassword", {
                  type: "password",
                  placeholder: "Repeat your password",
                })}
              </div>

              {/* Setup summary */}
              <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm space-y-2">
                <p className="font-semibold text-blue-800 text-xs uppercase tracking-wide mb-2">
                  Setting up
                </p>
                <div className="flex items-center gap-2 text-blue-700">
                  <Building2 size={13} />
                  <span>
                    {form.academyName}{" "}
                    <span className="text-blue-400">
                      ({form.academyCode.toUpperCase()})
                    </span>
                  </span>
                </div>
                {branches.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-blue-700"
                  >
                    <User size={13} className={i === 0 ? "" : "opacity-50"} />
                    <span>
                      {b.name || (
                        <span className="text-blue-300 italic">
                          Unnamed branch
                        </span>
                      )}
                      {i === 0 && (
                        <span className="text-blue-400 text-xs ml-1">
                          (main)
                        </span>
                      )}
                      {form.city && i === 0 ? `, ${form.city}` : ""}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={18} />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Complete Setup
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Already set up?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Go to Login
          </a>
        </p>
      </div>
    </div>
  );
}
