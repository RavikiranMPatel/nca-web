import { useState, useEffect } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Info } from "lucide-react";

type RevenueCategory = {
  publicId: string;
  label: string;
  displayOrder: number;
  active: boolean;
};

const EMPTY_FORM = { label: "", displayOrder: 0 };

export default function RevenueCategorySettings() {
  const [categories, setCategories] = useState<RevenueCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await api.get<RevenueCategory[]>("/admin/revenue-categories");
      setCategories(res.data);
    } catch {
      toast.error("Failed to load income categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ label: "", displayOrder: categories.length });
    setShowForm(true);
  };

  const openEdit = (c: RevenueCategory) => {
    setEditingId(c.publicId);
    setForm({ label: c.label, displayOrder: c.displayOrder });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) { toast.error("Label is required"); return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/revenue-categories/${editingId}`, form);
        toast.success("Updated");
      } else {
        await api.post("/admin/revenue-categories", form);
        toast.success("Category added");
      }
      closeForm();
      load();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: RevenueCategory) => {
    try {
      await api.patch(`/admin/revenue-categories/${c.publicId}/toggle`);
      load();
    } catch {
      toast.error("Failed to update");
    }
  };

  const remove = async (publicId: string) => {
    try {
      await api.delete(`/admin/revenue-categories/${publicId}`);
      toast.success("Deleted");
      setDeleteConfirm(null);
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const moveOrder = async (cat: RevenueCategory, direction: "up" | "down") => {
    const sorted = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((c) => c.publicId === cat.publicId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swapCat = sorted[swapIdx];
    try {
      await Promise.all([
        api.put(`/admin/revenue-categories/${cat.publicId}`, { displayOrder: swapCat.displayOrder }),
        api.put(`/admin/revenue-categories/${swapCat.publicId}`, { displayOrder: cat.displayOrder }),
      ]);
      load();
    } catch {
      toast.error("Reorder failed");
    }
  };

  if (loading) return <div className="py-6 text-center text-sm text-gray-400">Loading…</div>;

  const sorted = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Income Categories</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Categories shown when logging income entries in the Revenue dashboard
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* Match Fees convention hint */}
      <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
        <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          <span className="font-medium">Convention:</span> Match entry fees collected at the
          ground are best logged as Income under a <span className="font-medium">"Match Fees"</span>{" "}
          category. This keeps them visible in the Revenue dashboard alongside other income sources.
        </p>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No categories yet.</p>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          {sorted.map((c, idx) => (
            <div
              key={c.publicId}
              className={`flex items-center gap-2 px-4 py-3 bg-white ${!c.active ? "opacity-50" : ""}`}
            >
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => moveOrder(c, "up")}
                  disabled={idx === 0}
                  className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  onClick={() => moveOrder(c, "down")}
                  disabled={idx === sorted.length - 1}
                  className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronDown size={13} />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900 truncate block">{c.label}</span>
                {!c.active && <span className="text-xs text-gray-400">Hidden from income form</span>}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleActive(c)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                  title={c.active ? "Hide from form" : "Show in form"}
                >
                  {c.active ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  onClick={() => openEdit(c)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(c.publicId)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {editingId ? "Edit Category" : "Add Income Category"}
            </h3>
            <form onSubmit={save} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Label *</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Sponsorship"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 border border-gray-300 text-gray-700 bg-gray-50 text-sm py-2 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete category?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Existing income entries with this category label will appear under "Other" in the
              Revenue dashboard. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-700 bg-gray-50 text-sm py-2 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => remove(deleteConfirm)}
                className="flex-1 bg-red-600 text-white text-sm py-2 rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
