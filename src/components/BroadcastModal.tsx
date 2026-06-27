import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Send, AlertTriangle, Loader2, History, RefreshCw,
  Users, User, Plus, Search, Phone, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/axios";
import BroadcastRecipientsModal from "./BroadcastRecipientsModal";

const MAX_CHARS = 100;

// ── Types ─────────────────────────────────────────────────────────────────────

type BroadcastMode = "ALL" | "BATCH" | "SPECIFIC";

interface Batch {
  id: string;
  name: string;
  startTime: string; // "HH:mm:ss"
  endTime: string;
  color: string | null;
  active: boolean;
}

interface PreviewPlayer {
  playerName: string;
  maskedPhone: string | null;
  phoneType: "PARENT" | "PLAYER" | null;
  hasPhone: boolean;
}

interface RecipientInput {
  name: string;
  phone: string;
}

interface PlayerSearchResult {
  id: string;
  displayName: string;
  parentsPhone: string | null;
  phone: string | null;
}

interface BroadcastHistoryEntry {
  id: string;
  message: string;
  mode: string;
  sentBy: string;
  sentAt: string;
  totalSent: number;
  totalSkipped: number;
}

interface Props {
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length < 10) return phone;
  return d.slice(d.length - 10, d.length - 10 + 5) + "XXXXX";
}

const MODE_LABELS: Record<string, string> = {
  ALL: "📢 All Players",
  BATCH: "🏏 By Batch",
  SPECIFIC: "👤 Specific",
};

function modeBadgeClass(m: string) {
  if (m === "BATCH") return "bg-indigo-50 text-indigo-700";
  if (m === "SPECIFIC") return "bg-blue-50 text-blue-700";
  return "bg-gray-100 text-gray-600";
}

function counterColor(len: number): string {
  if (len > 90) return "text-red-500 font-medium";
  if (len > 70) return "text-orange-500 font-medium";
  return "text-gray-400";
}

function counterWarning(len: number): string | null {
  if (len > 90) return "Very long — may get cut off on some phones";
  if (len > 70) return "Getting long — keep it short for WhatsApp";
  return null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlayerInitial({ name, hasPhone }: { name: string; hasPhone: boolean }) {
  const initial = (name || "?")[0].toUpperCase();
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${
      hasPhone ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
    }`}>
      {initial}
    </span>
  );
}

interface PreviewListProps {
  players: PreviewPlayer[];
  open: boolean;
  onToggle: () => void;
  label?: string;
}

function PreviewList({ players, open, onToggle, label }: PreviewListProps) {
  const withPhone = players.filter((p) => p.hasPhone).length;
  const skipped = players.length - withPhone;
  const toggleLabel = label ?? `👥 Preview recipients (${players.length})`;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition"
      >
        <span>{toggleLabel}</span>
        <span className="flex items-center gap-2 text-gray-400">
          {skipped > 0 && (
            <span className="text-amber-600 font-semibold">{skipped} skipped</span>
          )}
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>

      {open && (
        <ul className="divide-y divide-gray-100 max-h-[200px] overflow-y-auto">
          {players.map((p, i) => (
            <li key={i} className="px-3 py-2">
              <div className="flex items-start gap-2.5">
                <PlayerInitial name={p.playerName} hasPhone={p.hasPhone} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium leading-snug ${p.hasPhone ? "text-gray-800" : "text-gray-400"}`}>
                    {p.playerName}
                  </p>
                  {p.hasPhone ? (
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <Phone size={11} className="text-green-500 flex-shrink-0" />
                      <span className="text-xs text-gray-500 font-mono">{p.maskedPhone}</span>
                      {p.phoneType && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          p.phoneType === "PARENT"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {p.phoneType === "PARENT" ? "Parent" : "Player"}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-amber-500">
                      <AlertTriangle size={10} />
                      No phone — skipped
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BroadcastModal({ onClose }: Props) {
  const [tab, setTab] = useState<"send" | "history">("send");

  // Common send state
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<BroadcastMode>("ALL");

  // BATCH mode
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());
  const [previewPlayers, setPreviewPlayers] = useState<PreviewPlayer[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [batchPreviewOpen, setBatchPreviewOpen] = useState(false);
  const previewDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SPECIFIC mode — manual entry
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [recipients, setRecipients] = useState<RecipientInput[]>([]);
  const [specificPreviewOpen, setSpecificPreviewOpen] = useState(false);

  // SPECIFIC mode — player search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // History tab
  const [history, setHistory] = useState<BroadcastHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);

  // ── Load batches when mode = BATCH ────────────────────────────────────────
  useEffect(() => {
    if (mode !== "BATCH" || batches.length > 0) return;
    setBatchesLoading(true);
    api.get<Batch[]>("/admin/batches")
      .then((r) => setBatches(r.data.filter((b) => b.active !== false)))
      .catch(() => toast.error("Failed to load batches."))
      .finally(() => setBatchesLoading(false));
  }, [mode, batches.length]);

  // ── Preview when selected batches change ──────────────────────────────────
  useEffect(() => {
    if (mode !== "BATCH") return;
    if (previewDebounce.current) clearTimeout(previewDebounce.current);
    if (selectedBatchIds.size === 0) {
      setPreviewPlayers([]);
      setBatchPreviewOpen(false);
      return;
    }

    previewDebounce.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const ids = Array.from(selectedBatchIds).join(",");
        const res = await api.get<PreviewPlayer[]>(`/admin/whatsapp/broadcast/preview?batchIds=${ids}`);
        setPreviewPlayers(res.data);
      } catch {
        setPreviewPlayers([]);
      } finally {
        setPreviewLoading(false);
      }
    }, 400);

    return () => { if (previewDebounce.current) clearTimeout(previewDebounce.current); };
  }, [selectedBatchIds, mode]);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    function h(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node))
        setShowDropdown(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Debounced player search ───────────────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); setShowDropdown(false); return; }
    setSearchLoading(true);
    try {
      const r = await api.get<PlayerSearchResult[]>(`/admin/players/search?q=${encodeURIComponent(q)}`);
      setSearchResults(r.data);
      setShowDropdown(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(searchQuery), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, runSearch]);

  // ── History ───────────────────────────────────────────────────────────────
  useEffect(() => { if (tab === "history") loadHistory(); }, [tab]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const r = await api.get<BroadcastHistoryEntry[]>("/admin/whatsapp/broadcast/history");
      setHistory(r.data);
    } catch {
      toast.error("Failed to load broadcast history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  // ── Batch selection ───────────────────────────────────────────────────────
  function toggleBatch(id: string) {
    setSelectedBatchIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── SPECIFIC recipient management ─────────────────────────────────────────
  function isDuplicatePhone(phone: string) {
    return recipients.some((r) => r.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""));
  }

  function addManualRecipient() {
    const digits = phoneInput.replace(/\D/g, "");
    if (digits.length !== 10) { setPhoneError("Phone must be 10 digits"); return; }
    if (isDuplicatePhone(digits)) { setPhoneError("This number is already in the list"); return; }
    setRecipients((prev) => [...prev, { name: nameInput.trim() || "Player", phone: digits }]);
    setNameInput(""); setPhoneInput(""); setPhoneError("");
  }

  function addPlayerFromSearch(player: PlayerSearchResult) {
    const phone = (player.parentsPhone || player.phone || "").replace(/\D/g, "");
    if (!phone) { toast.error(`${player.displayName} has no phone number on file`); setShowDropdown(false); return; }
    if (isDuplicatePhone(phone)) {
      toast(`${player.displayName} is already in the list`, { icon: "⚠️" });
      setShowDropdown(false); setSearchQuery(""); return;
    }
    setRecipients((prev) => [...prev, { name: player.displayName, phone }]);
    setSearchQuery(""); setSearchResults([]); setShowDropdown(false);
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  async function handleSend() {
    if (!message.trim() || sending) return;
    if (mode === "SPECIFIC" && recipients.length === 0) return;
    if (mode === "BATCH" && selectedBatchIds.size === 0) return;

    setSending(true);
    try {
      const payload: Record<string, unknown> = { message: message.trim(), mode };
      if (mode === "SPECIFIC") payload.recipients = recipients.map((r) => ({ name: r.name, phone: r.phone }));
      if (mode === "BATCH") payload.batchIds = Array.from(selectedBatchIds);

      const res = await api.post<{ sent: number; skipped: number; broadcastId: string }>(
        "/admin/whatsapp/broadcast", payload
      );
      const { sent, skipped } = res.data;
      toast.success(
        `✅ Broadcast sent to ${sent} player${sent !== 1 ? "s" : ""}` +
          (skipped > 0 ? ` (${skipped} skipped — no phone)` : ""),
        { duration: 5000 }
      );
      onClose();
    } catch {
      toast.error("❌ Failed to send broadcast. Please try again.");
    } finally {
      setSending(false);
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const batchWithPhone = previewPlayers.filter((p) => p.hasPhone).length;
  const batchSkipped = previewPlayers.length - batchWithPhone;

  const specificPreviewPlayers: PreviewPlayer[] = recipients.map((r) => ({
    playerName: r.name,
    maskedPhone: maskPhone(r.phone),
    phoneType: null,
    hasPhone: true,
  }));

  const sendDisabled =
    !message.trim() || sending ||
    (mode === "SPECIFIC" && recipients.length === 0) ||
    (mode === "BATCH" && selectedBatchIds.size === 0);

  function sendLabelDesktop() {
    if (mode === "ALL") return "Send to All Players";
    if (mode === "SPECIFIC") return `Send to ${recipients.length} Player${recipients.length !== 1 ? "s" : ""}`;
    if (!previewLoading && previewPlayers.length > 0)
      return `Send to ${batchWithPhone} in ${selectedBatchIds.size} Batch${selectedBatchIds.size !== 1 ? "es" : ""}`;
    return `Send to Batch${selectedBatchIds.size !== 1 ? "es" : ""}`;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop — bottom-sheet on mobile, centered on desktop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Modal panel — flex column, max-h enforced on both axes */}
        <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92vh] sm:max-h-[85vh]">

          {/* ── HEADER — flex-shrink-0, never scrolls ──────────────── */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl">📢</span>
                <h2 className="text-sm sm:text-base font-semibold text-gray-900">WhatsApp Broadcast</h2>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
                <X size={18} />
              </button>
            </div>
            <div className="flex border-b border-gray-100">
              {(["send", "history"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-medium transition border-b-2 ${
                    tab === t ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}>
                  {t === "send" ? <Send size={13} /> : <History size={13} />}
                  {t === "send" ? "Send" : "History"}
                </button>
              ))}
            </div>
          </div>

          {/* ── BODY — flex-1 min-h-0 overflow-y-auto (THE KEY FIX) ── */}
          {/* min-h-0 overrides flex's default min-height:auto so       */}
          {/* overflow-y-auto can actually kick in and constrain height  */}
          <div className="flex-1 min-h-0 overflow-y-auto">

          {/* ── SEND TAB ──────────────────────────────────────────────────── */}
          {tab === "send" && (
            <div className="px-4 sm:px-5 py-4 space-y-4">

                {/* ── 3-way mode toggle ──────────────────────────────────── */}
                <div className="flex rounded-xl border border-gray-200 p-1 gap-0.5 sm:gap-1 bg-gray-50">
                  {(["ALL", "BATCH", "SPECIFIC"] as BroadcastMode[]).map((m) => (
                    <button key={m}
                      onClick={() => {
                        setMode(m);
                        setSelectedBatchIds(new Set());
                        setPreviewPlayers([]);
                        setBatchPreviewOpen(false);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold transition ${
                        mode === m ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}>
                      {m === "ALL" && <><Users size={12} />All</>}
                      {m === "BATCH" && <span>🏏 Batch</span>}
                      {m === "SPECIFIC" && <><User size={12} />Specific</>}
                    </button>
                  ))}
                </div>

                {/* ── Message ────────────────────────────────────────────── */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
                  <p className="text-xs text-gray-400 mb-1.5 leading-snug">
                    Each player receives a personalised message with their name. Replies are not possible — this is a one-way notification.
                  </p>
                  <textarea
                    rows={3}
                    maxLength={MAX_CHARS}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. Academy will be closed today for Rajyotsava holiday"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder:text-gray-400 min-h-[72px] sm:min-h-[96px]"
                  />
                  <div className="flex items-start justify-between mt-1 gap-2 min-h-[16px]">
                    {counterWarning(message.length) ? (
                      <p className={`text-xs ${message.length > 90 ? "text-red-500" : "text-orange-500"}`}>
                        {counterWarning(message.length)}
                      </p>
                    ) : <span />}
                    <p className={`text-xs flex-shrink-0 ${counterColor(message.length)}`}>
                      {message.length} / {MAX_CHARS}
                    </p>
                  </div>
                </div>

                {/* ── WhatsApp live preview ──────────────────────────────── */}
                <div>
                  <p className="text-xs text-gray-400 italic mb-2">📱 Message Preview</p>
                  <div
                    className="rounded-xl p-3.5 sm:p-4 text-sm leading-relaxed break-words"
                    style={{ backgroundColor: "#DCF8C6", borderLeft: "3px solid #25D366", wordBreak: "break-word", overflowWrap: "break-word" }}
                  >
                    <span className="text-gray-500">Hi </span>
                    <strong className="text-gray-800">Sample Player</strong>
                    <span className="text-gray-500">, important update from </span>
                    <strong className="text-gray-800">NextGen Cricket Academy</strong>
                    <span className="text-gray-500">:{" "}</span>
                    {message.trim() ? (
                      <span className="rounded px-0.5" style={{ backgroundColor: "#FFF9C4" }}>
                        {message.trim()}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">your message here…</span>
                    )}
                    <span className="text-gray-500"> For any queries, feel free to contact us. Thank you!</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    💡 <strong className="text-gray-500">Bold</strong> parts are fixed template text.{" "}
                    <span
                      className="inline-block w-3 h-2.5 rounded align-middle"
                      style={{ backgroundColor: "#FFF9C4", border: "1px solid #c8b800" }}
                    />{" "}
                    Highlighted part is your message.
                  </p>
                </div>

                {/* ── ALL mode — warning ─────────────────────────────────── */}
                {mode === "ALL" && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                    <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      Sends to <strong>all active players</strong>. Parent's phone is preferred over the player's own.
                    </p>
                  </div>
                )}

                {/* ── BATCH mode ────────────────────────────────────────── */}
                {mode === "BATCH" && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-gray-600">Select batches</p>

                    {batchesLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 size={18} className="animate-spin text-green-600" />
                      </div>
                    ) : batches.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No active batches found.</p>
                    ) : (
                      /* 1 col on mobile, 2 col on sm+ */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {batches.map((b) => {
                          const selected = selectedBatchIds.has(b.id);
                          const dot = b.color || "#6B7280";
                          return (
                            <button key={b.id} onClick={() => toggleBatch(b.id)}
                              className={`text-left p-2 sm:p-3 rounded-xl border-2 transition ${
                                selected
                                  ? "border-green-500 bg-green-50"
                                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                              }`}>
                              <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: dot }} />
                                <span className="text-xs font-semibold text-gray-800 truncate flex-1 min-w-0">
                                  {b.name}
                                </span>
                                {selected && (
                                  <span className="text-green-600 flex-shrink-0">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 ml-4">
                                {fmtTime(b.startTime)} – {fmtTime(b.endTime)}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Summary bar */}
                    {selectedBatchIds.size > 0 && (
                      <div className={`rounded-lg px-3 py-2.5 text-xs font-medium ${
                        previewLoading
                          ? "bg-gray-50 border border-gray-200 text-gray-400"
                          : previewPlayers.length > 0
                            ? "bg-green-50 border border-green-200 text-green-800"
                            : "bg-gray-50 border border-gray-200 text-gray-500"
                      }`}>
                        {previewLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 size={12} className="animate-spin" />
                            Loading recipients…
                          </span>
                        ) : (
                          <>
                            <strong>{selectedBatchIds.size} batch{selectedBatchIds.size !== 1 ? "es" : ""} selected</strong>
                            {previewPlayers.length > 0 && (
                              <>
                                {" · "}
                                <span className="text-green-700">{batchWithPhone} will receive</span>
                                {batchSkipped > 0 && (
                                  <span className="text-amber-600">
                                    {" · "}{batchSkipped} skipped (no phone)
                                  </span>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Collapsible recipient preview */}
                    {!previewLoading && previewPlayers.length > 0 && (
                      <PreviewList
                        players={previewPlayers}
                        open={batchPreviewOpen}
                        onToggle={() => setBatchPreviewOpen((o) => !o)}
                      />
                    )}
                  </div>
                )}

                {/* ── SPECIFIC mode ─────────────────────────────────────── */}
                {mode === "SPECIFIC" && (
                  <div className="space-y-3">

                    {/* Search from players */}
                    <div ref={searchContainerRef} className="relative">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Search & add from players
                      </label>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                          placeholder="Search player by name…"
                          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder:text-gray-400"
                        />
                        {searchLoading && (
                          <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
                        )}
                      </div>
                      {showDropdown && searchResults.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {searchResults.map((p) => {
                            const phone = (p.parentsPhone || p.phone || "").replace(/\D/g, "");
                            const added = isDuplicatePhone(phone);
                            return (
                              <button key={p.id} disabled={added} onClick={() => addPlayerFromSearch(p)}
                                className={`w-full text-left px-4 py-2.5 hover:bg-green-50 transition flex items-center justify-between gap-2 ${added ? "opacity-40 cursor-not-allowed" : ""}`}>
                                <div>
                                  <p className="text-sm text-gray-800 font-medium">{p.displayName}</p>
                                  <p className="text-xs text-gray-400">
                                    {p.parentsPhone ? `Parent: ${p.parentsPhone}` : p.phone ? `Player: ${p.phone}` : "No phone"}
                                  </p>
                                </div>
                                {added && <span className="text-xs text-green-600 font-medium">Added</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Manual entry */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Or add manually</label>
                      <div className="flex gap-2">
                        <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                          placeholder="Name (optional)"
                          className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder:text-gray-400"
                        />
                        <input type="tel" value={phoneInput} maxLength={10}
                          onChange={(e) => { setPhoneInput(e.target.value); setPhoneError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && addManualRecipient()}
                          placeholder="Phone*"
                          className={`w-24 sm:w-28 text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder:text-gray-400 ${phoneError ? "border-red-400" : "border-gray-200"}`}
                        />
                        <button onClick={addManualRecipient} disabled={!phoneInput.trim()}
                          className="flex-shrink-0 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
                          <Plus size={16} />
                        </button>
                      </div>
                      {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                    </div>

                    {/* Recipient preview list */}
                    {recipients.length > 0 ? (
                      <PreviewList
                        players={specificPreviewPlayers}
                        open={specificPreviewOpen}
                        onToggle={() => setSpecificPreviewOpen((o) => !o)}
                        label={`👥 Recipients (${recipients.length})`}
                      />
                    ) : (
                      <p className="text-xs text-gray-400 italic">No recipients added yet.</p>
                    )}
                  </div>
                )}
            </div>
          )}

          {/* ── HISTORY TAB ───────────────────────────────────────────────── */}
          {tab === "history" && (
            <>
              {/* Sticky sub-header within the scrollable body */}
              <div className="sticky top-0 bg-white border-b border-gray-50 flex items-center justify-between px-4 sm:px-5 py-3 z-10">
                <p className="text-xs text-gray-500">Last 20 broadcasts</p>
                <button onClick={loadHistory} disabled={historyLoading}
                  className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition">
                  <RefreshCw size={12} className={historyLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>

              {historyLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-green-600" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-400">No broadcasts sent yet.</div>
              ) : (
                <ul className="divide-y divide-gray-50 pb-4">
                  {history.map((entry) => (
                    <li key={entry.id} className="px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 leading-snug line-clamp-2">{entry.message}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-1.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${modeBadgeClass(entry.mode)}`}>
                              {MODE_LABELS[entry.mode] ?? entry.mode}
                            </span>
                            <span className="text-xs text-gray-400">{entry.sentAt}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                        <button onClick={() => setSelectedBroadcastId(entry.id)}
                          className="text-xs text-green-600 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 transition whitespace-nowrap flex-shrink-0">
                          View
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          </div>{/* end BODY */}

          {/* ── FOOTER — flex-shrink-0, only on send tab ───────────────── */}
          {tab === "send" && (
            <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 sm:px-5 py-3 sm:py-4 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <button onClick={onClose} disabled={sending}
                className="w-full sm:flex-1 py-3 sm:py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleSend} disabled={sendDisabled}
                className="w-full sm:flex-1 flex items-center justify-center gap-1.5 py-3 sm:py-2 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
                {sending ? (
                  <><Loader2 size={15} className="animate-spin" />Sending…</>
                ) : (
                  <>
                    <Send size={14} />
                    <span className="sm:hidden">Send 📤</span>
                    <span className="hidden sm:inline">{sendLabelDesktop()} 📤</span>
                  </>
                )}
              </button>
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
