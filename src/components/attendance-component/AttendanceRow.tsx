import { Check, X, MoreVertical, Edit2 } from "lucide-react";
import { useState } from "react";

type Props = {
  player: {
    id: string;
    displayName: string;
    batch?: string;
    gender?: string;
  };
  value?: "PRESENT" | "ABSENT";
  disabled?: boolean;
  onChange: (id: string, status: "PRESENT" | "ABSENT") => void;
  canOverride?: boolean;
  onOverride?: () => void;
};

function AttendanceRow({
  player,
  value,
  disabled = false,
  onChange,
  canOverride = false,
  onOverride,
}: Props) {
  const [showMenu, setShowMenu] = useState(false);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Avatar color based on gender
  const getAvatarColor = (gender?: string) => {
    switch (gender) {
      case "MALE":
        return "bg-gradient-to-br from-blue-400 to-blue-600";
      case "FEMALE":
        return "bg-gradient-to-br from-pink-400 to-pink-600";
      default:
        return "bg-gradient-to-br from-purple-400 to-purple-600";
    }
  };

  return (
    <div
      className={`group relative bg-white rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
        disabled
          ? "border-slate-200 hover:border-slate-300"
          : "border-slate-200 hover:border-blue-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-center gap-4 p-4">
        {/* AVATAR */}
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm ${getAvatarColor(
            player.gender,
          )} shadow-md`}
        >
          {getInitials(player.displayName)}
        </div>

        {/* PLAYER INFO */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-base truncate">
            {player.displayName}
          </p>
          {player.batch && (
            <p className="text-xs text-slate-500 mt-0.5">{player.batch}</p>
          )}
        </div>

        {/* STATUS / CONTROLS */}
        {disabled ? (
          <div className="flex items-center gap-2">
            {/* Status Badge */}
            <div
              className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm transition-all ${
                value === "PRESENT"
                  ? "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border border-emerald-200"
                  : value === "ABSENT"
                    ? "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {value === "PRESENT" ? (
                <span className="flex items-center gap-1.5">
                  <Check size={16} />
                  Present
                </span>
              ) : value === "ABSENT" ? (
                <span className="flex items-center gap-1.5">
                  <X size={16} />
                  Absent
                </span>
              ) : (
                "Not Marked"
              )}
            </div>

            {/* Override Button */}
            {canOverride && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors md:hidden touch-target"
                  aria-label="Options"
                >
                  <MoreVertical size={18} className="text-slate-600" />
                </button>

                {/* Desktop Override Button */}
                <button
                  onClick={onOverride}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-purple-200 font-medium touch-target"
                >
                  <Edit2 size={14} />
                  Override
                </button>

                {/* Mobile Menu */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-slate-200 z-10 md:hidden">
                    <button
                      onClick={() => {
                        onOverride?.();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-purple-600 hover:bg-purple-50 transition-colors rounded-lg"
                    >
                      Override
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* EDIT MODE - Attendance Buttons */
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChange(player.id, "PRESENT")}
              className={`w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center font-semibold transition-all shadow-md touch-target hover:scale-105 active:scale-95 ${
                value === "PRESENT"
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-200 ring-2 ring-emerald-300"
                  : "bg-white text-slate-400 border-2 border-slate-200 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50"
              }`}
              aria-label="Mark present"
            >
              <Check size={20} strokeWidth={3} />
            </button>

            <button
              onClick={() => onChange(player.id, "ABSENT")}
              className={`w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center font-semibold transition-all shadow-md touch-target hover:scale-105 active:scale-95 ${
                value === "ABSENT"
                  ? "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-200 ring-2 ring-red-300"
                  : "bg-white text-slate-400 border-2 border-slate-200 hover:border-red-400 hover:text-red-600 hover:bg-red-50"
              }`}
              aria-label="Mark absent"
            >
              <X size={20} strokeWidth={3} />
            </button>
          </div>
        )}
      </div>

      {/* MOBILE: Close menu on outside click */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0 md:hidden"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}

export default AttendanceRow;
