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
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Instagram Posts Section</h2>

      <label className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 cursor-pointer">
        <div>
          <span className="font-medium">Section Enabled</span>
          <p className="text-sm text-gray-500">
            Instagram section visible on home page
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
          <Instagram size={18} className="text-pink-600" />
          <h3 className="font-medium">Post / Reel URLs</h3>
        </div>
        <p className="text-sm text-gray-500">
          Paste Instagram post or Reel URLs. Examples:
          <br />
          <code className="bg-gray-100 px-1 rounded text-xs">
            https://www.instagram.com/p/XXXX/
          </code>
          <br />
          <code className="bg-gray-100 px-1 rounded text-xs">
            https://www.instagram.com/reel/XXXX/
          </code>
        </p>

        {posts.map((url, i) => (
          <div key={i}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
