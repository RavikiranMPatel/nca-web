import { useEffect, useState } from "react";
import { Save, Instagram } from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../../auth/useAuth";
import PresenceBanner from "../../components/PresenceBanner";

export default function InstagramSettings() {
  const { academyId } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [heading, setHeading] = useState("Follow Us on Instagram");
  const [subheading, setSubheading] = useState(
    "Stay connected with our latest updates",
  );
  const [posts, setPosts] = useState(["", "", "", "", ""]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin/settings").then((res) => {
      setEnabled(res.data.SECTION_INSTAGRAM_ENABLED !== "false");
      setHeading(res.data.INSTAGRAM_HEADING || "Follow Us on Instagram");
      setSubheading(
        res.data.INSTAGRAM_SUBHEADING ||
          "Stay connected with our latest updates",
      );
      setPosts([
        res.data.INSTAGRAM_POST_1 || "",
        res.data.INSTAGRAM_POST_2 || "",
        res.data.INSTAGRAM_POST_3 || "",
        res.data.INSTAGRAM_POST_4 || "",
        res.data.INSTAGRAM_POST_5 || "",
      ]);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/admin/settings", {
        SECTION_INSTAGRAM_ENABLED: String(enabled),
        INSTAGRAM_HEADING: heading,
        INSTAGRAM_SUBHEADING: subheading,
        INSTAGRAM_POST_1: posts[0],
        INSTAGRAM_POST_2: posts[1],
        INSTAGRAM_POST_3: posts[2],
        INSTAGRAM_POST_4: posts[3],
        INSTAGRAM_POST_5: posts[4],
      });
      toast.success("Instagram settings saved");
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
          <Instagram className="w-5 h-5 text-pink-600 flex-shrink-0" />
          Instagram Posts Section
        </h2>
        <PresenceBanner entity="branches-tab" id={academyId ?? undefined} />
        <p className="text-sm text-gray-500 mt-0.5">
          Configure the Instagram feed section on your homepage
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {/* Toggle */}
        <label className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-gray-50 transition rounded-t-xl">
          <div>
            <span className="font-semibold text-sm text-gray-800 block">Section Enabled</span>
            <p className="text-xs text-gray-500 mt-0.5">
              Instagram section visible on home page
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

        {/* Post URLs */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Instagram size={15} className="text-pink-600 flex-shrink-0" />
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Post / Reel URLs</h3>
          </div>
          <p className="text-xs text-gray-400">
            Paste Instagram post or Reel URLs:&nbsp;
            <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">instagram.com/p/XXXX/</code>
            &nbsp;or&nbsp;
            <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">instagram.com/reel/XXXX/</code>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {posts.map((url, i) => (
              <div key={i}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Post {i + 1}
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    const updated = [...posts];
                    updated[i] = e.target.value;
                    setPosts(updated);
                  }}
                  placeholder="https://www.instagram.com/reel/..."
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
