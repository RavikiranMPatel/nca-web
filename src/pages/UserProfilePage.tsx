import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Lock,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";
import api from "../api/axios";
import { toast } from "react-hot-toast";

type Profile = {
  publicId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
};

function UserProfilePage() {
  const navigate = useNavigate();
  const { updateUserName } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    api
      .get("/users/me")
      .then((res) => {
        setProfile(res.data);
        setName(res.data.name || "");
        setPhone(res.data.phone || "");
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (phone && phone.length !== 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.put("/users/me", { name, phone });
      setProfile(res.data);
      setProfileSaved(true);
      toast.success("Profile updated!");
      setTimeout(() => setProfileSaved(false), 3000);

      // Update localStorage name so navbar reflects change
      updateUserName(res.data.name);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");

    if (newPassword === currentPassword) {
      setPasswordError(
        "New password must be different from your current password",
      );
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setSavingPassword(true);
    try {
      await api.put("/users/me/password", { currentPassword, newPassword });
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(
        err?.response?.data?.message || "Failed to change password",
      );
    } finally {
      setSavingPassword(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return null;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { label: "Weak", color: "bg-red-500", width: "25%" };
    if (score === 2)
      return { label: "Fair", color: "bg-amber-500", width: "50%" };
    if (score === 3)
      return { label: "Good", color: "bg-blue-500", width: "75%" };
    return { label: "Strong", color: "bg-green-500", width: "100%" };
  };

  const strength = getPasswordStrength(newPassword);

  if (loading) {
    return (
      <div className="flex justify-center mt-20">
        <div
          className="w-8 h-8 border-4 border-slate-200 border-t-blue-600
                        rounded-full animate-spin"
        />
      </div>
    );
  }

  if (!profile) return null;

  const isAdmin =
    profile.role === "ROLE_ADMIN" || profile.role === "ROLE_SUPER_ADMIN";

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full
                     bg-white border border-gray-200 text-gray-600 shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your account details
          </p>
        </div>
      </div>

      {/* Avatar + role badge */}
      <div
        className="bg-white rounded-2xl border border-slate-200 p-5
                      flex items-center gap-4"
      >
        <div
          className="w-16 h-16 rounded-full bg-blue-600 flex items-center
                        justify-center text-white text-2xl font-bold shrink-0"
        >
          {profile.name?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div>
          <p className="font-bold text-slate-900 text-lg">
            {profile.name || "—"}
          </p>
          <p className="text-sm text-slate-500">{profile.email}</p>
          <span
            className={`mt-1 inline-block text-xs px-2.5 py-0.5 rounded-full
                            font-semibold ${
                              isAdmin
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
          >
            {profile.role === "ROLE_SUPER_ADMIN"
              ? "Super Admin"
              : profile.role === "ROLE_ADMIN"
                ? "Admin"
                : "Member"}
          </span>
        </div>
      </div>

      {/* ── PERSONAL INFO ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={16} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800">Personal Information</h2>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
            Phone Number
          </label>
          <div
            className="flex items-center border border-slate-200 rounded-xl
                          focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden"
          >
            <div className="px-3 py-3 bg-slate-50 border-r border-slate-200">
              <Phone size={15} className="text-slate-400" />
            </div>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder=""
              className="flex-1 px-3 py-3 text-sm focus:outline-none"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Used for booking confirmations via WhatsApp
          </p>
        </div>

        {/* Email — read only */}
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
            Email Address
          </label>
          <div
            className="flex items-center border border-slate-100 rounded-xl
                          bg-slate-50 overflow-hidden"
          >
            <div className="px-3 py-3 border-r border-slate-200">
              <Mail size={15} className="text-slate-400" />
            </div>
            <input
              type="email"
              value={profile.email}
              disabled
              className="flex-1 px-3 py-3 text-sm text-slate-400
                         bg-slate-50 cursor-not-allowed"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm
                     font-semibold hover:bg-blue-700 transition
                     disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {savingProfile ? (
            <div
              className="w-4 h-4 border-2 border-white border-t-transparent
                            rounded-full animate-spin"
            />
          ) : profileSaved ? (
            <CheckCircle size={16} />
          ) : (
            <Save size={16} />
          )}
          {savingProfile ? "Saving…" : profileSaved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* ── CHANGE PASSWORD ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={16} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800">Change Password</h2>
        </div>

        {/* Current password */}
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
            Current Password
          </label>
          <div
            className="flex items-center border border-slate-200 rounded-xl
                          focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden"
          >
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="flex-1 px-4 py-3 text-sm focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((p) => !p)}
              className="px-3 text-slate-400 hover:text-slate-600"
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* New password */}
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
            New Password
          </label>
          <div
            className="flex items-center border border-slate-200 rounded-xl
                          focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden"
          >
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="flex-1 px-4 py-3 text-sm focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowNew((p) => !p)}
              className="px-3 text-slate-400 hover:text-slate-600"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Strength bar */}
          {strength && (
            <div className="mt-2">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all ${strength.color}`}
                  style={{ width: strength.width }}
                />
              </div>
              <p
                className={`text-xs mt-1 font-medium ${
                  strength.label === "Weak"
                    ? "text-red-500"
                    : strength.label === "Fair"
                      ? "text-amber-500"
                      : strength.label === "Good"
                        ? "text-blue-500"
                        : "text-green-500"
                }`}
              >
                {strength.label}
              </p>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
            Confirm New Password
          </label>
          <div
            className={`flex items-center border rounded-xl overflow-hidden
                           focus-within:ring-2 focus-within:ring-blue-500 ${
                             confirmPassword && confirmPassword !== newPassword
                               ? "border-red-300"
                               : confirmPassword &&
                                   confirmPassword === newPassword
                                 ? "border-green-300"
                                 : "border-slate-200"
                           }`}
          >
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="flex-1 px-4 py-3 text-sm focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((p) => !p)}
              className="px-3 text-slate-400 hover:text-slate-600"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confirmPassword && confirmPassword === newPassword && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <CheckCircle size={11} /> Passwords match
            </p>
          )}
        </div>

        {passwordError && (
          <div
            className="bg-red-50 border border-red-200 rounded-xl px-4 py-3
                          text-sm text-red-700"
          >
            {passwordError}
          </div>
        )}

        <button
          onClick={handleChangePassword}
          disabled={savingPassword}
          className="w-full py-3 bg-slate-800 text-white rounded-xl text-sm
                     font-semibold hover:bg-slate-900 transition
                     disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {savingPassword ? (
            <div
              className="w-4 h-4 border-2 border-white border-t-transparent
                            rounded-full animate-spin"
            />
          ) : (
            <Lock size={16} />
          )}
          {savingPassword ? "Changing…" : "Change Password"}
        </button>
      </div>

      {/* ── QUICK LINKS ───────────────────────────────────────────────── */}
      {!isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Quick Links
          </p>
          <button
            onClick={() => navigate("/my-bookings")}
            className="w-full flex items-center justify-between px-4 py-3
                       rounded-xl hover:bg-slate-50 transition border border-slate-100"
          >
            <span className="text-sm font-medium text-slate-700">
              📅 My Bookings
            </span>
            <ArrowLeft size={14} className="text-slate-400 rotate-180" />
          </button>
          <button
            onClick={() => navigate("/my-subscription")}
            className="w-full flex items-center justify-between px-4 py-3
                       rounded-xl hover:bg-slate-50 transition border border-slate-100"
          >
            <span className="text-sm font-medium text-slate-700">
              🏏 My Subscription
            </span>
            <ArrowLeft size={14} className="text-slate-400 rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}

export default UserProfilePage;
