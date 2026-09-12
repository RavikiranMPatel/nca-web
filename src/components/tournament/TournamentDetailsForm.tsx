import ImageUpload from "../ImageUpload";
import type { TournamentInput } from "../../api/scoring/tournamentApi";

/**
 * The Phase 2 fields, as one form — used by both create and edit.
 *
 * One component rather than two forms for the same reason the backend has one
 * `applyRequest` for both verbs: a field wired into create and forgotten in edit
 * is the defect this shape prevents, and it is exactly what happened to
 * `lossPoints`, which the create page has rendered since it was written while
 * the request DTO never carried it.
 *
 * There was no edit surface at all before this slice. `updateTournament` existed
 * in the API module with no caller anywhere in `src/`, so a tournament's name,
 * dates, venue and description could be set once at creation and never changed.
 */

export const FORMATS: { value: string; label: string; desc: string }[] = [
  { value: "ROUND_ROBIN", label: "Round Robin", desc: "Every team plays every other team" },
  { value: "DOUBLE_ROUND_ROBIN", label: "Double Round Robin", desc: "Every pairing played twice" },
  { value: "KNOCKOUT", label: "Knockout", desc: "Single elimination bracket" },
  { value: "GROUP_KNOCKOUT", label: "Group + Knockout", desc: "Group stage then knockout" },
  {
    value: "LEAGUE_PLAYOFFS",
    label: "League + Playoffs",
    desc: "Full league stage, then top teams advance to playoffs (IPL format)",
  },
];

/**
 * What the tournament IS, not how it is played — the distinction the
 * `tournament_type` column exists to make. Mirrors TournamentType.java, and the
 * server refuses anything outside it.
 */
export const TYPES: { value: string; label: string }[] = [
  { value: "INTERNAL", label: "Internal — our own teams" },
  { value: "INTER_ACADEMY", label: "Inter-academy" },
  { value: "AGE_GROUP", label: "Age group (U12, U14…)" },
  { value: "OPEN", label: "Open / senior" },
  { value: "INVITATIONAL", label: "Invitational" },
  { value: "EXTERNAL", label: "External body (KSCA-style)" },
  { value: "FRIENDLY", label: "Friendly / exhibition" },
];

const INPUT =
  "w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 " +
  "rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500";

const LABEL =
  "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

interface Props {
  form: TournamentInput;
  set: (key: keyof TournamentInput, value: string | number | undefined) => void;
  /** The derived season, shown read-only — the server owns it (ruling 11). */
  seasonLabel?: string | null;
}

export default function TournamentDetailsForm({ form, set, seasonLabel }: Props) {
  return (
    <div className="space-y-5" data-testid="tournament-details-form">
      {/* Name and short name. Side by side from sm up, stacked on a phone. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className={LABEL} htmlFor="t-name">
            Tournament Name *
          </label>
          <input
            id="t-name"
            data-testid="tournament-name"
            type="text"
            className={INPUT}
            placeholder="e.g. NCA Summer Cup 2026"
            value={form.name ?? ""}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="t-short-name">
            Short Name
          </label>
          <input
            id="t-short-name"
            data-testid="tournament-short-name"
            type="text"
            maxLength={30}
            className={INPUT}
            placeholder="e.g. NCASC26"
            value={form.shortName ?? ""}
            onChange={(e) => set("shortName", e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">
            Used in tables and badges. Optional.
          </p>
        </div>
      </div>

      {/* Type. A select rather than the format's card list: it is a plain
          choice, and seven cards would push the dates below the fold. */}
      <div>
        <label className={LABEL} htmlFor="t-type">
          Tournament Type
        </label>
        <select
          id="t-type"
          data-testid="tournament-type"
          className={INPUT}
          value={form.tournamentType ?? "INTERNAL"}
          onChange={(e) => set("tournamentType", e.target.value)}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          What the tournament is. Separate from the format below, which is how
          the fixtures are drawn.
        </p>
      </div>

      {/* Format */}
      <div>
        <label className={LABEL}>Format</label>
        <div className="space-y-2">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              data-testid={`tournament-format-${f.value}`}
              onClick={() => set("format", f.value)}
              className={`w-full p-3 rounded-xl border text-left transition-all active:scale-95 ${
                (form.format ?? "ROUND_ROBIN") === f.value
                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {f.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {f.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Dates, and the year they imply */}
      <div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL} htmlFor="t-start">
              Start Date
            </label>
            <input
              id="t-start"
              data-testid="tournament-start-date"
              type="date"
              className={INPUT}
              value={form.startDate ?? ""}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="t-end">
              End Date
            </label>
            <input
              id="t-end"
              data-testid="tournament-end-date"
              type="date"
              className={INPUT}
              value={form.endDate ?? ""}
              onChange={(e) => set("endDate", e.target.value)}
            />
          </div>
        </div>
        {/* The year is derived, never entered (ruling 11). Showing it makes that
            visible instead of leaving the operator looking for a year field. */}
        <p
          className="text-xs text-gray-500 dark:text-gray-400 mt-1"
          data-testid="tournament-season-hint"
        >
          {seasonLabel
            ? `Season ${seasonLabel} — taken from the start date`
            : "The season is taken from the start date"}
        </p>
      </div>

      {/* Organizer and venue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor="t-organizer">
            Organizer / Host
          </label>
          <input
            id="t-organizer"
            data-testid="tournament-organizer"
            type="text"
            className={INPUT}
            placeholder="e.g. KSCA Bengaluru"
            value={form.organizer ?? ""}
            onChange={(e) => set("organizer", e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="t-venue">
            Venue
          </label>
          <input
            id="t-venue"
            data-testid="tournament-venue"
            type="text"
            className={INPUT}
            placeholder="e.g. NCA Ground A"
            value={form.venue ?? ""}
            onChange={(e) => set("venue", e.target.value)}
          />
        </div>
      </div>

      {/* Logo, through the upload endpoint the academy logo already uses */}
      <div>
        <label className={LABEL}>Logo</label>
        <ImageUpload
          uploadType="logo"
          currentUrl={form.logoUrl ?? undefined}
          onUploadSuccess={(url) => set("logoUrl", url)}
          label="Upload tournament logo"
          helpText="Shown beside the tournament in lists. Optional."
        />
      </div>

      {/* Overs */}
      <div>
        <label className={LABEL} htmlFor="t-overs">
          Default Overs per Match
        </label>
        <select
          id="t-overs"
          data-testid="tournament-overs"
          className={INPUT}
          value={form.defaultOvers ?? 20}
          onChange={(e) => set("defaultOvers", Number(e.target.value))}
        >
          {[5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50].map((o) => (
            <option key={o} value={o}>
              {o} overs
            </option>
          ))}
        </select>
      </div>

      {/* Points. Four inputs, not three: "Tie/NR" used to set only tiePoints
          while noResultPoints was sent as a constant, and Loss was bound to a
          field the request did not carry at all. */}
      <div>
        <label className={LABEL}>Points System</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            [
              { label: "Win", key: "winPoints" },
              { label: "Tie", key: "tiePoints" },
              { label: "No result", key: "noResultPoints" },
              { label: "Loss", key: "lossPoints" },
            ] as { label: string; key: keyof TournamentInput }[]
          ).map(({ label, key }) => (
            <div key={key}>
              <label
                className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
                htmlFor={`t-${key}`}
              >
                {label}
              </label>
              <input
                id={`t-${key}`}
                data-testid={`tournament-${key}`}
                type="number"
                min={0}
                max={100}
                className={`${INPUT} text-center px-2`}
                value={(form[key] as number | undefined) ?? 0}
                onChange={(e) => set(key, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={LABEL} htmlFor="t-description">
          Description (optional)
        </label>
        <textarea
          id="t-description"
          data-testid="tournament-description"
          rows={3}
          maxLength={500}
          className={`${INPUT} resize-none`}
          placeholder="Tournament rules, prizes, notes..."
          value={form.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>
    </div>
  );
}
