import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import api from "../api/axios";

type DateOverride = {
  id: string;
  date: string;
  overrideType: "CLOSED" | "CUSTOM_TEMPLATE";
  templateId?: string;
  templateName?: string;
  customMessage?: string;
  createdAt: string;
};

function CalendarView() {
  const navigate = useNavigate();
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: "",
    overrideType: "CLOSED" as "CLOSED" | "CUSTOM_TEMPLATE",
    templateId: "",
    customMessage: "",
  });

  useEffect(() => {
    loadOverrides();
  }, []);

  const loadOverrides = async () => {
    try {
      const response = await api.get("/admin/date-overrides");
      setOverrides(response.data);
    } catch (error) {
      console.error("Failed to load overrides:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date) {
      alert("Please select a date");
      return;
    }

    if (formData.overrideType === "CLOSED" && !formData.customMessage) {
      alert("Please provide a message for the closed date");
      return;
    }

    try {
      if (editingId) {
        await api.put(`/admin/date-overrides/${editingId}`, formData);
      } else {
        await api.post("/admin/date-overrides", formData);
      }
      resetForm();
      loadOverrides();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to save override");
    }
  };

  const handleDelete = async (id: string, date: string) => {
    if (!confirm(`Delete override for ${date}?`)) return;

    try {
      await api.delete(`/admin/date-overrides/${id}`);
      loadOverrides();
    } catch (error) {
      alert("Failed to delete override");
    }
  };

  const resetForm = () => {
    setFormData({
      date: "",
      overrideType: "CLOSED",
      templateId: "",
      customMessage: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (override: DateOverride) => {
    setFormData({
      date: override.date,
      overrideType: override.overrideType,
      templateId: override.templateId || "",
      customMessage: override.customMessage || "",
    });
    setEditingId(override.id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold">Calendar & Date Overrides</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage holidays, maintenance, and special dates
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          <span>Add Override</span>
        </button>
      </div>

      {/* INFO BANNER */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-blue-600 flex-shrink-0" size={20} />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">How Date Overrides Work:</p>
            <ul className="space-y-1 text-blue-800">
              <li>
                • <strong>CLOSED:</strong> No slots available, users see custom
                message
              </li>
              <li>
                • <strong>CUSTOM TEMPLATE:</strong> Use different slot template
                for this date
              </li>
              <li>• Overrides take precedence over default templates</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CREATE/EDIT FORM */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Override" : "Add Date Override"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Override Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Override Type *
              </label>
              <select
                value={formData.overrideType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    overrideType: e.target.value as
                      | "CLOSED"
                      | "CUSTOM_TEMPLATE",
                  })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="CLOSED">Closed (No bookings)</option>
                <option value="CUSTOM_TEMPLATE">
                  Custom Template (Different slots)
                </option>
              </select>
            </div>

            {/* Message (for CLOSED) */}
            {formData.overrideType === "CLOSED" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Message *
                </label>
                <textarea
                  value={formData.customMessage}
                  onChange={(e) =>
                    setFormData({ ...formData, customMessage: e.target.value })
                  }
                  placeholder="e.g., Closed for Republic Day"
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            )}

            {/* Template ID (for CUSTOM_TEMPLATE) */}
            {formData.overrideType === "CUSTOM_TEMPLATE" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template ID
                </label>
                <input
                  type="text"
                  value={formData.templateId}
                  onChange={(e) =>
                    setFormData({ ...formData, templateId: e.target.value })
                  }
                  placeholder="Template UUID"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to disable slots for this date
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                {editingId ? "Update Override" : "Add Override"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* OVERRIDES LIST */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">All Date Overrides</h2>
          <p className="text-sm text-gray-500 mt-1">
            {overrides.length} override(s) configured
          </p>
        </div>

        {overrides.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500 mb-4">No date overrides configured</p>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="text-blue-600 font-medium hover:underline"
            >
              Add your first override
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {overrides.map((override) => (
              <div
                key={override.id}
                className="p-6 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar size={20} className="text-gray-400" />
                      <h3 className="text-lg font-semibold">
                        {new Date(override.date).toLocaleDateString("en-IN", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </h3>

                      {override.overrideType === "CLOSED" ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                          ✕ CLOSED
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                          📋 CUSTOM TEMPLATE
                        </span>
                      )}
                    </div>

                    {override.customMessage && (
                      <p className="text-sm text-gray-600 mb-2">
                        {override.customMessage}
                      </p>
                    )}

                    {override.templateName && (
                      <p className="text-sm text-gray-500">
                        Template: {override.templateName}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      Added on:{" "}
                      {new Date(override.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(override)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                      title="Edit override"
                    >
                      <Edit size={18} />
                    </button>

                    <button
                      onClick={() => handleDelete(override.id, override.date)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                      title="Delete override"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CalendarView;
