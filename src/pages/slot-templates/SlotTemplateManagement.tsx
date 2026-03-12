import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  Edit,
  Plus,
  Trash2,
  Settings,
  ArrowLeft,
  X,
} from "lucide-react";
import api from "../../api/axios";

type SlotTemplate = {
  id: string;
  publicId: string;
  name: string;
  description: string;
  templateType: "WEEKDAY" | "WEEKEND" | "HOLIDAY" | "CUSTOM";
  isDefaultWeekday: boolean;
  isDefaultWeekend: boolean;
  active: boolean;
  slotCount: number;
  firstSlot: string;
  lastSlot: string;
};

function SlotTemplateManagement() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<SlotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasWeekdayDefault, setHasWeekdayDefault] = useState(false);
  const [hasWeekendDefault, setHasWeekendDefault] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await api.get("/admin/slot-templates");
      const mappedTemplates = response.data.map((template: any) => ({
        ...template,
        isDefaultWeekday: template.defaultWeekday || false,
        isDefaultWeekend: template.defaultWeekend || false,
      }));
      setTemplates(mappedTemplates);
      setHasWeekdayDefault(
        mappedTemplates.some(
          (t: SlotTemplate) => t.isDefaultWeekday && t.active,
        ),
      );
      setHasWeekendDefault(
        mappedTemplates.some(
          (t: SlotTemplate) => t.isDefaultWeekend && t.active,
        ),
      );
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    setDeleteError("");
    try {
      await api.delete(`/admin/slot-templates/${id}`);
      loadTemplates();
    } catch (err: any) {
      setDeleteError(
        err.response?.data?.message || "Failed to delete template",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/admin")}
            className="p-2 hover:bg-gray-100 rounded transition flex-shrink-0"
            title="Back to Admin Dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">
              Slot Templates
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm mt-0.5 hidden sm:block">
              Manage slot timings and pricing for different day types
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/admin/slot-templates/create")}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-blue-700 text-sm flex-shrink-0"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">New Template</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* DELETE ERROR BANNER */}
      {deleteError && (
        <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-3 flex items-start gap-3">
          <span className="text-red-500 text-lg flex-shrink-0">🚫</span>
          <div className="flex-1">
            <p className="font-semibold text-red-800 text-sm">
              Cannot Delete Template
            </p>
            <p className="text-red-700 text-sm mt-0.5">{deleteError}</p>
          </div>
          <button
            onClick={() => setDeleteError("")}
            className="text-red-400 hover:text-red-600 flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* WARNING BANNER */}
      {(!hasWeekdayDefault || !hasWeekendDefault) && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 sm:p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-xl">⚠️</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-amber-800 mb-1 sm:mb-2">
                Default Templates Required
              </h3>
              <div className="text-sm text-amber-700 space-y-1 sm:space-y-2">
                <p className="font-medium">
                  Set default templates before users can book slots:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  {!hasWeekdayDefault && (
                    <li>
                      <strong>Weekday Template</strong> (Mon–Fri) — Not set
                    </li>
                  )}
                  {!hasWeekendDefault && (
                    <li>
                      <strong>Weekend Template</strong> (Sat–Sun) — Not set
                    </li>
                  )}
                </ul>
                <p className="mt-2 text-amber-800 text-xs sm:text-sm">
                  📝 Create a template and check "Set as default weekday" or
                  "Set as default weekend" to enable bookings.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <button
          onClick={() => navigate("/admin/slot-templates")}
          className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105 text-left"
        >
          <div className="flex items-center gap-3 mb-2 sm:mb-3">
            <Calendar size={24} className="text-white flex-shrink-0" />
            <h3 className="text-base sm:text-lg font-bold text-white">
              Calendar View
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-purple-100">
            Override specific dates and view slot schedule
          </p>
        </button>

        {hasWeekdayDefault && hasWeekendDefault && (
          <button
            onClick={() => navigate("/admin/slot-templates/generate")}
            className="bg-gradient-to-br from-green-500 to-green-600 p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105 text-left"
          >
            <div className="flex items-center gap-3 mb-2 sm:mb-3">
              <Settings size={24} className="text-white flex-shrink-0" />
              <h3 className="text-base sm:text-lg font-bold text-white">
                Generate Slots
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-green-100">
              Bulk generate slots for next 30 days
            </p>
          </button>
        )}

        {hasWeekdayDefault && hasWeekendDefault && (
          <button
            onClick={() => navigate("/admin/slot-templates/overrides")}
            className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105 text-left"
          >
            <div className="flex items-center gap-3 mb-2 sm:mb-3">
              <Clock size={24} className="text-white flex-shrink-0" />
              <h3 className="text-base sm:text-lg font-bold text-white">
                Date Overrides
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-orange-100">
              Manage holidays, maintenance, and special events
            </p>
          </button>
        )}
      </div>

      {/* TEMPLATES LIST */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-base sm:text-lg font-semibold">All Templates</h2>
        </div>

        {templates.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Clock size={40} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No templates yet</p>
            <button
              onClick={() => navigate("/admin/slot-templates/create")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Create Your First Template
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() =>
                  navigate(`/admin/slot-templates/${template.id}/edit`)
                }
                onDelete={() => handleDelete(template.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type TemplateCardProps = {
  template: SlotTemplate;
  onEdit: () => void;
  onDelete: () => void;
};

function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  const getBadgeColor = (type: string) => {
    switch (type) {
      case "WEEKDAY":
        return "bg-blue-100 text-blue-800";
      case "WEEKEND":
        return "bg-green-100 text-green-800";
      case "HOLIDAY":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-4 sm:p-6 hover:bg-gray-50 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-base sm:text-lg font-semibold leading-tight">
              {template.name}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                title="Edit"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={onDelete}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${getBadgeColor(template.templateType)}`}
            >
              {template.templateType}
            </span>
            {template.isDefaultWeekday && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                ⭐ Default Weekday
              </span>
            )}
            {template.isDefaultWeekend && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                ⭐ Default Weekend
              </span>
            )}
            {!template.active && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                Inactive
              </span>
            )}
          </div>

          {template.description && (
            <p className="text-gray-600 text-sm mb-2">{template.description}</p>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Clock size={14} className="text-gray-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm">
              {template.slotCount} slots ({template.firstSlot} –{" "}
              {template.lastSlot})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SlotTemplateManagement;
