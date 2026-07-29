import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Search,
  Award,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  representativeHonorService,
  type RepresentativeHonor,
  type RepresentativeHonorRequest,
} from "../../api/representativeHonorService";
import { playerService } from "../../api/playerService/playerService";
import type { Player } from "../../api/playerService/playerService";
import ModalOverlay from "../../components/ModalOverlay";
import { getImageUrl } from "../../utils/imageUrl";

const LEVELS = [
  { value: "NATIONAL", label: "National" },
  { value: "STATE", label: "State" },
  { value: "ZONE", label: "Zone" },
  { value: "DISTRICT", label: "District" },
  { value: "OTHER", label: "Other" },
];

const AGE_GROUPS = ["U-10", "U-12", "U-14", "U-16", "U-19", "SENIOR"];

const LEVEL_COLORS: Record<string, string> = {
  NATIONAL: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  STATE: "bg-blue-100 text-blue-800 border border-blue-300",
  ZONE: "bg-purple-100 text-purple-800 border border-purple-300",
  DISTRICT: "bg-green-100 text-green-800 border border-green-300",
  OTHER: "bg-gray-100 text-gray-700 border border-gray-300",
};

const EMPTY_FORM: RepresentativeHonorRequest = {
  playerPublicId: "",
  level: "DISTRICT",
  teamName: "",
  ageGroup: "",
  seasonYear: "",
  description: "",
  displayOrder: 0,
};

type ModalMode = "create" | "edit";

export default function RepresentativeHonorsAdmin() {
  const navigate = useNavigate();
  const [honors, setHonors] = useState<RepresentativeHonor[]>([]);
  const [loading, setLoading] = useState(true);

  // Players for selector
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerSearch, setPlayerSearch] = useState("");

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RepresentativeHonorRequest>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await representativeHonorService.list();
      setHonors(data);
    } catch {
      toast.error("Failed to load representative honors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    playerService.getAllPlayers(true).then(setPlayers).catch(() => {});
  }, []);

  const filteredPlayers = players.filter((p) =>
    p.displayName.toLowerCase().includes(playerSearch.toLowerCase()),
  );

  const selectedPlayer = players.find((p) => p.publicId === form.playerPublicId);

  function openCreate() {
    setForm({ ...EMPTY_FORM, displayOrder: honors.length });
    setPlayerSearch("");
    setModalMode("create");
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(honor: RepresentativeHonor) {
    setForm({
      playerPublicId: honor.playerPublicId,
      level: honor.level,
      teamName: honor.teamName,
      ageGroup: honor.ageGroup ?? "",
      seasonYear: honor.seasonYear ?? "",
      description: honor.description ?? "",
      displayOrder: honor.displayOrder,
    });
    setPlayerSearch("");
    setModalMode("edit");
    setEditingId(honor.publicId);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
  }

  async function handleSave() {
    if (!form.playerPublicId) {
      toast.error("Please select a player");
      return;
    }
    if (!form.teamName.trim()) {
      toast.error("Team name is required");
      return;
    }
    setSaving(true);
    try {
      if (modalMode === "create") {
        await representativeHonorService.create(form);
        toast.success("Honor added");
      } else if (editingId) {
        await representativeHonorService.update(editingId, form);
        toast.success("Honor updated");
      }
      closeModal();
      load();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(publicId: string) {
    setDeleting(true);
    try {
      await representativeHonorService.delete(publicId);
      toast.success("Honor removed");
      setDeletingId(null);
      load();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/admin/settings")}
            className="p-1.5 rounded-lg hover:bg-gray-200 transition"
          >
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Representative Honors</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Players selected for external representative teams
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Add Honor
          </button>
        </div>

        {/* Enable module hint */}
        <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          To show this section on the public homepage, enable{" "}
          <strong>MODULE_REPRESENTATIVE_HONORS_ENABLED</strong> in Academy Settings.
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : honors.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Award size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No representative honors yet</p>
            <p className="text-sm mt-1">Click "Add Honor" to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {honors.map((h) => (
              <div
                key={h.publicId}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 shadow-sm"
              >
                {/* Player photo */}
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                  {h.playerPhotoUrl ? (
                    <img
                      src={getImageUrl(h.playerPhotoUrl)}
                      alt={h.playerDisplayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-bold">
                      {h.playerDisplayName?.charAt(0) ?? "?"}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 truncate">
                      {h.playerDisplayName}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        LEVEL_COLORS[h.level] ?? LEVEL_COLORS.OTHER
                      }`}
                    >
                      {LEVELS.find((l) => l.value === h.level)?.label ?? h.level}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-0.5 truncate">{h.teamName}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {h.ageGroup && <span>{h.ageGroup}</span>}
                    {h.seasonYear && <span>{h.seasonYear}</span>}
                    <span>Order: {h.displayOrder}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(h)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => setDeletingId(h.publicId)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <ModalOverlay onClose={closeModal}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">
                {modalMode === "create" ? "Add Representative Honor" : "Edit Representative Honor"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Player selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Player <span className="text-red-500">*</span>
                </label>
                {selectedPlayer ? (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                      {selectedPlayer.photoUrl ? (
                        <img
                          src={getImageUrl(selectedPlayer.photoUrl)}
                          alt={selectedPlayer.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm">
                          {selectedPlayer.displayName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="flex-1 font-medium text-gray-800 text-sm">
                      {selectedPlayer.displayName}
                    </span>
                    <button
                      onClick={() =>
                        setForm((f) => ({ ...f, playerPublicId: "" }))
                      }
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative mb-2">
                      <Search
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="Search player…"
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                    <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
                      {filteredPlayers.length === 0 ? (
                        <p className="py-4 text-center text-sm text-gray-400">
                          No players found
                        </p>
                      ) : (
                        filteredPlayers.slice(0, 30).map((p) => (
                          <button
                            key={p.publicId}
                            onClick={() => {
                              setForm((f) => ({ ...f, playerPublicId: p.publicId }));
                              setPlayerSearch("");
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition text-left"
                          >
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                              {p.photoUrl ? (
                                <img
                                  src={getImageUrl(p.photoUrl)}
                                  alt={p.displayName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                                  {p.displayName.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="text-sm text-gray-800">{p.displayName}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.level}
                  onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Team name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team / Competition Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Karnataka U19, South Zone, India A…"
                  value={form.teamName}
                  onChange={(e) => setForm((f) => ({ ...f, teamName: e.target.value }))}
                  maxLength={200}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              {/* Age group + Season year */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age Group
                  </label>
                  <select
                    value={form.ageGroup ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, ageGroup: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">— None —</option>
                    {AGE_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Season / Year
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2024-25"
                    value={form.seasonYear ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, seasonYear: e.target.value }))}
                    maxLength={20}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Optional note about this honor…"
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>

              {/* Display order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.displayOrder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Lower numbers appear first. Within the same order, National ranks highest.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
              >
                <Save size={15} />
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Delete confirm modal */}
      {deletingId && (
        <ModalOverlay onClose={() => setDeletingId(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">Remove honor?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will soft-delete the representative honor and remove it from the public
              homepage.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-60 transition"
              >
                {deleting ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
