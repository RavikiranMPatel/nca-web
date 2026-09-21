import { useEffect, useState } from "react";
import type { AttributedShotDot, ShotDot, WagonWheelBatter } from "./WagonWheel.types";
import { FIELD_CX, FIELD_CY, FIELD_RADIUS, FIELD_VIEWBOX, runColor, zoneToPixel } from "./wagonWheelGeometry";

/**
 * The one wagon-wheel display component. Replaces the two that used to exist
 * (WagonWheelDisplay.tsx and PublicScorecardPage.tsx's inline copy) — see
 * SESSION-HANDOFF.md for why. Renders the field, the accumulated shot spokes,
 * a run legend, a zone breakdown table, and (when more than one batter is
 * available) the "All" + per-batter filter row that only WagonWheelDisplay
 * used to have.
 *
 * This component owns fetching: `fetchShots` is injected so it stays
 * decoupled from any one API shape, and "All" is implemented by calling it
 * once per batter and merging — there is still only ever one shots-by-batter
 * endpoint, called client-side more than once, not a new combined endpoint.
 */

interface WagonWheelProps {
  /** Roster for the filter row. Fewer than 2 entries hides the row entirely. */
  batters: WagonWheelBatter[];
  /** Which batter to show initially. Null starts on "All". */
  initialBatterId: string | null;
  /** Resolves the shots for one batter. Called once per batter when "All" is active. */
  fetchShots: (batterPublicId: string) => Promise<ShotDot[]>;
  /** Accent color for the active filter/toggle pill. Defaults to the app's blue. */
  primaryColor?: string;
}

const battingStyleIsLeft = (style?: string) =>
  (style ?? "").toLowerCase().includes("left");

export function WagonWheel({
  batters,
  initialBatterId,
  fetchShots,
  primaryColor = "#1d4ed8",
}: WagonWheelProps) {
  const [activeBatterId, setActiveBatterId] = useState<string | null>(initialBatterId);
  const [manualHandedness, setManualHandedness] = useState<"RHB" | "LHB" | null>(null);
  const [shots, setShots] = useState<AttributedShotDot[]>([]);
  const [loading, setLoading] = useState(true);

  const activeBatter = batters.find((b) => b.publicId === activeBatterId) ?? null;

  // Switching the selected batter resets any manual RHB/LHB override back to
  // "follow the data" — the override is a per-viewing correction, not a
  // sticky preference that should leak onto the next batter.
  useEffect(() => {
    setManualHandedness(null);
  }, [activeBatterId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        if (activeBatterId) {
          const zones = await fetchShots(activeBatterId);
          if (!cancelled) {
            setShots(zones.map((z) => ({ ...z, batsmanPublicId: activeBatterId })));
          }
        } else {
          const perBatter = await Promise.all(
            batters.map(async (b) => {
              const zones = await fetchShots(b.publicId);
              return zones.map((z) => ({ ...z, batsmanPublicId: b.publicId, batsmanName: b.name }));
            }),
          );
          if (!cancelled) setShots(perBatter.flat());
        }
      } catch {
        if (!cancelled) setShots([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [activeBatterId, batters, fetchShots]);

  const isRHB = manualHandedness
    ? manualHandedness === "RHB"
    : !battingStyleIsLeft(activeBatter?.battingStyle);

  const fours = shots.filter((s) => s.runs === 4).length;
  const sixes = shots.filter((s) => s.runs === 6).length;
  const singles = shots.filter((s) => s.runs === 1 || s.runs === 3).length;
  const twos = shots.filter((s) => s.runs === 2).length;

  const zoneRuns = shots.reduce<Record<string, number>>((acc, s) => {
    acc[s.zone] = (acc[s.zone] ?? 0) + s.runs;
    return acc;
  }, {});
  const zoneRows = Object.entries(zoneRuns).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3">
      {batters.length > 1 && (
        <div data-testid="ww-batter-filter" className="flex items-center gap-2 flex-wrap">
          <button
            data-testid="ww-filter-all"
            onClick={() => setActiveBatterId(null)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl transition-all active:scale-95"
            style={
              activeBatterId === null
                ? { backgroundColor: primaryColor, color: "#fff" }
                : { backgroundColor: "rgba(148,163,184,0.15)", color: "#9ca3af" }
            }
          >
            All
          </button>
          {batters.map((b) => (
            <button
              key={b.publicId}
              data-testid={`ww-filter-${b.publicId}`}
              onClick={() => setActiveBatterId(b.publicId)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl transition-all active:scale-95"
              style={
                activeBatterId === b.publicId
                  ? { backgroundColor: primaryColor, color: "#fff" }
                  : { backgroundColor: "rgba(148,163,184,0.15)", color: "#9ca3af" }
              }
            >
              {b.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {activeBatter && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">View as:</span>
          <div className="flex bg-gray-800 rounded-lg p-0.5 gap-0.5">
            {(["RHB", "LHB"] as const).map((h) => (
              <button
                key={h}
                onClick={() => setManualHandedness(h)}
                className="px-2.5 py-1 text-xs font-semibold rounded-md transition-all"
                style={
                  (manualHandedness ?? (isRHB ? "RHB" : "LHB")) === h
                    ? { backgroundColor: primaryColor, color: "#fff" }
                    : { color: "#9ca3af" }
                }
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-900 rounded-2xl p-4 flex flex-col items-center">
        {loading ? (
          <div className="flex items-center justify-center h-48 w-full">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${primaryColor}60`, borderTopColor: "transparent" }}
            />
          </div>
        ) : shots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <p className="text-2xl mb-2">🏏</p>
            <p className="text-sm">No shot zones recorded yet</p>
          </div>
        ) : (
          <>
            <FieldSVG shots={shots} isRHB={isRHB} />
            <div className="flex gap-3 mt-3 justify-center flex-wrap">
              {[
                { color: "bg-white", label: `1s/3s (${singles})` },
                { color: "bg-blue-500", label: `2s (${twos})` },
                { color: "bg-green-500", label: `4s (${fours})` },
                { color: "bg-purple-500", label: `6s (${sixes})` },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className={`w-3 h-0.5 ${color} rounded-full`} />
                  <span className="text-xs text-gray-400">{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {!loading && zoneRows.length > 0 && (
        <div data-testid="ww-zone-table" className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-700">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Shot breakdown by zone
            </p>
          </div>
          <div className="divide-y divide-gray-700/50 max-h-40 overflow-y-auto">
            {zoneRows.map(([zone, runs]) => (
              <div key={zone} className="flex justify-between items-center px-3 py-1.5">
                <span className="text-xs text-gray-300">{zone}</span>
                <span className="text-xs font-bold text-white">{runs} runs</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Read-only wagon wheel SVG — renders accumulated shots as spokes. Moved
 * here verbatim (geometry constants and per-zone coordinates now come from
 * wagonWheelGeometry.ts instead of a locally duplicated copy) from the old
 * WagonWheelModal.tsx named export of the same name.
 */
function FieldSVG({
  shots,
  battingFromTop = true,
  isRHB = true,
  size = 260,
}: {
  shots: ShotDot[];
  battingFromTop?: boolean;
  isRHB?: boolean;
  size?: number;
}) {
  const pitchHalfLen = FIELD_RADIUS * 0.44;
  const pitchW = 14;
  const batterStumpY = battingFromTop ? FIELD_CY - pitchHalfLen : FIELD_CY + pitchHalfLen;
  const bowlerStumpY = battingFromTop ? FIELD_CY + pitchHalfLen : FIELD_CY - pitchHalfLen;
  const pitchRectY = Math.min(batterStumpY, bowlerStumpY);
  const pitchRectH = Math.abs(bowlerStumpY - batterStumpY);
  const batterDir = battingFromTop ? 1 : -1;
  const batterIconY = batterStumpY + batterDir * 10;
  const batterFlipX = isRHB ? 1 : -1;

  return (
    <svg viewBox={`0 0 ${FIELD_VIEWBOX} ${FIELD_VIEWBOX}`} style={{ width: size, height: size }}>
      <defs>
        <radialGradient id="fs_grass" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a7a38" />
          <stop offset="100%" stopColor="#0d4d22" />
        </radialGradient>
        <linearGradient id="fs_pitch" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#92400e" stopOpacity="0" />
          <stop offset="50%" stopColor="#b45309" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
        </linearGradient>
        <clipPath id="fs_clip">
          <circle cx={FIELD_CX} cy={FIELD_CY} r={FIELD_RADIUS} />
        </clipPath>
      </defs>

      <circle cx={FIELD_CX} cy={FIELD_CY} r={FIELD_RADIUS} fill="url(#fs_grass)" />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect
          key={i}
          x={FIELD_CX - FIELD_RADIUS}
          y={FIELD_CY - FIELD_RADIUS + i * ((FIELD_RADIUS * 2) / 12)}
          width={FIELD_RADIUS * 2}
          height={(FIELD_RADIUS * 2) / 12}
          fill={i % 2 === 0 ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.03)"}
          clipPath="url(#fs_clip)"
        />
      ))}
      <circle cx={FIELD_CX} cy={FIELD_CY} r={FIELD_RADIUS - 1} fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.4" />
      <circle
        cx={FIELD_CX}
        cy={FIELD_CY}
        r={FIELD_RADIUS * 0.53}
        fill="none"
        stroke="#22c55e"
        strokeWidth="1"
        strokeDasharray="5 4"
        opacity="0.2"
      />

      <rect
        x={FIELD_CX - pitchW / 2}
        y={pitchRectY}
        width={pitchW}
        height={pitchRectH}
        rx="2"
        fill="url(#fs_pitch)"
        clipPath="url(#fs_clip)"
      />

      {[-3.5, 0, 3.5].map((ox) => (
        <line
          key={ox}
          x1={FIELD_CX + ox}
          y1={bowlerStumpY - 6}
          x2={FIELD_CX + ox}
          y2={bowlerStumpY + 6}
          stroke="#9ca3af"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.3"
        />
      ))}
      {[-3.5, 0, 3.5].map((ox) => (
        <line
          key={ox}
          x1={FIELD_CX + ox}
          y1={batterStumpY - 6}
          x2={FIELD_CX + ox}
          y2={batterStumpY + 6}
          stroke="#fbbf24"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.95"
        />
      ))}
      <line
        x1={FIELD_CX - 4.5}
        y1={batterStumpY - 6.5}
        x2={FIELD_CX + 4.5}
        y2={batterStumpY - 6.5}
        stroke="#fbbf24"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.8"
      />

      <g transform={`translate(${FIELD_CX + batterFlipX * 6}, ${batterIconY}) scale(${batterFlipX * 3.8}, 3.8)`}>
        <circle cx={0} cy={-4} r={1.5} fill="#fbbf24" />
        <line x1={0} y1={-2.5} x2={0} y2={1.5} stroke="#fbbf24" strokeWidth={0.7} strokeLinecap="round" />
        <line x1={0} y1={-1.5} x2={-2.2} y2={-0.3} stroke="#fbbf24" strokeWidth={0.6} strokeLinecap="round" />
        <line x1={-2.2} y1={-0.3} x2={-3.6} y2={1.5} stroke="#fbbf24" strokeWidth={1.1} strokeLinecap="round" />
        <line x1={0} y1={-1.5} x2={1.4} y2={-0.5} stroke="#fbbf24" strokeWidth={0.6} strokeLinecap="round" />
        <line x1={0} y1={1.5} x2={-1.0} y2={3.8} stroke="#fbbf24" strokeWidth={0.6} strokeLinecap="round" />
        <line x1={0} y1={1.5} x2={1.0} y2={3.8} stroke="#fbbf24" strokeWidth={0.6} strokeLinecap="round" />
      </g>

      {shots.map((shot, i) => {
        const { px, py } = zoneToPixel(shot.zone, isRHB, battingFromTop, batterStumpY, shot.runs);
        const color = runColor(shot.runs);
        return (
          <g key={i}>
            <line x1={FIELD_CX} y1={batterStumpY} x2={px} y2={py} stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.75" />
            <circle cx={px} cy={py} r={6} fill={color} opacity="0.85" />
            <circle cx={px} cy={py} r={2} fill="white" opacity="0.8" />
          </g>
        );
      })}
    </svg>
  );
}

