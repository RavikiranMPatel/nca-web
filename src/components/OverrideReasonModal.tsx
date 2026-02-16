import { useState } from "react";
import Button from "./Button";

type Props = {
  open: boolean;
  playerName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

function OverrideReasonModal({
  open,
  playerName,
  onConfirm,
  onCancel,
}: Props) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[360px] space-y-4 shadow-lg animate-modal-in">
        <h2 className="text-lg font-semibold text-red-600">
          Override Attendance
        </h2>

        <p className="text-sm text-gray-600">
          You are overriding attendance for{" "}
          <strong>{playerName}</strong>.  
          Please provide a reason.
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for override..."
          className="w-full border rounded-md px-3 py-2 text-sm"
          rows={3}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
          >
            Confirm Override
          </Button>
        </div>
      </div>
    </div>
  );
}

export default OverrideReasonModal;
