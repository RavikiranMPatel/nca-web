import type React from "react";

// Keep in sync with PlayerKitDetails.VALID_SIZES and PlayerKitService.SIZE_LIST
// on the backend. (Known tech debt: this list lives in three places; the fix is
// to serve it from an endpoint.)
export const KIT_SIZES = ["22","24","26","28","30","32","34","36","S","M","L","XL","XXL"];

export type KitFormValues = {
  seasonYear: string;
  tshirtSize: string;
  trouserSize: string;
  capGiven: boolean;
  tshirtGiven: boolean;
  trouserGiven: boolean;
  jerseyName: string;
  jerseyNumber: string;
};

export const emptyKitForm = (): KitFormValues => ({
  seasonYear: new Date().getFullYear().toString(),
  tshirtSize: "",
  trouserSize: "",
  capGiven: false,
  tshirtGiven: false,
  trouserGiven: false,
  jerseyName: "",
  jerseyNumber: "",
});

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

/**
 * The one kit editor.
 *
 * Extracted from PlayerKitPage so the Kit tab and the Kit / Merchandise list
 * drawer share a single form rather than each growing their own copy. Both post
 * to the same POST /admin/players/{id}/kit, so whatever one saves the other sees.
 *
 * Presentational only — it owns no fetching and no save. The parent supplies the
 * values, the change handler and the buttons, because the two callers frame the
 * form differently (a card on the tab, a drawer in the list).
 *
 * `lockSeason` is for the list drawer, which always edits one already-chosen
 * season and must not let the season be retyped into a different row.
 */
export default function KitDetailsForm({
  values,
  onChange,
  lockSeason = false,
  idPrefix = "kit",
}: {
  values: KitFormValues;
  onChange: (next: KitFormValues) => void;
  lockSeason?: boolean;
  idPrefix?: string;
}) {
  const set = <K extends keyof KitFormValues>(key: K, v: KitFormValues[K]) =>
    onChange({ ...values, [key]: v });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid={`${idPrefix}-form`}>
      <Field label="Season / Year *">
        <input
          type="text"
          value={values.seasonYear}
          onChange={(e) => set("seasonYear", e.target.value)}
          placeholder="e.g. 2025"
          disabled={lockSeason}
          className={`${inputClass} ${lockSeason ? "bg-gray-100 text-gray-500" : ""}`}
          data-testid={`${idPrefix}-season`}
        />
      </Field>

      <Field label="T-Shirt Size">
        <select
          value={values.tshirtSize}
          onChange={(e) => set("tshirtSize", e.target.value)}
          className={inputClass}
          data-testid={`${idPrefix}-tshirt-size`}
        >
          <option value="">— Select —</option>
          {KIT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>

      <Field label="Trouser Size">
        <select
          value={values.trouserSize}
          onChange={(e) => set("trouserSize", e.target.value)}
          className={inputClass}
          data-testid={`${idPrefix}-trouser-size`}
        >
          <option value="">— Select —</option>
          {KIT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>

      <Field label="Jersey Name">
        <input
          type="text"
          value={values.jerseyName}
          onChange={(e) => set("jerseyName", e.target.value)}
          maxLength={50}
          placeholder="Name on jersey"
          className={inputClass}
          data-testid={`${idPrefix}-jersey-name`}
        />
      </Field>

      <Field label="Jersey Number">
        <input
          type="text"
          value={values.jerseyNumber}
          onChange={(e) => set("jerseyNumber", e.target.value)}
          maxLength={10}
          placeholder="e.g. 7"
          className={inputClass}
          data-testid={`${idPrefix}-jersey-number`}
        />
      </Field>

      <Field label="Items Given">
        <div className="flex flex-col gap-2 py-1">
          <Check
            testId={`${idPrefix}-tshirt-given`}
            checked={values.tshirtGiven}
            onChange={(v) => set("tshirtGiven", v)}
            label="T-shirt issued to player"
          />
          <Check
            testId={`${idPrefix}-trouser-given`}
            checked={values.trouserGiven}
            onChange={(v) => set("trouserGiven", v)}
            label="Trousers issued to player"
          />
          <Check
            testId={`${idPrefix}-cap-given`}
            checked={values.capGiven}
            onChange={(v) => set("capGiven", v)}
            label="Cap has been issued to player"
          />
        </div>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Check({
  testId, checked, onChange, label,
}: { testId: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded"
        data-testid={testId}
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
