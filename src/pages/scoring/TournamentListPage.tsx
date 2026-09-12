import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  exportTournamentListPdf,
  getTournamentFilterOptions,
  listTournaments,
  updateTournamentStatus,
  type Paged,
  type TournamentFilterOptions,
  type TournamentListQuery,
  type TournamentSortKey,
  type TournamentSummary,
} from "../../api/scoring/tournamentApi";
import api from "../../api/axios";

/**
 * The tournament list — searched, filtered, sorted and paged by the SERVER
 * (Phase 3).
 *
 * <p>Three things about this page are deliberate:
 *
 * <ul>
 *   <li><b>The URL is the state.</b> Every control writes to the query string
 *       and the query string is what drives the fetch, so a filtered view is a
 *       link. PlayersListPage reads `?status=` once into initial state and never
 *       writes back, which means its filtered views cannot be shared — that is
 *       the half-measure this avoids.</li>
 *   <li><b>Nothing is filtered in the browser.</b> The page holds one page of
 *       rows, so filtering or sorting here would filter a set the server already
 *       truncated. Every control is a round trip.</li>
 *   <li><b>The status vocabulary is the server's.</b> The chips used to offer
 *       "ACTIVE", which has not been a status since V99 normalised the enum —
 *       so the ACTIVE chip could never match a row, and "Re-enable" PATCHed
 *       `status: "ACTIVE"` and got a 400. The filter values now come from
 *       /filter-options, which reads the enum.</li>
 * </ul>
 */

const statusBadge: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  UPCOMING:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  LIVE: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  COMPLETED:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  SUSPENDED:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

const formatLabel: Record<string, string> = {
  ROUND_ROBIN: "Round Robin",
  DOUBLE_ROUND_ROBIN: "Double Round Robin",
  KNOCKOUT: "Knockout",
  GROUP_KNOCKOUT: "Group + Knockout",
  LEAGUE_PLAYOFFS: "League + Playoffs",
};

const typeLabel: Record<string, string> = {
  INTERNAL: "Internal",
  INTER_ACADEMY: "Inter-academy",
  AGE_GROUP: "Age group",
  OPEN: "Open",
  INVITATIONAL: "Invitational",
  EXTERNAL: "External",
  FRIENDLY: "Friendly",
};

const SORT_LABELS: { key: TournamentSortKey; label: string }[] = [
  { key: "startDate", label: "Start date" },
  { key: "name", label: "Name" },
  { key: "year", label: "Year" },
  { key: "endDate", label: "End date" },
  { key: "status", label: "Status" },
  { key: "teams", label: "Teams" },
  { key: "matches", label: "Matches" },
];

/** Ascending by default for the two text columns, matching the server. */
const ASC_BY_DEFAULT: TournamentSortKey[] = ["name", "status"];

const DEFAULT_PAGE_SIZE = 20;

/**
 * Page size, from the URL, clamped.
 *
 * <p>In the URL because the whole state is, and a shared link should reproduce
 * what the sender was looking at. Clamped because it arrives from a link: 100 is
 * what PageableConfig caps the server at anyway, and a link asking for 10,000
 * would be one request pulling the entire table.
 */
function sizeFrom(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(n), 100);
}

/**
 * Only these keys ever go in the URL, and they are the same names the API takes.
 * Keeping them identical is what makes the URL a description of the request
 * rather than a second vocabulary to translate.
 */
const URL_KEYS = [
  "search",
  "year",
  "status",
  "format",
  "type",
  "team",
  "venue",
  "fromDate",
  "toDate",
  "sort",
  "direction",
  "page",
  "size",
] as const;

type UrlKey = (typeof URL_KEYS)[number];

const SELECT_CLASS =
  "w-full px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 " +
  "text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function TournamentListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState<Paged<TournamentSummary> | null>(null);
  const [options, setOptions] = useState<TournamentFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] =
    useState<TournamentSummary | null>(null);
  const [posting, setPosting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // The search box is typed into, so it is local state debounced into the URL —
  // otherwise every keystroke would be a history entry and a request.
  const [searchDraft, setSearchDraft] = useState(
    () => searchParams.get("search") ?? "",
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  /** The request, read straight off the URL. */
  const query = useMemo<TournamentListQuery>(() => {
    const get = (k: UrlKey) => searchParams.get(k) ?? undefined;
    const sort = get("sort") as TournamentSortKey | undefined;
    const direction = get("direction");
    return {
      search: get("search"),
      year: get("year"),
      status: get("status"),
      format: get("format"),
      type: get("type"),
      team: get("team"),
      venue: get("venue"),
      fromDate: get("fromDate"),
      toDate: get("toDate"),
      sort: sort ?? "startDate",
      direction:
        direction === "asc" || direction === "desc"
          ? direction
          : ASC_BY_DEFAULT.includes(sort ?? "startDate")
            ? "asc"
            : "desc",
      page: Number(get("page") ?? 1),
      size: sizeFrom(searchParams.get("size")),
    };
  }, [searchParams]);

  const activeFilterCount = useMemo(
    () =>
      (["year", "status", "format", "type", "team", "venue", "fromDate", "toDate"] as UrlKey[])
        .filter((k) => (searchParams.get(k) ?? "") !== "").length,
    [searchParams],
  );
  const hasAnyFilter = activeFilterCount > 0 || Boolean(query.search);

  /**
   * Write one or more keys into the URL, dropping blanks.
   *
   * Any change other than paging resets to page 1: staying on page 4 while the
   * filter narrows the result to one page shows an empty list and reads as "no
   * tournaments match", which is a different statement from the truth.
   */
  const patchUrl = useCallback(
    (patch: Partial<Record<UrlKey, string | undefined>>) => {
      const next = new URLSearchParams(searchParams);
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (!("page" in patch)) next.delete("page");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const clearAll = () => {
    setSearchDraft("");
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  // Debounce the search box into the URL.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      if ((searchParams.get("search") ?? "") !== searchDraft) {
        patchUrl({ search: searchDraft || undefined });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchDraft, patchUrl, searchParams]);

  // Keep the box in step when the URL changes from elsewhere — Clear all, or
  // the browser Back button.
  useEffect(() => {
    const fromUrl = searchParams.get("search") ?? "";
    setSearchDraft((current) => (current === fromUrl ? current : fromUrl));
  }, [searchParams]);

  /**
   * Fetch the page the URL describes.
   *
   * Ticketed, like KitListPage after BUG-28: this is called from typing, from
   * every filter, and from a status change, so a slow earlier response can land
   * after a later one and repaint the table with the wrong page. Only the newest
   * request may write.
   */
  const ticket = useRef(0);
  const reload = useCallback(() => {
    const mine = ++ticket.current;
    setLoading(true);
    setError("");
    listTournaments(query)
      .then((p) => {
        if (mine !== ticket.current) return;
        setPage(p);
      })
      .catch((e) => {
        if (mine !== ticket.current) return;
        setPage(null);
        setError(
          e.response?.data?.message ?? "Failed to load tournaments",
        );
      })
      .finally(() => {
        if (mine === ticket.current) setLoading(false);
      });
  }, [query]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    getTournamentFilterOptions().then(setOptions).catch(() => {});
  }, []);

  const handleStatusChange = async (t: TournamentSummary, status: string) => {
    setMenuOpen(null);
    try {
      await updateTournamentStatus(t.publicId, status);
      showToast(
        `✓ Tournament ${status === "CANCELLED" ? "cancelled" : "updated"}`,
      );
      reload();
      getTournamentFilterOptions().then(setOptions).catch(() => {});
    } catch (e: any) {
      showToast(e.response?.data?.message ?? "Failed to update status");
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

  /**
   * Export the filtered list.
   *
   * Sends the filters, not the rows on screen, so the PDF covers every matching
   * tournament rather than the twenty currently displayed — and the server
   * prints the filter set it applied, so the document states what it is.
   */
  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportTournamentListPdf(query);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tournaments${hasAnyFilter ? "-filtered" : ""}-${
        new Date().toISOString().slice(0, 10)
      }.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast("✓ PDF downloaded");
    } catch {
      showToast("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

  const rows = page?.content ?? [];
  const total = page?.totalElements ?? 0;
  const totalPages = page?.totalPages ?? 0;
  const currentPage = (page?.number ?? 0) + 1; // the response is 0-indexed

  const toggleDirection = () =>
    patchUrl({ direction: query.direction === "asc" ? "desc" : "asc" });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">
              Tournaments
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                disabled={exporting || loading}
                data-testid="tournament-export-pdf"
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-xl disabled:opacity-40 active:scale-95 transition-all"
              >
                {exporting ? "Exporting…" : "PDF"}
              </button>
              <button
                onClick={() => navigate("/admin/cricket/tournaments/new")}
                data-testid="tournament-new"
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
                New
              </button>
            </div>
          </div>

          {/* ── Search ── */}
          <div className="relative mb-2">
            <input
              type="search"
              data-testid="tournament-search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search name, short name or year…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="w-4 h-4 absolute left-3 top-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
              />
            </svg>
          </div>

          {/* ── Sort + filter toggle ── */}
          <div className="flex items-center gap-2">
            <select
              data-testid="tournament-sort"
              className={`${SELECT_CLASS} flex-1`}
              value={query.sort}
              onChange={(e) =>
                patchUrl({
                  sort: e.target.value,
                  // The direction resets to the column's own default, so
                  // switching from "Name A–Z" to "Start date" gives newest
                  // first rather than the academy's oldest tournament.
                  direction: undefined,
                })
              }
            >
              {SORT_LABELS.map((s) => (
                <option key={s.key} value={s.key}>
                  Sort: {s.label}
                </option>
              ))}
            </select>
            <button
              onClick={toggleDirection}
              data-testid="tournament-sort-direction"
              aria-label={
                query.direction === "asc" ? "Sort ascending" : "Sort descending"
              }
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 active:scale-95"
            >
              {query.direction === "asc" ? "↑ Asc" : "↓ Desc"}
            </button>
            <button
              onClick={() => setShowFilters((v) => !v)}
              data-testid="tournament-filters-toggle"
              className={`px-3 py-2 rounded-lg text-xs font-semibold border active:scale-95 ${
                activeFilterCount > 0
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"
              }`}
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          </div>

          {/* ── Filters. Two columns on a phone, four from sm up. ── */}
          {showFilters && (
            <div
              data-testid="tournament-filters"
              className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2"
            >
              <Filter
                testId="tournament-filter-year"
                label="Year"
                value={searchParams.get("year") ?? ""}
                onChange={(v) => patchUrl({ year: v })}
                options={(options?.years ?? []).map((y) => ({
                  value: String(y),
                  label: String(y),
                }))}
              />
              <Filter
                testId="tournament-filter-status"
                label="Status"
                value={searchParams.get("status") ?? ""}
                onChange={(v) => patchUrl({ status: v })}
                options={(options?.statuses ?? []).map((s) => ({
                  value: s,
                  label: s.charAt(0) + s.slice(1).toLowerCase(),
                }))}
              />
              <Filter
                testId="tournament-filter-format"
                label="Format"
                value={searchParams.get("format") ?? ""}
                onChange={(v) => patchUrl({ format: v })}
                options={(options?.formats ?? []).map((f) => ({
                  value: f,
                  label: formatLabel[f] ?? f,
                }))}
              />
              <Filter
                testId="tournament-filter-type"
                label="Type"
                value={searchParams.get("type") ?? ""}
                onChange={(v) => patchUrl({ type: v })}
                options={(options?.types ?? []).map((t) => ({
                  value: t,
                  label: typeLabel[t] ?? t,
                }))}
              />
              <Filter
                testId="tournament-filter-team"
                label="Team"
                value={searchParams.get("team") ?? ""}
                onChange={(v) => patchUrl({ team: v })}
                options={(options?.teams ?? []).map((t) => ({
                  value: t,
                  label: t,
                }))}
              />
              <Filter
                testId="tournament-filter-venue"
                label="Ground"
                value={searchParams.get("venue") ?? ""}
                onChange={(v) => patchUrl({ venue: v })}
                options={(options?.venues ?? []).map((v) => ({
                  value: v,
                  label: v,
                }))}
              />
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  From
                </label>
                <input
                  type="date"
                  data-testid="tournament-filter-from"
                  className={SELECT_CLASS}
                  value={searchParams.get("fromDate") ?? ""}
                  onChange={(e) => patchUrl({ fromDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  To
                </label>
                <input
                  type="date"
                  data-testid="tournament-filter-to"
                  className={SELECT_CLASS}
                  value={searchParams.get("toDate") ?? ""}
                  onChange={(e) => patchUrl({ toDate: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* The count, always with its denominator — "12 tournaments" says
              nothing about whether that is all of them. */}
          <div className="flex items-center justify-between gap-2 mt-2">
            <p
              className="text-xs text-gray-500 dark:text-gray-400"
              data-testid="tournament-count"
            >
              {loading
                ? "Loading…"
                : `${total} tournament${total === 1 ? "" : "s"}${
                    hasAnyFilter ? " match these filters" : ""
                  }`}
            </p>
            {hasAnyFilter && (
              <button
                onClick={clearAll}
                data-testid="tournament-filters-clear"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Rows ── */}
      <div className="px-4 pt-4 space-y-3 max-w-4xl mx-auto">
        {error && (
          <div
            data-testid="tournament-list-error"
            className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 && !error ? (
          <div className="text-center py-16" data-testid="tournament-empty">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              {hasAnyFilter
                ? "No tournaments match these filters"
                : "No tournaments yet"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {hasAnyFilter
                ? "Try widening the search or clearing a filter"
                : "Create your first tournament to get started"}
            </p>
            <button
              onClick={
                hasAnyFilter
                  ? clearAll
                  : () => navigate("/admin/cricket/tournaments/new")
              }
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl active:scale-95"
            >
              {hasAnyFilter ? "Clear filters" : "New Tournament"}
            </button>
          </div>
        ) : (
          rows.map((t) => (
            <div
              key={t.publicId}
              data-testid="tournament-row"
              data-tournament-name={t.name}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex-1 min-w-0 cursor-pointer active:scale-[0.98] transition-all"
                  onClick={() =>
                    navigate(`/admin/cricket/tournaments/${t.publicId}`)
                  }
                >
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[t.status] ?? statusBadge.DRAFT}`}
                    >
                      {t.status}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatLabel[t.format] ?? t.format}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {typeLabel[t.tournamentType] ?? t.tournamentType}
                    </span>
                    {t.seasonLabel && (
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        {t.seasonLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    {t.logoUrl && (
                      <img
                        src={t.logoUrl}
                        alt=""
                        className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {t.name}
                      {t.shortName && (
                        <span className="ml-1.5 text-xs font-normal text-gray-400">
                          {t.shortName}
                        </span>
                      )}
                    </h3>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t.startDate ?? "No start date"}
                    {t.endDate ? ` → ${t.endDate}` : ""}
                    {t.defaultOvers ? ` · ${t.defaultOvers} overs` : ""}
                  </p>

                  {/* Teams and matches are shown because the list sorts on
                      them: a sort on a number the screen does not display is a
                      control with no visible effect. */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <span data-testid="tournament-team-count">
                      {t.teamCount} team{t.teamCount === 1 ? "" : "s"}
                    </span>
                    {" · "}
                    <span data-testid="tournament-match-count">
                      {t.matchCount} match{t.matchCount === 1 ? "" : "es"}
                    </span>
                  </p>

                  {t.venue && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      📍 {t.venue}
                    </p>
                  )}
                  {t.organizer && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      🏛 {t.organizer}
                    </p>
                  )}
                  {t.championTeamName && (
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-0.5">
                      🏆 {t.championTeamName}
                    </p>
                  )}
                </div>

                {/* ── 3-dot menu ── */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === t.publicId ? null : t.publicId);
                    }}
                    aria-label="Tournament actions"
                    data-testid="tournament-row-menu"
                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 active:scale-90 transition-all"
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
                    <div className="absolute right-0 top-10 z-30 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden">
                      <MenuItem
                        onClick={() => {
                          navigate(`/admin/cricket/tournaments/${t.publicId}`);
                          setMenuOpen(null);
                        }}
                      >
                        View details
                      </MenuItem>
                      <MenuItem
                        testId="tournament-row-edit"
                        onClick={() => {
                          navigate(
                            `/admin/cricket/tournaments/${t.publicId}/edit`,
                          );
                          setMenuOpen(null);
                        }}
                      >
                        Edit tournament
                      </MenuItem>

                      {/* DRAFT → UPCOMING is the publish step; LIVE and
                          COMPLETED are reached from fixture results and are
                          refused here by TournamentStatus. */}
                      {t.status === "DRAFT" && (
                        <MenuItem
                          tone="text-indigo-600 dark:text-indigo-400"
                          onClick={() => handleStatusChange(t, "UPCOMING")}
                        >
                          Publish (Upcoming)
                        </MenuItem>
                      )}
                      {t.status === "SUSPENDED" && (
                        <MenuItem
                          tone="text-green-600 dark:text-green-400"
                          onClick={() => handleStatusChange(t, "LIVE")}
                        >
                          Resume (Live)
                        </MenuItem>
                      )}
                      {t.status === "LIVE" && (
                        <MenuItem
                          tone="text-amber-600 dark:text-amber-400"
                          onClick={() => handleStatusChange(t, "SUSPENDED")}
                        >
                          Suspend
                        </MenuItem>
                      )}
                      {t.status !== "CANCELLED" && t.status !== "COMPLETED" && (
                        <MenuItem
                          tone="text-orange-600 dark:text-orange-400"
                          onClick={() => handleStatusChange(t, "CANCELLED")}
                        >
                          Cancel tournament
                        </MenuItem>
                      )}
                      <MenuItem
                        tone="text-red-600 dark:text-red-400"
                        onClick={() => {
                          setMenuOpen(null);
                          setConfirmDelete(t);
                        }}
                      >
                        Delete tournament
                      </MenuItem>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div
            className="flex items-center justify-between gap-3 pt-2"
            data-testid="tournament-pagination"
          >
            <button
              onClick={() => patchUrl({ page: String(currentPage - 1) })}
              disabled={page?.first}
              data-testid="tournament-page-prev"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 disabled:opacity-40 active:scale-95"
            >
              ← Previous
            </button>
            <span
              className="text-xs text-gray-500 dark:text-gray-400"
              data-testid="tournament-page-label"
            >
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => patchUrl({ page: String(currentPage + 1) })}
              disabled={page?.last}
              data-testid="tournament-page-next"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 disabled:opacity-40 active:scale-95"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── CONFIRM DELETE ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="text-2xl mb-3 text-center">⚠️</div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 text-center">
              Delete Tournament?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 text-center">
              <b>{confirmDelete.name}</b>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 text-center">
              This will permanently delete the tournament, all fixtures, teams
              and squad data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200"
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

      {menuOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(null)} />
      )}

      {toast && (
        <div
          data-testid="tournament-toast"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 border border-green-600 text-green-400 text-sm font-semibold px-6 py-2.5 rounded-full shadow-xl pointer-events-none"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/**
 * A labelled select with a solid background in both themes.
 *
 * Solid, not border-only: a border-only control is the recurring contrast bug in
 * this codebase (engineering-standards.md, and the Button secondary-variant
 * incident across 17 call sites).
 */
function Filter({
  testId,
  label,
  value,
  onChange,
  options,
}: {
  testId: string;
  label: string;
  value: string;
  onChange: (v: string | undefined) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </label>
      <select
        data-testid={testId}
        className={SELECT_CLASS}
        value={value}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  tone,
  testId,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: string;
  testId?: string;
}) {
  return (
    <button
      data-testid={testId}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-full px-4 py-3 text-xs font-medium text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
        tone ?? "text-gray-700 dark:text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
