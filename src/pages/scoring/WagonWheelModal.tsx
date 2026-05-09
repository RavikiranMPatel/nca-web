import { useState, useRef, useEffect } from "react";

interface Props {
  strikerName: string;
  strikerBattingStyle?: string;
  runs: number;
  deliveryPublicId: string;
  onSave: (zone: string) => void;
  onSkip: () => void;
}

function deriveZone(
  nx: number,
  ny: number,
  isRHB: boolean,
  battingFromTop: boolean,
): string {
  const fy = battingFromTop ? ny : -ny;
  const fx = battingFromTop ? nx : -nx;
  let angle = Math.atan2(fx, fy) * (180 / Math.PI);
  if (!isRHB) angle = -angle;
  const r = Math.sqrt(nx * nx + ny * ny);
  const deep = r > 0.6;

  if (angle > 155) return "Fine Leg";
  if (angle > 120) return deep ? "Fine Leg" : "Short Fine Leg";
  if (angle > 90) return deep ? "Deep Sq. Leg" : "Leg Slip";
  if (angle < -155) return "Third Man";
  if (angle < -120) return deep ? "Third Man" : "Short Third Man";
  if (angle < -90) return deep ? "Deep Point" : "Slip";
  if (angle > 72) return deep ? "Deep Sq. Leg" : "Square Leg";
  if (angle < -72) return deep ? "Deep Point" : "Point";
  if (angle > 45) return deep ? "Deep Mid Wicket" : "Mid Wicket";
  if (angle < -45) return deep ? "Deep Cover" : "Cover";
  if (angle > 18) return deep ? "Long On" : "Mid On";
  if (angle < -18) return deep ? "Long Off" : "Extra Cover";
  if (angle > 6) return deep ? "Long On" : "Mid On";
  if (angle < -6) return deep ? "Long Off" : "Mid Off";
  return deep ? "Straight Drive" : "Straight";
}

const RUN_COLOR: Record<number, string> = {
  0: "#94a3b8",
  1: "#3b82f6",
  2: "#10b981",
  3: "#8b5cf6",
  4: "#22c55e",
  6: "#ec4899",
};

const VB = 320,
  R = 148,
  CX = 160,
  CY = 160;

export default function WagonWheelModal({
  strikerName,
  strikerBattingStyle,
  runs,
  onSave,
  onSkip,
}: Props) {
  const isRHBDefault = !(strikerBattingStyle ?? "")
    .toLowerCase()
    .includes("left");
  const [handedness, setHandedness] = useState<"RHB" | "LHB">(
    isRHBDefault ? "RHB" : "LHB",
  );
  const [battingFromTop, setBattingFromTop] = useState(true);
  const [dot, setDot] = useState<{
    nx: number;
    ny: number;
    px: number;
    py: number;
  } | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [ripple, setRipple] = useState<{
    px: number;
    py: number;
    key: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const isRHBRef = useRef(handedness === "RHB");
  const battingFromTopRef = useRef(battingFromTop);
  useEffect(() => {
    isRHBRef.current = handedness === "RHB";
  }, [handedness]);
  useEffect(() => {
    battingFromTopRef.current = battingFromTop;
  }, [battingFromTop]);

  const isRHB = handedness === "RHB";
  const dotColor = RUN_COLOR[runs] ?? "#3b82f6";

  const pitchHalfLen = R * 0.44;
  const pitchW = 14;
  const batterStumpY = battingFromTop ? CY - pitchHalfLen : CY + pitchHalfLen;
  const bowlerStumpY = battingFromTop ? CY + pitchHalfLen : CY - pitchHalfLen;
  const pitchRectY = Math.min(batterStumpY, bowlerStumpY);
  const pitchRectH = Math.abs(bowlerStumpY - batterStumpY);
  const batterDir = battingFromTop ? 1 : -1;
  const batterIconY = batterStumpY + batterDir * 10;
  const batterFlipX = isRHB ? 1 : -1;

  const getCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * VB;
    const py = ((clientY - rect.top) / rect.height) * VB;
    const nx = (px - CX) / R;
    const ny = (py - CY) / R;
    if (nx * nx + ny * ny > 1.02) return null;
    return { px, py, nx, ny };
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onTouchStart = (e: TouchEvent) => {
      const c = getCoords(e.touches[0].clientX, e.touches[0].clientY);
      if (!c) return;
      setDot(c);
      setZone(null); // clear zone while dragging
      setIsDragging(true);
      setRipple({ px: c.px, py: c.py, key: Date.now() });
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const c = getCoords(e.touches[0].clientX, e.touches[0].clientY);
      if (!c) return;
      setDot(c);
      setZone(null); // no label while dragging
    };

    const onTouchEnd = (e: TouchEvent) => {
      // Compute zone from last touch position
      const last = e.changedTouches[0];
      const c = getCoords(last.clientX, last.clientY);
      if (c) {
        setDot(c);
        setZone(
          deriveZone(c.nx, c.ny, isRHBRef.current, battingFromTopRef.current),
        );
      }
      setIsDragging(false);
    };

    svg.addEventListener("touchstart", onTouchStart, { passive: true });
    svg.addEventListener("touchmove", onTouchMove, { passive: false });
    svg.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      svg.removeEventListener("touchstart", onTouchStart);
      svg.removeEventListener("touchmove", onTouchMove);
      svg.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const c = getCoords(e.clientX, e.clientY);
    if (!c) return;
    setDot(c);
    setZone(null);
    setIsDragging(true);
    setRipple({ px: c.px, py: c.py, key: Date.now() });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.buttons !== 1) return;
    const c = getCoords(e.clientX, e.clientY);
    if (!c) return;
    setDot(c);
    setZone(null);
  };

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    const c = getCoords(e.clientX, e.clientY);
    if (c) {
      setDot(c);
      setZone(deriveZone(c.nx, c.ny, isRHB, battingFromTop));
    }
    setIsDragging(false);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex flex-col justify-end">
      <div
        className="w-full bg-[#0d1117] rounded-t-3xl flex flex-col"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
              Shot placement
            </p>
            <p className="text-base font-bold text-white mt-0.5">
              {strikerName}
            </p>
          </div>
          <div
            className="px-4 py-1.5 rounded-full text-sm font-bold"
            style={{
              background: `${dotColor}20`,
              color: dotColor,
              border: `1.5px solid ${dotColor}45`,
            }}
          >
            {runs === 0 ? "Dot ball" : `${runs} run${runs !== 1 ? "s" : ""}`}
          </div>
        </div>

        {/* Field */}
        <div className="flex-shrink-0 w-full flex justify-center px-3">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VB} ${VB}`}
            className="cursor-crosshair"
            style={{
              width: "100%",
              maxWidth: 340,
              height: "auto",
              maxHeight: "44vh",
              touchAction: "none",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <defs>
              <radialGradient id="ww_grass" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1a7a38" />
                <stop offset="100%" stopColor="#0d4d22" />
              </radialGradient>
              <linearGradient id="ww_pitch" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#92400e" stopOpacity="0" />
                <stop offset="50%" stopColor="#b45309" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
              </linearGradient>
              <clipPath id="ww_clip">
                <circle cx={CX} cy={CY} r={R} />
              </clipPath>
            </defs>

            <circle cx={CX} cy={CY} r={R} fill="url(#ww_grass)" />
            {Array.from({ length: 12 }).map((_, i) => (
              <rect
                key={i}
                x={CX - R}
                y={CY - R + i * ((R * 2) / 12)}
                width={R * 2}
                height={(R * 2) / 12}
                fill={
                  i % 2 === 0 ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.03)"
                }
                clipPath="url(#ww_clip)"
              />
            ))}
            <circle
              cx={CX}
              cy={CY}
              r={R - 1}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              opacity="0.4"
            />
            <circle
              cx={CX}
              cy={CY}
              r={R * 0.53}
              fill="none"
              stroke="#22c55e"
              strokeWidth="1"
              strokeDasharray="5 4"
              opacity="0.2"
            />

            {/* Pitch */}
            <rect
              x={CX - pitchW / 2}
              y={pitchRectY}
              width={pitchW}
              height={pitchRectH}
              rx="2"
              fill="url(#ww_pitch)"
              clipPath="url(#ww_clip)"
            />

            {/* Bowler stumps */}
            {[-3.5, 0, 3.5].map((ox) => (
              <line
                key={ox}
                x1={CX + ox}
                y1={bowlerStumpY - 6}
                x2={CX + ox}
                y2={bowlerStumpY + 6}
                stroke="#9ca3af"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.3"
              />
            ))}

            {/* Batter stumps + bails */}
            {[-3.5, 0, 3.5].map((ox) => (
              <line
                key={ox}
                x1={CX + ox}
                y1={batterStumpY - 6}
                x2={CX + ox}
                y2={batterStumpY + 6}
                stroke="#fbbf24"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.95"
              />
            ))}
            <line
              x1={CX - 4.5}
              y1={batterStumpY - 6.5}
              x2={CX + 4.5}
              y2={batterStumpY - 6.5}
              stroke="#fbbf24"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.8"
            />

            {/* Batter icon */}
            <g
              transform={`translate(${CX + batterFlipX * 6}, ${batterIconY}) scale(${batterFlipX * 3.8}, 3.8)`}
            >
              <circle cx={0} cy={-4} r={1.5} fill="#fbbf24" />
              <line
                x1={0}
                y1={-2.5}
                x2={0}
                y2={1.5}
                stroke="#fbbf24"
                strokeWidth={0.7}
                strokeLinecap="round"
              />
              <line
                x1={0}
                y1={-1.5}
                x2={-2.2}
                y2={-0.3}
                stroke="#fbbf24"
                strokeWidth={0.6}
                strokeLinecap="round"
              />
              <line
                x1={-2.2}
                y1={-0.3}
                x2={-3.6}
                y2={1.5}
                stroke="#fbbf24"
                strokeWidth={1.1}
                strokeLinecap="round"
              />
              <line
                x1={0}
                y1={-1.5}
                x2={1.4}
                y2={-0.5}
                stroke="#fbbf24"
                strokeWidth={0.6}
                strokeLinecap="round"
              />
              <line
                x1={0}
                y1={1.5}
                x2={-1.0}
                y2={3.8}
                stroke="#fbbf24"
                strokeWidth={0.6}
                strokeLinecap="round"
              />
              <line
                x1={0}
                y1={1.5}
                x2={1.0}
                y2={3.8}
                stroke="#fbbf24"
                strokeWidth={0.6}
                strokeLinecap="round"
              />
            </g>

            {/* Spoke */}
            {dot && (
              <line
                x1={CX}
                y1={batterStumpY}
                x2={dot.px}
                y2={dot.py}
                stroke={dotColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.9"
                style={{ filter: `drop-shadow(0 0 3px ${dotColor})` }}
              />
            )}

            {/* Ripple */}
            {ripple && (
              <circle
                key={ripple.key}
                cx={ripple.px}
                cy={ripple.py}
                r="5"
                fill="none"
                stroke={dotColor}
                strokeWidth="2"
                opacity="0.7"
              >
                <animate
                  attributeName="r"
                  from="5"
                  to="24"
                  dur="0.4s"
                  fill="freeze"
                />
                <animate
                  attributeName="opacity"
                  from="0.7"
                  to="0"
                  dur="0.4s"
                  fill="freeze"
                />
              </circle>
            )}

            {/* Shot dot */}
            {dot && (
              <>
                <circle
                  cx={dot.px}
                  cy={dot.py}
                  r={14}
                  fill={dotColor}
                  opacity="0.1"
                />
                <circle
                  cx={dot.px}
                  cy={dot.py}
                  r={8}
                  fill={dotColor}
                  style={{ filter: `drop-shadow(0 0 5px ${dotColor}99)` }}
                />
                <circle
                  cx={dot.px}
                  cy={dot.py}
                  r={3}
                  fill="white"
                  opacity="0.9"
                />
              </>
            )}
          </svg>
        </div>

        {/* Zone — only after lift, not during drag */}
        <div
          className="flex-shrink-0 flex items-center justify-center py-2"
          style={{ minHeight: 40 }}
        >
          {isDragging ? (
            <p className="text-xs text-gray-600">Release to confirm</p>
          ) : zone ? (
            <p className="text-base font-bold" style={{ color: dotColor }}>
              📍 {zone}
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              Tap or drag to place the shot
            </p>
          )}
        </div>

        {/* Toggles */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pb-2">
          <div className="flex gap-2">
            {(["RHB", "LHB"] as const).map((h) => (
              <button
                key={h}
                onClick={() => {
                  setHandedness(h);
                  if (dot && !isDragging)
                    setZone(
                      deriveZone(dot.nx, dot.ny, h === "RHB", battingFromTop),
                    );
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95 ${
                  handedness === h
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-white/5 border-white/10 text-gray-400"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              const n = !battingFromTop;
              setBattingFromTop(n);
              if (dot && !isDragging)
                setZone(deriveZone(dot.nx, dot.ny, isRHB, n));
            }}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-amber-950/40 border-amber-800/40 text-amber-500 active:scale-95 transition-all"
          >
            {battingFromTop ? "⬆ Top end" : "⬇ Bottom end"}
          </button>
        </div>

        {/* Buttons */}
        <div className="flex-shrink-0 flex gap-3 px-4 pb-10 pt-1">
          <button
            onClick={onSkip}
            className="flex-1 py-4 rounded-2xl bg-white/[0.05] border border-white/10 text-gray-400 text-sm font-semibold active:scale-95 transition-all"
          >
            Skip
          </button>
          <button
            disabled={!zone}
            onClick={() => zone && onSave(zone)}
            className="flex-[2.5] py-4 rounded-2xl text-white text-sm font-bold active:scale-95 transition-all disabled:opacity-20"
            style={{ background: zone ? dotColor : "#3b82f6" }}
          >
            Save Zone
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Named exports for PublicScorecardPage ────────────────────────────────────

/** All possible zone name strings this modal can produce */
export const ZONES = [
  "Fine Leg",
  "Short Fine Leg",
  "Deep Sq. Leg",
  "Leg Slip",
  "Third Man",
  "Short Third Man",
  "Deep Point",
  "Slip",
  "Square Leg",
  "Point",
  "Mid Wicket",
  "Cover",
  "Mid On",
  "Extra Cover",
  "Long On",
  "Long Off",
  "Mid Off",
  "Deep Mid Wicket",
  "Deep Cover",
  "Deep Sq. Leg",
  "Straight Drive",
  "Straight",
] as const;

export type ZoneName = (typeof ZONES)[number];

interface ShotDot {
  zone: string;
  runs: number;
}

interface FieldSVGProps {
  shots: ShotDot[];
  battingFromTop?: boolean;
  isRHB?: boolean;
  size?: number; // diameter in px, default 260
}

/**
 * Read-only wagon wheel SVG — renders accumulated shots as spokes.
 * Used by PublicScorecardPage to display a batter's full wagon wheel.
 */
export function FieldSVG({
  shots,
  battingFromTop = true,
  isRHB = true,
  size = 260,
}: FieldSVGProps) {
  const VB2 = 320,
    R2 = 148,
    CX2 = 160,
    CY2 = 160;
  const pitchHalfLen = R2 * 0.44;
  const pitchW2 = 14;
  const batterStumpY2 = battingFromTop
    ? CY2 - pitchHalfLen
    : CY2 + pitchHalfLen;
  const bowlerStumpY2 = battingFromTop
    ? CY2 + pitchHalfLen
    : CY2 - pitchHalfLen;
  const pitchRectY2 = Math.min(batterStumpY2, bowlerStumpY2);
  const pitchRectH2 = Math.abs(bowlerStumpY2 - batterStumpY2);
  const batterDir2 = battingFromTop ? 1 : -1;
  const batterIconY2 = batterStumpY2 + batterDir2 * 10;
  const batterFlipX2 = isRHB ? 1 : -1;

  // Convert zone name back to approximate SVG coords for the spoke endpoint
  const zoneToCoords = (zone: string): { px: number; py: number } => {
    // angle: 0° = straight (bowler end), +90° = leg (RHB)
    // We map zone names to (angle°, radius 0-1)
    const zoneMap: Record<string, [number, number]> = {
      "Fine Leg": [145, 0.85],
      "Short Fine Leg": [132, 0.5],
      "Deep Sq. Leg": [105, 0.85],
      "Leg Slip": [95, 0.35],
      "Square Leg": [82, 0.55],
      "Mid Wicket": [55, 0.48],
      "Deep Mid Wicket": [55, 0.82],
      "Mid On": [22, 0.48],
      "Long On": [22, 0.82],
      "Straight Drive": [0, 0.75],
      Straight: [0, 0.45],
      "Mid Off": [-22, 0.48],
      "Long Off": [-22, 0.82],
      "Extra Cover": [-38, 0.5],
      "Deep Cover": [-50, 0.82],
      Cover: [-50, 0.52],
      Point: [-78, 0.52],
      "Deep Point": [-78, 0.82],
      Slip: [-95, 0.35],
      "Short Third Man": [-132, 0.5],
      "Third Man": [-145, 0.85],
    };
    const entry = zoneMap[zone] ?? [0, 0.6];
    let [angleDeg, r] = entry;
    if (!isRHB) angleDeg = -angleDeg;
    // flip if batting from bottom
    const angleRad = (angleDeg * Math.PI) / 180;
    // fy = r*sin, fx = r*cos mapped to SVG (angle=0 → straight down from batter)
    const fxRaw = Math.sin(angleRad) * r * R2;
    const fyRaw = Math.cos(angleRad) * r * R2;
    const fx = battingFromTop ? fxRaw : -fxRaw;
    const fy = battingFromTop ? fyRaw : -fyRaw;
    return { px: CX2 + fx, py: batterStumpY2 + fy };
  };

  const runColor = (runs: number) => {
    const m: Record<number, string> = {
      0: "#94a3b8",
      1: "#3b82f6",
      2: "#10b981",
      3: "#8b5cf6",
      4: "#22c55e",
      6: "#ec4899",
    };
    return m[runs] ?? "#3b82f6";
  };

  return (
    <svg viewBox={`0 0 ${VB2} ${VB2}`} style={{ width: size, height: size }}>
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
          <circle cx={CX2} cy={CY2} r={R2} />
        </clipPath>
      </defs>

      <circle cx={CX2} cy={CY2} r={R2} fill="url(#fs_grass)" />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect
          key={i}
          x={CX2 - R2}
          y={CY2 - R2 + i * ((R2 * 2) / 12)}
          width={R2 * 2}
          height={(R2 * 2) / 12}
          fill={i % 2 === 0 ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.03)"}
          clipPath="url(#fs_clip)"
        />
      ))}
      <circle
        cx={CX2}
        cy={CY2}
        r={R2 - 1}
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
        opacity="0.4"
      />
      <circle
        cx={CX2}
        cy={CY2}
        r={R2 * 0.53}
        fill="none"
        stroke="#22c55e"
        strokeWidth="1"
        strokeDasharray="5 4"
        opacity="0.2"
      />

      <rect
        x={CX2 - pitchW2 / 2}
        y={pitchRectY2}
        width={pitchW2}
        height={pitchRectH2}
        rx="2"
        fill="url(#fs_pitch)"
        clipPath="url(#fs_clip)"
      />

      {[-3.5, 0, 3.5].map((ox) => (
        <line
          key={ox}
          x1={CX2 + ox}
          y1={bowlerStumpY2 - 6}
          x2={CX2 + ox}
          y2={bowlerStumpY2 + 6}
          stroke="#9ca3af"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.3"
        />
      ))}
      {[-3.5, 0, 3.5].map((ox) => (
        <line
          key={ox}
          x1={CX2 + ox}
          y1={batterStumpY2 - 6}
          x2={CX2 + ox}
          y2={batterStumpY2 + 6}
          stroke="#fbbf24"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.95"
        />
      ))}
      <line
        x1={CX2 - 4.5}
        y1={batterStumpY2 - 6.5}
        x2={CX2 + 4.5}
        y2={batterStumpY2 - 6.5}
        stroke="#fbbf24"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.8"
      />

      <g
        transform={`translate(${CX2 + batterFlipX2 * 6}, ${batterIconY2}) scale(${batterFlipX2 * 3.8}, 3.8)`}
      >
        <circle cx={0} cy={-4} r={1.5} fill="#fbbf24" />
        <line
          x1={0}
          y1={-2.5}
          x2={0}
          y2={1.5}
          stroke="#fbbf24"
          strokeWidth={0.7}
          strokeLinecap="round"
        />
        <line
          x1={0}
          y1={-1.5}
          x2={-2.2}
          y2={-0.3}
          stroke="#fbbf24"
          strokeWidth={0.6}
          strokeLinecap="round"
        />
        <line
          x1={-2.2}
          y1={-0.3}
          x2={-3.6}
          y2={1.5}
          stroke="#fbbf24"
          strokeWidth={1.1}
          strokeLinecap="round"
        />
        <line
          x1={0}
          y1={-1.5}
          x2={1.4}
          y2={-0.5}
          stroke="#fbbf24"
          strokeWidth={0.6}
          strokeLinecap="round"
        />
        <line
          x1={0}
          y1={1.5}
          x2={-1.0}
          y2={3.8}
          stroke="#fbbf24"
          strokeWidth={0.6}
          strokeLinecap="round"
        />
        <line
          x1={0}
          y1={1.5}
          x2={1.0}
          y2={3.8}
          stroke="#fbbf24"
          strokeWidth={0.6}
          strokeLinecap="round"
        />
      </g>

      {/* Render all shot spokes */}
      {shots.map((shot, i) => {
        const { px, py } = zoneToCoords(shot.zone);
        const color = runColor(shot.runs);
        return (
          <g key={i}>
            <line
              x1={CX2}
              y1={batterStumpY2}
              x2={px}
              y2={py}
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.75"
            />
            <circle cx={px} cy={py} r={6} fill={color} opacity="0.85" />
            <circle cx={px} cy={py} r={2} fill="white" opacity="0.8" />
          </g>
        );
      })}
    </svg>
  );
}
