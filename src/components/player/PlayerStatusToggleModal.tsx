import { useState } from "react";
import { AlertTriangle, Power } from "lucide-react";
import Button from ".././Button";
type Props = {
  open: boolean;
  playerName: string;
  currentStatus: boolean; // true = active, false = inactive
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading?: boolean;
};

function PlayerStatusToggleModal({
  open,
  playerName,
  currentStatus,
  onConfirm,
  onCancel,
  loading = false,
}: Props) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  const action = currentStatus ? "disable" : "enable";
  const actionColor = currentStatus ? "red" : "green";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl animate-modal-in">
        <div className="space-y-4">
          {/* Icon & Title */}
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-full ${currentStatus ? "bg-red-100" : "bg-green-100"}`}
            >
              {currentStatus ? (
                <AlertTriangle className="text-red-600" size={24} />
              ) : (
                <Power className="text-green-600" size={24} />
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 capitalize">
                {action} Player
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                You are about to <strong>{action}</strong>{" "}
                <strong>{playerName}</strong>
              </p>
            </div>
          </div>

          {/* Warning Message */}
          <div
            className={`p-4 rounded-lg ${currentStatus ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}
          >
            <p className="text-sm text-gray-700">
              {currentStatus ? (
                <>
                  <strong>⚠️ This will:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Remove player from attendance</li>
                    <li>Prevent facility bookings</li>
                    <li>Hide from active player list</li>
                    <li>Mark player as INACTIVE</li>
                  </ul>
                </>
              ) : (
                <>
                  <strong>✅ This will:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Restore player to attendance</li>
                    <li>Allow facility bookings</li>
                    <li>Show in active player list</li>
                    <li>Mark player as ACTIVE</li>
                  </ul>
                </>
              )}
            </p>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for {action} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`E.g., ${currentStatus ? "Fees not paid, Moved to another academy" : "Rejoining after break"}`}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={loading}
            />
            {!reason.trim() && (
              <p className="text-xs text-red-500 mt-1">
                Please provide a reason
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => onConfirm(reason)}
              disabled={!reason.trim() || loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerStatusToggleModal;
