import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Save, X, Award, Eye, EyeOff } from "lucide-react";
import api from "../../api/axios";
import publicApi from "../../api/publicApi";
import PresenceBanner from "../../components/PresenceBanner";
import { useAuth } from "../../auth/useAuth";

type Facility = {
  id: string;
  title: string;
  description: string;
  iconName: string;
  displayOrder: number;
  active: boolean;
};

const FacilitiesManager = () => {
  const { academyId } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    iconName: "Award",
    displayOrder: 0,
    active: true,
  });

  const iconOptions = [
    "Trophy",
    "Target",
    "Award",
    "Clock",
    "Users",
    "Zap",
    "Star",
    "Heart",
  ];

  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const response = await publicApi.get("/cms/facilities");
        setFacilities(response.data);
      } catch (error) {
        console.error("Error loading facilities:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFacilities();
  }, []);

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({
      title: "",
      description: "",
      iconName: "Award",
      displayOrder: facilities.length,
      active: true,
    });
  };

  const handleEdit = (facility: Facility) => {
    setEditingId(facility.id);
    setFormData({
      title: facility.title,
      description: facility.description,
      iconName: facility.iconName,
      displayOrder: facility.displayOrder,
      active: facility.active,
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      title: "",
      description: "",
      iconName: "Award",
      displayOrder: 0,
      active: true,
    });
  };

  const handleSave = async () => {
    try {
      if (isAdding) {
        const response = await api.post("/admin/cms/facilities", formData);
        setFacilities([...facilities, response.data]);
      } else {
        const response = await api.put(
          `/admin/cms/facilities/${editingId}`,
          formData,
        );
        setFacilities(
          facilities.map((f) => (f.id === editingId ? response.data : f)),
        );
      }
      handleCancel();
    } catch (error) {
      console.error("Error saving facility:", error);
      alert("Failed to save facility");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this facility?")) return;

    try {
      await api.delete(`/admin/cms/facilities/${id}`);
      setFacilities(facilities.filter((f) => f.id !== id));
    } catch (error) {
      console.error("Error deleting facility:", error);
      alert("Failed to delete facility");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 tracking-tight">
              <Award className="w-5 h-5 text-blue-600 flex-shrink-0" />
              Facilities Management
            </h2>
            <PresenceBanner
              entity="facilities-manager"
              id={academyId ?? undefined}
            />
            <p className="text-sm text-gray-500 mt-0.5">
              Manage the facilities showcased on your homepage
            </p>
          </div>
          <button
            onClick={handleAdd}
            disabled={isAdding || !!editingId}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-sm flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Facility</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="bg-white rounded-xl border-2 border-blue-200 shadow-sm p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
            {isAdding ? "Add New Facility" : "Edit Facility"}
          </h3>

          {editingId && <PresenceBanner entity="facility" id={editingId} />}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Professional Turf Wickets"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="International-standard cricket pitches for match-like practice"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Icon
                </label>
                <select
                  value={formData.iconName}
                  onChange={(e) =>
                    setFormData({ ...formData, iconName: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition bg-white"
                >
                  {iconOptions.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      displayOrder: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) =>
                  setFormData({ ...formData, active: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="active"
                className="text-sm font-medium text-gray-700"
              >
                Active (visible on homepage)
              </label>
            </div>

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={!formData.title}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-sm"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 active:bg-gray-300 transition"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Facilities List */}
      <div className="grid gap-3">
        {facilities.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 sm:p-16 text-center">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No facilities added yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Click "Add Facility" to get started
            </p>
          </div>
        ) : (
          facilities.map((facility) => (
            <div
              key={facility.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 hover:border-slate-300 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm truncate">
                        {facility.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {facility.active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                            <Eye className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">
                            <EyeOff className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          Order: {facility.displayOrder}
                        </span>
                      </div>
                    </div>
                  </div>
                  {facility.description && (
                    <p className="text-sm text-gray-500 mt-1 pl-12 leading-relaxed">
                      {facility.description}
                    </p>
                  )}
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(facility)}
                    disabled={
                      isAdding || (editingId && editingId !== facility.id)
                    }
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:text-gray-300 disabled:hover:bg-transparent transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(facility.id)}
                    disabled={isAdding || !!editingId}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:text-gray-300 disabled:hover:bg-transparent transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FacilitiesManager;
