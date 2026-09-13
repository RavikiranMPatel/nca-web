import { randomInt } from "node:crypto";

/**
 * Unique tags for fixture-owned rows.
 *
 * Fixtures in this suite tear down by MATCHING ON THE NAME, and the name carries
 * a tag. So the tag is the only thing keeping one worker's teardown from
 * deleting another worker's rows, and it has to be unique across PROCESSES —
 * Playwright runs each project in its own worker, so module state is not shared.
 *
 * It used to be `Date.now() % 1000000` plus a counter held in module state. Both
 * halves are per-process: every worker's counter starts at 0, and two workers
 * that start in the same millisecond read the same clock. Identical tags, and the
 * first teardown then deleted the other worker's rows — BUG-54.
 *
 * Randomness rather than a wider clock or a worker index: the clock does not get
 * more unique by adding digits (two workers still start together), and a worker
 * index only separates workers inside ONE run, not a run from a stale row left by
 * the last one. This is the same reasoning that fixed BUG-11's match public ids.
 */

/**
 * Builds an independent tagger — one per process, exactly like a worker gets.
 *
 * EIGHT DIGITS, and both halves of that matter — this was got wrong twice before
 * it was got right, and the reason is the same both times.
 *
 * Fixture tags end up inside team names, and team names are printed into a PDF
 * whose table columns are sized in points. A twelve-character tag pushed
 * "Home <tag> won by 10 runs" past a column boundary and the sentence wrapped, so
 * four report assertions failed on text that was all present but no longer
 * contiguous. Shortening to eight fixed that — and then the suite failed on two
 * runs out of three, because eight HEX characters are not eight digits wide: the
 * font is proportional, `W` and `M` are wide, `1` is narrow, and only the tags
 * that happened to draw wide letters overflowed. A test that fails for two runs
 * and passes for the third reads as a flaky fixture; it was a variable-width
 * string in a fixed-width column.
 *
 * Digits are what the old scheme produced, so digits are what keeps every
 * rendered width the same as the layout was built against. 10^8 is a hundred
 * million, which is ample for rows that live for one spec file.
 */
export function makeTagger(_now: () => number = Date.now): () => string {
  return () => String(randomInt(10_000_000, 100_000_000));
}

export const newFixtureTag = makeTagger();

/**
 * The 7-digit trunk of a fixture's phone numbers.
 *
 * A phone is `9` + this + a 2-digit player index = exactly 10 digits, so one
 * trunk yields up to 100 distinct numbers and the index is what separates the
 * players inside a fixture. It must be the index, not a slice of the tag: the tag
 * is hex and a phone is not.
 *
 * This matters beyond tidiness. The previous scheme built the phone from the tag
 * and then truncated to 10 characters, which cut the index off — 22 players
 * received THREE distinct phone numbers between them. Nothing enforced phone
 * uniqueness on players, so it went unnoticed.
 */
export function newPhoneTrunk(): string {
  return String(randomInt(1_000_000, 10_000_000));
}

/** The phone for player `index` (0-based, < 100) in a fixture. */
export function fixturePhone(trunk: string, index: number): string {
  if (index >= 100) throw new Error(`fixturePhone: index ${index} exceeds 99`);
  return `9${trunk}${String(index).padStart(2, "0")}`;
}
