import { useEffect, useState } from "react";
import { Save, Youtube } from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-hot-toast";
import PresenceBanner from "../../components/PresenceBanner";
import { useAuth } from "../../auth/useAuth";

export default function YouTubeSettings() {
  const { academyId } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [heading, setHeading] = useState("Watch Us in Action");
  const [subheading, setSubheading] = useState(
    "Training highlights, match moments and more from our academy",
  );
  const [videos, setVideos] = useState(["", "", "", "", ""]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin/settings").then((res) => {
      setEnabled(res.data.SECTION_YOUTUBE_ENABLED !== "false");
      setHeading(res.data.YOUTUBE_HEADING || "Watch Us in Action");
      setSubheading(
        res.data.YOUTUBE_SUBHEADING ||
          "Training highlights, match moments and more from our academy",
      );
      setVideos([
        res.data.YOUTUBE_VIDEO_1 || "",
        res.data.YOUTUBE_VIDEO_2 || "",
        res.data.YOUTUBE_VIDEO_3 || "",
        res.data.YOUTUBE_VIDEO_4 || "",
        res.data.YOUTUBE_VIDEO_5 || "",
      ]);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/admin/settings", {
        SECTION_YOUTUBE_ENABLED: String(enabled),
        YOUTUBE_HEADING: heading,
        YOUTUBE_SUBHEADING: subheading,
        YOUTUBE_VIDEO_1: videos[0],
        YOUTUBE_VIDEO_2: videos[1],
        YOUTUBE_VIDEO_3: videos[2],
        YOUTUBE_VIDEO_4: videos[3],
        YOUTUBE_VIDEO_5: videos[4],
      });
      toast.success("YouTube settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 tracking-tight">
          <Youtube className="w-5 h-5 text-red-600 flex-shrink-0" />
          YouTube Videos Section
        </h2>
        <PresenceBanner entity="branches-tab" id={academyId ?? undefined} />
        <p className="text-sm text-gray-500 mt-0.5">
          Configure the YouTube feed section on your homepage
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {/* Toggle */}
        <label className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-gray-50 transition rounded-t-xl">
          <div>
            <span className="font-semibold text-sm text-gray-800 block">Section Enabled</span>
            <p className="text-xs text-gray-500 mt-0.5">
              YouTube videos section visible on home page
            </p>
          </div>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5 text-blue-600 rounded accent-blue-600 flex-shrink-0"
          />
        </label>

        {/* Heading & Subheading */}
        <div className="p-4 sm:p-5 space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Section Labels</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Section Heading
              </label>
              <input
                type="text"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Section Subheading
              </label>
              <input
                type="text"
                value={subheading}
                onChange={(e) => setSubheading(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
              />
            </div>
          </div>
        </div>

        {/* Video URLs */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Youtube size={15} className="text-red-600 flex-shrink-0" />
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Video / Shorts URLs</h3>
          </div>
          <p className="text-xs text-gray-400">
            Paste YouTube video or Shorts URLs:&nbsp;
            <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">youtube.com/watch?v=XXXX</code>
            &nbsp;or&nbsp;
            <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">youtube.com/shorts/XXXX</code>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {videos.map((url, i) => (
              <div key={i}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Video {i + 1}
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    const updated = [...videos];
                    updated[i] = e.target.value;
                    setVideos(updated);
                  }}
                  placeholder="https://www.youtube.com/shorts/..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="px-4 sm:px-5 py-4 flex justify-end bg-gray-50 rounded-b-xl">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition shadow-sm"
          >
            <Save size={15} />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
