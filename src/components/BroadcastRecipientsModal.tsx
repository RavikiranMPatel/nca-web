import { useState, useEffect } from "react";
import { X, Loader2, Phone } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/axios";

interface RecipientRow {
  playerName: string;
  maskedPhone: string | null;
  phoneType: string | null;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED" | "SKIPPED" | null;
  skipReason: string | null;
  deliveredAt: string | null;
  readAt: string | null;
}

interface Props {
  broadcastId: string;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  SENT:      { label: "🔵 Sent",      className: "bg-blue-50 text-blue-700" },
  DELIVERED: { label: "✅ Delivered", className: "bg-green-50 text-green-700" },
  READ:      { label: "👁️ Read",     className: "bg-indigo-50 text-indigo-700" },
  FAILED:    { label: "❌ Failed",    className: "bg-red-50 text-red-700" },
  SKIPPED:   { label: "⚠️ Skipped",  className: "bg-amber-50 text-amber-700" },
};

const PHONE_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  PARENT: { label: "Parent", className: "bg-green-100 text-green-700" },
  PLAYER: { label: "Player", className: "bg-blue-100 text-blue-700" },
};

export default function BroadcastRecipientsModal({ broadcastId, onClose }: Props) {
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<RecipientRow[]>(`/admin/whatsapp/broadcast/${broadcastId}/recipients`)
      .then((res) => setRecipients(res.data))
      .catch(() => toast.error("Failed to load recipients."))
      .finally(() => setLoading(false));
  }, [broadcastId]);

  return (
    // Bottom-sheet on mobile, centered dialog on sm+
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm sm:text-base font-semibold text-gray-900">Recipients</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={22} className="animate-spin text-green-600" />
            </div>
          ) : recipients.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-12">No recipients found.</p>
          ) : (
            <>
              {/* ── Mobile card list (hidden on sm+) ────────────────────── */}
              <ul className="sm:hidden divide-y divide-gray-100">
                {recipients.map((r, i) => {
                  const statusCfg = r.status ? STATUS_CONFIG[r.status] : null;
                  const typeCfg = r.phoneType ? PHONE_TYPE_CONFIG[r.phoneType] : null;
                  return (
                    <li key={i} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: name + phone */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 leading-snug">
                            {r.playerName ?? "—"}
                          </p>
                          {r.maskedPhone ? (
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Phone size={11} className="text-green-500 flex-shrink-0" />
                              <span className="text-xs text-gray-500 font-mono">{r.maskedPhone}</span>
                              {typeCfg && (
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${typeCfg.className}`}>
                                  {typeCfg.label}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 mt-0.5">No phone</p>
                          )}
                          {r.status === "SKIPPED" && r.skipReason && (
                            <p className="text-xs text-gray-400 mt-0.5 italic">{r.skipReason}</p>
                          )}
                          {/* Timestamps on mobile — stacked below */}
                          {(r.deliveredAt || r.readAt) && (
                            <div className="mt-1.5 space-y-0.5">
                              {r.deliveredAt && (
                                <p className="text-[10px] text-gray-400">
                                  Delivered: {r.deliveredAt}
                                </p>
                              )}
                              {r.readAt && (
                                <p className="text-[10px] text-gray-400">
                                  Read: {r.readAt}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Right: status badge */}
                        <div className="flex-shrink-0">
                          {statusCfg ? (
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusCfg.className}`}>
                              {statusCfg.label}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* ── Desktop table (hidden on mobile) ────────────────────── */}
              <table className="hidden sm:table w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">Player</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">Phone</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">Type</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">Delivered</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">Read</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recipients.map((r, i) => {
                    const statusCfg = r.status ? STATUS_CONFIG[r.status] : null;
                    const typeCfg = r.phoneType ? PHONE_TYPE_CONFIG[r.phoneType] : null;
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-2.5 text-gray-800 font-medium whitespace-nowrap">
                          {r.playerName ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 font-mono text-xs whitespace-nowrap">
                          {r.maskedPhone ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {typeCfg ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeCfg.className}`}>
                              {typeCfg.label}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {statusCfg ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.className}`}>
                              {statusCfg.label}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                          {r.status === "SKIPPED" && r.skipReason && (
                            <span className="text-xs text-gray-400 ml-1">({r.skipReason})</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                          {r.deliveredAt ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                          {r.readAt ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-gray-100 flex-shrink-0 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">{recipients.length} recipient{recipients.length !== 1 ? "s" : ""}</p>
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
