// The one definition of "what angle/distance does each field zone occupy",
// shared by the capture side (WagonWheelModal — a tap resolves to a zone via
// deriveZone) and the display side (FieldSVG — a zone resolves to a spoke
// position via zoneToPolar). Before this file, each had its own copy; a zone
// boundary changed in one without the other would have made a shot render in
// a visually different place than where taps like it actually cluster.

/** Every zone name a shot can be resolved to. */
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
  "Straight Drive",
  "Straight",
] as const;

export type ZoneName = (typeof ZONES)[number];

/**
 * The one field-circle layout both the capture modal and the display
 * component draw against. Both previously hardcoded these same four numbers
 * independently (VB/R/CX/CY in the modal, VB2/R2/CX2/CY2 in FieldSVG) — same
 * values, two copies. Centralized here so a future resize only happens once.
 */
export const FIELD_VIEWBOX = 320;
export const FIELD_RADIUS = 148;
export const FIELD_CX = 160;
export const FIELD_CY = 160;

/** Shot-run → dot/spoke color, shared by the capture modal and the display. */
const RUN_COLOR_MAP: Record<number, string> = {
  0: "#94a3b8",
  1: "#3b82f6",
  2: "#10b981",
  3: "#8b5cf6",
  4: "#22c55e",
  6: "#ec4899",
};

export function runColor(runs: number): string {
  return RUN_COLOR_MAP[runs] ?? "#3b82f6";
}

/**
 * A tapped point (normalized to the field circle, |{nx,ny}| <= 1) resolved to
 * the named zone it falls in. `isRHB`/`battingFromTop` orient the same tap
 * differently depending on which way the batter is facing and which hand
 * they bat with — a tap "behind square on the off side" is a different named
 * zone for a left-hander than a right-hander.
 */
export function deriveZone(
  nx: number,
  ny: number,
  isRHB: boolean,
  battingFromTop: boolean,
): ZoneName {
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

/**
 * The inverse of deriveZone for display: where a named zone's spoke should
 * point, as (angle in degrees, radius as a 0-1 fraction of the field circle).
 * Approximate by construction — a zone spans a range of real taps, this
 * returns one representative point for it, which is exactly the "render from
 * discrete zones with an approximate representative angle per zone" this
 * project settled on rather than capturing continuous angle/distance.
 */
const ZONE_POLAR: Record<string, [angleDeg: number, radius: number]> = {
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

const DEFAULT_POLAR: [number, number] = [0, 0.6];

export function zoneToPolar(
  zone: string,
  isRHB: boolean,
): { angleDeg: number; radius: number } {
  const [rawAngle, radius] = ZONE_POLAR[zone] ?? DEFAULT_POLAR;
  return { angleDeg: isRHB ? rawAngle : -rawAngle, radius };
}

/**
 * zoneToPolar plus the pixel conversion FieldSVG needs to actually draw a
 * spoke — split out so the display component doesn't repeat this trig.
 * `batterStumpY` is the caller's own (battingFromTop-dependent) stump
 * position, since that's a property of the SVG layout, not of the zone.
 */
export function zoneToPixel(
  zone: string,
  isRHB: boolean,
  battingFromTop: boolean,
  batterStumpY: number,
): { px: number; py: number } {
  const { angleDeg, radius } = zoneToPolar(zone, isRHB);
  const angleRad = (angleDeg * Math.PI) / 180;
  const fxRaw = Math.sin(angleRad) * radius * FIELD_RADIUS;
  const fyRaw = Math.cos(angleRad) * radius * FIELD_RADIUS;
  const fx = battingFromTop ? fxRaw : -fxRaw;
  const fy = battingFromTop ? fyRaw : -fyRaw;
  return { px: FIELD_CX + fx, py: batterStumpY + fy };
}
