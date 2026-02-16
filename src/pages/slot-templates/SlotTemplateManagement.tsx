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

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await api.get("/admin/slot-templates");

      // ✅ Map backend field names to frontend field names
      const mappedTemplates = response.data.map((template: any) => ({
        ...template,
        isDefaultWeekday: template.defaultWeekday || false,
        isDefaultWeekend: template.defaultWeekend || false,
      }));

      console.log("📋 Loaded templates:", mappedTemplates);

      setTemplates(mappedTemplates);

      // ✅ NEW: Check if defaults are set
      const weekdayDefault = mappedTemplates.some(
        (t: SlotTemplate) => t.isDefaultWeekday && t.active,
      );
      const weekendDefault = mappedTemplates.some(
        (t: SlotTemplate) => t.isDefaultWeekend && t.active,
      );

      setHasWeekdayDefault(weekdayDefault);
      setHasWeekendDefault(weekendDefault);

      console.log("🔍 Default checks:", { weekdayDefault, weekendDefault });
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await api.delete(`/admin/slot-templates/${id}`);
      loadTemplates();
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Failed to delete template";
      alert(message);
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
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
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
            <h1 className="text-2xl font-bold">Slot Templates</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage slot timings and pricing for different day types
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/admin/slot-templates/create")}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          New Template
        </button>
      </div>

      {/* ⚠️ WARNING BANNER - Missing Defaults */}
      {(!hasWeekdayDefault || !hasWeekendDefault) && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">
                Default Templates Required
              </h3>
              <div className="text-sm text-amber-700 space-y-2">
                <p className="font-medium">
                  You must set default templates before users can book slots:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  {!hasWeekdayDefault && (
                    <li>
                      <strong>Weekday Template</strong> (Monday - Friday) - Not
                      set
                    </li>
                  )}
                  {!hasWeekendDefault && (
                    <li>
                      <strong>Weekend Template</strong> (Saturday - Sunday) -
                      Not set
                    </li>
                  )}
                </ul>
                <p className="mt-3 text-amber-800">
                  📝 Create a template below and check "Set as default weekday"
                  or "Set as default weekend" to enable bookings.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ✅ Calendar View - Always visible */}
        <button
          onClick={() => navigate("/admin/slot-templates")}
          className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105 text-left"
        >
          <div className="flex items-center gap-3 mb-3">
            <Calendar size={28} className="text-white" />
            <h3 className="text-lg font-bold text-white">Calendar View</h3>
          </div>
          <p className="text-sm text-purple-100">
            Override specific dates and view slot schedule
          </p>
        </button>

        {/* ✅ Generate Slots - Only show if defaults are set */}
        {hasWeekdayDefault && hasWeekendDefault && (
          <button
            onClick={() => navigate("/admin/slot-templates/generate")}
            className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105 text-left"
          >
            <div className="flex items-center gap-3 mb-3">
              <Settings size={28} className="text-white" />
              <h3 className="text-lg font-bold text-white">Generate Slots</h3>
            </div>
            <p className="text-sm text-green-100">
              Bulk generate slots for next 30 days
            </p>
          </button>
        )}

        {/* ✅ Date Overrides - Only show if defaults are set */}
        {hasWeekdayDefault && hasWeekendDefault && (
          <button
            onClick={() => navigate("/admin/slot-templates/overrides")}
            className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-lg shadow-lg hover:shadow-xl cursor-pointer transition transform hover:scale-105 text-left"
          >
            <div className="flex items-center gap-3 mb-3">
              <Clock size={28} className="text-white" />
              <h3 className="text-lg font-bold text-white">Date Overrides</h3>
            </div>
            <p className="text-sm text-orange-100">
              Manage holidays, maintenance, and special events
            </p>
          </button>
        )}
      </div>

      {/* TEMPLATES LIST */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">All Templates</h2>
        </div>

        {templates.length === 0 ? (
          <div className="p-12 text-center">
            <Clock size={48} className="mx-auto text-gray-400 mb-4" />
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
    <div className="p-6 hover:bg-gray-50 transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">{template.name}</h3>

            {/* Template Type Badge */}
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${getBadgeColor(template.templateType)}`}
            >
              {template.templateType}
            </span>

            {/* ✅ DEFAULT WEEKDAY BADGE - Blue */}
            {template.isDefaultWeekday && (
              <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                <span>⭐</span>
                <span>Default Weekday</span>
              </span>
            )}

            {/* ✅ DEFAULT WEEKEND BADGE - Purple */}
            {template.isDefaultWeekend && (
              <span className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                <span>⭐</span>
                <span>Default Weekend</span>
              </span>
            )}

            {/* Inactive Badge */}
            {!template.active && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                Inactive
              </span>
            )}
          </div>

          <p className="text-gray-600 text-sm mb-3">{template.description}</p>

          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              <span>
                {template.slotCount} slots ({template.firstSlot} -{" "}
                {template.lastSlot})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
            title="Edit"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default SlotTemplateManagement;
