import React, { useState, useEffect } from "react";
import { Star, Upload, Save, AlertCircle, CheckCircle } from "lucide-react";
import publicApi from "../../api/publicApi";
import api from "../../api/axios";
import { getImageUrl } from "../../utils/imageUrl";
import PresenceBanner from "../../components/PresenceBanner";
import { useAuth } from "../../auth/useAuth";

const StarPerformerSettings = () => {
  const { academyId } = useAuth();
  const [settings, setSettings] = useState({
    SECTION_STAR_PERFORMER_ENABLED: "",
    STAR_PERFORMER_HEADING: "",
    STAR_PERFORMER_SUBHEADING: "",
    STAR_PERFORMER_NAME: "",
    STAR_PERFORMER_ACHIEVEMENT: "",
    STAR_PERFORMER_PHOTO_URL: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await publicApi.get("/settings/public");
      const data = response.data;

      setSettings({
        SECTION_STAR_PERFORMER_ENABLED:
          data.SECTION_STAR_PERFORMER_ENABLED || "false",
        STAR_PERFORMER_HEADING:
          data.STAR_PERFORMER_HEADING || "Star Performer of the Week",
        STAR_PERFORMER_SUBHEADING:
          data.STAR_PERFORMER_SUBHEADING ||
          "Celebrating excellence and dedication",
        STAR_PERFORMER_NAME: data.STAR_PERFORMER_NAME || "",
        STAR_PERFORMER_ACHIEVEMENT: data.STAR_PERFORMER_ACHIEVEMENT || "",
        STAR_PERFORMER_PHOTO_URL: data.STAR_PERFORMER_PHOTO_URL || "",
      });

      setLoading(false);
    } catch (error) {
      console.error("Error loading settings:", error);
      setMessage({ type: "error", text: "Failed to load settings" });
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: String(value) }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage({ type: "", text: "" }); // Clear previous messages

    const fd = new FormData();
    fd.append("file", file);

    try {
      const response = await api.post(
        "/admin/settings/star-performer/upload-photo",
        fd,
      );
      setSettings((prev) => ({
        ...prev,
        STAR_PERFORMER_PHOTO_URL: response.data,
      }));
      setMessage({
        type: "success",
        text: "Photo uploaded successfully!",
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      console.error("Error uploading photo:", error);
      setMessage({ type: "error", text: "Failed to upload photo" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: "", text: "" }); // Clear previous messages

    try {
      // Save all settings using batch update endpoint
      const updates = {
        SECTION_STAR_PERFORMER_ENABLED: settings.SECTION_STAR_PERFORMER_ENABLED,
        STAR_PERFORMER_HEADING: settings.STAR_PERFORMER_HEADING,
        STAR_PERFORMER_SUBHEADING: settings.STAR_PERFORMER_SUBHEADING,
        STAR_PERFORMER_NAME: settings.STAR_PERFORMER_NAME,
        STAR_PERFORMER_ACHIEVEMENT: settings.STAR_PERFORMER_ACHIEVEMENT,
        STAR_PERFORMER_PHOTO_URL: settings.STAR_PERFORMER_PHOTO_URL,
      };

      await api.put("/admin/settings", updates);

      setMessage({
        type: "success",
        text: "Star Performer settings saved successfully! ✓",
      });

      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);

      // Reload settings to confirm
      await loadSettings();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to save settings. Please try again.";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isEnabled = settings.SECTION_STAR_PERFORMER_ENABLED === "true";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 tracking-tight">
          <Star className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          Star Performer Settings
        </h2>
        <PresenceBanner
          entity="branches-tab"
          id={academyId ?? undefined}
        />
        <p className="text-sm text-gray-500 mt-0.5">
          Showcase your academy's outstanding performer
        </p>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm shadow-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {/* Toggle */}
        <label className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-gray-50 transition rounded-t-xl">
          <div>
            <span className="font-semibold text-sm text-gray-800 block">Section Enabled</span>
            <p className="text-xs text-gray-500 mt-0.5">
              Star Performer section is visible on home page
            </p>
          </div>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) =>
              handleChange("SECTION_STAR_PERFORMER_ENABLED", e.target.checked)
            }
            className="w-5 h-5 text-blue-600 rounded accent-blue-600 flex-shrink-0"
          />
        </label>

        {/* Heading & Subheading */}
        <div className="p-4 sm:p-5 space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Section Labels</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Page Heading
              </label>
              <input
                type="text"
                value={settings.STAR_PERFORMER_HEADING}
                onChange={(e) =>
                  handleChange("STAR_PERFORMER_HEADING", e.target.value)
                }
                placeholder="Star Performer of the Week"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
              />
              <p className="text-xs text-gray-400 mt-1">
                e.g. "Player of the Month", "Champion of the Year"
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Subheading
              </label>
              <input
                type="text"
                value={settings.STAR_PERFORMER_SUBHEADING}
                onChange={(e) =>
                  handleChange("STAR_PERFORMER_SUBHEADING", e.target.value)
                }
                placeholder="Celebrating excellence and dedication"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
              />
            </div>
          </div>
        </div>

        {/* Performer Details */}
        <div className="p-4 sm:p-5 space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Performer Details</h3>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Performer Name *
            </label>
            <input
              type="text"
              value={settings.STAR_PERFORMER_NAME}
              onChange={(e) =>
                handleChange("STAR_PERFORMER_NAME", e.target.value)
              }
              placeholder="Rahul Sharma"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
            />
            <p className="text-xs text-gray-400 mt-1">
              Required to display the performer on home page
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Achievement / Description *
            </label>
            <textarea
              value={settings.STAR_PERFORMER_ACHIEVEMENT}
              onChange={(e) =>
                handleChange("STAR_PERFORMER_ACHIEVEMENT", e.target.value)
              }
              placeholder="Scored a brilliant century in the district championship finals…"
              rows={5}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition resize-none"
            />
          </div>
        </div>

        {/* Photo Upload */}
        <div className="p-4 sm:p-5 space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Performer Photo</h3>

          <div className="space-y-3">
            {settings.STAR_PERFORMER_PHOTO_URL && (
              <div className="flex justify-center">
                <div className="relative">
                  <img
                    src={getImageUrl(settings.STAR_PERFORMER_PHOTO_URL) || ""}
                    alt="Star Performer"
                    className="w-40 h-40 sm:w-48 sm:h-48 object-cover rounded-xl shadow-md border border-gray-100"
                  />
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                    <CheckCircle size={14} />
                  </div>
                </div>
              </div>
            )}
            <label
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition border-2 border-dashed text-sm font-medium ${
                uploading
                  ? "bg-gray-50 border-gray-200 cursor-not-allowed text-gray-400"
                  : "bg-blue-50 text-blue-600 border-blue-300 hover:bg-blue-100"
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>
                {uploading
                  ? "Uploading…"
                  : settings.STAR_PERFORMER_PHOTO_URL
                    ? "Change Photo"
                    : "Upload Photo"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-400 text-center">
              Recommended: Square image, at least 400×400px. Max 5MB.
            </p>
          </div>
        </div>

        {/* Save Buttons */}
        <div className="px-4 sm:px-5 py-4 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button
            onClick={loadSettings}
            disabled={saving}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StarPerformerSettings;
