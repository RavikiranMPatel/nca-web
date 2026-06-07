import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Save, Camera, Video, Eye, EyeOff, Hash } from "lucide-react";
import api from "../../api/axios";
import PresenceBanner from "../../components/PresenceBanner";
import { useAuth } from "../../auth/useAuth";

type SettingsMap = Record<string, string>;

function MediaSettingsManager() {
  const { academyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Media settings
  const [mediaEnabled, setMediaEnabled] = useState(true);
  const [parentVisible, setParentVisible] = useState(false);
  const [maxPhotos, setMaxPhotos] = useState("0");
  const [platforms, setPlatforms] = useState<string[]>([
    "YOUTUBE",
    "INSTAGRAM",
  ]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get<SettingsMap>("/admin/settings");
      setMediaEnabled(response.data.MEDIA_TAB_ENABLED !== "false");
      setParentVisible(response.data.MEDIA_VISIBLE_TO_PARENTS === "true");
      setMaxPhotos(response.data.MEDIA_MAX_PHOTOS_PER_PLAYER || "0");

      const platformStr =
        response.data.MEDIA_VIDEO_PLATFORMS || "YOUTUBE,INSTAGRAM";
      setPlatforms(
        platformStr
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      );
    } catch (error) {
      console.error("Failed to load media settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: SettingsMap = {
        MEDIA_TAB_ENABLED: String(mediaEnabled),
        MEDIA_VISIBLE_TO_PARENTS: String(parentVisible),
        MEDIA_MAX_PHOTOS_PER_PLAYER: maxPhotos,
        MEDIA_VIDEO_PLATFORMS: platforms.join(","),
      };

      await api.put("/admin/settings", updates);
      toast.success("Media settings saved");
    } catch (error) {
      console.error("Failed to save media settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 tracking-tight">
          <Camera className="w-5 h-5 text-blue-600 flex-shrink-0" />
          Media Gallery Settings
        </h2>
        <PresenceBanner
          entity="facilities-manager"
          id={academyId ?? undefined}
        />
        <p className="text-sm text-slate-500 mt-0.5">
          Configure the player media gallery feature
        </p>
      </div>

      {/* ─── ENABLE / DISABLE ─────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {/* Media Tab Toggle */}
        <label className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-slate-50 transition rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 flex-shrink-0">
              <Camera size={16} className="text-blue-600" />
            </div>
            <div>
              <span className="font-semibold text-sm text-slate-900">
                Enable Media Tab
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Show the Media tab on player profiles
              </p>
            </div>
          </div>
          <div className="relative flex-shrink-0">
            <input
              type="checkbox"
              checked={mediaEnabled}
              onChange={(e) => setMediaEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
          </div>
        </label>

        {/* Parent Visibility */}
        <label className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-slate-50 transition rounded-b-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 flex-shrink-0">
              {parentVisible ? (
                <Eye size={16} className="text-green-600" />
              ) : (
                <EyeOff size={16} className="text-slate-400" />
              )}
            </div>
            <div>
              <span className="font-semibold text-sm text-slate-900">
                Parents Can View Media
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Allow parents to see their child's media gallery
              </p>
            </div>
          </div>
          <div className="relative flex-shrink-0">
            <input
              type="checkbox"
              checked={parentVisible}
              onChange={(e) => setParentVisible(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-green-600 transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
          </div>
        </label>
      </div>

      {/* ─── PHOTO LIMIT ──────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-orange-100 flex-shrink-0">
            <Hash size={16} className="text-orange-600" />
          </div>
          <div>
            <span className="font-semibold text-sm text-slate-900">
              Max Photos Per Player
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Limit storage per player (0 = unlimited)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="number"
            value={maxPhotos}
            onChange={(e) => setMaxPhotos(e.target.value)}
            min="0"
            max="500"
            className="w-32 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
          <span className="text-sm text-slate-500">
            {maxPhotos === "0"
              ? "Unlimited photos"
              : `Max ${maxPhotos} photos per player`}
          </span>
        </div>
      </div>

      {/* ─── VIDEO PLATFORMS ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-100 flex-shrink-0">
            <Video size={16} className="text-purple-600" />
          </div>
          <div>
            <span className="font-semibold text-sm text-slate-900">
              Enabled Video Platforms
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Select which video platforms coaches can link to
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {/* YouTube */}
          <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 font-bold text-xs">▶</span>
              </div>
              <div>
                <span className="font-semibold text-sm text-slate-800">YouTube</span>
                <p className="text-xs text-slate-500">
                  YouTube videos, shorts, and embeds
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={platforms.includes("YOUTUBE")}
              onChange={() => togglePlatform("YOUTUBE")}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 flex-shrink-0 accent-blue-600"
            />
          </label>

          {/* Instagram */}
          <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">📷</span>
              </div>
              <div>
                <span className="font-semibold text-sm text-slate-800">Instagram</span>
                <p className="text-xs text-slate-500">
                  Instagram reels and posts (must be public)
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={platforms.includes("INSTAGRAM")}
              onChange={() => togglePlatform("INSTAGRAM")}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 flex-shrink-0 accent-blue-600"
            />
          </label>
        </div>

        {platforms.length === 0 && (
          <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <p className="text-xs text-yellow-800">
              No platforms enabled — coaches won't be able to add video links.
            </p>
          </div>
        )}

        {platforms.includes("INSTAGRAM") && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-xs text-blue-800">
              Instagram embeds only work for <strong>public</strong>{" "}
              accounts. Private reels will show a fallback link.
            </p>
          </div>
        )}
      </div>

      {/* ─── SAVE BUTTON ──────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          {saving ? "Saving…" : "Save Media Settings"}
        </button>
      </div>
    </div>
  );
}

export default MediaSettingsManager;
