import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  listTournaments,
  updateTournamentStatus,
} from "../../api/scoring/tournamentApi";
import api from "../../api/axios";

const statusBadge: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  ACTIVE:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED: "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  CANCELLED: "bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400",
};

// The four formats generateFixtures actually accepts. DOUBLE_ELIMINATION and
// CUSTOM used to be here and are rejected by the backend with "Unsupported
// format"; LEAGUE_PLAYOFFS was missing, so an IPL-format tournament rendered a
// blank label.
const formatLabel: Record<string, string> = {
  ROUND_ROBIN: "Round Robin",
  KNOCKOUT: "Knockout",
  GROUP_KNOCKOUT: "Group + Knockout",
  LEAGUE_PLAYOFFS: "League + Playoffs",
};

// Rule 6: the year comes from the ISO string's own parts. new Date(iso)
// .getFullYear() parses as UTC midnight, so a 1 January tournament reads as
// 31 December of the previous year in IST.
const yearOf = (iso?: string | null) =>
  iso && iso.length >= 4 ? iso.slice(0, 4) : "";

type SortKey =
  "name" | "year" | "startDate" | "endDate" | "status" | "teams" | "matches";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "startDate", label: "Start date" },
  { key: "endDate", label: "End date" },
  { key: "name", label: "Name" },
  { key: "year", label: "Year" },
  { key: "status", label: "Status" },
  { key: "teams", label: "Teams" },
  { key: "matches", label: "Matches" },
];

export default function TournamentListPage() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fYear, setFYear] = useState("all");
  const [fFormat, setFFormat] = useState("all");
  const [fVenue, setFVenue] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("startDate");
  const [sortAsc, setSortAsc] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [posting, setPosting] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const reload = () =>
    listTournaments()
      .then(setTournaments)
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);

  const handleStatusChange = async (t: any, status: string) => {
    setMenuOpen(null);
    try {
      await updateTournamentStatus(t.publicId, status);
      showToast(
        `✓ Tournament ${status === "CANCELLED" ? "disabled" : "updated"}`,
      );
      reload();
    } catch {
      showToast("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setPosting(true);
    try {
      await api.delete(`/admin/cricket/tournaments/${confirmDelete.publicId}`);
      setConfirmDelete(null);
      showToast("✓ Tournament deleted");
      reload();
    } catch (e: any) {
      showToast(e.response?.data?.message ?? "Failed to delete tournament");
    } finally {
      setPosting(false);
    }
  };

  // Options come from the data itself, so a filter can never offer a value that
  // matches nothing. Everything below is client-side: an academy runs a handful
  // of tournaments a year, and server-side filtering would be machinery that
  // never earns itself.
  const years = Array.from(
    new Set(tournaments.map((t) => yearOf(t.startDate)).filter(Boolean)),
  ).sort((a, b) => b.localeCompare(a));
  const formats = Array.from(
    new Set(tournaments.map((t) => t.format).filter(Boolean)),
  ).sort();
  const statuses = Array.from(
    new Set(tournaments.map((t) => t.status).filter(Boolean)),
  ).sort();
  const venues = Array.from(
    new Set(tournaments.map((t) => t.venue).filter(Boolean)),
  ).sort();

  const activeFilterCount =
    (fStatus !== "all" ? 1 : 0) +
    (fYear !== "all" ? 1 : 0) +
    (fFormat !== "all" ? 1 : 0) +
    (fVenue !== "all" ? 1 : 0);

  const filtered = tournaments
    .filter((t) => {
      // Search covers name and year. Short name and tournament type are NOT
      // searchable because neither column exists — they belong with the other
      // Phase 2 fields that were specified and never added.
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (t.name ?? "").toLowerCase().includes(q) ||
        yearOf(t.startDate).includes(q);
      return (
        matchesSearch &&
        (fStatus === "all" || t.status === fStatus) &&
        (fYear === "all" || yearOf(t.startDate) === fYear) &&
        (fFormat === "all" || t.format === fFormat) &&
        (fVenue === "all" || t.venue === fVenue)
      );
    })
    .sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      const cmp = (() => {
        switch (sortKey) {
          case "name":
            return (a.name ?? "").localeCompare(b.name ?? "");
          case "year":
            return yearOf(a.startDate).localeCompare(yearOf(b.startDate));
          case "endDate":
            // ISO strings compare correctly as strings; parsing them to Date
            // would reintroduce the UTC-midnight problem Rule 6 warns about.
            return (a.endDate ?? "").localeCompare(b.endDate ?? "");
          case "status":
            return (a.status ?? "").localeCompare(b.status ?? "");
          case "teams":
            return (a.teamCount ?? 0) - (b.teamCount ?? 0);
          case "matches":
            return (a.matchCount ?? 0) - (b.matchCount ?? 0);
          default:
            return (a.startDate ?? "").localeCompare(b.startDate ?? "");
        }
      })();
      // Name is the stable fallback so equal keys do not reorder per render.
      return cmp !== 0 ? cmp * dir : (a.name ?? "").localeCompare(b.name ?? "");
    });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            Tournaments
          </h1>
          <button
            onClick={() => navigate("/admin/cricket/tournaments/new")}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl active:scale-95 transition-all"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Tournament
          </button>
        </div>
        {/* Search + the one filter that is used constantly. Year, format, venue
            and sort live in a sheet: eight controls inline would push the list
            itself below the fold at 380px. */}
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or year..."
            className="flex-1 min-w-0 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs text-gray-900 dark:text-gray-100 outline-none"
          />
          <button
            onClick={() => setShowFilters(true)}
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold active:scale-95 ${
              activeFilterCount > 0
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
            }`}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>

        {/* Same pattern as the 9-tab bar: scrolls horizontally inside its own
            container rather than wrapping or being clipped. */}
        <div className="flex gap-2 -mx-4 px-4 overflow-x-auto">
          {["all", ...statuses].map((f) => (
            <button
              key={f}
              onClick={() => setFStatus(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                fStatus === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              }`}
            >
              {f === "all"
                ? "All"
                : f === "ACTIVE"
                  ? "🏏 Active"
                  : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              No tournaments found
            </p>
            <p className="text-xs text-gray-400">
              Create your first tournament to get started
            </p>
            <button
              onClick={() => navigate("/admin/cricket/tournaments/new")}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl active:scale-95"
            >
              New Tournament
            </button>
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.publicId}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex-1 min-w-0 cursor-pointer active:scale-[0.98] transition-all"
                  onClick={() =>
                    navigate(`/admin/cricket/tournaments/${t.publicId}`)
                  }
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[t.status] ?? statusBadge.DRAFT}`}
                    >
                      {t.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatLabel[t.format] ?? t.format}
                    </span>
                  </div>
                  {/* Wraps rather than truncating: the name is what search
                      matches on, and "Jayalakshmipuram Invitational Trophy
                      2025" was being cut at 238px of the 294px it needs. The
                      card is already several lines tall, so wrapping is free. */}
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight break-words">
                    {t.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.startDate} {t.endDate ? `→ ${t.endDate}` : ""} ·{" "}
                    {t.defaultOvers} overs
                  </p>
                  {t.venue && (
                    <p className="text-xs text-gray-400">📍 {t.venue}</p>
                  )}
                  {/* Shown because they are sortable — a sort key the card
                      never displays is a sort nobody can verify. */}
                  <p className="text-xs text-gray-400">
                    {t.teamCount ?? 0} {t.teamCount === 1 ? "team" : "teams"} ·{" "}
                    {t.matchCount ?? 0}{" "}
                    {t.matchCount === 1 ? "match" : "matches"}
                  </p>
                </div>

                {/* ── 3-dot menu ── */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === t.publicId ? null : t.publicId);
                    }}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-90 transition-all"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="5" cy="12" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="19" cy="12" r="2" />
                    </svg>
                  </button>

                  {menuOpen === t.publicId && (
                    <div className="absolute right-0 top-10 z-20 w-44 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/cricket/tournaments/${t.publicId}`);
                          setMenuOpen(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        View Details
                      </button>

                      {t.status !== "CANCELLED" && t.status !== "COMPLETED" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(t, "CANCELLED");
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-left border-t border-gray-100 dark:border-gray-700"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                            />
                          </svg>
                          Disable Tournament
                        </button>
                      )}

                      {t.status === "CANCELLED" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(t, "ACTIVE");
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 text-left border-t border-gray-100 dark:border-gray-700"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Re-enable
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(null);
                          setConfirmDelete(t);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left border-t border-gray-100 dark:border-gray-700"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Delete Tournament
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── CONFIRM DELETE MODAL ── */}
      {/* ── FILTERS & SORT SHEET ── */}
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl max-h-[85dvh] overflow-y-auto p-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white text-center mb-4">
              Filters &amp; Sort
            </h3>

            {(
              [
                { label: "Year", value: fYear, set: setFYear, opts: years },
                {
                  label: "Format",
                  value: fFormat,
                  set: setFFormat,
                  opts: formats,
                  labelFor: (v: string) => formatLabel[v] ?? v,
                },
                { label: "Venue", value: fVenue, set: setFVenue, opts: venues },
              ] as const
            ).map((g: any) => (
              <div key={g.label} className="mb-4">
                <label className="text-xs text-gray-400 mb-1.5 block">
                  {g.label}
                </label>
                <div className="flex flex-wrap gap-2">
                  {["all", ...g.opts].map((o: string) => (
                    <button
                      key={o}
                      onClick={() => g.set(o)}
                      className={`px-3 h-10 rounded-xl text-xs font-semibold border transition-all active:scale-95 break-words ${
                        g.value === o
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {o === "all" ? "Any" : g.labelFor ? g.labelFor(o) : o}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <label className="text-xs text-gray-400 mb-1.5 block">
              Sort by
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {SORTS.map((srt) => (
                <button
                  key={srt.key}
                  onClick={() => setSortKey(srt.key)}
                  className={`h-11 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                    sortKey === srt.key
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {srt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {([false, true] as const).map((asc) => (
                <button
                  key={String(asc)}
                  onClick={() => setSortAsc(asc)}
                  className={`h-11 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                    sortAsc === asc
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {asc ? "↑ Ascending" : "↓ Descending"}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFilters(false)}
              className="mt-4 w-full h-14 bg-blue-600 text-white rounded-xl font-bold text-sm active:scale-95"
            >
              Show {filtered.length}{" "}
              {filtered.length === 1 ? "tournament" : "tournaments"}
            </button>
            <button
              onClick={() => {
                setFYear("all");
                setFFormat("all");
                setFVenue("all");
                setFStatus("all");
                setSearch("");
              }}
              className="w-full py-3 text-gray-400 text-sm"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl max-h-[85dvh] overflow-y-auto">
            <div className="text-2xl mb-3 text-center">⚠️</div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 text-center">
              Delete Tournament?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 text-center">
              <b>{confirmDelete.name}</b>
            </p>
            <p className="text-xs text-gray-400 mb-5 text-center">
              This will permanently delete the tournament, all fixtures, teams
              and squad data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={posting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-95"
              >
                {posting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close menu on outside click */}
      {menuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 border border-green-600 text-green-400 text-sm font-semibold px-6 py-2.5 rounded-full shadow-xl pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
