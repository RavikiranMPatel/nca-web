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

      // Update local state
      setPlayer((prev) =>
        prev
          ? {
              ...prev,
              active: response.active,
              status: response.status,
            }
          : null,
      );

      setShowToggleModal(false);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to update player status";
      toast.error(message);
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
      {/* STATUS BANNER (if inactive) */}
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
          {/* Photo */}

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

            {/* Fallback avatar - show if no photo or error */}
            <div
              className={`w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300 ${
                player.photoUrl ? "hidden" : ""
              }`}
            >
              <User size={64} className="text-gray-400" />
            </div>

            {/* Status badge on photo */}
            <div
              className={`absolute bottom-2 right-2 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                player.active
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
              }`}
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

          {/* Player Name & Toggle Button */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-gray-900">
              {player.displayName}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Status: <span className="font-medium">{player.status}</span>
            </p>

            {/* Toggle Status Button (Super Admin Only) */}
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

      {/* Status Toggle Modal */}
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

/* ================= HELPERS ================= */

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
