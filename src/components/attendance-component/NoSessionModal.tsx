import { useState } from "react";
import { CloudRain } from "lucide-react";
import Button from "../Button";
import ModalOverlay from "../ModalOverlay";
import { NO_SESSION_REASON_LABELS, type NoSessionReason } from "../../api/attendance";

type Props = {
  open: boolean;
  batchName: string;
  onClose: () => void;
  onConfirm: (reason: NoSessionReason, note: string) => void;
};

const REASONS = Object.keys(NO_SESSION_REASON_LABELS) as NoSessionReason[];

function NoSessionModal({ open, batchName, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState<NoSessionReason | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    setReason(null);
    setNote("");
    onClose();
  };

  const handleConfirm = async () => {
    if (!reason) return;
    setIsSubmitting(true);
    try {
      await onConfirm(reason, note.trim());
      setReason(null);
      setNote("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalOverlay className="bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-4">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <CloudRain size={22} className="text-slate-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">No Session Today</h2>
            <p className="text-sm text-slate-600 mt-1">
              <strong>{batchName}</strong> — this won't count against attendance
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                    reason === r
                      ? "bg-slate-800 border-slate-800 text-white"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {NO_SESSION_REASON_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          {reason === "OTHER" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Note
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What happened?"
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-100 transition-all"
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <button
              onClick={handleConfirm}
              disabled={!reason || isSubmitting}
              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-2.5 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? "Saving…" : "Mark No Session"}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

export default NoSessionModal;
