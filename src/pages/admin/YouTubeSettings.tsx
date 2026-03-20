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
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">YouTube Videos Section</h2>

      <label className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 cursor-pointer">
        <div>
          <span className="font-medium">Section Enabled</span>
          <p className="text-sm text-gray-500">
            YouTube videos section visible on home page
          </p>
          <PresenceBanner
            entity="branches-tab"
            id={academyId ?? undefined}
          />{" "}
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-5 h-5 text-blue-600 rounded"
        />
      </label>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Section Heading
        </label>
        <input
          type="text"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Section Subheading
        </label>
        <input
          type="text"
          value={subheading}
          onChange={(e) => setSubheading(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="border-t pt-5 space-y-4">
        <div className="flex items-center gap-2">
          <Youtube size={18} className="text-red-600" />
          <h3 className="font-medium">Video / Shorts URLs</h3>
        </div>
        <p className="text-sm text-gray-500">
          Paste YouTube video or Shorts URLs. Examples:
          <br />
          <code className="bg-gray-100 px-1 rounded text-xs">
            https://www.youtube.com/watch?v=XXXX
          </code>
          <br />
          <code className="bg-gray-100 px-1 rounded text-xs">
            https://www.youtube.com/shorts/XXXX
          </code>
        </p>

        {videos.map((url, i) => (
          <div key={i}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
