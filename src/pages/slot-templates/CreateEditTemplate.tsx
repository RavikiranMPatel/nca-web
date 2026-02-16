import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Trash2,
  ArrowLeft,
  Sun,
  Moon,
  CloudSun,
  CheckCircle,
} from "lucide-react";
import api from "../../api/axios";

type TemplateSlot = {
  id?: string;
  startTime: string;
  endTime: string;
  price: number;
  lightsRequired: boolean;
  slotType: "MORNING" | "AFTERNOON" | "EVENING";
  displayOrder: number;
};

type TemplateFormData = {
  name: string;
  description: string;
  templateType: "WEEKDAY" | "WEEKEND" | "HOLIDAY" | "CUSTOM";
  isDefaultWeekday: boolean;
  isDefaultWeekend: boolean;
  slots: TemplateSlot[];
};

function CreateEditTemplate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: "",
    description: "",
    templateType: "WEEKDAY",
    isDefaultWeekday: false,
    isDefaultWeekend: false,
    slots: [],
  });

  // ============================================
  // OPTION 2: Move loadTemplate INSIDE useEffect
  // ============================================

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const response = await api.get(`/admin/slot-templates/${id}`);
        const data = response.data;

        console.log("📥 Loaded template from backend:", data);

        // ✅ Map backend field names to frontend field names
        const mappedData = {
          name: data.name,
          description: data.description,
          templateType: data.templateType,
          isDefaultWeekday: data.defaultWeekday || false,
          isDefaultWeekend: data.defaultWeekend || false,
          slots: data.slots || [],
        };

        console.log("📋 Mapped data for form:", mappedData);

        setFormData(mappedData);
      } catch (error) {
        console.error("Failed to load template:", error);
        alert("Failed to load template");
        navigate("/admin/slot-templates");
      }
    };

    if (isEdit) {
      loadTemplate();
    }
  }, [id]);

  const addSlot = () => {
    const newSlot: TemplateSlot = {
      startTime: "09:00",
      endTime: "10:00",
      price: 500,
      lightsRequired: false,
      slotType: "MORNING",
      displayOrder: formData.slots.length + 1,
    };
    setFormData({ ...formData, slots: [...formData.slots, newSlot] });
  };

  const removeSlot = (index: number) => {
    const newSlots = formData.slots.filter((_, i) => i !== index);
    newSlots.forEach((slot, i) => {
      slot.displayOrder = i + 1;
    });
    setFormData({ ...formData, slots: newSlots });
  };

  const updateSlot = (index: number, field: keyof TemplateSlot, value: any) => {
    const newSlots = [...formData.slots];
    newSlots[index] = { ...newSlots[index], [field]: value };

    if (field === "startTime") {
      const hour = parseInt(value.split(":")[0]);
      if (hour < 12) {
        newSlots[index].slotType = "MORNING";
      } else if (hour >= 12 && hour < 17) {
        newSlots[index].slotType = "AFTERNOON";
      } else {
        newSlots[index].slotType = "EVENING";
      }
    }

    setFormData({ ...formData, slots: newSlots });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // ✅ CRITICAL: Block submission if both are unchecked
    if (!formData.isDefaultWeekday && !formData.isDefaultWeekend) {
      setError(
        "⚠️ Template must be default for either Weekday or Weekend (or both)",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return; // ❌ STOP HERE - Don't submit!
    }

    // ✅ Validation: Must have at least one slot
    if (formData.slots.length === 0) {
      setError("Please add at least one slot to the template");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        templateType: formData.templateType,
        defaultWeekday: formData.isDefaultWeekday,
        defaultWeekend: formData.isDefaultWeekend,
        slots: formData.slots,
      };

      if (isEdit) {
        const response = await api.put(`/admin/slot-templates/${id}`, payload);
        console.log("✅ Update response:", response.data);
      } else {
        const response = await api.post("/admin/slot-templates", payload);
        console.log("✅ Create response:", response.data);
      }

      setShowSuccessToast(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/admin/slot-templates");
      }, 2000);
    } catch (err: any) {
      console.error("❌ Save failed:", err);
      setError(err.response?.data?.message || "Failed to save template");
      setLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const generateHourlySlots = (
    start: number,
    end: number,
    price: number,
  ): TemplateSlot[] => {
    const slots: TemplateSlot[] = [];
    for (let hour = start; hour < end; hour++) {
      let slotType: "MORNING" | "AFTERNOON" | "EVENING";

      if (hour < 12) {
        slotType = "MORNING";
      } else if (hour >= 12 && hour < 17) {
        slotType = "AFTERNOON";
      } else {
        slotType = "EVENING";
      }

      slots.push({
        startTime: `${hour.toString().padStart(2, "0")}:00`,
        endTime: `${(hour + 1).toString().padStart(2, "0")}:00`,
        price: price,
        lightsRequired: hour >= 17,
        slotType: slotType,
        displayOrder: slots.length + 1,
      });
    }
    return slots;
  };

  const getQuickPresets = () => {
    const allPresets = [
      {
        name: "Early Morning (6 AM - 12 PM)",
        types: ["WEEKDAY", "CUSTOM"],
        action: () =>
          setFormData({ ...formData, slots: generateHourlySlots(6, 12, 500) }),
      },
      {
        name: "Standard Day (8 AM - 4 PM)",
        types: ["WEEKDAY", "CUSTOM"],
        action: () =>
          setFormData({ ...formData, slots: generateHourlySlots(8, 16, 500) }),
      },
      {
        name: "Afternoon Only (12 PM - 5 PM)",
        types: ["WEEKDAY", "WEEKEND", "CUSTOM"],
        action: () =>
          setFormData({ ...formData, slots: generateHourlySlots(12, 17, 500) }),
      },
      {
        name: "Evening Slots (7 PM - 11 PM)",
        types: ["WEEKDAY", "WEEKEND", "HOLIDAY", "CUSTOM"],
        action: () =>
          setFormData({ ...formData, slots: generateHourlySlots(19, 23, 700) }),
      },
      {
        name: "Weekend Extended (7 AM - 11 PM)",
        types: ["WEEKEND", "HOLIDAY"],
        action: () => {
          const morning = generateHourlySlots(7, 17, 500);
          const evening = generateHourlySlots(19, 23, 700);
          setFormData({ ...formData, slots: [...morning, ...evening] });
        },
      },
      {
        name: "Full Day (6 AM - 11 PM)",
        types: ["WEEKDAY", "WEEKEND", "HOLIDAY", "CUSTOM"],
        action: () =>
          setFormData({ ...formData, slots: generateHourlySlots(6, 23, 500) }),
      },
    ];

    // Filter based on current template type
    return allPresets.filter((preset) =>
      preset.types.includes(formData.templateType),
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* SUCCESS TOAST */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
            <CheckCircle size={24} />
            <div>
              <p className="font-semibold">
                {isEdit ? "Template Updated!" : "Template Created!"}
              </p>
              <p className="text-sm text-green-100">
                Redirecting to templates list...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin/slot-templates")}
          className="p-2 hover:bg-gray-100 rounded"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? "Edit Template" : "Create New Template"}
          </h1>
          <p className="text-gray-600 text-sm">
            Define slot timings and pricing for different day types
          </p>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BASIC INFO */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., Standard Weekday Schedule"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              placeholder="Brief description of this template"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Template Type
            </label>
            <select
              value={formData.templateType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  templateType: e.target.value as any,
                })
              }
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="WEEKDAY">Weekday (Mon-Fri)</option>
              <option value="WEEKEND">Weekend (Sat-Sun)</option>
              <option value="HOLIDAY">Holiday</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          {/* ✅ CHECKBOX SECTION WITH DEBUGGING */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Default Template Settings:
            </p>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDefaultWeekday || false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFormData((prev) => ({
                    ...prev,
                    isDefaultWeekday: checked,
                    isDefaultWeekend: checked ? false : prev.isDefaultWeekend,
                  }));
                }}
                className="w-4 h-4"
              />
              <span className="text-sm">Set as default weekday template</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDefaultWeekend || false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFormData((prev) => ({
                    ...prev,
                    isDefaultWeekend: checked,
                    isDefaultWeekday: checked ? false : prev.isDefaultWeekday,
                  }));
                }}
                className="w-4 h-4"
              />
              <span className="text-sm">Set as default weekend template</span>
            </label>

            <p className="text-xs text-gray-500 mt-1">
              ⚠️ At least one must be checked. You cannot select both.
            </p>

            {/* ✅ Show warning if both unchecked */}
            {!formData.isDefaultWeekday && !formData.isDefaultWeekend && (
              <p className="text-xs text-red-600 font-medium mt-2">
                ❌ Please check at least one default option
              </p>
            )}
          </div>
        </div>

        {/* QUICK PRESETS */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Presets</h2>
          <p className="text-sm text-gray-600 mb-3">
            Start with a preset, then customize pricing and timings as needed
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {getQuickPresets().map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={preset.action}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition text-left"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* SLOTS */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Slots ({formData.slots.length})
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                ☀️ Morning: Before 12 PM • 🌤️ Afternoon: 12-5 PM • 🌙 Evening:
                After 5 PM
              </p>
            </div>
            <button
              type="button"
              onClick={addSlot}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus size={18} />
              Add Slot
            </button>
          </div>

          {formData.slots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No slots added yet.</p>
              <p className="text-sm">
                Use a quick preset above or click "Add Slot" to create manually
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.slots.map((slot, index) => (
                <SlotRow
                  key={index}
                  slot={slot}
                  index={index}
                  onUpdate={updateSlot}
                  onRemove={removeSlot}
                />
              ))}
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 justify-end sticky bottom-4 bg-white p-4 rounded-lg shadow-lg border">
          <button
            type="button"
            onClick={() => navigate("/admin/slot-templates")}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <span>{isEdit ? "Update Template" : "Create Template"}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

type SlotRowProps = {
  slot: TemplateSlot;
  index: number;
  onUpdate: (index: number, field: keyof TemplateSlot, value: any) => void;
  onRemove: (index: number) => void;
};

function SlotRow({ slot, index, onUpdate, onRemove }: SlotRowProps) {
  const getSlotIcon = (type: string) => {
    switch (type) {
      case "MORNING":
        return <Sun size={18} className="text-orange-500" />;
      case "AFTERNOON":
        return <CloudSun size={18} className="text-yellow-500" />;
      case "EVENING":
        return <Moon size={18} className="text-blue-600" />;
      default:
        return <Sun size={18} className="text-gray-400" />;
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition">
      <div className="flex items-center gap-2 min-w-[120px]">
        {getSlotIcon(slot.slotType)}
        <span className="text-sm font-medium text-gray-700">
          {slot.slotType === "MORNING" && "Morning"}
          {slot.slotType === "AFTERNOON" && "Afternoon"}
          {slot.slotType === "EVENING" && "Evening"}
        </span>
      </div>

      <input
        type="time"
        value={slot.startTime}
        onChange={(e) => onUpdate(index, "startTime", e.target.value)}
        className="border rounded px-2 py-1 text-sm w-24"
      />
      <span className="text-gray-400">-</span>
      <input
        type="time"
        value={slot.endTime}
        onChange={(e) => onUpdate(index, "endTime", e.target.value)}
        className="border rounded px-2 py-1 text-sm w-24"
      />

      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-500">₹</span>
        <input
          type="number"
          value={slot.price}
          onChange={(e) => onUpdate(index, "price", parseFloat(e.target.value))}
          className="border rounded px-2 py-1 text-sm w-20"
          min="0"
          step="50"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={slot.lightsRequired}
          onChange={(e) => onUpdate(index, "lightsRequired", e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm whitespace-nowrap">💡 Lights</span>
      </label>

      <button
        type="button"
        onClick={() => onRemove(index)}
        className="ml-auto p-2 text-red-600 hover:bg-red-50 rounded"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}

export default CreateEditTemplate;
