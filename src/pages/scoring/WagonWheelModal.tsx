import { useState, useRef, useEffect } from "react";
import {
  FIELD_CX,
  FIELD_CY,
  FIELD_RADIUS,
  FIELD_VIEWBOX,
  deriveZone,
  runColor,
} from "../../components/cricket/WagonWheel/wagonWheelGeometry";

interface Props {
  strikerName: string;
  strikerBattingStyle?: string;
  runs: number;
  deliveryPublicId: string;
  onSave: (zone: string) => void;
  onSkip: () => void;
}

const VB = FIELD_VIEWBOX,
  R = FIELD_RADIUS,
  CX = FIELD_CX,
  CY = FIELD_CY;

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
  const dotColor = runColor(runs);

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
    <div
      data-testid="wagon-wheel-modal"
      className="fixed inset-0 z-[80] bg-black/70 flex flex-col justify-end"
    >
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
            data-testid="wagon-wheel-field"
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
            <p
              data-testid="wagon-wheel-zone-label"
              className="text-base font-bold"
              style={{ color: dotColor }}
            >
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
            data-testid="wagon-wheel-save"
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
