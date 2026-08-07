import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, Trash2, BellOff, Bell } from "lucide-react";
import api from "../../api/axios";

type Recipient = {
  publicId: string;
  email: string;
  category: string;
  excluded: boolean;
};

type CategoryConfig = {
  key: string;
  label: string;
  description: string;
};

const CATEGORIES: CategoryConfig[] = [
  {
    key: "INVENTORY_OVERDUE",
    label: "Inventory Overdue Alerts",
    description:
      "Notified when equipment checkouts pass their expected return date.",
  },
  {
    key: "FEES_DUE",
    label: "Fees Due Alerts",
    description: "Notified about overdue fee installments.",
  },
  {
    key: "GENERAL",
    label: "General Notifications",
    description: "Catch-all for academy-wide system notifications.",
  },
];

type CategorySectionProps = {
  config: CategoryConfig;
};

function CategorySection({ config }: CategorySectionProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadRecipients();
  }, [config.key]);

  const loadRecipients = async () => {
    try {
      setLoading(true);
      const res = await api.get<Recipient[]>(
        `/admin/settings/notifications/${config.key}`,
      );
      setRecipients(res.data);
    } catch {
      toast.error(`Failed to load ${config.label}`);
    } finally {
      setLoading(false);
    }
  };

  const addRecipient = async () => {
    const trimmed = newEmail.trim();
    if (!trimmed) {
      toast.error("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email address");
      return;
    }
    try {
      setAdding(true);
      const res = await api.post<Recipient>(
        `/admin/settings/notifications/${config.key}`,
        { email: trimmed },
      );
      setRecipients((prev) => [...prev, res.data]);
      setNewEmail("");
      toast.success("Recipient added");
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(msg || "Failed to add recipient");
    } finally {
      setAdding(false);
    }
  };

  const removeRecipient = async (publicId: string) => {
    try {
      await api.delete(
        `/admin/settings/notifications/${config.key}/${publicId}`,
      );
      setRecipients((prev) => prev.filter((r) => r.publicId !== publicId));
      toast.success("Recipient removed");
    } catch {
      toast.error("Failed to remove recipient");
    }
  };

  const toggleExcluded = async (publicId: string) => {
    try {
      const res = await api.patch<Recipient>(
        `/admin/settings/notifications/${config.key}/${publicId}/toggle-excluded`,
      );
      setRecipients((prev) =>
        prev.map((r) => (r.publicId === publicId ? res.data : r)),
      );
    } catch {
      toast.error("Failed to update recipient");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      <div>
        <h4 className="font-semibold text-slate-900">{config.label}</h4>
        <p className="text-xs text-slate-500 mt-0.5">{config.description}</p>
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addRecipient()}
          placeholder="admin@example.com"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-all"
        />
        <button
          onClick={addRecipient}
          disabled={adding}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm transition-all"
        >
          <Plus size={15} />
          Add
        </button>
      </div>

      {/* Recipient list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : recipients.length === 0 ? (
        <p className="text-sm text-slate-400 italic text-center py-3">
          No recipients yet — add an email above.
        </p>
      ) : (
        <div className="space-y-2">
          {recipients.map((r) => (
            <div
              key={r.publicId}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                r.excluded
                  ? "bg-slate-50 border-slate-200 opacity-60"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <span
                className={`text-sm ${r.excluded ? "line-through text-slate-400" : "text-slate-800"}`}
              >
                {r.email}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <button
                  onClick={() => toggleExcluded(r.publicId)}
                  title={r.excluded ? "Re-enable" : "Mute (keep but skip sends)"}
                  className={`p-1.5 rounded-lg transition-all ${
                    r.excluded
                      ? "text-slate-400 hover:bg-slate-100"
                      : "text-blue-500 hover:bg-blue-50"
                  }`}
                >
                  {r.excluded ? <BellOff size={15} /> : <Bell size={15} />}
                </button>
                <button
                  onClick={() => removeRecipient(r.publicId)}
                  title="Remove permanently"
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          Notification Recipients
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Configure which email addresses receive automated alerts per
          notification category. Muted addresses are kept on record but skipped
          during sends.
        </p>
      </div>
      {CATEGORIES.map((cat) => (
        <CategorySection key={cat.key} config={cat} />
      ))}
    </div>
  );
}

export default NotificationSettings;
