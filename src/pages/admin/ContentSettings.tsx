import { useState, useEffect } from "react";
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
import api from "../../api/axios";
import PresenceBanner from "../../components/PresenceBanner";
import { useAuth } from "../../auth/useAuth";

const ContentSettings = () => {
  const { academyId } = useAuth();
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
      await api.put("/admin/settings", settings);

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
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 tracking-tight">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
          Content & Social Media Settings
        </h2>
        <PresenceBanner entity="facilities-manager" id={academyId ?? undefined} />
        <p className="text-sm text-gray-500 mt-0.5">
          Customize homepage section headings and social media links
        </p>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 border border-blue-200 rounded-xl bg-blue-50 shadow-sm">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-0.5">Section Visibility</p>
          <p className="text-blue-700">
            Visibility is controlled in the <span className="font-semibold">Home Page</span> tab.
            These settings only customize headings and content.
          </p>
        </div>
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {/* TESTIMONIALS SECTION */}
        <div className="p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            Testimonials Section
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Section Heading</label>
              <input
                type="text"
                value={settings.TESTIMONIALS_HEADING}
                onChange={(e) => handleChange("TESTIMONIALS_HEADING", e.target.value)}
                placeholder="What Our Students Say"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subheading</label>
              <input
                type="text"
                value={settings.TESTIMONIALS_SUBHEADING}
                onChange={(e) => handleChange("TESTIMONIALS_SUBHEADING", e.target.value)}
                placeholder="Real success stories from our cricket family"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
              />
            </div>
          </div>
        </div>

        {/* NEWS SECTION */}
        <div className="p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            News Section
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Section Heading</label>
              <input
                type="text"
                value={settings.NEWS_HEADING}
                onChange={(e) => handleChange("NEWS_HEADING", e.target.value)}
                placeholder="Latest News & Updates"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subheading</label>
              <input
                type="text"
                value={settings.NEWS_SUBHEADING}
                onChange={(e) => handleChange("NEWS_SUBHEADING", e.target.value)}
                placeholder="Stay updated with our latest achievements"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
              />
            </div>
          </div>
        </div>

        {/* GALLERY SECTION */}
        <div className="p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <Image className="w-4 h-4 text-blue-600" />
            Gallery Section
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Section Heading</label>
              <input
                type="text"
                value={settings.GALLERY_HEADING}
                onChange={(e) => handleChange("GALLERY_HEADING", e.target.value)}
                placeholder="Gallery"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subheading</label>
              <input
                type="text"
                value={settings.GALLERY_SUBHEADING}
                onChange={(e) => handleChange("GALLERY_SUBHEADING", e.target.value)}
                placeholder="Glimpses from our training sessions"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
              />
            </div>
          </div>
        </div>

        {/* SOCIAL MEDIA */}
        <div className="p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Social Media Links
          </h3>
          <p className="text-xs text-gray-500">Enter full URLs (e.g., https://facebook.com/youracademy)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                <Facebook className="w-3.5 h-3.5 text-blue-600" /> Facebook
              </label>
              <input type="url" value={settings.SOCIAL_FACEBOOK}
                onChange={(e) => handleChange("SOCIAL_FACEBOOK", e.target.value)}
                placeholder="https://facebook.com/youracademy"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-pink-600" /> Instagram
              </label>
              <input type="url" value={settings.SOCIAL_INSTAGRAM}
                onChange={(e) => handleChange("SOCIAL_INSTAGRAM", e.target.value)}
                placeholder="https://instagram.com/youracademy"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                <Twitter className="w-3.5 h-3.5 text-blue-400" /> Twitter / X
              </label>
              <input type="url" value={settings.SOCIAL_TWITTER}
                onChange={(e) => handleChange("SOCIAL_TWITTER", e.target.value)}
                placeholder="https://twitter.com/youracademy"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                <Youtube className="w-3.5 h-3.5 text-red-600" /> YouTube
              </label>
              <input type="url" value={settings.SOCIAL_YOUTUBE}
                onChange={(e) => handleChange("SOCIAL_YOUTUBE", e.target.value)}
                placeholder="https://youtube.com/@youracademy"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                <Linkedin className="w-3.5 h-3.5 text-blue-700" /> LinkedIn
              </label>
              <input type="url" value={settings.SOCIAL_LINKEDIN}
                onChange={(e) => handleChange("SOCIAL_LINKEDIN", e.target.value)}
                placeholder="https://linkedin.com/company/youracademy"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="px-4 sm:px-5 py-4 flex justify-end bg-gray-50 rounded-b-xl">
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

export default ContentSettings;
