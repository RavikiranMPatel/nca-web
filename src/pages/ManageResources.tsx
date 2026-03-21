import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Power, PowerOff, Edit, ArrowLeft, Plus, X } from "lucide-react";
import api from "../api/axios";

type Resource = {
  id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
  displayOrder: number;
  description: string;
};

type NewResource = {
  code: string;
  name: string;
  type: string;
  description: string;
  displayOrder: number;
};

const INITIAL_FORM: NewResource = {
  code: "",
  name: "",
  type: "TURF",
  description: "",
  displayOrder: 1,
};

function ManageResources() {
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NewResource>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    displayOrder: 1,
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleOpenEdit = (resource: Resource) => {
    setEditingResource(resource);
    setEditForm({
      name: resource.name,
      description: resource.description || "",
      displayOrder: resource.displayOrder,
    });
    setEditError(null);
  };

  const handleCloseEdit = () => {
    setEditingResource(null);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingResource) return;
    if (!editForm.name.trim()) return setEditError("Name is required.");
    setEditSaving(true);
    try {
      await api.put(`/admin/resources/${editingResource.id}`, editForm);
      handleCloseEdit();
      loadResources();
    } catch (err: any) {
      const message =
        err?.response?.data?.message || "Failed to update resource.";
      setEditError(
        typeof message === "string" ? message : JSON.stringify(message),
      );
    } finally {
      setEditSaving(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      const response = await api.get("/admin/resources");
      setResources(response.data);
    } catch (error) {
      console.error("Failed to load resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const action = currentActive ? "disable" : "enable";
    if (!confirm(`Are you sure you want to ${action} this resource?`)) return;
    try {
      await api.patch(`/admin/resources/${id}/toggle-active`);
      loadResources();
    } catch (error) {
      console.error("Failed to toggle resource:", error);
      alert("Failed to update resource");
    }
  };

  const handleAddResource = async () => {
    setError(null);
    if (!form.code.trim()) return setError("Code is required.");
    if (!form.name.trim()) return setError("Name is required.");
    setSaving(true);
    try {
      await api.post("/admin/resources", form);
      setShowModal(false);
      setForm(INITIAL_FORM);
      loadResources();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Failed to create resource. Please try again.";
      setError(typeof message === "string" ? message : JSON.stringify(message));
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm(INITIAL_FORM);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const turfResources = resources.filter((r) => r.type === "TURF");
  const astroResources = resources.filter((r) => r.type === "ASTRO");
  const bowlingResources = resources.filter(
    (r) => r.type === "BOWLING_MACHINE",
  );

  // ── Shared input class ──
  const inputCls =
    "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* ── HEADER ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin")}
          className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-2xl font-bold">Manage Resources</h1>
          <p className="text-xs text-gray-500">
            Enable or disable resources for booking
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex-shrink-0"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Resource</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* ── RESOURCE SECTIONS ── */}
      {[
        { label: "Turf Wickets", items: turfResources },
        { label: "Astro Turf", items: astroResources },
        { label: "Bowling Machines", items: bowlingResources },
      ].map(({ label, items }) => (
        <div
          key={label}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <div className="px-4 py-3 border-b bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">
              {label} ({items.length})
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {items.length === 0 ? (
              <p className="text-gray-400 text-sm">
                No {label.toLowerCase()} added yet.
              </p>
            ) : (
              items.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onToggle={toggleActive}
                  onEdit={handleOpenEdit}
                />
              ))
            )}
          </div>
        </div>
      ))}

      {/* ── INFO BOX ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2 text-sm">
          ℹ️ How it works:
        </h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>
            • Users see time slots (e.g., 08:00 - 09:00) without specific
            resource names
          </li>
          <li>
            • System automatically picks any available ACTIVE resource when user
            books
          </li>
          <li>• Disabled resources won't be assigned to new bookings</li>
          <li>• Existing bookings for disabled resources remain unaffected</li>
        </ul>
      </div>

      {/* ── ADD RESOURCE MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white rounded-t-2xl sm:rounded-t-xl">
              <h2 className="text-base font-bold">Add New Resource</h2>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className={inputCls}
                >
                  <option value="TURF">TURF (Turf Wicket)</option>
                  <option value="ASTRO">ASTRO (Astro Turf)</option>
                  <option value="BOWLING_MACHINE">
                    BOWLING_MACHINE (Bowling Machine)
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. TURF1, ASTRO2"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Turf Wicket 1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Description{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Short description..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Display Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.displayOrder}
                  onChange={(e) =>
                    setForm({ ...form, displayOrder: Number(e.target.value) })
                  }
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t pb-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 py-2.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddResource}
                disabled={saving}
                className="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Resource"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT RESOURCE MODAL ── */}
      {editingResource && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white rounded-t-2xl sm:rounded-t-xl">
              <h2 className="text-base font-bold">
                Edit — {editingResource.code}
              </h2>
              <button
                onClick={handleCloseEdit}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {editError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Description{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Display Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={editForm.displayOrder}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      displayOrder: Number(e.target.value),
                    })
                  }
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t pb-6">
              <button
                onClick={handleCloseEdit}
                className="flex-1 py-2.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Resource Card ─────────────────────────────────────────────────

type ResourceCardProps = {
  resource: Resource;
  onToggle: (id: string, currentActive: boolean) => void;
  onEdit: (resource: Resource) => void;
};

function ResourceCard({ resource, onToggle, onEdit }: ResourceCardProps) {
  return (
    <div
      className={`border rounded-xl p-4 transition-all ${
        resource.active
          ? "bg-white border-green-200"
          : "bg-gray-50 border-gray-200"
      }`}
    >
      {/* Top row: name + badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm">
              {resource.name}
            </h3>
            <span className="text-xs text-gray-400">({resource.code})</span>
          </div>
          {resource.description && (
            <p className="text-xs text-gray-500 mt-0.5">
              {resource.description}
            </p>
          )}
          <p className="text-[10px] text-gray-400 mt-1">
            Order: {resource.displayOrder}
          </p>
        </div>
        {resource.active ? (
          <span className="flex-shrink-0 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded-full">
            Active
          </span>
        ) : (
          <span className="flex-shrink-0 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-semibold rounded-full">
            Disabled
          </span>
        )}
      </div>

      {/* Action buttons — full width on mobile */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onToggle(resource.id, resource.active)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
            resource.active
              ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
              : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
          }`}
        >
          {resource.active ? (
            <>
              <PowerOff size={14} /> Disable
            </>
          ) : (
            <>
              <Power size={14} /> Enable
            </>
          )}
        </button>
        <button
          onClick={() => onEdit(resource)}
          className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition"
        >
          <Edit size={15} />
        </button>
      </div>
    </div>
  );
}

export default ManageResources;
