import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import { Plus, Trash2 } from "lucide-react";

function CampTypeSettings() {
  const [campTypes, setCampTypes] = useState<string[]>([]);
  const [newCampType, setNewCampType] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCampTypes();
  }, []);

  const loadCampTypes = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/settings/camp-types");
      setCampTypes(response.data);
    } catch (error) {
      console.error("Failed to load camp types:", error);
      toast.error("Failed to load camp types");
    } finally {
      setLoading(false);
    }
  };

  const addCampType = () => {
    if (!newCampType.trim()) {
      toast.error("Camp type name is required");
      return;
    }

    // Convert to uppercase with underscores and add _CAMP suffix
    const formattedType =
      newCampType.trim().toUpperCase().replace(/\s+/g, "_") + "_CAMP";

    if (campTypes.includes(formattedType)) {
      toast.error("This camp type already exists");
      return;
    }

    setCampTypes([...campTypes, formattedType]);
    setNewCampType("");
  };

  const removeCampType = (type: string) => {
    if (campTypes.length <= 1) {
      toast.error("At least one camp type must remain");
      return;
    }
    setCampTypes(campTypes.filter((t) => t !== type));
  };

  const saveCampTypes = async () => {
    try {
      setSaving(true);
      await api.put("/admin/settings/camp-types", campTypes);
      toast.success("Camp types updated successfully!");
    } catch (error) {
      console.error("Failed to save camp types:", error);
      toast.error("Failed to save camp types");
    } finally {
      setSaving(false);
    }
  };

  const formatDisplayName = (type: string): string => {
    return type
      .replace(/_CAMP$/, "")
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Camp Type Settings
        </h3>
        <p className="text-sm text-slate-600">
          Configure available camp types for your academy
        </p>
      </div>

      {/* Add new camp type */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Add New Camp Type
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCampType}
            onChange={(e) => setNewCampType(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addCampType()}
            placeholder="e.g., Fitness, Advanced, Wicket Keeping"
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
          <button
            onClick={addCampType}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <Plus size={18} />
            Add
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Enter a descriptive name. It will be automatically formatted (e.g.,
          "Fitness" becomes "FITNESS_CAMP")
        </p>
      </div>

      {/* List existing camp types */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h4 className="font-medium text-slate-900 mb-3">
          Current Camp Types ({campTypes.length})
        </h4>

        {campTypes.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-4 text-center">
            No camp types configured
          </p>
        ) : (
          <div className="space-y-2">
            {campTypes.map((type, index) => (
              <div
                key={type}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-500">
                    {index + 1}.
                  </span>
                  <div>
                    <span className="font-medium text-slate-900">
                      {formatDisplayName(type)}
                    </span>
                    <span className="ml-2 text-xs text-slate-500">
                      ({type})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeCampType(type)}
                  className="flex items-center gap-1 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          onClick={loadCampTypes}
          className="px-6 py-2 rounded-lg font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={saveCampTypes}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>Save Settings</>
          )}
        </button>
      </div>
    </div>
  );
}

export default CampTypeSettings;
