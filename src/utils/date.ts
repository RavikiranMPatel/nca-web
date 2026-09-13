export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * The zone a scheduled time belongs to.
 *
 * A fixture's slot is a fact about the ground it is played on, not about the
 * laptop it is read on. `new Date(iso).toLocaleTimeString()` formats an instant
 * in the VIEWER's zone, so the same fixture read in Bengaluru, London and New
 * York shows three different times and two different dates — and only one of
 * them is the time the umpires will be standing there.
 *
 * Matches the backend's `AcademyZone`, which is the same decision made once on
 * the other side of the wire: the academies this platform serves all operate in
 * one zone, and the day one does not, these two constants are what widen into a
 * per-academy setting.
 */
export const ACADEMY_TIME_ZONE = "Asia/Kolkata";

/** "Sun, 10 May, 2026" — the day at the ground. */
export function formatFixtureDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: ACADEMY_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    weekday: "short",
  });
}

/** "09:30 am" — the time at the ground. */
export function formatFixtureTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: ACADEMY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
