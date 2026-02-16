import React, { useState, useEffect } from "react";
import {
  Star,
  Upload,
  Save,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import publicApi from "../../api/publicApi";
import axiosInstance from "../../api/axiosInstance";
import { getImageUrl } from "../../utils/imageUrl";

const StarPerformerSettings = () => {
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
      const response = await axiosInstance.post(
        "/api/admin/settings/star-performer/upload-photo",
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

      await axiosInstance.put("/api/admin/settings", updates);

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
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            Star Performer Settings
          </h2>
          <p className="text-gray-600 mt-1">
            Showcase your academy's outstanding performer
          </p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 animate-fade-in ${
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

        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center gap-3">
              {isEnabled ? (
                <Eye className="w-5 h-5 text-green-600" />
              ) : (
                <EyeOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <span className="font-medium block">
                  {isEnabled ? "Section Enabled" : "Section Disabled"}
                </span>
                <span className="text-sm text-gray-500">
                  {isEnabled
                    ? "Star Performer section is visible on home page"
                    : "Star Performer section is hidden"}
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) =>
                  handleChange(
                    "SECTION_STAR_PERFORMER_ENABLED",
                    e.target.checked,
                  )
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Heading */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Page Heading (Customizable)
            </label>
            <input
              type="text"
              value={settings.STAR_PERFORMER_HEADING}
              onChange={(e) =>
                handleChange("STAR_PERFORMER_HEADING", e.target.value)
              }
              placeholder="Star Performer of the Week"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Examples: "Star Performer of the Week", "Player of the Month",
              "Champion of the Year"
            </p>
          </div>

          {/* Subheading */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subheading
            </label>
            <input
              type="text"
              value={settings.STAR_PERFORMER_SUBHEADING}
              onChange={(e) =>
                handleChange("STAR_PERFORMER_SUBHEADING", e.target.value)
              }
              placeholder="Celebrating excellence and dedication"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Performer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Performer Name *
            </label>
            <input
              type="text"
              value={settings.STAR_PERFORMER_NAME}
              onChange={(e) =>
                handleChange("STAR_PERFORMER_NAME", e.target.value)
              }
              placeholder="Rahul Sharma"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Required to display the performer on home page
            </p>
          </div>

          {/* Achievement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Achievement / Description *
            </label>
            <textarea
              value={settings.STAR_PERFORMER_ACHIEVEMENT}
              onChange={(e) =>
                handleChange("STAR_PERFORMER_ACHIEVEMENT", e.target.value)
              }
              placeholder="Scored a brilliant century in the district championship finals. Showed exceptional technique and temperament under pressure. Selected for state-level trials."
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Performer Photo
            </label>
            <div className="space-y-4">
              {settings.STAR_PERFORMER_PHOTO_URL && (
                <div className="flex justify-center">
                  <div className="relative">
                    <img
                      src={getImageUrl(settings.STAR_PERFORMER_PHOTO_URL)}
                      alt="Star Performer"
                      className="w-48 h-48 object-cover rounded-lg shadow-lg"
                    />
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                      <CheckCircle size={16} />
                    </div>
                  </div>
                </div>
              )}
              <label
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition border-2 border-dashed ${
                  uploading
                    ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                    : "bg-blue-50 text-blue-600 border-blue-300 hover:bg-blue-100"
                }`}
              >
                <Upload className="w-5 h-5" />
                <span className="font-medium">
                  {uploading
                    ? "Uploading..."
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
              <p className="text-xs text-gray-500 text-center">
                Recommended: Square image, at least 400x400px. Max 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={() => window.location.reload()}
            disabled={saving}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-md hover:shadow-lg"
          >
            <Save className="w-5 h-5" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StarPerformerSettings;
