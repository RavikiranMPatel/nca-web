import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import {
  searchAuditLog,
  getAuditFilterOptions,
  type AuditLogEntry,
  type AuditFilterOptions,
} from "../../api/auditApi";

const PAGE_SIZE = 25;

/**
 * Jackson serialises a java.time.LocalDate inside a JSONB column as a bare
 * [year, month, day] array (no field name to say what it is) — readable as JSON,
 * not as a date. Walked recursively because some actions (e.g. markPaid) log a
 * whole entity graph, with dates nested several levels down inside "player" or
 * "feePlan" sub-objects, not just at the top level.
 */
function normaliseDates(value: unknown): unknown {
  if (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((v) => typeof v === "number")
  ) {
    const [y, m, d] = value as number[];
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  if (Array.isArray(value)) return value.map(normaliseDates);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        normaliseDates(v),
      ]),
    );
  }
  return value;
}

/**
 * Some actions log a curated handful of fields (ATTENDANCE_MARKED); others log an
 * entire JPA entity graph as-is (FEE_MARKED_PAID logs the whole FeePayment,
 * player and feePlan included). Phase 1 is a read-only view of what's already
 * there — reshaping what gets written is a service-layer change, out of scope
 * here — so this renders whatever shape arrives, just indented and scrollable
 * instead of squashed onto one line per key.
 */
function DetailsCell({ details }: { details: unknown }) {
  if (details === null || details === undefined) {
    return <span className="text-slate-300">—</span>;
  }
  if (typeof details !== "object") {
    return <span className="text-slate-600">{String(details)}</span>;
  }
  if (Object.keys(details).length === 0) {
    return <span className="text-slate-300">—</span>;
  }
  return (
    <pre className="text-[11px] text-slate-700 bg-slate-50 rounded-lg p-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
      {JSON.stringify(normaliseDates(details), null, 2)}
    </pre>
  );
}

const fmtTimestamp = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function AdminAuditPage() {
  const navigate = useNavigate();

  const [options, setOptions] = useState<AuditFilterOptions | null>(null);
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [action, setAction] = useState("");
  const [actorPublicId, setActorPublicId] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityPublicId, setEntityPublicId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeAttendance, setIncludeAttendance] = useState(false);

  useEffect(() => {
    getAuditFilterOptions()
      .then(setOptions)
      .catch(() => setOptions({ actions: [], entityTypes: [], actors: [] }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await searchAuditLog({
        action: action || undefined,
        actorPublicId: actorPublicId || undefined,
        entityType: entityType || undefined,
        entityPublicId: entityPublicId.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
        includeAttendance,
        page,
        size: PAGE_SIZE,
      });
      setRows(result.content);
      setTotalElements(result.totalElements);
      setTotalPages(result.totalPages);
    } catch {
      setError("Failed to load audit log");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [action, actorPublicId, entityType, entityPublicId, from, to, includeAttendance, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Any filter change resets to page 0 — otherwise you can land on a page number
  // that no longer exists under the new filter and see a blank table.
  const updateFilter = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(0);
  };

  const resetFilters = () => {
    setAction("");
    setActorPublicId("");
    setEntityType("");
    setEntityPublicId("");
    setFrom("");
    setTo("");
    setIncludeAttendance(false);
    setPage(0);
  };

  // Action options filtered by the attendance toggle, so the dropdown never offers
  // a choice the current includeAttendance setting would silently return zero rows
  // for — see AuditLogRepository.search()'s ESCAPE clause for the backend half of this.
  const actionOptions = (options?.actions ?? []).filter(
    (a) => includeAttendance || !a.startsWith("ATTENDANCE_"),
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Audit Log</h1>
            <p className="text-xs text-slate-400">
              {loading ? "Loading…" : `${totalElements} record${totalElements === 1 ? "" : "s"}`}
              {!includeAttendance && " — attendance hidden"}
            </p>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="min-w-0">
              <label className="text-xs font-medium text-slate-500 block mb-1">Action</label>
              <select
                value={action}
                onChange={(e) => updateFilter(setAction)(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                {actionOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="text-xs font-medium text-slate-500 block mb-1">Actor</label>
              <select
                value={actorPublicId}
                onChange={(e) => updateFilter(setActorPublicId)(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                {(options?.actors ?? []).map((a) => (
                  <option key={a.actorPublicId} value={a.actorPublicId}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="text-xs font-medium text-slate-500 block mb-1">Entity type</label>
              <select
                value={entityType}
                onChange={(e) => updateFilter(setEntityType)(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                {(options?.entityTypes ?? []).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="text-xs font-medium text-slate-500 block mb-1">
                Entity ID
              </label>
              <input
                type="text"
                value={entityPublicId}
                onChange={(e) => updateFilter(setEntityPublicId)(e.target.value)}
                placeholder="e.g. FPM_34"
                className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="min-w-0">
              <label className="text-xs font-medium text-slate-500 block mb-1">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => updateFilter(setFrom)(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="min-w-0">
              <label className="text-xs font-medium text-slate-500 block mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => updateFilter(setTo)(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={includeAttendance}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIncludeAttendance(checked);
                  // Dropping an attendance action when the toggle turns off, so the
                  // filter never points at a now-hidden action and silently empties.
                  if (!checked && action.startsWith("ATTENDANCE_")) setAction("");
                  setPage(0);
                }}
              />
              Include attendance (hidden by default — it's most of this table)
            </label>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition"
            >
              <RotateCcw size={12} /> Reset filters
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {error ? (
            <div className="text-center py-12 text-sm text-red-500">{error}</div>
          ) : loading ? (
            <div className="text-center py-12 text-sm text-slate-400">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400">
              No matching audit records.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase tracking-wide border-b bg-slate-50 text-left">
                    <th className="px-4 py-2.5 whitespace-nowrap">When</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">Actor</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">Action</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">Entity</th>
                    <th className="px-4 py-2.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.id} className="align-top hover:bg-slate-50/60">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {fmtTimestamp(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-slate-700">{r.createdBy ?? "—"}</div>
                        <div className="text-[10px] text-slate-400">{r.actorRole}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                          {r.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-slate-700">{r.entityType}</div>
                        <div className="text-[10px] text-slate-400">
                          {r.entityPublicId ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-[240px]">
                        <DetailsCell details={r.details} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ── */}
          {!loading && !error && rows.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page + 1 >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
