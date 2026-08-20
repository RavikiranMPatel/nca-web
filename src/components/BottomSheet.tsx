/**
 * BottomSheet — shared mobile-safe modal wrapper.
 *
 * On small screens slides up from the bottom (items-end); on sm+ it centers
 * like a standard dialog (items-center). The white panel is capped at 85dvh
 * so it never overflows browser chrome on portrait mobile, and overflow-y-auto
 * lets long content scroll while keeping buttons reachable at the bottom.
 *
 * Usage:
 *   <BottomSheet>
 *     <div className="...header..." />
 *     <div className="p-5 space-y-4">
 *       ... form fields ...
 *       <div className="flex gap-2 pt-1">  ← action buttons go at end of content
 *         ...
 *       </div>
 *     </div>
 *   </BottomSheet>
 */
export function BottomSheet({
  children,
  maxWidth = "sm:max-w-sm",
  shadow = "shadow-xl",
}: {
  children: React.ReactNode;
  maxWidth?: string;
  shadow?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
      <div
        className={`bg-white rounded-t-2xl sm:rounded-xl ${shadow} w-full ${maxWidth} max-h-[85dvh] overflow-y-auto`}
      >
        {children}
      </div>
    </div>
  );
}
