import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Save, X, Award, Eye, EyeOff } from "lucide-react";
import axiosInstance from "../../api/axiosInstance";
import publicApi from "../../api/publicApi";

type Facility = {
  id: string;
  title: string;
  description: string;
  iconName: string;
  displayOrder: number;
  active: boolean;
};

const FacilitiesManager = () => {
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
        const response = await axiosInstance.post(
          "/api/admin/cms/facilities",
          formData,
        );
        setFacilities([...facilities, response.data]);
      } else {
        const response = await axiosInstance.put(
          `/api/admin/cms/facilities/${editingId}`,
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
      await axiosInstance.delete(`/api/admin/cms/facilities/${id}`);
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
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Award className="w-6 h-6 text-blue-600" />
              Facilities Management
            </h2>
            <p className="text-gray-600 mt-1">
              Manage the facilities showcased on your homepage
            </p>
          </div>
          <button
            onClick={handleAdd}
            disabled={isAdding || !!editingId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Facility
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">
            {isAdding ? "Add New Facility" : "Edit Facility"}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Professional Turf Wickets"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="International-standard cricket pitches for match-like practice"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <select
                  value={formData.iconName}
                  onChange={(e) =>
                    setFormData({ ...formData, iconName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {iconOptions.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
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

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={!formData.title}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Facilities List */}
      <div className="grid gap-4">
        {facilities.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No facilities added yet</p>
            <p className="text-gray-400 mt-2">
              Click "Add Facility" to get started
            </p>
          </div>
        ) : (
          facilities.map((facility) => (
            <div
              key={facility.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Award className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {facility.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {facility.active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            <Eye className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            <EyeOff className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          Order: {facility.displayOrder}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 mt-2">{facility.description}</p>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(facility)}
                    disabled={
                      isAdding || (editingId && editingId !== facility.id)
                    }
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:text-gray-400 disabled:hover:bg-transparent"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(facility.id)}
                    disabled={isAdding || !!editingId}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:text-gray-400 disabled:hover:bg-transparent"
                  >
                    <Trash2 className="w-5 h-5" />
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
