import React, { useState, useEffect } from "react";
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
import axiosInstance from "../../api/axiosInstance";

const ContactInfoSettings = () => {
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
        axiosInstance.put(`/api/admin/settings/${key}`, { value }),
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
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            Contact Information
          </h2>
          <p className="text-gray-600 mt-1">
            Update your academy's contact details displayed on the website
          </p>
        </div>

        {/* ✅ SECTION STATUS INDICATOR */}
        <div className="mb-6">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-green-600" />
              <div>
                <span className="font-medium block">
                  Section Always Visible
                </span>
                <span className="text-sm text-gray-500">
                  Contact section is always shown on home page
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500">No toggle available</div>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Address Line 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address Line 1
            </label>
            <input
              type="text"
              value={settings.CONTACT_ADDRESS_LINE1}
              onChange={(e) =>
                handleChange("CONTACT_ADDRESS_LINE1", e.target.value)
              }
              placeholder="123 Cricket Lane"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address Line 2
            </label>
            <input
              type="text"
              value={settings.CONTACT_ADDRESS_LINE2}
              onChange={(e) =>
                handleChange("CONTACT_ADDRESS_LINE2", e.target.value)
              }
              placeholder="Bangalore, Karnataka 560001"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </label>
            <input
              type="tel"
              value={settings.CONTACT_PHONE}
              onChange={(e) => handleChange("CONTACT_PHONE", e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Address
            </label>
            <input
              type="email"
              value={settings.CONTACT_EMAIL}
              onChange={(e) => handleChange("CONTACT_EMAIL", e.target.value)}
              placeholder="info@nca-academy.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Working Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Working Hours
            </label>
            <input
              type="text"
              value={settings.CONTACT_HOURS}
              onChange={(e) => handleChange("CONTACT_HOURS", e.target.value)}
              placeholder="Mon-Sun: 6 AM - 9 PM"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Save className="w-5 h-5" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactInfoSettings;
