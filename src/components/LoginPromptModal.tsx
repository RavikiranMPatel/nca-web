import { useEffect } from "react";
import Button from "./Button";

type Props = {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function LoginPromptModal({ open, message, onConfirm, onCancel }: Props) {
  // 🔑 ESC key handler
  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel} // 👈 click outside closes modal
    >
      {/* MODAL */}
      <div
        onClick={(e) => e.stopPropagation()} // ⛔ prevent close when clicking inside
        className="
          bg-white rounded-lg w-[360px] p-6 shadow-lg
          transform transition-all duration-200
          scale-95 opacity-0
          animate-modal-in
        "
      >
        <h2 className="text-lg font-semibold text-center mb-2">
          Login Required
        </h2>

        <p className="text-sm text-gray-600 text-center mb-6">
          {message}
        </p>

        <div className="flex justify-center gap-4">
          <Button onClick={onConfirm}>
            Yes, Login
          </Button>

          <Button variant="secondary" onClick={onCancel}>
            No
          </Button>
        </div>
      </div>
    </div>
  );
}

export default LoginPromptModal;
