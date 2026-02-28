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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading resources...</p>
      </div>
    );
  }

  const turfResources = resources.filter((r) => r.type === "TURF");
  const astroResources = resources.filter((r) => r.type === "ASTRO");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="p-2 hover:bg-gray-100 rounded transition"
            title="Back to Admin Dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Manage Resources</h1>
            <p className="text-gray-600 text-sm mt-1">
              Enable or disable resources for booking
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          <Plus size={18} />
          Add Resource
        </button>
      </div>

      {/* TURF RESOURCES */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">
            Turf Wickets ({turfResources.length})
          </h2>
        </div>
        <div className="p-6 space-y-4">
          {turfResources.length === 0 ? (
            <p className="text-gray-400 text-sm">
              No turf resources added yet.
            </p>
          ) : (
            turfResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onToggle={toggleActive}
              />
            ))
          )}
        </div>
      </div>

      {/* ASTRO RESOURCES */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">
            Astro Turf ({astroResources.length})
          </h2>
        </div>
        <div className="p-6 space-y-4">
          {astroResources.length === 0 ? (
            <p className="text-gray-400 text-sm">
              No astro resources added yet.
            </p>
          ) : (
            astroResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onToggle={toggleActive}
              />
            ))
          )}
        </div>
      </div>

      {/* INFO BOX */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
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

      {/* ADD RESOURCE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">Add New Resource</h2>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Error Banner */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TURF">TURF (Turf Wicket)</option>
                  <option value="ASTRO">ASTRO (Astro Turf)</option>
                </select>
              </div>

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. TURF1, ASTRO2"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Turf Wicket 1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description{" "}
                  <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Short description..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.displayOrder}
                  onChange={(e) =>
                    setForm({ ...form, displayOrder: Number(e.target.value) })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddResource}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Resource"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ResourceCardProps = {
  resource: Resource;
  onToggle: (id: string, currentActive: boolean) => void;
};

function ResourceCard({ resource, onToggle }: ResourceCardProps) {
  return (
    <div
      className={`border rounded-lg p-4 flex items-center justify-between transition-all ${
        resource.active
          ? "bg-white border-green-200"
          : "bg-gray-50 border-gray-300"
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{resource.name}</h3>
          <span className="text-sm text-gray-500">({resource.code})</span>
          {resource.active ? (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
              ● Active
            </span>
          ) : (
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
              ○ Disabled
            </span>
          )}
        </div>
        {resource.description && (
          <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
        )}
        <div className="flex items-center gap-4 mt-1">
          <p className="text-xs text-gray-500">
            Display Order: {resource.displayOrder}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(resource.id, resource.active)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            resource.active
              ? "bg-red-100 text-red-700 hover:bg-red-200"
              : "bg-green-100 text-green-700 hover:bg-green-200"
          }`}
        >
          {resource.active ? (
            <>
              <PowerOff size={18} />
              <span>Disable</span>
            </>
          ) : (
            <>
              <Power size={18} />
              <span>Enable</span>
            </>
          )}
        </button>

        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
          <Edit size={18} />
        </button>
      </div>
    </div>
  );
}

export default ManageResources;
