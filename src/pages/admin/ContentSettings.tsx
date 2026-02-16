import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Users,
  FileText,
  Image,
  Save,
  AlertCircle,
  CheckCircle,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  Info,
} from "lucide-react";
import publicApi from "../../api/publicApi";
import axiosInstance from "../../api/axiosInstance";

const ContentSettings = () => {
  const [settings, setSettings] = useState({
    // Testimonials Section
    TESTIMONIALS_HEADING: "",
    TESTIMONIALS_SUBHEADING: "",

    // News Section
    NEWS_HEADING: "",
    NEWS_SUBHEADING: "",

    // Gallery Section
    GALLERY_HEADING: "",
    GALLERY_SUBHEADING: "",

    // Social Media
    SOCIAL_FACEBOOK: "",
    SOCIAL_TWITTER: "",
    SOCIAL_INSTAGRAM: "",
    SOCIAL_YOUTUBE: "",
    SOCIAL_LINKEDIN: "",
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
        TESTIMONIALS_HEADING:
          data.TESTIMONIALS_HEADING || "What Our Students Say",
        TESTIMONIALS_SUBHEADING:
          data.TESTIMONIALS_SUBHEADING ||
          "Real success stories from our cricket family",
        NEWS_HEADING: data.NEWS_HEADING || "Latest News & Updates",
        NEWS_SUBHEADING:
          data.NEWS_SUBHEADING ||
          "Stay updated with our latest achievements and announcements",
        GALLERY_HEADING: data.GALLERY_HEADING || "Gallery",
        GALLERY_SUBHEADING:
          data.GALLERY_SUBHEADING ||
          "Glimpses from our training sessions and tournaments",
        SOCIAL_FACEBOOK: data.SOCIAL_FACEBOOK || "",
        SOCIAL_TWITTER: data.SOCIAL_TWITTER || "",
        SOCIAL_INSTAGRAM: data.SOCIAL_INSTAGRAM || "",
        SOCIAL_YOUTUBE: data.SOCIAL_YOUTUBE || "",
        SOCIAL_LINKEDIN: data.SOCIAL_LINKEDIN || "",
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
        text: "Content settings saved successfully!",
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
            <FileText className="w-6 h-6 text-blue-600" />
            Content & Social Media Settings
          </h2>
          <p className="text-gray-600 mt-1">
            Customize homepage section headings and social media links
          </p>
        </div>

        {/* ✅ INFO BOX */}
        <div className="mb-6">
          <div className="flex items-start gap-3 p-4 border border-blue-200 rounded-lg bg-blue-50">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Section Visibility</p>
              <p>
                Section visibility is controlled in the{" "}
                <span className="font-semibold">Home Page</span> settings tab.
                These settings only customize the headings and content for each
                section.
              </p>
            </div>
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

        <div className="space-y-8">
          {/* TESTIMONIALS SECTION */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Testimonials Section
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section Heading
                </label>
                <input
                  type="text"
                  value={settings.TESTIMONIALS_HEADING}
                  onChange={(e) =>
                    handleChange("TESTIMONIALS_HEADING", e.target.value)
                  }
                  placeholder="What Our Students Say"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subheading
                </label>
                <input
                  type="text"
                  value={settings.TESTIMONIALS_SUBHEADING}
                  onChange={(e) =>
                    handleChange("TESTIMONIALS_SUBHEADING", e.target.value)
                  }
                  placeholder="Real success stories from our cricket family"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* NEWS SECTION */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              News Section
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section Heading
                </label>
                <input
                  type="text"
                  value={settings.NEWS_HEADING}
                  onChange={(e) => handleChange("NEWS_HEADING", e.target.value)}
                  placeholder="Latest News & Updates"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subheading
                </label>
                <input
                  type="text"
                  value={settings.NEWS_SUBHEADING}
                  onChange={(e) =>
                    handleChange("NEWS_SUBHEADING", e.target.value)
                  }
                  placeholder="Stay updated with our latest achievements"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* GALLERY SECTION */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Image className="w-5 h-5 text-blue-600" />
              Gallery Section
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section Heading
                </label>
                <input
                  type="text"
                  value={settings.GALLERY_HEADING}
                  onChange={(e) =>
                    handleChange("GALLERY_HEADING", e.target.value)
                  }
                  placeholder="Gallery"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subheading
                </label>
                <input
                  type="text"
                  value={settings.GALLERY_SUBHEADING}
                  onChange={(e) =>
                    handleChange("GALLERY_SUBHEADING", e.target.value)
                  }
                  placeholder="Glimpses from our training sessions"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SOCIAL MEDIA */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Social Media Links
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter full URLs (e.g., https://facebook.com/youracademy)
            </p>
            <div className="space-y-4">
              {/* Facebook */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Facebook className="w-4 h-4 text-blue-600" />
                  Facebook
                </label>
                <input
                  type="url"
                  value={settings.SOCIAL_FACEBOOK}
                  onChange={(e) =>
                    handleChange("SOCIAL_FACEBOOK", e.target.value)
                  }
                  placeholder="https://facebook.com/youracademy"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Instagram */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-pink-600" />
                  Instagram
                </label>
                <input
                  type="url"
                  value={settings.SOCIAL_INSTAGRAM}
                  onChange={(e) =>
                    handleChange("SOCIAL_INSTAGRAM", e.target.value)
                  }
                  placeholder="https://instagram.com/youracademy"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Twitter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Twitter className="w-4 h-4 text-blue-400" />
                  Twitter / X
                </label>
                <input
                  type="url"
                  value={settings.SOCIAL_TWITTER}
                  onChange={(e) =>
                    handleChange("SOCIAL_TWITTER", e.target.value)
                  }
                  placeholder="https://twitter.com/youracademy"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* YouTube */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-600" />
                  YouTube
                </label>
                <input
                  type="url"
                  value={settings.SOCIAL_YOUTUBE}
                  onChange={(e) =>
                    handleChange("SOCIAL_YOUTUBE", e.target.value)
                  }
                  placeholder="https://youtube.com/@youracademy"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* LinkedIn */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Linkedin className="w-4 h-4 text-blue-700" />
                  LinkedIn
                </label>
                <input
                  type="url"
                  value={settings.SOCIAL_LINKEDIN}
                  onChange={(e) =>
                    handleChange("SOCIAL_LINKEDIN", e.target.value)
                  }
                  placeholder="https://linkedin.com/company/youracademy"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
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

export default ContentSettings;
