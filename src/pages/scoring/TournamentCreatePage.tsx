import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTournament } from "../../api/scoring/tournamentApi";

const FORMATS = [
  {
    value: "ROUND_ROBIN",
    label: "Round Robin",
    desc: "Every team plays every other team",
  },
  { value: "KNOCKOUT", label: "Knockout", desc: "Single elimination bracket" },
  {
    value: "GROUP_KNOCKOUT",
    label: "Group + Knockout",
    desc: "Group stage then knockout",
  },
  {
    value: "LEAGUE_PLAYOFFS",
    label: "League + Playoffs",
    desc: "Full league stage, then top teams advance to playoffs (IPL format)",
  },
];

export default function TournamentCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    format: "ROUND_ROBIN",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    venue: "",
    description: "",
    defaultOvers: 20,
    winPoints: 2,
    tiePoints: 1,
    noResultPoints: 1,
  });

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError("Tournament name is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const t = await createTournament(form);
      navigate(`/admin/cricket/tournaments/${t.publicId}`);
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to create tournament");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 text-gray-500">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            New Tournament
          </h1>
        </div>
      </div>

      <div className="px-4 pt-5 max-w-2xl mx-auto space-y-5">
        {error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Tournament Name *
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. NCA Summer Cup 2026"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        {/* Format */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Format
          </label>
          <div className="space-y-2">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                onClick={() => set("format", f.value)}
                className={`w-full p-3 rounded-xl border text-left transition-all active:scale-95 ${
                  form.format === f.value
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {f.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Start Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              End Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
            />
          </div>
        </div>

        {/* Venue */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Venue
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. NCA Ground A"
            value={form.venue}
            onChange={(e) => set("venue", e.target.value)}
          />
        </div>

        {/* Overs */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Default Overs per Match
          </label>
          <select
            className="w-full px-3 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.defaultOvers}
            onChange={(e) => set("defaultOvers", Number(e.target.value))}
          >
            {[5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50].map((o) => (
              <option key={o} value={o}>
                {o} overs
              </option>
            ))}
          </select>
        </div>

        {/* Points */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Points System
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Win", key: "winPoints" },
              { label: "Tie/NR", key: "tiePoints" },
              { label: "Loss", key: "lossPoints" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">
                  {label}
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={(form as any)[key] ?? 0}
                  onChange={(e) => set(key, Number(e.target.value))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Description (optional)
          </label>
          <textarea
            rows={3}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Tournament rules, prizes, notes..."
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
      </div>

      {/* Bottom action */}
      <div className="fixed bottom-16 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-3 z-[60] sm:bottom-0">
        <button
          disabled={loading}
          onClick={handleCreate}
          className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {loading && (
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          🏆 Create Tournament
        </button>
      </div>
    </div>
  );
}
