import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MessageCircle, Send, Loader2, AlertTriangle, Check, CheckCheck, ArrowLeft, User,
  Paperclip, Download,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import { getImageUrl } from "../../utils/imageUrl";

// Two-pane on desktop, single-pane on mobile: below md this shows the list OR the
// conversation, never both, with a back control.
//
// This deliberately no longer follows ContactInbox's shell. That was built for a
// read-only view whose detail pane is short, so stacking both panes and letting the page
// scroll was survivable there. Here the compose box must stay reachable, which needs a
// bounded height and an internally scrolling timeline.

/**
 * A player on a thread or on a message.
 *
 * `name` is the ONLY field guaranteed to be present. publicId and photoUrl are both null
 * for a player who has since been hard-deleted — the link column is ON DELETE SET NULL
 * and only player_name_snapshot survives — so neither the photo nor the link may gate
 * rendering the name.
 */
type InboxPlayer = {
  publicId: string | null;
  name: string;
  photoUrl?: string | null;
  active: boolean;
};

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
  /** LIVE match on the number — whoever holds it today, which is who a reply reaches. */
  players: InboxPlayer[];
};

type Message = {
  direction: "INBOUND" | "OUTBOUND";
  at: string;
  /** Present on inbound messages; addresses the media endpoint. */
  publicId?: string;
  body?: string | null;
  numMedia?: number;
  /**
   * Content types only. The Twilio URLs are deliberately no longer sent: they needed HTTP
   * Basic auth with the account SID and token, so no browser could ever open one, and
   * they embedded that account SID in the page.
   */
  mediaContentTypes?: string[];
  matchStatus?: "MATCHED" | "UNMATCHED" | "AMBIGUOUS";
  /** SNAPSHOT — who this number matched when the message arrived. */
  players?: InboxPlayer[];
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

/**
 * Photo with an initials fallback — the pattern from PlayersListPage.tsx:1074-1091,
 * onError handler included: the <img> hides itself and reveals its sibling when the file
 * is missing. The fallback is the normal path, not an edge case: 9 of the 82 reachable
 * players have no photo at all, and a deleted player never has one.
 */
function PlayerAvatar({ p, size }: { p: InboxPlayer; size: number }) {
  const url = getImageUrl(p.photoUrl);
  const box = { width: size, height: size };
  return (
    <span className="inline-flex shrink-0" style={box}>
      {url && (
        <img
          src={url}
          alt={p.name}
          style={box}
          className="rounded-full object-cover border-2 border-white bg-gray-100"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
      )}
      <span
        style={box}
        className={`rounded-full border-2 border-white bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center ${url ? "hidden" : ""}`}
      >
        <span className="font-bold text-blue-600" style={{ fontSize: Math.round(size * 0.42) }}>
          {p.name.trim().charAt(0).toUpperCase()}
        </span>
      </span>
    </span>
  );
}

/**
 * An unmatched number. Deliberately NOT an initial from the WhatsApp profile name: that
 * is sender-supplied and unverified, and rendering it as an avatar letter would present
 * it as identity we do not have.
 */
function UnknownAvatar({ size }: { size: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white bg-gray-100"
    >
      <User size={Math.round(size * 0.5)} className="text-gray-400" />
    </span>
  );
}

/** Overlapping, because a list row at 380px has no width for two side by side. */
function AvatarStack({ players, size }: { players: InboxPlayer[]; size: number }) {
  if (players.length === 0) return <UnknownAvatar size={size} />;
  return (
    <span className="flex shrink-0">
      {players.slice(0, 3).map((p, i) => (
        <span
          key={p.publicId ?? `${p.name}-${i}`}
          style={{ marginLeft: i === 0 ? 0 : -Math.round(size / 3), zIndex: 3 - i }}
        >
          <PlayerAvatar p={p} size={size} />
        </span>
      ))}
    </span>
  );
}

function InactiveChip() {
  return (
    <span className="shrink-0 text-[10px] font-medium text-gray-500 bg-gray-100 rounded px-1 py-px">
      inactive
    </span>
  );
}

/**
 * One player in the conversation header.
 *
 * A hard-deleted player has no detail screen to open, so this degrades to plain text —
 * the name is the record of who the message was about and still renders. Only the link
 * is lost, never the name.
 */
function PlayerRow({ p, onOpen }: { p: InboxPlayer; onOpen: (publicId: string) => void }) {
  const inner = (
    <>
      <PlayerAvatar p={p} size={28} />
      <span className="text-sm font-semibold text-gray-900 truncate">{p.name}</span>
      {!p.active && <InactiveChip />}
    </>
  );
  if (!p.publicId) {
    return (
      <span className="flex items-center gap-2 min-w-0">
        {inner}
        <span className="shrink-0 text-[10px] text-gray-400">no longer on file</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(p.publicId!)}
      className="flex items-center gap-2 min-w-0 text-left rounded hover:underline"
    >
      {inner}
    </button>
  );
}

/**
 * Inbound attachments, fetched through the authenticated proxy and rendered inline.
 *
 * Not an <a href>: the endpoint requires the Bearer token that the axios interceptor adds
 * per request, and a plain navigation or target="_blank" carries no headers. That is the
 * same reason the old Twilio links failed, so linking straight to the proxy would just
 * swap Twilio's 401 for ours. The bytes are fetched as a blob and shown from an object
 * URL, following the receipt-PDF download in PlayerFeesTab.
 */
function MessageMedia({
  messagePublicId,
  count,
  contentTypes,
}: {
  messagePublicId?: string;
  count: number;
  contentTypes?: string[];
}) {
  const [loaded, setLoaded] = useState<Record<number, { url: string; type: string }>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [failed, setFailed] = useState<Record<number, string>>({});
  // Every object URL ever created here, revoked once on unmount. Keying the cleanup on
  // `loaded` instead would revoke a URL the moment a second attachment loaded.
  const createdUrls = useRef<string[]>([]);
  useEffect(() => () => createdUrls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  if (!count || !messagePublicId) return null;

  const load = async (i: number) => {
    if (loaded[i] || busy !== null) return;
    setBusy(i);
    setFailed((p) => {
      const next = { ...p };
      delete next[i];
      return next;
    });
    try {
      const res = await api.get(
        `/admin/whatsapp/messages/${messagePublicId}/media/${i}`,
        { responseType: "blob" },
      );
      const type =
        (res.data as Blob).type || contentTypes?.[i] || "application/octet-stream";
      const url = URL.createObjectURL(res.data as Blob);
      createdUrls.current.push(url);
      setLoaded((p) => ({ ...p, [i]: { url, type } }));
    } catch (e: any) {
      // responseType blob means an error body is a Blob too, so the status is the only
      // thing reliably readable here.
      setFailed((p) => ({
        ...p,
        [i]:
          e?.response?.status === 404
            ? "No longer available from WhatsApp"
            : "Couldn't load this attachment",
      }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ul className="mt-1.5 space-y-1.5">
      {Array.from({ length: count }, (_, i) => {
        const got = loaded[i];
        const type = got?.type ?? contentTypes?.[i] ?? "";
        if (got) {
          if (type.startsWith("image/")) {
            return (
              <li key={i}>
                {/* The object URL already exists, so this open is synchronous with the
                    click and is not treated as a popup. */}
                <img
                  src={got.url}
                  alt={`Attachment ${i + 1}`}
                  onClick={() => window.open(got.url, "_blank", "noopener")}
                  className="max-h-64 w-auto max-w-full rounded-lg border border-gray-200 cursor-zoom-in"
                />
              </li>
            );
          }
          if (type.startsWith("audio/")) {
            return (
              <li key={i}>
                <audio controls src={got.url} className="w-full max-w-[240px]" />
              </li>
            );
          }
          if (type.startsWith("video/")) {
            return (
              <li key={i}>
                <video controls src={got.url} className="max-h-64 w-auto max-w-full rounded-lg" />
              </li>
            );
          }
          return (
            <li key={i}>
              <a
                href={got.url}
                download={`attachment-${i + 1}`}
                className="inline-flex items-center gap-1 text-xs text-blue-600 underline"
              >
                <Download size={12} /> Save attachment {i + 1}
                {type ? ` (${type})` : ""}
              </a>
            </li>
          );
        }
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => load(i)}
              disabled={busy !== null}
              className="inline-flex items-center gap-1 text-xs text-blue-600 underline disabled:opacity-50"
            >
              {busy === i ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Paperclip size={12} />
              )}
              View attachment {i + 1}
              {contentTypes?.[i] ? ` (${contentTypes[i]})` : ""}
            </button>
            {failed[i] && (
              <p className="text-[10px] text-red-600 mt-0.5">{failed[i]}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Identity only: the publicId when there is one, the snapshot name otherwise. Active
 * state is deliberately excluded — "was active then, inactive now" is the same person and
 * must not read as a change of who holds the number.
 */
const identityKey = (ps?: InboxPlayer[]) =>
  (ps ?? []).map((p) => p.publicId ?? `name:${p.name}`).sort().join("|");

export default function AdminWhatsAppInbox() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // The existing admin player screen — the same target PlayersListPage.tsx:1052 uses.
  // The route (App.tsx:564) redirects its index to /info.
  const openPlayer = (publicId: string) => navigate(`/admin/players/${publicId}`);

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

  // ?thread=WAT-… opens that conversation directly. This is what the inbound admin email
  // links to: the email cannot link the media endpoint itself, because a mail client's
  // browser has no Bearer token and would get the same 401 the Twilio links gave.
  const deepLinkThread = searchParams.get("thread");
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || !deepLinkThread || threads.length === 0) return;
    const match = threads.find((t) => t.publicId === deepLinkThread);
    if (match) {
      deepLinked.current = true;
      openThread(match);
    }
    // Runs once per load: a second attempt after the admin navigates away would yank
    // them back to the emailed thread.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkThread, threads]);

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

  // What the header currently says. A message whose snapshot differs from this is the
  // only case worth repeating names for — see the timeline below.
  const headerIdentity = identityKey(selected?.players);

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
              const named = t.players.length > 0;
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
                  <div className="flex items-start gap-2.5">
                    <AvatarStack players={t.players} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-900 truncate">
                          {named
                            ? t.players.map((p) => p.name).join(" & ")
                            : t.profileName?.trim() || `+91 ${t.tenDigit}`}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          {t.players.length === 1 && !t.players[0].active && <InactiveChip />}
                          {t.unreadCount > 0 && (
                            <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {t.unreadCount}
                            </span>
                          )}
                        </span>
                      </div>
                      {!named && (
                        <p className="text-[11px] text-gray-400 truncate">Not a registered player</p>
                      )}
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {t.lastDirection === "OUTBOUND" ? "You: " : ""}
                        {t.lastPreview}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                        +91 {t.tenDigit} · {fmtTime(t.lastMessageAt)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Detail panel ── */}
          {selected && (
            <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b flex items-start gap-2">
                {/* Back to the list. Only needed below md, where the list is hidden —
                    without it a phone has no way to reach another conversation. */}
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Back to conversations"
                  className="md:hidden -ml-1 p-1 mt-0.5 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="min-w-0 flex-1">
                  {selected.players.length > 0 ? (
                    // Stacked, one per row: the header has the width the list row does
                    // not, and two overlapping avatars would hide a name here.
                    <div className="space-y-1">
                      {selected.players.map((p, i) => (
                        <PlayerRow key={p.publicId ?? `${p.name}-${i}`} p={p} onOpen={openPlayer} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <UnknownAvatar size={28} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {selected.profileName?.trim() || `+91 ${selected.tenDigit}`}
                        </p>
                        <p className="text-[11px] text-gray-400">Not a registered player</p>
                      </div>
                    </div>
                  )}
                  {/* Skipped when the title above IS the number — an unmatched thread
                      with no profile name would otherwise print it twice. */}
                  {(selected.players.length > 0 || !!selected.profileName?.trim()) && (
                    <p className="text-xs text-gray-500 mt-1">+91 {selected.tenDigit}</p>
                  )}
                  {/* A property of the NUMBER, not of any one message — which is why it
                      lives here and no longer on every inbound bubble. */}
                  {selected.players.length > 1 && (
                    <p className="text-[11px] text-amber-700 mt-1 flex items-start gap-1">
                      <AlertTriangle size={11} className="mt-px shrink-0" />
                      Shared number — {selected.players.length} players are reachable on it.
                    </p>
                  )}
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
                      {/* The snapshot is shown ONLY where it disagrees with the header.
                          Repeating the same names on every bubble is noise; a difference
                          is the number having changed hands, a player having been removed,
                          or a message that predates the registration — all worth saying. */}
                      {m.direction === "INBOUND" && identityKey(m.players) !== headerIdentity && (
                        <div className="mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-amber-700">
                          {m.players?.length ? (
                            <>
                              <span>At the time:</span>
                              {m.players.map((p, j) =>
                                p.publicId ? (
                                  <button
                                    key={j}
                                    type="button"
                                    onClick={() => openPlayer(p.publicId!)}
                                    className="inline-flex items-center gap-1 text-gray-700 hover:underline"
                                  >
                                    <PlayerAvatar p={p} size={16} />
                                    {p.name}
                                    {!p.active && <span className="text-gray-400">(inactive)</span>}
                                  </button>
                                ) : (
                                  <span key={j} className="inline-flex items-center gap-1 text-gray-700">
                                    <PlayerAvatar p={p} size={16} />
                                    {p.name}
                                    <span className="text-gray-400">(no longer on file)</span>
                                  </span>
                                ),
                              )}
                            </>
                          ) : (
                            <span>No player matched this number when this arrived.</span>
                          )}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap break-words">
                        {m.body || <em className="text-gray-500">(media only)</em>}
                      </p>
                      <MessageMedia
                        messagePublicId={m.publicId}
                        count={m.numMedia ?? 0}
                        contentTypes={m.mediaContentTypes}
                      />
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
