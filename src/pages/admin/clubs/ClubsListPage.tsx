import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Shield,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  X,
  Save,
  User,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { clubService } from "../../../api/clubService";
import type { Club, ClubRequest, ClubSeasonStandingData } from "../../../types/club";

// ── Shared standing badge logic (mirrors public side) ─────────────────────────
function standingOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function standingLabel(s: ClubSeasonStandingData): string {
  if (s.position === 1) return `🏆 Champions · Div ${s.division}`;
  if (s.position === 2) return `🥈 Runners-up · Div ${s.division}`;
  if (s.position) return `Div ${s.division} · ${standingOrdinal(s.position)}`;
  return `Div ${s.division}`;
}

const MOVEMENT_STYLES: Record<string, string> = {
  PROMOTED: "bg-emerald-100 text-emerald-700",
  RELEGATED: "bg-red-100 text-red-700",
  RETAINED: "bg-slate-100 text-slate-600",
};

const MOVEMENT_ARROW: Record<string, string> = {
  PROMOTED: "↑",
  RELEGATED: "↓",
  RETAINED: "→",
};

function StandingBadge({ standing }: { standing: ClubSeasonStandingData }) {
  const label = standingLabel(standing);
  const movStyle = standing.movement ? MOVEMENT_STYLES[standing.movement] ?? "" : "";
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
        {label}
      </span>
      {standing.movement && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${movStyle}`}>
          {MOVEMENT_ARROW[standing.movement]} {standing.movement.charAt(0) + standing.movement.slice(1).toLowerCase()}
        </span>
      )}
    </div>
  );
}

const EMPTY_FORM: ClubRequest = {
  name: "",
  ownerName: "",
  ownerContact: "",
  history: "",
};

function ClubsListPage() {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<ClubRequest>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [editForm, setEditForm] = useState<ClubRequest>(EMPTY_FORM);
  const [updating, setUpdating] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  const load = useCallback(async (p: number) => {
    try {
      setLoading(true);
      const data = await clubService.listClubs(p, PAGE_SIZE);
      setClubs(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch {
      toast.error("Failed to load clubs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN");

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error("Club name is required");
      return;
    }
    setCreating(true);
    try {
      await clubService.createClub({
        name: createForm.name.trim(),
        ownerName: createForm.ownerName?.trim() || undefined,
        ownerContact: createForm.ownerContact?.trim() || undefined,
        history: createForm.history?.trim() || undefined,
      });
      toast.success("Club created");
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      load(0);
      setPage(0);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create club");
    } finally {
      setCreating(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const openEdit = (club: Club) => {
    setEditingClub(club);
    setEditForm({
      name: club.name,
      ownerName: club.ownerName ?? "",
      ownerContact: club.ownerContact ?? "",
      history: club.history ?? "",
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClub) return;
    if (!editForm.name.trim()) {
      toast.error("Club name is required");
      return;
    }
    setUpdating(true);
    try {
      await clubService.updateClub(editingClub.publicId, {
        name: editForm.name.trim(),
        ownerName: editForm.ownerName?.trim() || undefined,
        ownerContact: editForm.ownerContact?.trim() || undefined,
        history: editForm.history?.trim() || undefined,
      });
      toast.success("Club updated");
      setEditingClub(null);
      load(page);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update club");
    } finally {
      setUpdating(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (publicId: string) => {
    setDeletingId(publicId);
    try {
      await clubService.deleteClub(publicId);
      toast.success("Club deleted");
      const newPage = clubs.length === 1 && page > 0 ? page - 1 : page;
      setPage(newPage);
      load(newPage);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete club");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-20">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm"
      >
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/admin")}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="text-blue-600" size={26} />
                  Clubs
                </h1>
                <p className="text-sm text-slate-600 mt-0.5">
                  {totalElements} club{totalElements !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Club</span>
            </button>
          </div>
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : clubs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <Shield size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No clubs yet</h3>
            <p className="text-slate-500 text-sm mb-4">
              Create your first club to get started
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-blue-600 font-medium hover:underline"
            >
              Add first club
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {clubs.map((club, index) => (
              <motion.div
                key={club.publicId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
              >
                {/* Card top accent */}
                <div className="h-1.5 bg-gradient-to-r from-blue-600 to-blue-400" />

                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Crest badge */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-white font-black text-2xl leading-none">
                        {club.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/admin/clubs/${club.publicId}`)}
                        className="font-bold text-slate-900 text-left hover:text-blue-600 transition text-lg leading-snug group-hover:text-blue-600 truncate block w-full"
                      >
                        {club.name}
                      </button>
                      {club.ownerName && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <User size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-500 truncate">
                            {club.ownerName}
                            {club.ownerContact ? ` · ${club.ownerContact}` : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(club)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit club"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(club.publicId)}
                        disabled={deletingId === club.publicId}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                        title="Delete club"
                      >
                        {deletingId === club.publicId ? (
                          <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  {club.history && (
                    <p className="text-sm text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                      {club.history}
                    </p>
                  )}

                  {club.currentStanding && (
                    <div className="mt-3">
                      <StandingBadge standing={club.currentStanding} />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="col-span-full flex items-center justify-center gap-4 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm text-slate-600">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CREATE MODAL ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Add Club</h2>
              <button
                onClick={() => { setShowCreate(false); setCreateForm(EMPTY_FORM); }}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <ClubFormFields form={createForm} onChange={setCreateForm} />
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCreateForm(EMPTY_FORM); }}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {creating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Save size={16} /> Create</>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editingClub && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Edit Club</h2>
              <button
                onClick={() => setEditingClub(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <ClubFormFields form={editForm} onChange={setEditForm} />
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClub(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {updating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Save size={16} /> Save Changes</>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ── Shared club form fields ───────────────────────────────────────────────────
function ClubFormFields({
  form,
  onChange,
}: {
  form: ClubRequest;
  onChange: React.Dispatch<React.SetStateAction<ClubRequest>>;
}) {
  const set = (field: keyof ClubRequest, value: string) =>
    onChange((prev) => ({ ...prev, [field]: value }));

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Club Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          maxLength={255}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          placeholder="e.g., Royal Challengers CC"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Owner Name <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={form.ownerName ?? ""}
          onChange={(e) => set("ownerName", e.target.value)}
          maxLength={255}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          placeholder="Owner / President name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Owner Contact <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={form.ownerContact ?? ""}
          onChange={(e) => set("ownerContact", e.target.value)}
          maxLength={255}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          placeholder="Phone or email"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          History <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={form.history ?? ""}
          onChange={(e) => set("history", e.target.value)}
          rows={4}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
          placeholder="Brief club history and background..."
        />
      </div>
    </>
  );
}

export default ClubsListPage;
