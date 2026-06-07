import { useEffect, useMemo, useState } from "react";
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
import TeamMembersAdmin from "./TeamMembersAdmin";
import BranchesTab from "./BranchesTab";
import SubscriptionPricingManager from "./SubscriptionPricingManager";
import YouTubeSettings from "./YouTubeSettings";
import InstagramSettings from "./InstagramSettings";
import PresenceBanner from "../../components/PresenceBanner";
import { useAuth } from "../../auth/useAuth";
import ModulesTab from "./ModulesTab";

type SettingsMap = Record<string, string>;

type TabType =
  | "general"
  | "branding"
  | "content"
  | "contact"
  | "facilities"
  | "testimonials"
  | "news"
  | "gallery"
  | "starperformer"
  | "batch"
  | "fees"
  | "media"
  | "team"
  | "branches"
  | "youtube"
  | "instagram"
  | "subscription"
  | "modules";

function AcademySettings() {
  const navigate = useNavigate();
  const { academyId } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewId, setPreviewId] = useState("");
  const isSuperAdmin = localStorage.getItem("userRole") === "ROLE_SUPER_ADMIN";

  const NAV_GROUPS: {
    label: string;
    tabs: { key: TabType; label: string; icon: string }[];
  }[] = useMemo(
    () => [
      {
        label: "General",
        tabs: [
          { key: "general", label: "General", icon: "ti-settings" },
          { key: "branches", label: "Branches", icon: "ti-building" },
          { key: "branding", label: "Branding & Theme", icon: "ti-palette" },
          ...(isSuperAdmin
            ? [
                {
                  key: "modules" as TabType,
                  label: "Modules",
                  icon: "ti-apps",
                },
              ]
            : []),
        ],
      },
      {
        label: "Commerce",
        tabs: [
          { key: "fees", label: "Fees", icon: "ti-cash" },
          { key: "subscription", label: "Subscriptions", icon: "ti-ticket" },
        ],
      },
      {
        label: "Content",
        tabs: [
          { key: "batch", label: "Camp Settings", icon: "ti-sun" },
          { key: "media", label: "Media", icon: "ti-photo" },
          { key: "content", label: "Content & Social", icon: "ti-share" },
          { key: "contact", label: "Contact Info", icon: "ti-phone" },
        ],
      },
      {
        label: "Home Page",
        tabs: [
          { key: "facilities", label: "Facilities", icon: "ti-tool" },
          { key: "testimonials", label: "Testimonials", icon: "ti-star" },
          { key: "news", label: "News", icon: "ti-news" },
          { key: "youtube", label: "YouTube", icon: "ti-brand-youtube" },
          { key: "instagram", label: "Instagram", icon: "ti-brand-instagram" },
          { key: "gallery", label: "Gallery", icon: "ti-photo-album" },
          { key: "team", label: "Team Members", icon: "ti-users" },
          { key: "starperformer", label: "Star Performer", icon: "ti-trophy" },
        ],
      },
    ],
    [isSuperAdmin],
  );

  // Form state (controlled inputs)
  const [academyName, setAcademyName] = useState("");
  const [academyCode, setAcademyCode] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [playerIdPrefix, setPlayerIdPrefix] = useState("");
  const [playerIdCounter, setPlayerIdCounter] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [upiId, setUpiId] = useState("");
  const [upiQrUrl, setUpiQrUrl] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [announcementEnabled, setAnnouncementEnabled] = useState(true);
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementExpiry, setAnnouncementExpiry] = useState("");
  const [cricketStatsEnabled, setCricketStatsEnabled] = useState(true);

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
  const [testimonialsEnabled, setTestimonialsEnabled] = useState(true);
  const [newsEnabled, setNewsEnabled] = useState(true);
  const [galleryEnabled, setGalleryEnabled] = useState(true);
  const [teamEnabled, setTeamEnabled] = useState(true);
  const [facilitiesEnabled, setFacilitiesEnabled] = useState(true);

  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  useEffect(() => {
    loadSettings();
    previewNextPlayerId();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get<SettingsMap>("/admin/settings");
      setAcademyName(response.data.ACADEMY_NAME || "");
      setAcademyCode(response.data.ACADEMY_CODE || "");
      setAdminPhone(response.data.ADMIN_PHONE || "");
      setPlayerIdPrefix(response.data.PLAYER_ID_PREFIX || "");
      setAnnouncementEnabled(response.data.ANNOUNCEMENT_ENABLED !== "false");
      setAnnouncementText(response.data.ANNOUNCEMENT_TEXT || "");
      setAnnouncementExpiry(response.data.ANNOUNCEMENT_EXPIRY || "");
      setPlayerIdCounter(response.data.PLAYER_ID_COUNTER || "0");
      setPrimaryColor(response.data.PRIMARY_COLOR || "#2563eb");
      setSecondaryColor(response.data.SECONDARY_COLOR || "#10b981");
      setLogoUrl(response.data.LOGO_URL || "");
      setContactEmail(response.data.CONTACT_EMAIL || "");
      setUpiId(response.data.UPI_ID || "");
      setUpiQrUrl(response.data.UPI_QR_URL || "");
      setBookingPhone(response.data.BOOKING_PHONE || "");
      setButtonRadius(response.data.BUTTON_RADIUS || "8");
      setCardRadius(response.data.CARD_RADIUS || "8");
      setShadowIntensity(response.data.SHADOW_INTENSITY || "md");
      setSliderHeight(response.data.SLIDER_HEIGHT || "standard");
      setKenBurnsEnabled(response.data.KEN_BURNS_ENABLED !== "false");
      setSlideDuration(response.data.SLIDE_DURATION || "5000");
      setSliderImageFit(response.data.SLIDER_IMAGE_FIT || "cover");
      setSliderEnabled(response.data.SECTION_SLIDER_ENABLED !== "false");
      setFacilitiesEnabled(
        response.data.SECTION_FACILITIES_ENABLED !== "false",
      );
      setTestimonialsEnabled(
        response.data.SECTION_TESTIMONIALS_ENABLED !== "false",
      );
      setNewsEnabled(response.data.SECTION_NEWS_ENABLED !== "false");
      setGalleryEnabled(response.data.SECTION_GALLERY_ENABLED !== "false");
      setTeamEnabled(response.data.SECTION_TEAM_ENABLED !== "false");
      setCricketStatsEnabled(
        response.data.SECTION_CRICKET_STATS_ENABLED !== "false",
      );
      const moduleTypes = response.data.BATCH_MODULE_TYPES || "";
      setSelectedModules(
        moduleTypes
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
      );
    } catch (error) {
      console.error("Failed to load settings:", error);
      alert("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const previewNextPlayerId = async () => {
    try {
      const response = await api.get("/admin/settings/preview-next-player-id");
      setPreviewId(response.data.nextPlayerId);
    } catch (error) {
      console.error("Failed to preview player ID:", error);
    }
  };

  const handleToggleSetting = async (key: string, value: boolean) => {
    try {
      await api.put("/admin/settings", { [key]: String(value) });
      toast.success("Section visibility updated");
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: SettingsMap = {
        ACADEMY_NAME: academyName,
        ACADEMY_CODE: academyCode,
        ADMIN_PHONE: adminPhone,
        UPI_ID: upiId,
        BOOKING_PHONE: bookingPhone,
        ANNOUNCEMENT_ENABLED: String(announcementEnabled),
        ANNOUNCEMENT_TEXT: announcementText,
        ANNOUNCEMENT_EXPIRY: announcementExpiry,
        PLAYER_ID_PREFIX: playerIdPrefix,
        PLAYER_ID_COUNTER: playerIdCounter,
        PRIMARY_COLOR: primaryColor,
        SECONDARY_COLOR: secondaryColor,
        LOGO_URL: logoUrl,
        CONTACT_EMAIL: contactEmail,
        BUTTON_RADIUS: buttonRadius,
        CARD_RADIUS: cardRadius,
        SHADOW_INTENSITY: shadowIntensity,
        SLIDER_HEIGHT: sliderHeight,
        KEN_BURNS_ENABLED: String(kenBurnsEnabled),
        SLIDE_DURATION: slideDuration,
        SLIDER_IMAGE_FIT: sliderImageFit,
        BATCH_MODULE_TYPES: [
          "REGULAR",
          ...selectedModules.filter((m) => m !== "REGULAR"),
        ].join(","),
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
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading settings…</p>
        </div>
      </div>
    );
  }

  const showSaveButton = activeTab === "general" || activeTab === "branding";

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-28 px-3 sm:px-4 md:px-0">
      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
        <button
          onClick={() => navigate("/admin")}
          className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0 text-gray-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 leading-tight">Academy Settings</h1>
          <p className="text-xs text-gray-500 hidden sm:block">
            Configure your academy information and content
          </p>
        </div>
        {showSaveButton && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="hidden md:flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition disabled:opacity-50 text-sm font-medium flex-shrink-0 shadow-sm"
          >
            <Save size={15} />
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>

      {/* ── SIDEBAR + CONTENT ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row min-h-[600px]">
          {/* ── LEFT SIDEBAR — desktop only ── */}
          <aside className="hidden md:flex w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50/80 overflow-y-auto">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="pb-2">
                <p className="px-4 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {group.label}
                </p>
                {group.tabs.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-all border-l-2 ${
                      activeTab === key
                        ? "border-blue-600 text-blue-700 font-semibold bg-white shadow-sm"
                        : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/70"
                    }`}
                  >
                    <i className={`ti ${icon} text-base flex-shrink-0`} aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            ))}
          </aside>

          {/* ── MOBILE: horizontal scroll strip ── */}
          <div className="md:hidden w-full border-b border-gray-200 bg-gray-50 overflow-x-auto">
            <nav className="flex min-w-max px-2">
              {NAV_GROUPS.flatMap((g) => g.tabs).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`py-3 px-3.5 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === key
                      ? "border-blue-600 text-blue-600 font-semibold"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* ── TAB CONTENT ── */}
          <div className="flex-1 p-4 sm:p-5 md:p-7 overflow-y-auto min-w-0">
            {activeTab === "general" && (
              <div className="space-y-6">
                <h2 className="text-base md:text-lg font-bold text-gray-900 tracking-tight">
                  General Settings
                </h2>
                <PresenceBanner
                  entity="academy-general"
                  id={academyId ?? undefined}
                />
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition cursor-pointer shadow-sm">
                  <div>
                    <span className="font-semibold text-sm text-gray-800">
                      🏏 Cricket Stats Leaderboard
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Show public cricket batting & bowling leaderboard on home
                      page
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={cricketStatsEnabled}
                    onChange={(e) => {
                      setCricketStatsEnabled(e.target.checked);
                      handleToggleSetting(
                        "SECTION_CRICKET_STATS_ENABLED",
                        e.target.checked,
                      );
                    }}
                    className="w-5 h-5 text-blue-600 rounded accent-blue-600"
                  />
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Academy Name
                  </label>
                  <input
                    type="text"
                    value={academyName}
                    onChange={(e) => setAcademyName(e.target.value)}
                    placeholder="NCA Cricket Academy"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Academy Short Code
                  </label>
                  <input
                    type="text"
                    value={academyCode}
                    onChange={(e) =>
                      setAcademyCode(e.target.value.toUpperCase())
                    }
                    placeholder="NCA"
                    maxLength={10}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm bg-white transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Short code for your academy (max 10 characters)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Academy Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="academy@example.com"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm bg-white transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used as the sender address for all outgoing emails
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Phone (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm bg-white transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used to receive WhatsApp notifications. Include country
                    code.
                  </p>
                </div>
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                    💳 Payment Settings
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        UPI ID
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@ybl"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm bg-white transition"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Shown to users on the payment page
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Booking Contact Phone
                      </label>
                      <input
                        type="text"
                        value={bookingPhone}
                        onChange={(e) => setBookingPhone(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm bg-white transition"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Phone number users call after paying
                      </p>
                    </div>
                    <ImageUpload
                      currentUrl={upiQrUrl}
                      uploadType="qr"
                      uploadUrl="/admin/settings/upi-qr/upload"
                      onUploadSuccess={(url) => {
                        setUpiQrUrl(url);
                        api.put("/admin/settings", { UPI_QR_URL: url });
                      }}
                      label="PhonePe / UPI QR Code"
                      helpText="Upload your UPI QR image. Shown on the payment page."
                    />
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                    📢 Announcement Bar
                  </h3>
                  <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition mb-4 cursor-pointer shadow-sm">
                    <div>
                      <span className="font-medium text-sm">
                        Show Announcement Bar
                      </span>
                      <p className="text-xs text-gray-500">
                        Display a banner on the home page
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={announcementEnabled}
                      onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded accent-blue-600"
                    />
                  </label>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message{" "}
                      <span className="text-gray-400 font-normal">
                        ({announcementText.length}/120)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={announcementText}
                      onChange={(e) =>
                        setAnnouncementText(e.target.value.slice(0, 120))
                      }
                      placeholder="🏏 Summer Camp starts March 30! — Limited seats."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm bg-white transition"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Max 120 characters. Keep it short for mobile.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auto-hide after date
                    </label>
                    <input
                      type="date"
                      value={announcementExpiry}
                      onChange={(e) => setAnnouncementExpiry(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm bg-white transition"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Bar disappears automatically after this date. Leave empty
                      to always show.
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                    Player ID Format
                  </h3>
                  <div className="space-y-4">
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm bg-white transition"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This will be used as the prefix for all player IDs
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Counter
                      </label>
                      <input
                        type="number"
                        value={playerIdCounter}
                        onChange={(e) => setPlayerIdCounter(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm bg-white transition"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Next player will get ID number:{" "}
                        {parseInt(playerIdCounter) + 1}
                      </p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                        Preview Next Player ID
                      </p>
                      <div className="text-2xl font-bold text-blue-700 font-mono">
                        {previewId ||
                          `${playerIdPrefix}-${parseInt(playerIdCounter) + 1}`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "branches" && <BranchesTab />}

            {activeTab === "branding" && (
              <div className="space-y-8">
                <h2 className="text-base md:text-lg font-bold text-gray-900 tracking-tight">
                  Branding & Theme Customization
                </h2>
                <PresenceBanner
                  entity="academy-branding"
                  id={academyId ?? undefined}
                />
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition cursor-pointer shadow-sm">
                  <div>
                    <span className="font-semibold text-sm text-gray-800">Section Enabled</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Image slider is visible on home page
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={sliderEnabled}
                    onChange={(e) => {
                      setSliderEnabled(e.target.checked);
                      handleToggleSetting(
                        "SECTION_SLIDER_ENABLED",
                        e.target.checked,
                      );
                    }}
                    className="w-5 h-5 text-blue-600 rounded accent-blue-600"
                  />
                </label>
                <ImageUpload
                  currentUrl={logoUrl}
                  uploadType="logo"
                  onUploadSuccess={(url) => {
                    setLogoUrl(url);
                    api.put("/admin/settings/LOGO_URL", { value: url });
                  }}
                  label="Academy Logo"
                  helpText="Square image, will be resized to 200x200px. Max 5MB."
                />
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">🎨 Colors</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Color
                      </label>
                      <div className="flex gap-3 items-center">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="h-10 w-16 border rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          placeholder="#2563eb"
                          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Main brand color for buttons, links, and key elements
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Secondary Color
                      </label>
                      <div className="flex gap-3 items-center">
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="h-10 w-16 border rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          placeholder="#10b981"
                          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Accent color for badges, tags, and highlights
                      </p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                    🔘 Button Style
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        value: "0",
                        label: "Sharp Corners",
                        desc: "Modern, flat design (0px radius)",
                      },
                      {
                        value: "8",
                        label: "Rounded",
                        desc: "Balanced, professional (8px radius) - Recommended",
                      },
                      {
                        value: "16",
                        label: "Extra Rounded",
                        desc: "Soft, friendly (16px radius)",
                      },
                      {
                        value: "24",
                        label: "Pill Shape",
                        desc: "Very friendly, playful (24px radius)",
                      },
                    ].map(({ value, label, desc }) => (
                      <label
                        key={value}
                        className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="buttonRadius"
                          value={value}
                          checked={buttonRadius === value}
                          onChange={(e) => setButtonRadius(e.target.value)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{label}</span>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                        <button
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs flex-shrink-0"
                          style={{ borderRadius: `${value}px` }}
                        >
                          Sample
                        </button>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                    📐 Card Corners
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        value: "0",
                        label: "Sharp Corners",
                        desc: "Clean, modern (0px)",
                      },
                      {
                        value: "8",
                        label: "Rounded",
                        desc: "Standard (8px) - Recommended",
                      },
                      {
                        value: "16",
                        label: "Extra Rounded",
                        desc: "Soft, premium (16px)",
                      },
                    ].map(({ value, label, desc }) => (
                      <label
                        key={value}
                        className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="cardRadius"
                          value={value}
                          checked={cardRadius === value}
                          onChange={(e) => setCardRadius(e.target.value)}
                          className="w-4 h-4"
                        />
                        <div>
                          <span className="font-medium text-sm">{label}</span>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
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
                          <span className="font-medium text-sm">{label}</span>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                        <div
                          className={`w-16 h-10 bg-white rounded-lg ${shadow} flex-shrink-0`}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                    📏 Home Slider Settings
                  </h3>
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
                            <span className="font-medium text-sm">{label}</span>
                            <p className="text-xs text-gray-500">{desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={kenBurnsEnabled}
                        onChange={(e) => setKenBurnsEnabled(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded accent-blue-600"
                      />
                      <div>
                        <span className="font-medium text-sm">
                          Enable Ken Burns Effect
                        </span>
                        <p className="text-xs text-gray-500">
                          Subtle zoom animation on slider images (Recommended)
                        </p>
                      </div>
                    </label>
                  </div>
                  <div className="mb-6">
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
                      <span className="text-sm font-medium w-12 text-center">
                        {parseInt(slideDuration) / 1000}s
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      How long each slide displays before transitioning (3-7
                      seconds)
                    </p>
                  </div>
                  <div className="border-t border-gray-200 pt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Image Fit Style
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      How should full (non-cropped) images display in the
                      slider?
                    </p>
                    <div className="space-y-3">
                      {[
                        {
                          value: "cover",
                          label: "Cover (Fill Space)",
                          desc: "Image fills the entire slider, may crop edges - Recommended",
                        },
                        {
                          value: "contain",
                          label: "Contain (Show Full Image)",
                          desc: "Entire image is visible, may have black bars on sides",
                        },
                        {
                          value: "fill",
                          label: "Fill (Stretch)",
                          desc: "Stretches image to fill space (may distort)",
                        },
                      ].map(({ value, label, desc }) => (
                        <label
                          key={value}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="sliderImageFit"
                            value={value}
                            checked={sliderImageFit === value}
                            onChange={(e) => setSliderImageFit(e.target.value)}
                            className="w-4 h-4"
                          />
                          <div>
                            <span className="font-medium text-sm">{label}</span>
                            <p className="text-xs text-gray-500">{desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Live Preview</h3>
                  <div className="space-y-4 bg-gray-50 border border-gray-200 p-4 sm:p-6 rounded-xl">
                    {logoUrl && (
                      <div>
                        <p className="text-xs text-gray-600 mb-2">Logo:</p>
                        <img
                          src={getImageUrl(logoUrl) || ""}
                          alt="Logo"
                          className="h-16 object-contain"
                        />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <button
                        style={{
                          backgroundColor: primaryColor,
                          borderRadius: `${buttonRadius}px`,
                        }}
                        className="px-5 py-2 text-white text-sm"
                      >
                        Primary Button
                      </button>
                      <button
                        style={{
                          backgroundColor: secondaryColor,
                          borderRadius: `${buttonRadius}px`,
                        }}
                        className="px-5 py-2 text-white text-sm"
                      >
                        Secondary Button
                      </button>
                    </div>
                    <div
                      className={`p-4 bg-white ${shadowIntensity === "none" ? "border border-gray-200" : `shadow-${shadowIntensity}`}`}
                      style={{ borderRadius: `${cardRadius}px` }}
                    >
                      <h4 className="font-semibold text-sm mb-1">
                        Sample Card
                      </h4>
                      <p className="text-xs text-gray-600">
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
                <CampTypeSettings />
                <div className="border-t border-slate-300 pt-8">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-slate-900 mb-1">
                      Regular Batch Types
                    </h3>
                    <p className="text-sm text-slate-500">
                      Default batch type for all regular training batches.
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="font-medium text-slate-900 text-sm">
                        REGULAR
                      </span>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                        Default · Cannot be changed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "content" && <ContentSettings />}
            {activeTab === "contact" && <ContactInfoSettings />}

            {activeTab === "facilities" && (
              <div>
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition mb-6 cursor-pointer shadow-sm">
                  <div>
                    <span className="font-medium text-sm">Section Enabled</span>
                    <p className="text-xs text-gray-500">
                      Facilities section is visible on home page
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={facilitiesEnabled}
                    onChange={(e) => {
                      setFacilitiesEnabled(e.target.checked);
                      handleToggleSetting(
                        "SECTION_FACILITIES_ENABLED",
                        e.target.checked,
                      );
                    }}
                    className="w-5 h-5 text-blue-600 rounded accent-blue-600"
                  />
                </label>
                <FacilitiesManager />
              </div>
            )}

            {activeTab === "testimonials" && (
              <div>
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition mb-6 cursor-pointer shadow-sm">
                  <div>
                    <span className="font-medium text-sm">Section Enabled</span>
                    <p className="text-xs text-gray-500">
                      Testimonials section is visible on home page
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={testimonialsEnabled}
                    onChange={(e) => {
                      setTestimonialsEnabled(e.target.checked);
                      handleToggleSetting(
                        "SECTION_TESTIMONIALS_ENABLED",
                        e.target.checked,
                      );
                    }}
                    className="w-5 h-5 text-blue-600 rounded accent-blue-600"
                  />
                </label>
                <TestimonialsManager />
              </div>
            )}

            {activeTab === "news" && (
              <div>
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition mb-6 cursor-pointer shadow-sm">
                  <div>
                    <span className="font-medium text-sm">Section Enabled</span>
                    <p className="text-xs text-gray-500">
                      News section is visible on home page
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newsEnabled}
                    onChange={(e) => {
                      setNewsEnabled(e.target.checked);
                      handleToggleSetting(
                        "SECTION_NEWS_ENABLED",
                        e.target.checked,
                      );
                    }}
                    className="w-5 h-5 text-blue-600 rounded accent-blue-600"
                  />
                </label>
                <NewsManager />
              </div>
            )}

            {activeTab === "youtube" && <YouTubeSettings />}
            {activeTab === "instagram" && <InstagramSettings />}

            {activeTab === "gallery" && (
              <div>
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition mb-6 cursor-pointer shadow-sm">
                  <div>
                    <span className="font-medium text-sm">Section Enabled</span>
                    <p className="text-xs text-gray-500">
                      Gallery section is visible on home page
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={galleryEnabled}
                    onChange={(e) => {
                      setGalleryEnabled(e.target.checked);
                      handleToggleSetting(
                        "SECTION_GALLERY_ENABLED",
                        e.target.checked,
                      );
                    }}
                    className="w-5 h-5 text-blue-600 rounded accent-blue-600"
                  />
                </label>
                <GalleryManager />
              </div>
            )}

            {activeTab === "team" && (
              <div>
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition mb-6 cursor-pointer shadow-sm">
                  <div>
                    <span className="font-medium text-sm">Section Enabled</span>
                    <p className="text-xs text-gray-500">
                      Team Members section is visible on home page
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={teamEnabled}
                    onChange={(e) => {
                      setTeamEnabled(e.target.checked);
                      handleToggleSetting(
                        "SECTION_TEAM_ENABLED",
                        e.target.checked,
                      );
                    }}
                    className="w-5 h-5 text-blue-600 rounded accent-blue-600"
                  />
                </label>
                <TeamMembersAdmin />
              </div>
            )}

            {activeTab === "starperformer" && <StarPerformerSettings />}
            {activeTab === "fees" && <FeeSettingsManager />}
            {activeTab === "subscription" && <SubscriptionPricingManager />}
            {activeTab === "media" && <MediaSettingsManager />}
            {activeTab === "modules" && isSuperAdmin && <ModulesTab />}
          </div>
        </div>
      </div>

      {showSaveButton && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-20 px-3 sm:px-4">
          <div className="bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-gray-200 flex gap-2">
            <Button variant="secondary" onClick={() => navigate("/admin")}>
              Cancel
            </Button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition disabled:opacity-50 text-sm font-semibold shadow-sm"
            >
              <Save size={16} />
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AcademySettings;
