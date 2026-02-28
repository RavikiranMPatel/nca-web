import { useEffect, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import {
  Mail,
  MailOpen,
  CheckCheck,
  Trash2,
  Phone,
  Clock,
  X,
  Loader2,
  Inbox,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Submission = {
  publicId: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: "NEW" | "READ" | "REPLIED";
  submittedAt: string;
  readAt?: string;
  repliedAt?: string;
};

type Counts = { NEW: number; READ: number; REPLIED: number };

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  NEW: {
    label: "New",
    dot: "bg-blue-500",
    badge: "bg-blue-100 text-blue-700",
    icon: <Mail size={14} />,
  },
  READ: {
    label: "Read",
    dot: "bg-yellow-500",
    badge: "bg-yellow-100 text-yellow-700",
    icon: <MailOpen size={14} />,
  },
  REPLIED: {
    label: "Replied",
    dot: "bg-green-500",
    badge: "bg-green-100 text-green-700",
    icon: <CheckCheck size={14} />,
  },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ContactInbox() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [counts, setCounts] = useState<Counts>({ NEW: 0, READ: 0, REPLIED: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [selected, setSelected] = useState<Submission | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get(
          `/admin/contact-submissions?size=50${filter ? `&status=${filter}` : ""}`,
        ),
        api.get("/admin/contact-submissions/counts"),
      ]);
      setSubmissions(listRes.data.content);
      setCounts(countRes.data);
    } catch {
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  // ── Open detail (auto-marks READ) ─────────────────────────────────────────
  const openDetail = async (s: Submission) => {
    try {
      const res = await api.get(`/admin/contact-submissions/${s.publicId}`);
      setSelected(res.data);
      load(); // refresh list + counts
    } catch {
      toast.error("Failed to open message");
    }
  };

  // ── Mark replied ──────────────────────────────────────────────────────────
  const markReplied = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await api.patch(
        `/admin/contact-submissions/${selected.publicId}/replied`,
      );
      setSelected(res.data);
      load();
      toast.success("Marked as replied");
    } catch {
      toast.error("Failed to update");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (publicId: string) => {
    try {
      await api.delete(`/admin/contact-submissions/${publicId}`);
      toast.success("Deleted");
      setDeleteConfirm(null);
      if (selected?.publicId === publicId) setSelected(null);
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const total = counts.NEW + counts.READ + counts.REPLIED;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Inbox size={20} className="text-blue-600" />
            Contact Inbox
            {counts.NEW > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {counts.NEW} new
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Messages from your website contact form
          </p>
        </div>
      </div>

      {/* Count pills */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={() => setFilter("")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition ${
            filter === ""
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
          }`}
        >
          All
          <span className="text-xs opacity-70">{total}</span>
        </button>
        {(["NEW", "READ", "REPLIED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition ${
              filter === s
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
            {STATUS_CONFIG[s].label}
            <span className="text-xs opacity-70">{counts[s]}</span>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {submissions.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl">
          <Inbox size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-medium">
            {filter ? `No ${filter.toLowerCase()} messages` : "No messages yet"}
          </p>
          <p className="text-sm text-gray-300 mt-1">
            Messages from your website contact form will appear here
          </p>
        </div>
      )}

      {/* Two-panel layout */}
      {submissions.length > 0 && (
        <div className="flex gap-4 h-[600px]">
          {/* ── List panel ── */}
          <div
            className={`flex flex-col gap-1 overflow-y-auto ${selected ? "w-2/5" : "w-full"} transition-all`}
          >
            {submissions.map((s) => {
              const cfg = STATUS_CONFIG[s.status];
              const isSelected = selected?.publicId === s.publicId;
              return (
                <button
                  key={s.publicId}
                  onClick={() => openDetail(s)}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    isSelected
                      ? "bg-blue-50 border-blue-200"
                      : s.status === "NEW"
                        ? "bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/40"
                        : "bg-white border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`}
                      />
                      <p
                        className={`font-semibold text-sm truncate ${s.status === "NEW" ? "text-gray-900" : "text-gray-600"}`}
                      >
                        {s.name}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {timeAgo(s.submittedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate pl-4 mb-1">
                    {s.email}
                  </p>
                  <p
                    className={`text-xs pl-4 truncate ${s.status === "NEW" ? "text-gray-700 font-medium" : "text-gray-400"}`}
                  >
                    {s.message}
                  </p>
                </button>
              );
            })}
          </div>

          {/* ── Detail panel ── */}
          {selected && (
            <div className="flex-1 border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
              {/* Detail header */}
              <div className="flex items-center justify-between p-4 border-b bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                    {selected.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {selected.name}
                    </p>
                    <p className="text-xs text-gray-400">{selected.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Status badge */}
                  <span
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_CONFIG[selected.status].badge}`}
                  >
                    {STATUS_CONFIG[selected.status].icon}
                    {STATUS_CONFIG[selected.status].label}
                  </span>
                  <button
                    onClick={() => setSelected(null)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-b text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(selected.submittedAt).toLocaleString("en-IN")}
                </span>
                {selected.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} />
                    {selected.phone}
                  </span>
                )}
              </div>

              {/* Message */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-white border border-gray-100 rounded-xl p-5">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selected.message}
                  </p>
                </div>

                {/* Timeline */}
                {(selected.readAt || selected.repliedAt) && (
                  <div className="mt-6 space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Timeline
                    </p>
                    {selected.readAt && (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <MailOpen size={12} />
                        Read at{" "}
                        {new Date(selected.readAt).toLocaleString("en-IN")}
                      </div>
                    )}
                    {selected.repliedAt && (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <CheckCheck size={12} />
                        Replied at{" "}
                        {new Date(selected.repliedAt).toLocaleString("en-IN")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 p-4 border-t bg-white">
                {/* Open email client */}
                <a
                  href={`mailto:${selected.email}?subject=Re: Your inquiry to NCA Cricket Academy`}
                  className="flex-1 py-2.5 text-sm font-medium text-center rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition"
                >
                  Reply via Email
                </a>

                {/* Mark replied */}
                {selected.status !== "REPLIED" && (
                  <button
                    onClick={markReplied}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCheck size={14} />
                    )}
                    Mark Replied
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={() => setDeleteConfirm(selected.publicId)}
                  className="p-2.5 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Delete Message?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete this contact submission. Cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
