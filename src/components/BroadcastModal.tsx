import { useState, useEffect } from "react";
import { X, Send, AlertTriangle, Loader2, History, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/axios";
import BroadcastRecipientsModal from "./BroadcastRecipientsModal";

const MAX_CHARS = 200;

interface Props {
  onClose: () => void;
}

interface BroadcastHistoryEntry {
  id: string;
  message: string;
  sentBy: string;
  sentAt: string;
  totalSent: number;
  totalSkipped: number;
}

export default function BroadcastModal({ onClose }: Props) {
  const [tab, setTab] = useState<"send" | "history">("send");

  // Send tab state
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // History tab state
  const [history, setHistory] = useState<BroadcastHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await api.get<BroadcastHistoryEntry[]>("/admin/whatsapp/broadcast/history");
      setHistory(res.data);
    } catch {
      toast.error("Failed to load broadcast history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSend() {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const res = await api.post<{ sent: number; skipped: number; broadcastId: string }>(
        "/admin/whatsapp/broadcast",
        { message: message.trim() }
      );
      const { sent, skipped } = res.data;
      toast.success(
        `✅ Broadcast sent to ${sent} player${sent !== 1 ? "s" : ""}` +
          (skipped > 0 ? ` (${skipped} skipped — no phone number)` : ""),
        { duration: 5000 }
      );
      onClose();
    } catch {
      toast.error("❌ Failed to send broadcast. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const previewText = message.trim()
    ? `Hi [Player], important update from NextGen Cricket Academy: ${message.trim()} For any queries, feel free to contact us. Thank you!`
    : null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">📢</span>
              <h2 className="text-base font-semibold text-gray-900">
                WhatsApp Broadcast
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-gray-100 flex-shrink-0">
            <button
              onClick={() => setTab("send")}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium transition border-b-2 ${
                tab === "send"
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Send size={14} />
              Send
            </button>
            <button
              onClick={() => setTab("history")}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium transition border-b-2 ${
                tab === "history"
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <History size={14} />
              History
            </button>
          </div>

          {/* ── SEND TAB ─────────────────────────────────── */}
          {tab === "send" && (
            <>
              <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    maxLength={MAX_CHARS}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. Academy will be closed today for Rajyotsava holiday"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder:text-gray-400"
                  />
                  <p
                    className={`text-right text-xs mt-1 ${
                      message.length >= MAX_CHARS
                        ? "text-red-500 font-medium"
                        : "text-gray-400"
                    }`}
                  >
                    {message.length} / {MAX_CHARS}
                  </p>
                </div>

                {previewText && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                      Preview
                    </p>
                    <div className="bg-[#dcf8c6] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 leading-relaxed shadow-sm max-w-xs">
                      {previewText}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    This will send to <strong>all active players</strong> with a phone number.
                    Parent's number is preferred over the player's own.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={onClose}
                  disabled={sending}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Send to All Players
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── HISTORY TAB ──────────────────────────────── */}
          {tab === "history" && (
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
                <p className="text-xs text-gray-500">Last 20 broadcasts</p>
                <button
                  onClick={loadHistory}
                  disabled={historyLoading}
                  className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition"
                >
                  <RefreshCw size={12} className={historyLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>

              {historyLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-green-600" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-400">
                  No broadcasts sent yet.
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {history.map((entry) => (
                    <li key={entry.id} className="px-5 py-4 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 leading-snug line-clamp-2">
                            {entry.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{entry.sentAt}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                              ✅ {entry.totalSent} sent
                            </span>
                            {entry.totalSkipped > 0 && (
                              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                ⚠️ {entry.totalSkipped} skipped
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedBroadcastId(entry.id)}
                          className="text-xs text-green-600 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 transition whitespace-nowrap flex-shrink-0"
                        >
                          View Recipients
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="px-5 py-4 border-t border-gray-100">
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedBroadcastId && (
        <BroadcastRecipientsModal
          broadcastId={selectedBroadcastId}
          onClose={() => setSelectedBroadcastId(null)}
        />
      )}
    </>
  );
}
