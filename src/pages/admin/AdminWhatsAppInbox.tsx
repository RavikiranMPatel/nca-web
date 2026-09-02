import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Loader2, AlertTriangle, Check, CheckCheck, ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";

// Two-pane on desktop, single-pane on mobile: below md this shows the list OR the
// conversation, never both, with a back control.
//
// This deliberately no longer follows ContactInbox's shell. That was built for a
// read-only view whose detail pane is short, so stacking both panes and letting the page
// scroll was survivable there. Here the compose box must stay reachable, which needs a
// bounded height and an internally scrolling timeline.

type Thread = {
  publicId: string;
  tenDigit: string;
  profileName?: string | null;
  lastMessageAt: string;
  lastDirection: "INBOUND" | "OUTBOUND";
  lastPreview?: string | null;
  unreadCount: number;
  windowClosesAt?: string | null;
  windowLikelyOpen: boolean;
};

type Message = {
  direction: "INBOUND" | "OUTBOUND";
  at: string;
  body?: string | null;
  numMedia?: number;
  mediaUrls?: string[];
  matchStatus?: "MATCHED" | "UNMATCHED" | "AMBIGUOUS";
  players?: string[];
  status?: string;
  errorCode?: number | null;
  errorMessage?: string | null;
  windowRejection?: boolean;
  sentBy?: string;
};

type ThreadDetail = Thread & { messages: Message[] };

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });

/** Delivery state. QUEUED/SENT are not delivery — only DELIVERED and READ are. */
function DeliveryTick({ status }: { status?: string }) {
  if (status === "READ") return <CheckCheck size={13} className="text-blue-500" />;
  if (status === "DELIVERED") return <CheckCheck size={13} className="text-gray-400" />;
  if (status === "SENT") return <Check size={13} className="text-gray-400" />;
  return null;
}

export default function AdminWhatsAppInbox() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    try {
      const res = await api.get<Thread[]>("/admin/whatsapp/threads");
      setThreads(res.data || []);
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages?.length]);

  const openThread = async (t: Thread) => {
    try {
      const res = await api.get<ThreadDetail>(`/admin/whatsapp/threads/${t.publicId}`);
      setSelected(res.data);
      // Opening marks read server-side; reflect it without a refetch.
      setThreads((prev) =>
        prev.map((x) => (x.publicId === t.publicId ? { ...x, unreadCount: 0 } : x)),
      );
    } catch {
      toast.error("Couldn't open the conversation");
    }
  };

  const send = async () => {
    if (!selected || !draft.trim()) return;
    setSending(true);
    try {
      const res = await api.post<Message>(
        `/admin/whatsapp/threads/${selected.publicId}/reply`,
        { body: draft.trim() },
      );
      const sent = res.data;
      // The reply is appended whatever happened — a failed send stays visible in the
      // thread rather than vanishing, which is the whole point of storing it.
      setSelected({ ...selected, messages: [...selected.messages, { ...sent, direction: "OUTBOUND" }] });
      setDraft("");

      if (sent.status === "FAILED") {
        // The distinction the error code buys: the window is actionable, everything
        // else is not.
        if (sent.windowRejection) {
          toast.error(
            "This number hasn't messaged in the last 24 hours, so a free reply can't be " +
              "delivered. An approved template is needed.",
            { duration: 8000 },
          );
        } else {
          toast.error(
            sent.errorMessage
              ? `Not delivered: ${sent.errorMessage}${sent.errorCode ? ` (code ${sent.errorCode})` : ""}`
              : "The message was not delivered.",
            { duration: 8000 },
          );
        }
      } else {
        toast.success("Sent");
      }
      loadThreads();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const windowNote = (t: Thread) => {
    if (!t.windowClosesAt) return "No free-reply window — this number hasn't messaged in.";
    return t.windowLikelyOpen
      ? `You can reply freely until ${fmtTime(t.windowClosesAt)}.`
      : `The free-reply window closed ${fmtTime(t.windowClosesAt)}. A template is needed.`;
  };

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle size={18} className="text-green-600 flex-shrink-0" />
          WhatsApp Inbox
          {threads.some((t) => t.unreadCount > 0) && (
            <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {threads.reduce((s, t) => s + t.unreadCount, 0)} new
            </span>
          )}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Conversations start when someone messages the academy number.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm text-gray-400">Loading…</div>
      ) : threads.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">
          No conversations yet.
        </div>
      ) : (
        // Height on EVERY breakpoint, not just md. Without a bounded parent the
        // timeline's flex-1 overflow-y-auto expands to full content height, the pane
        // never scrolls internally, and the compose box drifts to the bottom of the
        // page — further away with every message. 100dvh minus the chrome above.
        <div className="flex flex-col md:flex-row gap-4 h-[calc(100dvh-13rem)] md:h-[600px]">
          {/* ── List panel ──
              Below md this is list OR detail, never both. The previous version only
              changed the md width, so on a phone the detail was appended under a 360px
              list and could open below the fold — tapping a thread looked like nothing
              happened. */}
          <div
            className={`${selected ? "hidden md:flex md:w-2/5" : "flex w-full"} flex-col gap-1 overflow-y-auto min-h-0`}
          >
            {threads.map((t) => {
              const isSel = selected?.publicId === t.publicId;
              return (
                <button
                  key={t.publicId}
                  onClick={() => openThread(t)}
                  className={`text-left rounded-xl border p-3 transition ${
                    isSel
                      ? "border-green-500 bg-green-50"
                      : t.unreadCount > 0
                        ? "border-gray-200 bg-white hover:bg-gray-50 font-medium"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-900 truncate">
                      {t.profileName?.trim() || `+91 ${t.tenDigit}`}
                    </span>
                    {t.unreadCount > 0 && (
                      <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                        {t.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {t.lastDirection === "OUTBOUND" ? "You: " : ""}
                    {t.lastPreview}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{fmtTime(t.lastMessageAt)}</p>
                </button>
              );
            })}
          </div>

          {/* ── Detail panel ── */}
          {selected && (
            <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                {/* Back to the list. Only needed below md, where the list is hidden —
                    without it a phone has no way to reach another conversation. */}
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Back to conversations"
                  className="md:hidden -ml-1 p-1 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {selected.profileName?.trim() || `+91 ${selected.tenDigit}`}
                  </p>
                  <p className="text-xs text-gray-500">+91 {selected.tenDigit}</p>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {selected.messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] min-w-0 break-words rounded-xl px-3 py-2 text-sm ${
                        m.direction === "OUTBOUND"
                          ? m.status === "FAILED" || m.status === "UNDELIVERED"
                            ? "bg-red-50 border border-red-200 text-red-900"
                            : "bg-green-100 text-gray-900"
                          : "bg-white border border-gray-200 text-gray-900"
                      }`}
                    >
                      {m.direction === "INBOUND" && m.matchStatus === "AMBIGUOUS" && (
                        <p className="text-[10px] text-amber-700 mb-1">
                          Shared number — {m.players?.join(", ")}
                        </p>
                      )}
                      {m.direction === "INBOUND" && m.matchStatus === "UNMATCHED" && (
                        <p className="text-[10px] text-gray-500 mb-1">No matching player</p>
                      )}
                      <p className="whitespace-pre-wrap break-words">
                        {m.body || <em className="text-gray-500">(media only)</em>}
                      </p>
                      {!!m.mediaUrls?.length && (
                        <ul className="mt-1 space-y-0.5">
                          {m.mediaUrls.map((u, j) => (
                            <li key={j}>
                              <a
                                href={u}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 underline break-all"
                              >
                                View media {j + 1}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex items-center gap-1 justify-end mt-1">
                        <span className="text-[10px] text-gray-400">{fmtTime(m.at)}</span>
                        {m.direction === "OUTBOUND" && <DeliveryTick status={m.status} />}
                      </div>
                      {m.direction === "OUTBOUND" &&
                        (m.status === "FAILED" || m.status === "UNDELIVERED") && (
                          <p className="text-[10px] text-red-700 mt-1 flex items-start gap-1">
                            <AlertTriangle size={11} className="mt-px shrink-0" />
                            {m.windowRejection
                              ? "Outside the 24-hour window — an approved template is needed."
                              : m.errorMessage || "Not delivered."}
                          </p>
                        )}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              {/* ── Compose ── */}
              <div className="border-t bg-white p-3">
                <p
                  className={`text-[11px] mb-2 ${
                    selected.windowLikelyOpen ? "text-gray-500" : "text-amber-700"
                  }`}
                >
                  {windowNote(selected)}
                </p>
                <div className="flex gap-2 items-end">
                  {/* min-w-0: a flex child will not shrink below its intrinsic width
                      without it, which squeezes the Send button off at 380px. */}
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    placeholder="Type a reply…"
                    className="flex-1 min-w-0 resize-none border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={send}
                    disabled={sending || !draft.trim()}
                    className="shrink-0 px-3 sm:px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Send
                  </button>
                </div>
                {/* The window note above is a hint derived from the last inbound message.
                    It is not a gate — the send is always attempted and WhatsApp decides. */}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
