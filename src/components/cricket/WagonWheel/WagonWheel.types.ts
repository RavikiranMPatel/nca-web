// Consolidation: this project rejected continuous angle/distance shot capture
// (SESSION-HANDOFF.md, "Wagon wheel" section) in favour of the discrete zone
// model already shipping — one batter's shot is one named field zone plus the
// runs scored off it. Nothing here carries an angle or a distance; a zone
// name IS the location.

/** One scored shot, resolved to a named field zone (see wagonWheelGeometry). */
export interface ShotDot {
  /** A ZONES entry — see wagonWheelGeometry.ts. Not narrowed to ZoneName: the
   * data comes from the database (deliveries.shot_zone, VARCHAR(30)) and a
   * legacy or manually-edited row is read, not rejected, if it no longer
   * matches the current zone list. */
  zone: string;
  runs: number;
}

/** A shot attributed to a specific batter — the shape the multi-batter filter needs. */
export interface AttributedShotDot extends ShotDot {
  batsmanPublicId: string;
  batsmanName?: string;
}

/** One entry in the multi-batter filter row. */
export interface WagonWheelBatter {
  publicId: string;
  name: string;
  /** Selecting this batter overrides the field's handedness to match them —
   * the same behaviour the old WagonWheelDisplay had, preserved as-is. */
  battingStyle?: string;
}
