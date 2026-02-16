import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Power, PowerOff, Edit, ArrowLeft } from "lucide-react";
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

function ManageResources() {
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="flex items-center gap-4">
        {/* ✅ BACK BUTTON */}
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

      {/* TURF RESOURCES */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Turf Wickets (3)</h2>
        </div>
        <div className="p-6 space-y-4">
          {turfResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onToggle={toggleActive}
            />
          ))}
        </div>
      </div>

      {/* ASTRO RESOURCES */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Astro Turf (2)</h2>
        </div>
        <div className="p-6 space-y-4">
          {astroResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onToggle={toggleActive}
            />
          ))}
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
        <p className="text-xs text-gray-500 mt-1">
          Display Order: {resource.displayOrder}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Toggle Button */}
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

        {/* Edit Button (optional - for future) */}
        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
          <Edit size={18} />
        </button>
      </div>
    </div>
  );
}

export default ManageResources;
