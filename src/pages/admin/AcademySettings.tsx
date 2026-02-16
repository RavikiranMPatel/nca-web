import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import api from "../../api/axios";
import Button from "../../components/Button";
import ImageUpload from "../../components/ImageUpload";
import { getImageUrl } from "../../utils/imageUrl";
import ContactInfoSettings from "./ContactInfoSettings";
import ContentSettings from "./ContentSettings";
import FacilitiesManager from "./FacilitiesManager";
import TestimonialsManager from "./TestimonialsManager";
import NewsManager from "./NewsManager";
import GalleryManager from "./GalleryManager";
import StarPerformerSettings from "./StarPerformerSettings";
import { toast } from "react-hot-toast";
import FeeSettingsManager from "./FeeSettingsManager";
import CampTypeSettings from "./CampTypeSettings";
import MediaSettingsManager from "./MediaSettingsManager";

type SettingsMap = Record<string, string>;

type TabType =
  | "general"
  | "branding"
  | "homepage"
  | "content"
  | "contact"
  | "facilities"
  | "testimonials"
  | "news"
  | "gallery"
  | "starperformer"
  | "batch"
  | "fees"
  | "media";

function AcademySettings() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewId, setPreviewId] = useState("");

  // Form state (controlled inputs)
  const [academyName, setAcademyName] = useState("");
  const [academyCode, setAcademyCode] = useState("");
  const [playerIdPrefix, setPlayerIdPrefix] = useState("");
  const [playerIdCounter, setPlayerIdCounter] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Theme settings
  const [buttonRadius, setButtonRadius] = useState("8");
  const [cardRadius, setCardRadius] = useState("8");
  const [shadowIntensity, setShadowIntensity] = useState("md");

  // Slider settings
  const [sliderHeight, setSliderHeight] = useState("standard");
  const [kenBurnsEnabled, setKenBurnsEnabled] = useState(true);
  const [slideDuration, setSlideDuration] = useState("5000");
  const [sliderImageFit, setSliderImageFit] = useState("cover");

  // Section toggles
  const [sliderEnabled, setSliderEnabled] = useState(true);
  const [statsEnabled, setStatsEnabled] = useState(true);
  const [testimonialsEnabled, setTestimonialsEnabled] = useState(true);
  const [newsEnabled, setNewsEnabled] = useState(true);
  const [galleryEnabled, setGalleryEnabled] = useState(true);
  const [starPerformerEnabled, setStarPerformerEnabled] = useState(false);

  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [newModule, setNewModule] = useState("");

  useEffect(() => {
    loadSettings();
    previewNextPlayerId();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get<SettingsMap>("/admin/settings");

      // Populate form fields
      setAcademyName(response.data.ACADEMY_NAME || "");
      setAcademyCode(response.data.ACADEMY_CODE || "");
      setPlayerIdPrefix(response.data.PLAYER_ID_PREFIX || "");
      setPlayerIdCounter(response.data.PLAYER_ID_COUNTER || "0");
      setPrimaryColor(response.data.PRIMARY_COLOR || "#2563eb");
      setSecondaryColor(response.data.SECONDARY_COLOR || "#10b981");
      setLogoUrl(response.data.LOGO_URL || "");

      // Theme settings
      setButtonRadius(response.data.BUTTON_RADIUS || "8");
      setCardRadius(response.data.CARD_RADIUS || "8");
      setShadowIntensity(response.data.SHADOW_INTENSITY || "md");

      // Slider settings
      setSliderHeight(response.data.SLIDER_HEIGHT || "standard");
      setKenBurnsEnabled(response.data.KEN_BURNS_ENABLED !== "false");
      setSlideDuration(response.data.SLIDE_DURATION || "5000");
      setSliderImageFit(response.data.SLIDER_IMAGE_FIT || "cover");

      // Section toggles
      setSliderEnabled(response.data.SECTION_SLIDER_ENABLED === "true");
      setStatsEnabled(response.data.SECTION_STATS_ENABLED === "true");
      setTestimonialsEnabled(
        response.data.SECTION_TESTIMONIALS_ENABLED === "true",
      );
      setNewsEnabled(response.data.SECTION_NEWS_ENABLED === "true");
      setGalleryEnabled(response.data.SECTION_GALLERY_ENABLED === "true");
      setStarPerformerEnabled(
        response.data.SECTION_STAR_PERFORMER_ENABLED === "true",
      );

      const moduleTypes = response.data.BATCH_MODULE_TYPES || "";

      const modulesArray = moduleTypes
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);

      setAvailableModules(modulesArray);
      setSelectedModules(modulesArray);
    } catch (error) {
      console.error("Failed to load settings:", error);
      alert("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const addModule = () => {
    if (!newModule.trim()) return;

    const formatted = newModule.trim().toUpperCase().replace(/\s+/g, "_");

    if (availableModules.includes(formatted)) {
      alert("Module already exists");
      return;
    }

    setAvailableModules([...availableModules, formatted]);
    setSelectedModules([...selectedModules, formatted]);
    setNewModule("");
  };

  const previewNextPlayerId = async () => {
    try {
      const response = await api.get("/admin/settings/preview-next-player-id");
      setPreviewId(response.data.nextPlayerId);
    } catch (error) {
      console.error("Failed to preview player ID:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const updates: SettingsMap = {
        ACADEMY_NAME: academyName,
        ACADEMY_CODE: academyCode,
        PLAYER_ID_PREFIX: playerIdPrefix,
        PLAYER_ID_COUNTER: playerIdCounter,
        PRIMARY_COLOR: primaryColor,
        SECONDARY_COLOR: secondaryColor,
        LOGO_URL: logoUrl,

        // Theme settings
        BUTTON_RADIUS: buttonRadius,
        CARD_RADIUS: cardRadius,
        SHADOW_INTENSITY: shadowIntensity,

        // Slider settings
        SLIDER_HEIGHT: sliderHeight,
        KEN_BURNS_ENABLED: String(kenBurnsEnabled),
        SLIDE_DURATION: slideDuration,
        SLIDER_IMAGE_FIT: sliderImageFit,

        SECTION_SLIDER_ENABLED: String(sliderEnabled),
        SECTION_STATS_ENABLED: String(statsEnabled),
        SECTION_TESTIMONIALS_ENABLED: String(testimonialsEnabled),
        SECTION_NEWS_ENABLED: String(newsEnabled),
        SECTION_GALLERY_ENABLED: String(galleryEnabled),
        SECTION_STAR_PERFORMER_ENABLED: String(starPerformerEnabled),

        BATCH_MODULE_TYPES: selectedModules.join(","),
      };

      await api.put("/admin/settings", updates);

      await loadSettings();
      toast.success("Settings updated successfully");
      previewNextPlayerId();
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin")}
          className="p-2 hover:bg-gray-100 rounded transition"
          title="Back to Admin Dashboard"
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <h1 className="text-2xl font-bold">Academy Settings</h1>
          <p className="text-gray-600 text-sm mt-1">
            Configure your academy information and content
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-4">
          <nav className="flex gap-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab("general")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === "general"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-blue-600"
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab("branding")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === "branding"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-blue-600"
              }`}
            >
              Branding & Theme
            </button>

            <button
              onClick={() => setActiveTab("batch")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === "batch"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-blue-600"
              }`}
            >
              Camp Settings
            </button>

            <button
              onClick={() => setActiveTab("fees")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === "fees"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-blue-600"
              }`}
            >
              Fees
            </button>

            <button
              onClick={() => setActiveTab("media")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === "media"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-blue-600"
              }`}
            >
              📸 Media
            </button>

            <button
              onClick={() => setActiveTab("homepage")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === "homepage"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-blue-600"
              }`}
            >
              Home Page
            </button>
            <button
              onClick={() => setActiveTab("content")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === "content"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-blue-600"
              }`}
            >
              Content & Social
            </button>
            <button
              onClick={() => setActiveTab("contact")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === "contact"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-blue-600"
              }`}
            >
              Contact Info
            </button>
            <button
              onClick={() => setActiveTab("facilities")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === "facilities"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-blue-600"
              }`}
            >
              Facilities
            </button>
            <button
              onClick={() => setActiveTab("testimonials")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === "testimonials"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-blue-600"
              }`}
            >
              Testimonials
            </button>
            <button
              onClick={() => setActiveTab("news")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === "news"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-blue-600"
              }`}
            >
              News
            </button>
            <button
              onClick={() => setActiveTab("gallery")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === "gallery"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-blue-600"
              }`}
            >
              Gallery
            </button>
            <button
              onClick={() => setActiveTab("starperformer")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === "starperformer"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-blue-600"
              }`}
            >
              Star Performer
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* GENERAL TAB */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">General Settings</h2>

              {/* Academy Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academy Name
                </label>
                <input
                  type="text"
                  value={academyName}
                  onChange={(e) => setAcademyName(e.target.value)}
                  placeholder="NCA Cricket Academy"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Academy Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academy Short Code
                </label>
                <input
                  type="text"
                  value={academyCode}
                  onChange={(e) => setAcademyCode(e.target.value.toUpperCase())}
                  placeholder="NCA"
                  maxLength={10}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Short code for your academy (max 10 characters)
                </p>
              </div>

              {/* Player ID Configuration */}
              <div className="border-t pt-6">
                <h3 className="text-base font-semibold mb-4">
                  Player ID Format
                </h3>

                <div className="space-y-4">
                  {/* Prefix */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Player ID Prefix
                    </label>
                    <input
                      type="text"
                      value={playerIdPrefix}
                      onChange={(e) =>
                        setPlayerIdPrefix(e.target.value.toUpperCase())
                      }
                      placeholder="PLY-NCA"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This will be used as the prefix for all player IDs
                    </p>
                  </div>

                  {/* Counter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Counter
                    </label>
                    <input
                      type="number"
                      value={playerIdCounter}
                      onChange={(e) => setPlayerIdCounter(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Next player will get ID number:{" "}
                      {parseInt(playerIdCounter) + 1}
                    </p>
                  </div>

                  {/* Preview */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Preview Next Player ID:
                    </p>
                    <div className="text-2xl font-bold text-blue-700">
                      {previewId ||
                        `${playerIdPrefix}-${parseInt(playerIdCounter) + 1}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BRANDING & THEME TAB */}
          {activeTab === "branding" && (
            <div className="space-y-8">
              <h2 className="text-lg font-semibold mb-4">
                Branding & Theme Customization
              </h2>

              {/* Logo Upload */}
              <ImageUpload
                currentUrl={logoUrl}
                uploadType="logo"
                onUploadSuccess={(url) => {
                  setLogoUrl(url);
                  // Auto-save to settings
                  api.put("/admin/settings/LOGO_URL", { value: url });
                }}
                label="Academy Logo"
                helpText="Square image, will be resized to 200x200px. Max 5MB."
              />

              {/* COLORS SECTION */}
              <div className="border-t pt-6">
                <h3 className="text-base font-semibold mb-4">🎨 Colors</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Primary Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Color
                    </label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-12 w-20 border rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#2563eb"
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Main brand color for buttons, links, and key elements
                    </p>
                  </div>

                  {/* Secondary Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Color
                    </label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="h-12 w-20 border rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        placeholder="#10b981"
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Accent color for badges, tags, and highlights
                    </p>
                  </div>
                </div>
              </div>

              {/* BUTTON STYLE SECTION */}
              <div className="border-t pt-6">
                <h3 className="text-base font-semibold mb-4">
                  🔘 Button Style
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="buttonRadius"
                      value="0"
                      checked={buttonRadius === "0"}
                      onChange={(e) => setButtonRadius(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <span className="font-medium">Sharp Corners</span>
                      <p className="text-sm text-gray-500">
                        Modern, flat design (0px radius)
                      </p>
                    </div>
                    <button
                      className="px-4 py-2 bg-blue-600 text-white text-sm"
                      style={{ borderRadius: "0px" }}
                    >
                      Sample
                    </button>
                  </label>

                  <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="buttonRadius"
                      value="8"
                      checked={buttonRadius === "8"}
                      onChange={(e) => setButtonRadius(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <span className="font-medium">Rounded</span>
                      <p className="text-sm text-gray-500">
                        Balanced, professional (8px radius) - Recommended
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">
                      Sample
                    </button>
                  </label>

                  <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="buttonRadius"
                      value="16"
                      checked={buttonRadius === "16"}
                      onChange={(e) => setButtonRadius(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <span className="font-medium">Extra Rounded</span>
                      <p className="text-sm text-gray-500">
                        Soft, friendly (16px radius)
                      </p>
                    </div>
                    <button
                      className="px-4 py-2 bg-blue-600 text-white text-sm"
                      style={{ borderRadius: "16px" }}
                    >
                      Sample
                    </button>
                  </label>

                  <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="buttonRadius"
                      value="24"
                      checked={buttonRadius === "24"}
                      onChange={(e) => setButtonRadius(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <span className="font-medium">Pill Shape</span>
                      <p className="text-sm text-gray-500">
                        Very friendly, playful (24px radius)
                      </p>
                    </div>
                    <button
                      className="px-4 py-2 bg-blue-600 text-white text-sm"
                      style={{ borderRadius: "24px" }}
                    >
                      Sample
                    </button>
                  </label>
                </div>
              </div>

              {/* CARD STYLE SECTION */}
              <div className="border-t pt-6">
                <h3 className="text-base font-semibold mb-4">
                  📐 Card Corners
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="cardRadius"
                      value="0"
                      checked={cardRadius === "0"}
                      onChange={(e) => setCardRadius(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <span className="font-medium">Sharp Corners</span>
                      <p className="text-sm text-gray-500">
                        Clean, modern (0px)
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="cardRadius"
                      value="8"
                      checked={cardRadius === "8"}
                      onChange={(e) => setCardRadius(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <span className="font-medium">Rounded</span>
                      <p className="text-sm text-gray-500">
                        Standard (8px) - Recommended
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="cardRadius"
                      value="16"
                      checked={cardRadius === "16"}
                      onChange={(e) => setCardRadius(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <span className="font-medium">Extra Rounded</span>
                      <p className="text-sm text-gray-500">
                        Soft, premium (16px)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* SHADOW SECTION */}
              <div className="border-t pt-6">
                <h3 className="text-base font-semibold mb-4">
                  🌑 Shadow Intensity
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      value: "none",
                      label: "None",
                      desc: "Flat design, no shadows",
                      shadow: "border border-gray-200",
                    },
                    {
                      value: "sm",
                      label: "Light",
                      desc: "Subtle elevation",
                      shadow: "shadow-sm",
                    },
                    {
                      value: "md",
                      label: "Medium",
                      desc: "Balanced depth - Recommended",
                      shadow: "shadow-md",
                    },
                    {
                      value: "lg",
                      label: "Large",
                      desc: "Strong elevation",
                      shadow: "shadow-lg",
                    },
                    {
                      value: "xl",
                      label: "Extra Large",
                      desc: "Maximum depth",
                      shadow: "shadow-xl",
                    },
                  ].map(({ value, label, desc, shadow }) => (
                    <label
                      key={value}
                      className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="shadowIntensity"
                        value={value}
                        checked={shadowIntensity === value}
                        onChange={(e) => setShadowIntensity(e.target.value)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <span className="font-medium">{label}</span>
                        <p className="text-sm text-gray-500">{desc}</p>
                      </div>
                      <div
                        className={`w-20 h-12 bg-white rounded-lg ${shadow}`}
                      ></div>
                    </label>
                  ))}
                </div>
              </div>

              {/* SLIDER CUSTOMIZATION SECTION */}
              <div className="border-t pt-6">
                <h3 className="text-base font-semibold mb-4">
                  📏 Home Slider Settings
                </h3>

                {/* Slider Height */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Slider Height
                  </label>
                  <div className="space-y-3">
                    {[
                      {
                        value: "compact",
                        label: "Compact",
                        desc: "300-400px - Best for most sites",
                      },
                      {
                        value: "standard",
                        label: "Standard",
                        desc: "400-550px - Balanced height",
                      },
                      {
                        value: "large",
                        label: "Large",
                        desc: "550-700px - Maximum impact",
                      },
                      {
                        value: "fullscreen",
                        label: "Full Screen",
                        desc: "Adapts to screen (max 75vh) - Bold statement",
                      },
                    ].map(({ value, label, desc }) => (
                      <label
                        key={value}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="sliderHeight"
                          value={value}
                          checked={sliderHeight === value}
                          onChange={(e) => setSliderHeight(e.target.value)}
                          className="w-4 h-4"
                        />
                        <div>
                          <span className="font-medium">{label}</span>
                          <p className="text-sm text-gray-500">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Ken Burns Effect */}
                <div className="mb-6">
                  <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={kenBurnsEnabled}
                      onChange={(e) => setKenBurnsEnabled(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <div>
                      <span className="font-medium">
                        Enable Ken Burns Effect
                      </span>
                      <p className="text-sm text-gray-500">
                        Subtle zoom animation on slider images (Recommended)
                      </p>
                    </div>
                  </label>
                </div>

                {/* Slide Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Slide Duration (seconds)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="3000"
                      max="7000"
                      step="1000"
                      value={slideDuration}
                      onChange={(e) => setSlideDuration(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-16 text-center">
                      {parseInt(slideDuration) / 1000}s
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    How long each slide displays before transitioning (3-7
                    seconds)
                  </p>
                </div>

                {/* Image Fit */}
                <div className="border-t pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Image Fit Style
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    How should full (non-cropped) images display in the slider?
                  </p>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="sliderImageFit"
                        value="cover"
                        checked={sliderImageFit === "cover"}
                        onChange={(e) => setSliderImageFit(e.target.value)}
                        className="w-4 h-4"
                      />
                      <div>
                        <span className="font-medium">Cover (Fill Space)</span>
                        <p className="text-sm text-gray-500">
                          Image fills the entire slider, may crop edges -
                          Recommended
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="sliderImageFit"
                        value="contain"
                        checked={sliderImageFit === "contain"}
                        onChange={(e) => setSliderImageFit(e.target.value)}
                        className="w-4 h-4"
                      />
                      <div>
                        <span className="font-medium">
                          Contain (Show Full Image)
                        </span>
                        <p className="text-sm text-gray-500">
                          Entire image is visible, may have black bars on sides
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="sliderImageFit"
                        value="fill"
                        checked={sliderImageFit === "fill"}
                        onChange={(e) => setSliderImageFit(e.target.value)}
                        className="w-4 h-4"
                      />
                      <div>
                        <span className="font-medium">Fill (Stretch)</span>
                        <p className="text-sm text-gray-500">
                          Stretches image to fill space (may distort)
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold mb-3">Live Preview</h3>
                <div className="space-y-3 bg-gray-50 p-6 rounded-lg">
                  {logoUrl && (
                    <div>
                      <p className="text-xs text-gray-600 mb-2">Logo:</p>
                      <img
                        src={getImageUrl(logoUrl) || ""}
                        alt="Logo"
                        className="h-20 object-contain"
                      />
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      style={{
                        backgroundColor: primaryColor,
                        borderRadius: `${buttonRadius}px`,
                      }}
                      className="px-6 py-2 text-white"
                    >
                      Primary Button
                    </button>
                    <button
                      style={{
                        backgroundColor: secondaryColor,
                        borderRadius: `${buttonRadius}px`,
                      }}
                      className="px-6 py-2 text-white"
                    >
                      Secondary Button
                    </button>
                  </div>
                  <div
                    className={`p-6 bg-white ${shadowIntensity === "none" ? "border border-gray-200" : `shadow-${shadowIntensity}`}`}
                    style={{ borderRadius: `${cardRadius}px` }}
                  >
                    <h4 className="font-semibold mb-2">Sample Card</h4>
                    <p className="text-sm text-gray-600">
                      This is how your cards will look with the current
                      settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "batch" && (
            <div className="space-y-8">
              {/* CAMP TYPES SECTION */}
              <CampTypeSettings />

              {/* DIVIDER */}
              <div className="border-t border-slate-300 my-8"></div>

              {/* BATCH MODULE TYPES SECTION */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Batch Module Types
                  </h3>
                  <p className="text-sm text-slate-600">
                    Configure batch types for regular training sessions
                  </p>
                </div>

                {/* Add New Module */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Add New Batch Type
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newModule}
                      onChange={(e) => setNewModule(e.target.value)}
                      placeholder="e.g., Batter Camp, Fielding"
                      className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      onClick={addModule}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* List existing modules */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="font-medium text-slate-900 mb-3">
                    Current Batch Types ({availableModules.length})
                  </h4>

                  <div className="space-y-2">
                    {availableModules.map((module) => (
                      <div
                        key={module}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-slate-900">
                            {module.replace(/_/g, " ")}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setAvailableModules((prev) =>
                                prev.filter((m) => m !== module),
                              );
                              setSelectedModules((prev) =>
                                prev.filter((m) => m !== module),
                              );
                            }}
                            className="text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                          >
                            Remove
                          </button>

                          <input
                            type="checkbox"
                            checked={selectedModules.includes(module)}
                            onChange={() => {
                              setSelectedModules((prev) =>
                                prev.includes(module)
                                  ? prev.filter((m) => m !== module)
                                  : [...prev, module],
                              );
                            }}
                            className="w-5 h-5 text-blue-600 rounded"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HOME PAGE TAB */}
          {activeTab === "homepage" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Home Page Sections</h2>
              <p className="text-sm text-gray-600 mb-4">
                Enable or disable sections on your home page
              </p>

              <div className="space-y-3">
                {/* Slider Toggle */}
                <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="font-medium">Image Slider</span>
                    <p className="text-sm text-gray-500">
                      Auto-rotating banner images
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={sliderEnabled}
                    onChange={(e) => setSliderEnabled(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* Stats Toggle */}
                <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="font-medium">Stats & Numbers</span>
                    <p className="text-sm text-gray-500">
                      Display student count, years, achievements
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={statsEnabled}
                    onChange={(e) => setStatsEnabled(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* Testimonials Toggle */}
                <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="font-medium">Testimonials</span>
                    <p className="text-sm text-gray-500">
                      Customer reviews and feedback
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={testimonialsEnabled}
                    onChange={(e) => setTestimonialsEnabled(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* News Toggle */}
                <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="font-medium">News & Announcements</span>
                    <p className="text-sm text-gray-500">
                      Latest blog posts and updates
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newsEnabled}
                    onChange={(e) => setNewsEnabled(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* Gallery Toggle */}
                <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="font-medium">Gallery Preview</span>
                    <p className="text-sm text-gray-500">
                      Recent photos from your academy
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={galleryEnabled}
                    onChange={(e) => setGalleryEnabled(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* Star Performer Toggle */}
                <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="font-medium">Star Performer</span>
                    <p className="text-sm text-gray-500">
                      Showcase outstanding performer of the week
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={starPerformerEnabled}
                    onChange={(e) => setStarPerformerEnabled(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* CONTENT & SOCIAL TAB */}
          {activeTab === "content" && <ContentSettings />}

          {/* CONTACT INFO TAB */}
          {activeTab === "contact" && <ContactInfoSettings />}

          {/* FACILITIES TAB */}
          {activeTab === "facilities" && <FacilitiesManager />}

          {/* TESTIMONIALS TAB */}
          {activeTab === "testimonials" && <TestimonialsManager />}

          {/* NEWS TAB */}
          {activeTab === "news" && <NewsManager />}

          {/* GALLERY TAB */}
          {activeTab === "gallery" && <GalleryManager />}

          {/* STAR PERFORMER TAB */}
          {activeTab === "starperformer" && <StarPerformerSettings />}

          {/* FEES TAB */}
          {activeTab === "fees" && <FeeSettingsManager />}

          {/* MEDIA TAB */}
          {activeTab === "media" && <MediaSettingsManager />}
        </div>
      </div>

      {/* SAVE BUTTON - Only show for general/branding/homepage tabs */}
      {(activeTab === "general" ||
        activeTab === "branding" ||
        activeTab === "homepage" ||
        activeTab === "batch") && (
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => navigate("/admin")}>
            Cancel
          </Button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      )}
    </div>
  );
}

export default AcademySettings;
