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

/**
 * The Edit Fixture form.
 *
 * Named for the same reason SettingsForm and GenForm are: a type inferred from a
 * useState initialiser suffices inside one function, but the moment a field is
 * added the inference becomes the spec, and every `setForm((p) => ...)` updater
 * silently disagrees with it. That produced eight TS errors the first time the
 * schedule-sheet fields were added.
 *
 * matchNumber is a string, not a number: an empty numeric input is "", and the
 * PATCH binder wants an Integer or the field absent.
 */
export interface EditFixtureForm {
  roundNumber: number;
  homeTeamPublicId: string;
  awayTeamPublicId: string;
  venue: string;
  venueId: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  matchNumber: string;
  city: string;
  umpire1Name: string;
  umpire2Name: string;
  umpire3Name: string;
  refereeName: string;
  scorerName: string;
  notes: string;
}

/**
 * The four small forms the Slice 5 modal split pushed across a component
 * boundary.
 *
 * Same reason SettingsForm, GenForm and EditFixtureForm above are named: a type
 * inferred from a useState initialiser is fine while the JSX lives in the same
 * function, but once the setter is a prop it can only be typed
 * Dispatch<SetStateAction<ApiRecord>> — and ApiRecord is any, which silently
 * strips the contextual type from every setForm((p) => ...) updater inside the
 * modal. That is 37 implicit-any parameters across the ten files if these are
 * left unnamed, measured rather than guessed.
 */
export interface TeamForm {
  name: string;
  shortName: string;
  colorHex: string;
  groupName: string;
}

export interface VenueForm {
  name: string;
  maxMatchesPerDay: number;
}

export interface OfficialForm {
  name: string;
  role: string;
}

/** The Add Fixture form — distinct from EditFixtureForm, which carries more. */
export interface ManualFixtureForm {
  stagePublicId: string;
  homeTeamPublicId: string;
  awayTeamPublicId: string;
  venue: string;
  venueId: string;
  scheduledDate: string;
  scheduledTime: string;
}

/** Reschedule / postpone. postpone true means "no new slot", not "move to now". */
export interface RescheduleForm {
  date: string;
  time: string;
  reason: string;
  postpone: boolean;
}
