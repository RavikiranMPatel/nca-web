import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getImageUrl } from "../../utils/imageUrl";

type Props = {
  displayName: string;
  photoUrl?: string | null;
  gender?: string | null;
  /** "sm" = w-9 h-9 (table cell), "md" = w-12 h-12 (card/row). Default "md". */
  size?: "sm" | "md";
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const getAvatarColor = (gender?: string | null) => {
  switch (gender) {
    case "MALE":
      return "bg-gradient-to-br from-blue-400 to-blue-600";
    case "FEMALE":
      return "bg-gradient-to-br from-pink-400 to-pink-600";
    default:
      return "bg-gradient-to-br from-purple-400 to-purple-600";
  }
};

export default function PlayerAvatar({
  displayName,
  photoUrl,
  gender,
  size = "md",
}: Props) {
  const [showPhoto, setShowPhoto] = useState(false);
  const [imgError, setImgError] = useState(false);

  const dims = size === "sm" ? "w-9 h-9" : "w-12 h-12";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const resolvedUrl = getImageUrl(photoUrl);
  const hasPhoto = !!resolvedUrl && !imgError;

  return (
    <>
      {hasPhoto ? (
        <button
          type="button"
          onClick={() => setShowPhoto(true)}
          className="flex-shrink-0 rounded-full transition-transform hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          aria-label={`View photo of ${displayName}`}
        >
          <img
            src={resolvedUrl}
            alt={displayName}
            className={`${dims} rounded-full object-cover shadow-md border-2 border-slate-200`}
            onError={() => setImgError(true)}
          />
        </button>
      ) : (
        <div
          className={`flex-shrink-0 ${dims} rounded-full flex items-center justify-center text-white font-bold ${textSize} ${getAvatarColor(gender)} shadow-md`}
        >
          {getInitials(displayName)}
        </div>
      )}

      {showPhoto &&
        resolvedUrl &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPhoto(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-4 relative max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowPhoto(false)}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <img
                src={resolvedUrl}
                alt={displayName}
                className="w-64 h-64 rounded-xl object-cover shadow-md"
              />
              <p className="text-base font-semibold text-slate-900 text-center">
                {displayName}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
