/**
 * Shared UI components for player assessment form and related views.
 * Extracted from PlayerAssessmentForm.tsx — no behaviour change.
 */

import { useState } from "react";
import type { ReactNode } from "react";
import type {
  RatingValue,
  SkillEntry,
} from "../../api/playerService/playerAssessmentService.ts";

// ─── RATINGS CONSTANT ────────────────────────────────────

export const RATINGS: {
  value: RatingValue;
  label: string;
  color: string;
  bg: string;
}[] = [
  {
    value: "NEEDS_WORK",
    label: "Needs Work",
    color: "text-red-800",
    bg: "bg-red-100 border-red-200",
  },
  {
    value: "DEVELOPING",
    label: "Developing",
    color: "text-yellow-800",
    bg: "bg-yellow-100 border-yellow-200",
  },
  {
    value: "GOOD",
    label: "Good",
    color: "text-green-800",
    bg: "bg-green-100 border-green-200",
  },
  {
    value: "EXCELLENT",
    label: "Excellent",
    color: "text-blue-800",
    bg: "bg-blue-100 border-blue-200",
  },
];

// ─── HELPER ──────────────────────────────────────────────

export function getSkill(
  data: Record<string, SkillEntry> | undefined,
  key: string,
): SkillEntry {
  return data?.[key] || {};
}

// ─── RATING PILLS ────────────────────────────────────────

export function RatingPills({
  value,
  onChange,
}: {
  value?: RatingValue;
  onChange: (v: RatingValue) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {RATINGS.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
            value === r.value
              ? `${r.bg} ${r.color} ring-2 ring-offset-1 ring-current`
              : `${r.bg} ${r.color} opacity-35 hover:opacity-60`
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

// ─── SKILL ROW ───────────────────────────────────────────

export function SkillRow({
  label,
  entry,
  onChange,
  commentRows = 1,
  previousRating,
  compact = false,
  measurement,
}: {
  label: string;
  entry: SkillEntry;
  onChange: (e: SkillEntry) => void;
  commentRows?: number;
  previousRating?: RatingValue;
  compact?: boolean;
  measurement?: { unit: string };
}) {
  const [open, setOpen] = useState(
    !compact && (!!entry.rating || !!entry.comment || entry.value !== undefined),
  );
  const [showCompactComment, setShowCompactComment] = useState(false);

  const prevCfg = previousRating ? RATINGS.find((r) => r.value === previousRating) : null;

  // ── Compact mode ─────────────────────────────────────
  if (compact) {
    // Measurement rows wrap to two lines below sm (640 px):
    //   line 1 — full-width label
    //   line 2 — number input + unit + rating buttons + comment button
    // Rating-only rows stay single-line at all widths.
    const controls = (
      <div className="flex gap-0.5 items-center flex-shrink-0">
        {measurement && (
          <div className="flex items-center gap-1 flex-shrink-0 mr-1">
            <input
              type="number"
              min={0}
              step={0.01}
              value={entry.value ?? ""}
              data-testid={`measurement-input-${label}`}
              onChange={(e) => {
                const v = e.target.value === "" ? undefined : parseFloat(e.target.value);
                onChange({ ...entry, value: v, unit: measurement.unit });
              }}
              placeholder="—"
              className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
            />
            <span className="text-[10px] text-slate-400 w-5">{measurement.unit}</span>
          </div>
        )}
        {RATINGS.map((r) => (
          <button
            key={r.value}
            type="button"
            title={r.label}
            onClick={() =>
              onChange({ ...entry, rating: entry.rating === r.value ? undefined : r.value })
            }
            className={`w-6 h-6 rounded text-[9px] font-black border transition-all ${
              entry.rating === r.value
                ? `${r.bg} ${r.color} ring-1 ring-current`
                : `${r.bg} ${r.color} opacity-25 hover:opacity-60`
            }`}
          >
            {r.label[0]}
          </button>
        ))}
        <button
          type="button"
          title="Comment"
          onClick={() => setShowCompactComment(!showCompactComment)}
          className={`w-6 h-6 ml-0.5 rounded border text-[10px] transition-all ${
            entry.comment
              ? "bg-blue-50 border-blue-200 text-blue-600"
              : "bg-slate-50 border-slate-200 text-slate-300 hover:text-slate-400"
          }`}
        >
          ✎
        </button>
      </div>
    );

    return (
      <div className="py-1.5 px-3 border-b border-slate-100 last:border-0">
        {measurement ? (
          // Two-line on narrow screens, single-line at sm+
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-1">
            <div className="w-full sm:flex-1 sm:min-w-0">
              <span className="text-xs font-medium text-slate-700 block sm:truncate">
                {label}
              </span>
              {prevCfg && (
                <span
                  className={`text-[9px] font-semibold px-1 py-0.5 rounded ${prevCfg.bg} ${prevCfg.color} opacity-70`}
                >
                  Last: {prevCfg.label}
                </span>
              )}
            </div>
            {controls}
          </div>
        ) : (
          // Rating-only: always single-line
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-slate-700 truncate block">
                {label}
              </span>
              {prevCfg && (
                <span
                  className={`text-[9px] font-semibold px-1 py-0.5 rounded ${prevCfg.bg} ${prevCfg.color} opacity-70`}
                >
                  Last: {prevCfg.label}
                </span>
              )}
            </div>
            {controls}
          </div>
        )}
        {showCompactComment && (
          <input
            type="text"
            value={entry.comment || ""}
            onChange={(e) => onChange({ ...entry, comment: e.target.value })}
            placeholder="Comment..."
            className="mt-1 w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
          />
        )}
      </div>
    );
  }

  // ── Detailed mode (default) ───────────────────────────
  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
          open
            ? "bg-blue-50 border border-blue-200"
            : "bg-slate-50 border border-slate-100 hover:border-slate-200"
        }`}
      >
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          {measurement && entry.value !== undefined && !open && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700">
              {entry.value} {measurement.unit}
            </span>
          )}
          {entry.rating && !open && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                RATINGS.find((r) => r.value === entry.rating)?.bg || ""
              } ${RATINGS.find((r) => r.value === entry.rating)?.color || ""}`}
            >
              {entry.rating.replace(/_/g, " ")}
            </span>
          )}
          {prevCfg && !open && !entry.rating && entry.value === undefined && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${prevCfg.bg} ${prevCfg.color} opacity-50`}>
              Last: {prevCfg.label}
            </span>
          )}
          <span
            className={`text-xs text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        </div>
      </button>
      {open && (
        <div className="px-3 pt-3 pb-1 space-y-2">
          {prevCfg && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span>Last rating:</span>
              <span className={`px-1.5 py-0.5 rounded font-semibold ${prevCfg.bg} ${prevCfg.color}`}>
                {prevCfg.label}
              </span>
            </div>
          )}
          {measurement && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium w-20 shrink-0">
                Measurement
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={entry.value ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? undefined : parseFloat(e.target.value);
                  onChange({ ...entry, value: v, unit: measurement.unit });
                }}
                placeholder="Enter value"
                className="w-28 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
              <span className="text-sm text-slate-500">{measurement.unit}</span>
            </div>
          )}
          <RatingPills
            value={entry.rating}
            onChange={(v) => onChange({ ...entry, rating: v })}
          />
          <textarea
            value={entry.comment || ""}
            onChange={(e) => onChange({ ...entry, comment: e.target.value })}
            placeholder="Coach comments..."
            rows={commentRows}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y bg-slate-50"
          />
        </div>
      )}
    </div>
  );
}

// ─── TIER HEADER ─────────────────────────────────────────

export function TierHeader({
  tier,
  label,
  rated,
  total,
}: {
  tier: string;
  label: string;
  rated?: number;
  total?: number;
}) {
  const styles: Record<string, { dot: string; bg: string; text: string }> = {
    Basics: {
      dot: "bg-green-500",
      bg: "bg-green-50",
      text: "text-green-700",
    },
    Intermediate: {
      dot: "bg-orange-500",
      bg: "bg-orange-50",
      text: "text-orange-700",
    },
    Advanced: {
      dot: "bg-pink-500",
      bg: "bg-pink-50",
      text: "text-pink-700",
    },
  };
  const s = styles[tier] || styles.Basics;

  return (
    <div className="flex items-center gap-2 mt-4 mb-2">
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      <span
        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${s.bg} ${s.text}`}
      >
        {tier} — {label}
      </span>
      {total !== undefined && total > 0 && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            rated === total
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {rated}/{total}
        </span>
      )}
    </div>
  );
}

// ─── SECTION CARD ────────────────────────────────────────

export function SectionCard({
  title,
  icon,
  children,
  compact = false,
}: {
  title: string;
  icon: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-lg shadow-sm ${
        compact ? "overflow-hidden" : "p-4"
      }`}
    >
      <div
        className={`flex items-center gap-2 ${
          compact
            ? "px-3 py-2 border-b border-slate-100 bg-slate-50"
            : "mb-3"
        }`}
      >
        <span className="text-base">{icon}</span>
        <span className="font-bold text-sm text-slate-900">{title}</span>
      </div>
      {children}
    </div>
  );
}
