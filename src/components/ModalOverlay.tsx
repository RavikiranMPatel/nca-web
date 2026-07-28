// ModalOverlay — the ONE place where z-index for modals is set.
// z-[60] is hardcoded so it always sits above the bottom nav (z-50).
// Inner panel MUST carry max-h-[90vh] overflow-y-auto for scroll safety.

interface ModalOverlayProps {
  /** Overlay layout classes: bg-black/*, flex alignment, padding. z-index is always z-[60]. */
  className?: string;
  /** Click the backdrop to close (omit if modal should NOT close on backdrop click) */
  onClose?: () => void;
  children: React.ReactNode;
}

export default function ModalOverlay({
  className = "bg-black/50 flex items-center justify-center p-4",
  onClose,
  children,
}: ModalOverlayProps) {
  return (
    <div
      className={`fixed inset-0 z-[60] ${className}`}
      onClick={onClose}
    >
      {children}
    </div>
  );
}
