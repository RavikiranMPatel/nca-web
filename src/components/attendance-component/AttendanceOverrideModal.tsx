import Button from "../Button";
import { useState } from "react";

type Props = {
  open: boolean;
  playerName: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

function AttendanceOverrideModal({
  open,
  playerName,
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    if (!reason.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(reason);
      setReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
        <div className="space-y-4">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-3">
              <span className="text-2xl">🔐</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Override Attendance
            </h2>
            <p className="text-sm text-slate-600 mt-1">Super Admin Override</p>
          </div>

          {/* Player Info */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
            <p className="text-sm text-purple-900">
              <strong>Player:</strong> {playerName}
            </p>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              ⚠️ This action will be logged and audited. Please provide a clear
              reason for overriding the locked attendance.
            </p>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Reason for Override <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for override..."
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <button
              onClick={handleConfirm}
              disabled={!reason.trim() || isSubmitting}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2.5 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? "Processing..." : "Confirm Override"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttendanceOverrideModal;
