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
  price60Balls?: number;
  price120Balls?: number;
  lightsRequired: boolean;
  slotType: "MORNING" | "AFTERNOON" | "EVENING";
  displayOrder: number;
};

type ResourceCategory = "TURF_ASTRO" | "BOWLING_MACHINE";

type TemplateFormData = {
  name: string;
  description: string;
  templateType: "WEEKDAY" | "WEEKEND" | "HOLIDAY" | "CUSTOM";
  resourceCategory: ResourceCategory;
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
    resourceCategory: "TURF_ASTRO",
    isDefaultWeekday: false,
    isDefaultWeekend: false,
    slots: [],
  });

  const isBowling = formData.resourceCategory === "BOWLING_MACHINE";

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const response = await api.get(`/admin/slot-templates/${id}`);
        const data = response.data;
        // Detect bowling machine template from slots having price60Balls
        setFormData({
          name: data.name,
          description: data.description,
          templateType: data.templateType,
          resourceCategory: (data.resourceType === "BOWLING_MACHINE"
            ? "BOWLING_MACHINE"
            : "TURF_ASTRO") as ResourceCategory,
          isDefaultWeekday: data.defaultWeekday || false,
          isDefaultWeekend: data.defaultWeekend || false,
          slots: data.slots || [],
        });
      } catch (error) {
        console.error("Failed to load template:", error);
        alert("Failed to load template");
        navigate("/admin/slot-templates");
      }
    };
    if (isEdit) loadTemplate();
  }, [id]);

  const addSlot = () => {
    const newSlot: TemplateSlot = isBowling
      ? {
          startTime: "06:00",
          endTime: "06:15",
          price: 0,
          price60Balls: 300,
          price120Balls: 500,
          lightsRequired: false,
          slotType: "MORNING",
          displayOrder: formData.slots.length + 1,
        }
      : {
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
      if (hour < 12) newSlots[index].slotType = "MORNING";
      else if (hour < 17) newSlots[index].slotType = "AFTERNOON";
      else newSlots[index].slotType = "EVENING";

      // Auto-set end time for bowling (always +15 min)
      if (isBowling) {
        const [h, m] = value.split(":").map(Number);
        const totalMin = h * 60 + m + 15;
        const endH = Math.floor(totalMin / 60) % 24;
        const endM = totalMin % 60;
        newSlots[index].endTime =
          `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
      }
    }
    setFormData({ ...formData, slots: newSlots });
  };

  // When switching resource category, clear slots to avoid confusion
  const handleCategoryChange = (cat: ResourceCategory) => {
    setFormData({ ...formData, resourceCategory: cat, slots: [] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !isBowling &&
      !formData.isDefaultWeekday &&
      !formData.isDefaultWeekend
    ) {
      setError("⚠️ Template must be default for either Weekday or Weekend");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
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
        resourceType: formData.resourceCategory,
        defaultWeekday: formData.isDefaultWeekday,
        defaultWeekend: formData.isDefaultWeekend,
        slots: formData.slots,
      };

      if (isEdit) {
        await api.put(`/admin/slot-templates/${id}`, payload);
      } else {
        await api.post("/admin/slot-templates", payload);
      }

      setShowSuccessToast(true);
      setTimeout(() => navigate("/admin/slot-templates"), 2000);
    } catch (err: any) {
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
      if (hour < 12) slotType = "MORNING";
      else if (hour < 17) slotType = "AFTERNOON";
      else slotType = "EVENING";
      slots.push({
        startTime: `${hour.toString().padStart(2, "0")}:00`,
        endTime: `${(hour + 1).toString().padStart(2, "0")}:00`,
        price,
        lightsRequired: hour >= 17,
        slotType,
        displayOrder: slots.length + 1,
      });
    }
    return slots;
  };

  const generate15MinSlots = (
    start: number,
    end: number,
    p60: number,
    p120: number,
  ): TemplateSlot[] => {
    const slots: TemplateSlot[] = [];
    for (let totalMin = start * 60; totalMin < end * 60; totalMin += 15) {
      const hour = Math.floor(totalMin / 60);
      const min = totalMin % 60;
      const endMin = totalMin + 15;
      const endHour = Math.floor(endMin / 60);
      const endMinute = endMin % 60;
      let slotType: "MORNING" | "AFTERNOON" | "EVENING";
      if (hour < 12) slotType = "MORNING";
      else if (hour < 17) slotType = "AFTERNOON";
      else slotType = "EVENING";
      slots.push({
        startTime: `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`,
        endTime: `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`,
        price: 0,
        price60Balls: p60,
        price120Balls: p120,
        lightsRequired: hour >= 17,
        slotType,
        displayOrder: slots.length + 1,
      });
    }
    return slots;
  };

  const getQuickPresets = () => {
    if (isBowling) {
      return [
        {
          name: "Morning (6 AM–12 PM)",
          action: () =>
            setFormData({
              ...formData,
              slots: generate15MinSlots(6, 12, 300, 500),
            }),
        },
        {
          name: "Full Day (6 AM–11 PM)",
          action: () =>
            setFormData({
              ...formData,
              slots: generate15MinSlots(6, 23, 300, 500),
            }),
        },
        {
          name: "Standard (8 AM–8 PM)",
          action: () =>
            setFormData({
              ...formData,
              slots: generate15MinSlots(8, 20, 300, 500),
            }),
        },
      ];
    }
    const allPresets = [
      {
        name: "Early Morning (6 AM–12 PM)",
        types: ["WEEKDAY", "CUSTOM"],
        action: () =>
          setFormData({ ...formData, slots: generateHourlySlots(6, 12, 500) }),
      },
      {
        name: "Standard Day (8 AM–4 PM)",
        types: ["WEEKDAY", "CUSTOM"],
        action: () =>
          setFormData({ ...formData, slots: generateHourlySlots(8, 16, 500) }),
      },
      {
        name: "Afternoon Only (12–5 PM)",
        types: ["WEEKDAY", "WEEKEND", "CUSTOM"],
        action: () =>
          setFormData({ ...formData, slots: generateHourlySlots(12, 17, 500) }),
      },
      {
        name: "Evening Slots (7–11 PM)",
        types: ["WEEKDAY", "WEEKEND", "HOLIDAY", "CUSTOM"],
        action: () =>
          setFormData({ ...formData, slots: generateHourlySlots(19, 23, 700) }),
      },
      {
        name: "Weekend Extended (7 AM–11 PM)",
        types: ["WEEKEND", "HOLIDAY"],
        action: () => {
          const morning = generateHourlySlots(7, 17, 500);
          const evening = generateHourlySlots(19, 23, 700);
          setFormData({ ...formData, slots: [...morning, ...evening] });
        },
      },
      {
        name: "Full Day (6 AM–11 PM)",
        types: ["WEEKDAY", "WEEKEND", "HOLIDAY", "CUSTOM"],
        action: () =>
          setFormData({ ...formData, slots: generateHourlySlots(6, 23, 500) }),
      },
    ];
    return allPresets.filter((p) => p.types.includes(formData.templateType));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-24">
      {/* SUCCESS TOAST */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-50">
          <div className="bg-green-500 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg flex items-center gap-3">
            <CheckCircle size={22} className="flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm sm:text-base">
                {isEdit ? "Template Updated!" : "Template Created!"}
              </p>
              <p className="text-xs sm:text-sm text-green-100">
                Redirecting to templates list...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={() => navigate("/admin/slot-templates")}
          className="p-2 hover:bg-gray-100 rounded flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            {isEdit ? "Edit Template" : "Create New Template"}
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm">
            Define slot timings and pricing for different day types
          </p>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* BASIC INFO */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4">
          <h2 className="text-base sm:text-lg font-semibold">
            Basic Information
          </h2>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Template Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g., Standard Weekday Schedule"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={2}
              placeholder="Brief description of this template"
            />
          </div>

          {/* RESOURCE CATEGORY */}
          {/* RESOURCE CATEGORY */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Resource Type
            </label>
            {isEdit ? (
              // Read-only on edit — cannot change resource type of existing template
              <div
                className={`rounded-xl border-2 p-3 ${
                  isBowling
                    ? "bg-blue-50 border-blue-500"
                    : "bg-gray-50 border-gray-300"
                }`}
              >
                <p
                  className={`font-semibold text-sm ${isBowling ? "text-blue-700" : "text-gray-800"}`}
                >
                  {isBowling ? "🎯 Bowling Machine" : "🏏 Turf / Astro"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Resource type cannot be changed after creation
                </p>
              </div>
            ) : (
              // Selectable only on create
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: "TURF_ASTRO",
                    label: "🏏 Turf / Astro",
                    desc: "1-hour slots, single price",
                  },
                  {
                    id: "BOWLING_MACHINE",
                    label: "🎯 Bowling Machine",
                    desc: "15-min slots, 60/120 ball pricing",
                  },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      handleCategoryChange(cat.id as ResourceCategory)
                    }
                    className={`rounded-xl border-2 p-3 text-left transition-all
            ${
              formData.resourceCategory === cat.id
                ? "bg-blue-50 border-blue-500"
                : "border-gray-200 hover:border-blue-300"
            }`}
                  >
                    <p
                      className={`font-semibold text-sm ${formData.resourceCategory === cat.id ? "text-blue-700" : "text-gray-800"}`}
                    >
                      {cat.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{cat.desc}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
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
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="WEEKDAY">Weekday (Mon–Fri)</option>
              <option value="WEEKEND">Weekend (Sat–Sun)</option>
              <option value="HOLIDAY">Holiday</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          {!isBowling && (
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
              <p className="text-xs text-gray-500">
                ⚠️ At least one must be checked. You cannot select both.
              </p>
              {!formData.isDefaultWeekday && !formData.isDefaultWeekend && (
                <p className="text-xs text-red-600 font-medium">
                  ❌ Please check at least one default option
                </p>
              )}
            </div>
          )}
        </div>

        {/* QUICK PRESETS */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-1">
            Quick Presets
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-3">
            Start with a preset, then customize as needed
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
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
          {isBowling && (
            <p className="text-xs text-blue-600 mt-2 bg-blue-50 rounded-lg px-3 py-2">
              🎯 Bowling presets generate 15-minute slots automatically. Prices
              default to ₹300/60 balls and ₹500/120 balls — adjust per slot as
              needed.
            </p>
          )}
        </div>

        {/* SLOTS */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold">
                Slots ({formData.slots.length})
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                ☀️ Before 12 PM &nbsp;•&nbsp; 🌤️ 12–5 PM &nbsp;•&nbsp; 🌙 After
                5 PM
                {isBowling && (
                  <span className="text-blue-600">
                    {" "}
                    &nbsp;•&nbsp; 15-min intervals
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={addSlot}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus size={16} />
              <span>Add Slot</span>
            </button>
          </div>

          {formData.slots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm mb-1">No slots added yet.</p>
              <p className="text-xs text-gray-400">
                Use a quick preset above or click "Add Slot"
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.slots.map((slot, index) => (
                <SlotRow
                  key={index}
                  slot={slot}
                  index={index}
                  isBowling={isBowling}
                  onUpdate={updateSlot}
                  onRemove={removeSlot}
                />
              ))}
            </div>
          )}
        </div>

        {/* ACTIONS - sticky bottom */}
        <div className="fixed bottom-0 left-0 right-0 sm:static bg-white px-4 py-3 sm:p-4 border-t sm:border sm:rounded-lg sm:shadow-lg flex gap-3 justify-end z-40">
          <button
            type="button"
            onClick={() => navigate("/admin/slot-templates")}
            className="flex-1 sm:flex-none px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 text-sm"
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
                Saving...
              </>
            ) : isEdit ? (
              "Update Template"
            ) : (
              "Create Template"
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
  isBowling: boolean;
  onUpdate: (index: number, field: keyof TemplateSlot, value: any) => void;
  onRemove: (index: number) => void;
};

function SlotRow({ slot, index, isBowling, onUpdate, onRemove }: SlotRowProps) {
  const getSlotIcon = (type: string) => {
    switch (type) {
      case "MORNING":
        return <Sun size={16} className="text-orange-500" />;
      case "AFTERNOON":
        return <CloudSun size={16} className="text-yellow-500" />;
      case "EVENING":
        return <Moon size={16} className="text-blue-600" />;
      default:
        return <Sun size={16} className="text-gray-400" />;
    }
  };

  const slotLabel =
    slot.slotType === "MORNING"
      ? "Morning"
      : slot.slotType === "AFTERNOON"
        ? "Afternoon"
        : "Evening";

  return (
    <div className="border rounded-lg bg-gray-50 p-3 space-y-3">
      {/* Row 1: Type label + delete */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getSlotIcon(slot.slotType)}
          <span className="text-sm font-medium text-gray-700">{slotLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Row 2: Times */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">
            Start
          </label>
          <input
            type="time"
            value={slot.startTime}
            onChange={(e) => onUpdate(index, "startTime", e.target.value)}
            className="border rounded px-2 py-1 text-sm w-28"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">End</label>
          <input
            type="time"
            value={slot.endTime}
            onChange={(e) => onUpdate(index, "endTime", e.target.value)}
            className="border rounded px-2 py-1 text-sm w-28"
            readOnly={isBowling}
          />
          {isBowling && <span className="text-xs text-gray-400">(auto)</span>}
        </div>
      </div>

      {/* Row 3: Price fields */}
      {isBowling ? (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 whitespace-nowrap">
              ₹ 60 balls
            </span>
            <input
              type="number"
              value={slot.price60Balls ?? ""}
              onChange={(e) =>
                onUpdate(index, "price60Balls", parseFloat(e.target.value))
              }
              className="border rounded px-2 py-1 text-sm w-20"
              min="0"
              step="50"
              placeholder="300"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 whitespace-nowrap">
              ₹ 120 balls
            </span>
            <input
              type="number"
              value={slot.price120Balls ?? ""}
              onChange={(e) =>
                onUpdate(index, "price120Balls", parseFloat(e.target.value))
              }
              className="border rounded px-2 py-1 text-sm w-20"
              min="0"
              step="50"
              placeholder="500"
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">₹</span>
          <input
            type="number"
            value={slot.price}
            onChange={(e) =>
              onUpdate(index, "price", parseFloat(e.target.value))
            }
            className="border rounded px-2 py-1 text-sm w-20"
            min="0"
            step="50"
          />
        </div>
      )}

      {/* Row 4: Lights toggle */}
      <label className="flex items-center gap-2 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={slot.lightsRequired}
          onChange={(e) => onUpdate(index, "lightsRequired", e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm text-gray-700">💡 Lights required</span>
      </label>
    </div>
  );
}

export default CreateEditTemplate;
