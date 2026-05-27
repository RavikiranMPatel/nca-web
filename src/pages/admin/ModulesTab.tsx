import { toast } from "react-hot-toast";
import api from "../../api/axios";
import { useFeatureFlags } from "../../components/FeatureFlagContext";

type ModuleItem = {
  key: string;
  label: string;
  description: string;
};

type ModuleGroup = {
  label: string;
  modules: ModuleItem[];
};

const MODULE_GROUPS: ModuleGroup[] = [
  {
    label: "Cricket Management",
    modules: [
      {
        key: "MODULE_PERFORMANCE_ENABLED",
        label: "Performance",
        description: "Player skill assessments",
      },
      {
        key: "SECTION_CRICKET_STATS_ENABLED",
        label: "Cricket Stats",
        description: "Match batting & bowling records",
      },
      {
        key: "MODULE_BATCHES_ENABLED",
        label: "Batches",
        description: "Training batch management",
      },
      {
        key: "MODULE_ENQUIRIES_ENABLED",
        label: "Enquiries",
        description: "Player enquiry tracking",
      },
      {
        key: "MODULE_COACHING_ENABLED",
        label: "1-on-1 Coaching",
        description: "Individual coaching sessions",
      },
      {
        key: "MODULE_MATCHES_ENABLED",
        label: "Matches & Scoring",
        description: "Live scoring & scorecards",
      },
      {
        key: "MODULE_TOURNAMENTS_ENABLED",
        label: "Tournaments",
        description: "Fixtures & standings",
      },
    ],
  },
  {
    label: "Slot & Booking",
    modules: [
      {
        key: "MODULE_SLOT_TEMPLATES_ENABLED",
        label: "Slot Templates",
        description: "Slot timings & pricing",
      },
      {
        key: "MODULE_BOOKINGS_ENABLED",
        label: "All Bookings",
        description: "User bookings & payments",
      },
      {
        key: "MODULE_BM_MEMBERS_ENABLED",
        label: "BM Members",
        description: "Bowling machine subscribers",
      },
      {
        key: "MODULE_CALENDAR_OVERRIDES_ENABLED",
        label: "Calendar View",
        description: "Date overrides & holidays",
      },
      {
        key: "MODULE_RESOURCES_ENABLED",
        label: "Resources",
        description: "Wickets & courts",
      },
    ],
  },
  {
    label: "Other",
    modules: [
      {
        key: "MODULE_HOME_SLIDER_ENABLED",
        label: "Home Slider",
        description: "Homepage banners",
      },
      {
        key: "SUMMER_CAMP_ENABLED",
        label: "Camps",
        description: "Camp programs & enrollments",
      },
      {
        key: "MODULE_REVENUE_ENABLED",
        label: "Revenue",
        description: "Fees & booking payments",
      },
    ],
  },
];

export default function ModulesTab() {
  const flags = useFeatureFlags();

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await api.put("/admin/settings", { [key]: String(value) });
      toast.success(`${value ? "Enabled" : "Disabled"} successfully`);
      // reload flags by refreshing the page context
      window.dispatchEvent(new Event("feature-flags-changed"));
    } catch {
      toast.error("Failed to update module");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          Module Visibility
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Control which features appear on the admin dashboard.
        </p>
      </div>

      {MODULE_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 pb-1.5 border-b border-gray-200">
            {group.label}
          </p>
          <div className="space-y-2">
            {group.modules.map(({ key, label, description }) => {
              const enabled = flags[key] ?? true;
              return (
                <label
                  key={key}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                    enabled
                      ? "bg-white border-gray-200"
                      : "bg-gray-50 border-gray-200 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        enabled ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    <div>
                      <span className="font-medium text-sm text-gray-900">
                        {label}
                      </span>
                      <p className="text-xs text-gray-500">{description}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => handleToggle(key, e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded flex-shrink-0"
                  />
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
