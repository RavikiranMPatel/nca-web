/**
 * Shapes shared between TournamentDetailPage and the tab components split out of
 * it.
 *
 * These were inferred from the `useState` initialisers before the split, which
 * was enough while the JSX lived in the same function. Once a form's setter
 * crosses a component boundary it needs a name, otherwise the prop can only be
 * typed `Dispatch<SetStateAction<any>>` — and an `any` there silently removes
 * the contextual type from every `setForm((p) => …)` updater. Naming them keeps
 * those updaters as well typed as they were.
 */

/**
 * A record returned by the tournament API — a team, a fixture, a standings row.
 *
 * `any` because that is what it already was: the page holds all of this in
 * `useState<any[]>` and none of these payloads has a type anywhere in the
 * codebase. Naming it once is the point — the tab components would otherwise
 * have carried about seventy separate `any` annotations between them, and this
 * gives the shapes a single place to be tightened when someone does type them.
 * Widening the refactor to invent those types was out of scope for a split whose
 * whole claim is that behaviour did not change.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiRecord = any;

/** A callback owned by the page and passed down to a tab. */
export type Handler = (...args: ApiRecord[]) => ApiRecord;

export interface SettingsForm {
  oversPerInnings: number;
  minsPerOver: number;
  inningsBreakMins: number;
  groundGapMins: number;
  dayStartTime: string;
  dayEndTime: string;
  maxMatchesPerDay: number;
}

export interface GenForm {
  teamsPerGroup: number;
  scheduleStartDate: string;
  scheduleStartTime: string;
  autoAssignVenues: boolean;
  selectedVenueIds: string[];
  playDays: number[];
  maxMatchesPerDay: number;
}

/** One match slot in the schedule preview on the Settings tab. */
export interface ScheduleSlot {
  start: string;
  end: string;
}

/** What `computeSchedulePreview()` returns: the per-match duration and the slots. */
export interface SchedulePreview {
  duration: number;
  slots: ScheduleSlot[];
}
