import { useState } from "react";
import { X, Send, ChevronDown, ChevronUp, Loader2, MessageCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/axios";

type Player = {
  publicId: string;
  displayName: string;
  profession: string;
  batch?: string;
};

interface Props {
  players: Player[];
  selectionMode: "checkbox" | "filter";
  filterLabel: string;
  onClose: () => void;
}

const SQUAD_LABELS = [
  "Under 12",
  "Under 14",
  "Under 16",
  "Under 19",
  "Under 23",
  "Senior",
  "Performance Batch",
  "Custom...",
];

function fmtToday(): string {
  return new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initial(name: string): string {
  return (name || "?")[0].toUpperCase();
}

export default function SendSquadModal({
  players,
  selectionMode,
  filterLabel,
  onClose,
}: Props) {
  const [playerListOpen, setPlayerListOpen] = useState(false);
  const [squadLabel, setSquadLabel] = useState("Under 14");
  const [customLabel, setCustomLabel] = useState("");
  const [coachName, setCoachName] = useState("");
  const [coachPhone, setCoachPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const effectiveLabel =
    squadLabel === "Custom..."
      ? customLabel.trim() || "Squad"
      : squadLabel;

  const today = fmtToday();

  const handleSend = async () => {
    const digits = coachPhone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setPhoneError("Enter a valid 10-digit WhatsApp number");
      return;
    }
    if (players.length === 0) {
      toast.error("No players to send");
      return;
    }

    setSending(true);
    try {
      const res = await api.post("/admin/whatsapp/squad", {
        coachPhone: digits,
        coachName: coachName.trim() || null,
        squadLabel: effectiveLabel,
        playerPublicIds: players.map((p) => p.publicId),
        note: note.trim() || null,
      });
      const { success, playerCount } = res.data;
      if (success) {
        toast.success(
          `Squad list of ${playerCount} players sent to coach!`,
          { duration: 5000 }
        );
        onClose();
      } else {
        toast.error("Failed to send. Check WhatsApp configuration.");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to send squad list"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92vh] sm:max-h-[85vh]">

        {/* HEADER */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageCircle size={15} className="text-green-600" />
              </div>
              <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                Send Squad to Coach
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
          <div className="border-b border-gray-100" />
        </div>

        {/* BODY */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">

          {/* Selection summary */}
          {selectionMode === "checkbox" ? (
            <div className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
              <span className="text-green-600 font-bold">✓</span>
              <span>
                <span className="font-semibold">{players.length}</span>{" "}
                player{players.length !== 1 ? "s" : ""} selected
              </span>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-sm text-blue-800">
              <span className="font-semibold">All filtered players</span>
              {filterLabel ? (
                <span className="text-blue-600"> — {filterLabel}</span>
              ) : null}
              <span className="font-semibold"> · {players.length} players</span>
            </div>
          )}

          {/* Collapsible player list */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setPlayerListOpen(!playerListOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition"
            >
              <span>👥 View players ({players.length})</span>
              {playerListOpen ? (
                <ChevronUp size={13} />
              ) : (
                <ChevronDown size={13} />
              )}
            </button>
            {playerListOpen && (
              <ul className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {players.map((p) => (
                  <li key={p.publicId} className="flex items-center gap-2.5 px-3 py-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0">
                      {initial(p.displayName)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">
                        {p.displayName}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {p.profession}
                        {p.batch ? ` · ${p.batch}` : ""}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                      {p.publicId}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Squad label */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Squad Label
            </label>
            <select
              value={squadLabel}
              onChange={(e) => setSquadLabel(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            >
              {SQUAD_LABELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            {squadLabel === "Custom..." && (
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g. KSCA U-16 Selection"
                className="mt-2 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
            )}
          </div>

          {/* Coach details */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600">
              Coach Details
            </label>
            <input
              type="text"
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              placeholder="Coach Name (optional)"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            />
            <div>
              <input
                type="tel"
                value={coachPhone}
                maxLength={10}
                onChange={(e) => {
                  setCoachPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                  setPhoneError("");
                }}
                placeholder="Coach WhatsApp Number *"
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent ${
                  phoneError ? "border-red-400 bg-red-50" : "border-gray-200"
                }`}
              />
              {phoneError && (
                <p className="text-xs text-red-500 mt-1">{phoneError}</p>
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                10-digit Indian mobile number
              </p>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Note for Coach{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Practice session on Monday at 6 AM"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder:text-gray-400"
            />
            <p className="text-xs text-gray-400 text-right mt-1">
              {note.length} / 200
            </p>
          </div>

          {/* WhatsApp preview */}
          <div>
            <p className="text-[11px] text-gray-400 italic mb-2">
              📱 Coach will receive:
            </p>
            <div
              className="rounded-xl p-3.5 text-sm leading-relaxed"
              style={{
                backgroundColor: "#DCF8C6",
                borderLeft: "3px solid #25D366",
              }}
            >
              <p className="font-bold text-gray-800 text-sm">
                🏏 {effectiveLabel}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                NextGen Cricket Academy · {today}
              </p>
              <div className="mt-2.5 space-y-0.5 max-h-40 overflow-y-auto">
                {players.map((p, i) => (
                  <p key={p.publicId} className="text-xs text-gray-700">
                    {i + 1}. {p.displayName}
                    {p.profession ? ` — ${p.profession}` : ""}
                  </p>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2 font-medium">
                Total: {players.length} player{players.length !== 1 ? "s" : ""}
              </p>
              {note.trim() && (
                <p className="text-xs text-gray-600 mt-2 italic">
                  Note: {note.trim()}
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-2">Sent by Admin</p>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 sm:px-5 py-3 sm:py-4 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={onClose}
            disabled={sending}
            className="w-full sm:flex-1 py-3 sm:py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || players.length === 0}
            className="w-full sm:flex-1 flex items-center justify-center gap-1.5 py-3 sm:py-2 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send size={14} />
                Send to Coach
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
