import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import type { KeyMoment } from "../../types/match";
import { patchKeyMoments } from "../../api/scoring/matchApi";

const TAGS = [
  "Turning Point",
  "Costly Mistake",
  "Brilliant Play",
  "Match Winning",
  "Other",
];

export interface PlayerOptionItem {
  value: string;
  label: string;
}

interface Props {
  matchPublicId: string;
  initialMoments: KeyMoment[];
  playerOptions: PlayerOptionItem[];
}

function emptyMoment(): KeyMoment {
  return { overNumber: undefined, ballNumber: undefined, description: "", tag: "Other" };
}

function formatBall(m: KeyMoment): string {
  if (m.overNumber != null && m.ballNumber != null) return `${m.overNumber}.${m.ballNumber}`;
  if (m.overNumber != null) return `${m.overNumber}`;
  return "";
}

export default function KeyMomentsEditor({ matchPublicId, initialMoments, playerOptions }: Props) {
  const [rows, setRows] = useState<KeyMoment[]>(
    initialMoments.length > 0 ? initialMoments : [],
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const update = (i: number, patch: Partial<KeyMoment>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const remove = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const handleBallInput = (i: number, raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "") {
      update(i, { overNumber: undefined, ballNumber: undefined });
      return;
    }
    const dot = trimmed.indexOf(".");
    if (dot === -1) {
      const n = parseInt(trimmed, 10);
      update(i, { overNumber: isNaN(n) ? undefined : n, ballNumber: undefined });
    } else {
      const over = parseInt(trimmed.slice(0, dot), 10);
      const ball = parseInt(trimmed.slice(dot + 1), 10);
      update(i, {
        overNumber: isNaN(over) ? undefined : over,
        ballNumber: isNaN(ball) ? undefined : ball,
      });
    }
  };

  const handleSave = async () => {
    const invalid = rows.some((r) => !r.description.trim());
    if (invalid) {
      setError("Each moment must have a description.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await patchKeyMoments(matchPublicId, rows);
      setRows(saved);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Save failed — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="space-y-3 mb-4">
        {rows.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            No key moments yet. Add one below.
          </p>
        )}
        {rows.map((row, i) => (
          <div
            key={i}
            className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={formatBall(row)}
                onChange={(e) => handleBallInput(i, e.target.value)}
                placeholder="38.2"
                className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <select
                value={row.tag}
                onChange={(e) => update(i, { tag: e.target.value })}
                className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TAGS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button
                onClick={() => remove(i)}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Remove"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <input
              type="text"
              value={row.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="Describe what happened…"
              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
            {playerOptions.length > 0 && (
              <select
                value={row.playerPublicId ?? ""}
                onChange={(e) => {
                  const opt = playerOptions.find((p) => p.value === e.target.value);
                  update(i, {
                    playerPublicId: opt?.value || undefined,
                    playerName: opt?.label || undefined,
                  });
                }}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Player involved (optional) —</option>
                {playerOptions.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => setRows((prev) => [...prev, emptyMoment()])}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          Add moment
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold active:scale-95 disabled:opacity-60 transition-all ml-auto"
        >
          <Save size={14} />
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save moments"}
        </button>
      </div>
    </div>
  );
}
