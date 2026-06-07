import { useState, useEffect } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Save,
  AlertCircle,
  CheckCircle,
  Eye,
} from "lucide-react";
import publicApi from "../../api/publicApi";
import api from "../../api/axios";
import PresenceBanner from "../../components/PresenceBanner";
import { useAuth } from "../../auth/useAuth";

const ContactInfoSettings = () => {
  const { academyId } = useAuth();
  const [settings, setSettings] = useState({
    CONTACT_ADDRESS_LINE1: "",
    CONTACT_ADDRESS_LINE2: "",
    CONTACT_PHONE: "",
    CONTACT_EMAIL: "",
    CONTACT_HOURS: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await publicApi.get("/settings/public");
      const data = response.data;

      setSettings({
        CONTACT_ADDRESS_LINE1: data.CONTACT_ADDRESS_LINE1 || "",
        CONTACT_ADDRESS_LINE2: data.CONTACT_ADDRESS_LINE2 || "",
        CONTACT_PHONE: data.CONTACT_PHONE || "",
        CONTACT_EMAIL: data.CONTACT_EMAIL || "",
        CONTACT_HOURS: data.CONTACT_HOURS || "",
      });

      setLoading(false);
    } catch (error) {
      console.error("Error loading settings:", error);
      setMessage({ type: "error", text: "Failed to load settings" });
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      // Save each setting individually
      const updates = Object.entries(settings).map(([key, value]) =>
        api.put(`/admin/settings/${key}`, { value }),
      );

      await Promise.all(updates);

      setMessage({
        type: "success",
        text: "Contact information saved successfully!",
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Failed to save settings" });
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 tracking-tight">
          <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
          Contact Information
        </h2>
        <PresenceBanner entity="branches-tab" id={academyId ?? undefined} />
        <p className="text-sm text-gray-500 mt-0.5">
          Update your academy's contact details displayed on the website
        </p>
      </div>

      {/* Section status */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <span className="font-semibold text-sm text-gray-800 block">
              Section Always Visible
            </span>
            <span className="text-xs text-gray-500">
              Contact section is always shown on home page
            </span>
          </div>
        </div>
        <span className="text-xs text-gray-400 hidden sm:block">No toggle</span>
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
          <span>{message.text}</span>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-5">
        {/* Address Line 1 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            Address Line 1
          </label>
          <input
            type="text"
            value={settings.CONTACT_ADDRESS_LINE1}
            onChange={(e) =>
              handleChange("CONTACT_ADDRESS_LINE1", e.target.value)
            }
            placeholder="123 Cricket Lane"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
          />
        </div>

        {/* Address Line 2 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            Address Line 2
          </label>
          <input
            type="text"
            value={settings.CONTACT_ADDRESS_LINE2}
            onChange={(e) =>
              handleChange("CONTACT_ADDRESS_LINE2", e.target.value)
            }
            placeholder="Bangalore, Karnataka 560001"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              Phone Number
            </label>
            <input
              type="tel"
              value={settings.CONTACT_PHONE}
              onChange={(e) => handleChange("CONTACT_PHONE", e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              Email Address
            </label>
            <input
              type="email"
              value={settings.CONTACT_EMAIL}
              onChange={(e) => handleChange("CONTACT_EMAIL", e.target.value)}
              placeholder="info@nca-academy.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
            />
          </div>
        </div>

        {/* Working Hours */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            Working Hours
          </label>
          <input
            type="text"
            value={settings.CONTACT_HOURS}
            onChange={(e) => handleChange("CONTACT_HOURS", e.target.value)}
            placeholder="Mon-Sun: 6 AM - 9 PM"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
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

export default ContactInfoSettings;
