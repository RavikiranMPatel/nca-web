import type { PlayerOption, PlayerSelection } from "../../types/match";

// ── PlayerCard ────────────────────────────────────────────────────────────────
// Renders a single player row with selection state, role toggles (C/WK/✈).
// Extracted from MatchSetupPage so it can be reused in ExternalMatchReportPage.

export const PlayerCard = ({
  player,
  selected,
  onToggle,
  onRoleToggle,
  onForeignToggle,
  isInSquad,
  squadIsForeign,
}: {
  player: PlayerOption;
  selected: PlayerSelection[];
  onToggle: () => void;
  onRoleToggle: (role: "isCaptain" | "isWicketkeeper") => void;
  onForeignToggle: () => void;
  isInSquad?: boolean;
  squadIsForeign?: boolean;
}) => {
  const sel = selected.find((s) => s.playerPublicId === player.publicId);
  const isSelected = !!sel;

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
        isSelected
          ? "bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-600"
          : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
      }`}
    >
      <button
        className="flex items-center gap-3 flex-1 text-left"
        onClick={onToggle}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            isSelected
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-500"
          }`}
        >
          {isSelected
            ? sel!.battingOrder
            : player.displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {player.displayName}
            </div>
            {isInSquad && !isSelected && (
              <span className="text-xs px-1.5 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded font-medium">
                Squad
              </span>
            )}
            {isInSquad && squadIsForeign && !isSelected && (
              <span className="text-xs text-orange-500">✈</span>
            )}
          </div>
          {(player.battingStyle || player.bowlingStyle || player.playerRole) && (
            <div className="text-xs text-gray-400">
              {[
                player.playerRole === "WK_BATSMAN"
                  ? "🧤 WK"
                  : player.playerRole === "BATSMAN"
                    ? "🏏 Bat"
                    : player.playerRole === "BOWLER"
                      ? "⚾ Bowl"
                      : player.playerRole === "ALL_ROUNDER"
                        ? "⭐ AR"
                        : null,
                player.battingStyle,
                player.bowlingStyle,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
        </div>
      </button>
      {isSelected && (
        <div className="flex gap-1.5 ml-2 flex-wrap justify-end">
          <button
            onClick={() => onRoleToggle("isCaptain")}
            className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
              sel!.isCaptain
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}
          >
            C
          </button>
          <button
            onClick={() => onRoleToggle("isWicketkeeper")}
            className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
              sel!.isWicketkeeper
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}
          >
            WK
          </button>
          <button
            onClick={onForeignToggle}
            className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
              sel!.isForeign
                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}
            title="Mark as foreign/overseas player"
          >
            ✈
          </button>
        </div>
      )}
    </div>
  );
};

// ── Toggle helpers ────────────────────────────────────────────────────────────
// Pure functions — same logic as inline MatchSetupPage, extracted for reuse.

export function togglePlayer(
  player: PlayerOption,
  selected: PlayerSelection[],
  setSelected: (s: PlayerSelection[]) => void,
  squadForeignIds: Set<string>,
  onError: (msg: string) => void,
) {
  const exists = selected.find((s) => s.playerPublicId === player.publicId);
  if (exists) {
    setSelected(
      selected
        .filter((s) => s.playerPublicId !== player.publicId)
        .map((s, idx) => ({ ...s, battingOrder: idx + 1 })),
    );
  } else {
    if (selected.length >= 11) {
      onError("Playing XI cannot have more than 11 players");
      return;
    }
    setSelected([
      ...selected,
      {
        playerPublicId: player.publicId,
        battingOrder: selected.length + 1,
        isCaptain: false,
        isWicketkeeper: player.playerRole === "WK_BATSMAN",
        isImpactPlayer: false,
        isForeign: squadForeignIds.has(player.publicId),
      },
    ]);
  }
  onError("");
}

export function removePlayer(
  publicId: string,
  selected: PlayerSelection[],
  setSelected: (s: PlayerSelection[]) => void,
) {
  setSelected(
    selected
      .filter((s) => s.playerPublicId !== publicId)
      .map((s, idx) => ({ ...s, battingOrder: idx + 1 })),
  );
}

export function toggleRole(
  publicId: string,
  role: "isCaptain" | "isWicketkeeper",
  selected: PlayerSelection[],
  setSelected: (s: PlayerSelection[]) => void,
) {
  setSelected(
    selected.map((p) =>
      p.playerPublicId === publicId
        ? { ...p, [role]: !p[role] }
        : role === "isCaptain"
          ? { ...p, isCaptain: false }
          : p,
    ),
  );
}

export function toggleForeign(
  publicId: string,
  selected: PlayerSelection[],
  setSelected: (s: PlayerSelection[]) => void,
) {
  setSelected(
    selected.map((p) =>
      p.playerPublicId === publicId ? { ...p, isForeign: !p.isForeign } : p,
    ),
  );
}
