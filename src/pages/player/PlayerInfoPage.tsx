import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { User, Power, Check, X } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import { togglePlayerStatus } from "../../api/playerService/playerService";
import PlayerStatusToggleModal from "../../components/player/PlayerStatusToggleModal";
import { getImageUrl } from "../../utils/imageUrl";

type PlayerInfo = {
  displayName: string;
  photoUrl?: string;
  kscaId: string;
  dob: string;
  fatherName: string;
  motherName: string;
  address: string;
  phone: string;
  parentsPhone: string;
  email: string;
  aadharNumber: string;
  gender: string;
  profession: string;
  batch: string;
  schoolOrCollege: string;
  skillLevel: string;
  battingStyle: string;
  bowlingStyle: string;
  previousRepresentation: string;
  joiningDate: string;
  notes: string;
  active: boolean;
  status: string;
};

// ── Account Access Section ────────────────────────────────────────

function AccountAccessSection({
  playerPublicId,
  playerEmail,
}: {
  playerPublicId: string;
  playerEmail?: string;
}) {
  const role = localStorage.getItem("userRole");
  const isAdminOrSuper = role === "ROLE_ADMIN" || role === "ROLE_SUPER_ADMIN";

  const [account, setAccount] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [email, setEmail] = useState(playerEmail || "");
  const [password, setPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAccount();
  }, [playerPublicId]);

  const loadAccount = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/players/${playerPublicId}/account`);
      setAccount(res.data);
    } catch {
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/admin/players/${playerPublicId}/create-account`, {
        email: email.trim(),
        password,
      });
      toast.success("Account created & credentials sent via WhatsApp!");
      setShowCreate(false);
      setPassword("");
      loadAccount();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create account");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (resetPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/admin/players/${playerPublicId}/account/reset-password`, {
        password: resetPassword,
      });
      toast.success("Password reset & sent via WhatsApp!");
      setShowReset(false);
      setResetPassword("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reset password");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdminOrSuper) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Account Access</h2>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          Checking account...
        </div>
      ) : account?.exists ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm flex-shrink-0">
              ✓
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">
                Login account active
              </p>
              <p className="text-xs text-green-600">{account.email}</p>
            </div>
            <span
              className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                account.active
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {account.active ? "ACTIVE" : "DISABLED"}
            </span>
          </div>

          {!showReset ? (
            <button
              onClick={() => setShowReset(true)}
              className="text-sm text-blue-600 font-medium hover:text-blue-700"
            >
              Reset Password
            </button>
          ) : (
            <div className="space-y-3 bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">
                Reset Password
              </p>
              <input
                type="text"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="New password (min 6 chars)"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500">
                New password will be sent via WhatsApp to the player.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Reset & Send"}
                </button>
                <button
                  onClick={() => {
                    setShowReset(false);
                    setResetPassword("");
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-sm flex-shrink-0">
              ?
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                No login account yet
              </p>
              <p className="text-xs text-slate-400">
                Player cannot access the coaching view
              </p>
            </div>
          </div>

          {!showCreate ? (
            <button
              onClick={() => {
                setEmail(playerEmail || "");
                setShowCreate(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
            >
              + Create Player Login
            </button>
          ) : (
            <div className="space-y-3 bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">
                Create Login Account
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player@email.com"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Temporary Password *
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-slate-500">
                Credentials will be sent via WhatsApp to the player's phone
                number.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create & Send"}
                </button>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setPassword("");
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

function PlayerInfoPage() {
  const { playerPublicId } = useParams();

  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [toggling, setToggling] = useState(false);

  const role = localStorage.getItem("userRole");
  const isSuperAdmin = role === "ROLE_SUPER_ADMIN";

  useEffect(() => {
    loadPlayerInfo();
  }, [playerPublicId]);

  const loadPlayerInfo = async () => {
    try {
      const res = await api.get(`/admin/players/${playerPublicId}/info`);
      setPlayer(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (reason: string) => {
    if (!playerPublicId) return;
    setToggling(true);
    try {
      const response = await togglePlayerStatus(playerPublicId, reason);
      toast.success(response.message);
      setPlayer((prev) =>
        prev
          ? { ...prev, active: response.active, status: response.status }
          : null,
      );
      setShowToggleModal(false);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to update player status",
      );
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-500">
        Loading player info...
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-10 text-gray-500">Player not found</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* STATUS BANNER */}
      {!player.active && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <X className="text-red-600" size={24} />
            <div>
              <p className="font-semibold text-red-800">Player Inactive</p>
              <p className="text-sm text-red-600">
                This player is currently disabled and won't appear in attendance
                or bookings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PLAYER PHOTO & STATUS */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="relative">
            {player.photoUrl ? (
              <img
                src={getImageUrl(player.photoUrl) || undefined}
                alt={player.displayName}
                className="w-40 h-40 rounded-full object-cover border-4 border-blue-500"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove(
                    "hidden",
                  );
                }}
              />
            ) : null}
            <div
              className={`w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300 ${player.photoUrl ? "hidden" : ""}`}
            >
              <User size={64} className="text-gray-400" />
            </div>
            <div
              className={`absolute bottom-2 right-2 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${player.active ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
            >
              {player.active ? (
                <div className="flex items-center gap-1">
                  <Check size={12} /> Active
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <X size={12} /> Inactive
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-gray-900">
              {player.displayName}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Status: <span className="font-medium">{player.status}</span>
            </p>
            {isSuperAdmin && (
              <button
                onClick={() => setShowToggleModal(true)}
                className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  player.active
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
              >
                <Power size={18} />
                {player.active ? "Disable Player" : "Enable Player"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PERSONAL INFO */}
      <Section title="Personal Information">
        <Field label="Full Name" value={player.displayName} />
        <Field label="Aadhar" value={player.aadharNumber} />
        <Field label="DOB" value={player.dob} />
        <Field label="Gender" value={player.gender} />
        <Field label="Father Name" value={player.fatherName} />
        <Field label="Mother Name" value={player.motherName} />
        <Field label="Phone" value={player.phone} />
        <Field label="Parents Phone" value={player.parentsPhone} />
        <Field label="Email" value={player.email} />
        <Field label="Address" value={player.address} full />
      </Section>

      {/* ACADEMY INFO */}
      <Section title="Academy Information">
        <Field label="Profession" value={player.profession} />
        <Field label="Batch" value={player.batch} />
        <Field label="School / College" value={player.schoolOrCollege} />
        <Field label="Joining Date" value={player.joiningDate} />
      </Section>

      {/* CRICKET INFO */}
      <Section title="Cricket Profile">
        <Field label="KSCA ID" value={player.kscaId} />
        <Field label="Skill Level" value={player.skillLevel} />
        <Field label="Batting Style" value={player.battingStyle} />
        <Field label="Bowling Style" value={player.bowlingStyle} />
        <Field
          label="Previous Representation"
          value={player.previousRepresentation}
          full
        />
      </Section>

      {/* NOTES */}
      {player.notes && (
        <Section title="Notes">
          <p className="text-sm text-gray-700 whitespace-pre-line col-span-2">
            {player.notes}
          </p>
        </Section>
      )}

      {/* ACCOUNT ACCESS */}
      <AccountAccessSection
        playerPublicId={playerPublicId!}
        playerEmail={player.email}
      />

      {/* STATUS TOGGLE MODAL */}
      <PlayerStatusToggleModal
        open={showToggleModal}
        playerName={player.displayName}
        currentStatus={player.active}
        onConfirm={handleToggleStatus}
        onCancel={() => setShowToggleModal(false)}
        loading={toggling}
      />
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  full = false,
}: {
  label: string;
  value?: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <p className="text-gray-500">{label}</p>
      <p className="font-medium">{value || "-"}</p>
    </div>
  );
}

export default PlayerInfoPage;
