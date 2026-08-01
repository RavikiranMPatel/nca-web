import { useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import { Shield, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

type JsonNode = Record<string, unknown> | null;

type AuditLogEntry = {
  publicId: string;
  action: string;
  entityType: string;
  entityPublicId: string | null;
  actorPublicId: string;
  actorRole: string | null;
  academyId: string;
  branchId: string | null;
  details: JsonNode | null;
  createdAt: string;
};

type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

const PAGE_SIZE = 25;

const ACTION_LABELS: Record<string, string> = {
  PLAYER_CREATED: "Player created",
  PLAYER_UPDATED: "Player updated",
  PLAYER_ACTIVATED: "Player activated",
  PLAYER_DEACTIVATED: "Player deactivated",
  USER_CREATED: "User created",
  USER_ENABLED: "User enabled",
  USER_DISABLED: "User disabled",
  USER_ROLE_CHANGED: "User role changed",
  USER_UPDATED: "User updated",
  USER_DELETED: "User deleted",
  SETTINGS_UPDATED: "Setting updated",
  SETTINGS_BATCH_UPDATED: "Settings batch updated",
  HONOR_CREATED: "Representative honor created",
  HONOR_UPDATED: "Representative honor updated",
  HONOR_DELETED: "Representative honor deleted",
  INVENTORY_ITEM_CREATED: "Inventory item created",
  INVENTORY_ITEM_UPDATED: "Inventory item updated",
  INVENTORY_ITEM_DELETED: "Inventory item deleted",
  INVENTORY_CHECKOUT: "Inventory checked out",
  INVENTORY_RETURN: "Inventory returned",
  BULK_IMPORT: "Bulk player import",
  KIT_DETAILS_CREATED: "Kit details created",
  KIT_DETAILS_UPDATED: "Kit details updated",
  KIT_BULK_IMPORT: "Kit bulk import",
  FEE_MARKED_PAID: "Fee marked paid",
  FEE_PAYMENT_REVERSED: "Fee payment reversed",
  FEE_PAYMENT_DATE_UPDATED: "Fee payment date updated",
  FEE_ACCOUNT_CREATED: "Fee account created",
  FEE_PLAN_CHANGED: "Fee plan changed",
};

const ENTITY_TYPES = [
  "PLAYER",
  "USER",
  "SETTINGS",
  "HONOR",
  "INVENTORY_ITEM",
  "INVENTORY_CHECKOUT",
  "BULK_IMPORT",
  "KIT_DETAILS",
  "FEE_PAYMENT",
  "FEE_ACCOUNT",
];

const FEE_ACTIONS = new Set([
  "FEE_MARKED_PAID",
  "FEE_PAYMENT_REVERSED",
  "FEE_PAYMENT_DATE_UPDATED",
  "FEE_ACCOUNT_CREATED",
]);

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDetailValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const s = String(v);
  // ISO date-time: "2026-07-31T14:30:00Z" or similar
  if (/^\d{4}-\d{2}-\d{2}(T[\d:.Z+\-]+)?$/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return s.includes("T")
        ? d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
        : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    }
  }
  return s;
}

function EntityLink({
  entityType,
  entityPublicId,
}: {
  entityType: string;
  entityPublicId: string | null;
}) {
  const navigate = useNavigate();
  if (!entityPublicId) return <span className="text-gray-400">—</span>;

  const preview = entityPublicId.length > 12
    ? entityPublicId.slice(0, 10) + "…"
    : entityPublicId;

  if (entityType === "PLAYER") {
    return (
      <button
        onClick={() => navigate(`/admin/players/${entityPublicId}`)}
        className="text-indigo-600 hover:underline text-sm font-mono"
        title={entityPublicId}
      >
        {preview}
      </button>
    );
  }

  return (
    <span className="text-gray-600 text-sm font-mono" title={entityPublicId}>
      {preview}
    </span>
  );
}

function EntityContextBlock({ ctx }: { ctx: Record<string, unknown> }) {
  const rows: { label: string; value: string }[] = [];
  if (ctx.createdBy) rows.push({ label: "Created by", value: String(ctx.createdBy) });
  if (ctx.createdAt) rows.push({ label: "Created", value: formatDetailValue(ctx.createdAt) });
  if (ctx.updatedBy) rows.push({ label: "Updated by", value: String(ctx.updatedBy) });
  if (ctx.updatedAt) rows.push({ label: "Updated", value: formatDetailValue(ctx.updatedAt) });
  if (rows.length === 0) return null;
  return (
    <div className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-0.5">
      {rows.map(({ label, value }) => (
        <div key={label} className="text-xs flex gap-1">
          <span className="font-medium text-gray-400 min-w-[68px]">{label}:</span>
          <span className="text-gray-400">{value}</span>
        </div>
      ))}
    </div>
  );
}

function ChangesBlock({ changes }: { changes: Record<string, unknown> }) {
  const entries = Object.entries(changes);
  if (entries.length === 0) return <span className="text-gray-400 text-xs">No field changes recorded</span>;
  return (
    <div className="space-y-1">
      {entries.map(([field, diff]) => {
        const d = diff as { old?: unknown; new?: unknown };
        const oldVal = formatDetailValue(d?.old);
        const newVal = formatDetailValue(d?.new);
        return (
          <div key={field} className="text-xs flex flex-wrap gap-1 items-center">
            <span className="font-semibold text-gray-600">{field}:</span>
            <span className="line-through text-red-500 bg-red-50 px-1 rounded">{oldVal}</span>
            <span className="text-gray-400">→</span>
            <span className="text-green-700 bg-green-50 px-1 rounded font-medium">{newVal}</span>
          </div>
        );
      })}
    </div>
  );
}

function FeeBlock({ details }: { details: Record<string, unknown> }) {
  const rows: { label: string; value: string }[] = [];
  if (details.amount != null) rows.push({ label: "Amount", value: `₹${details.amount}` });
  if (details.paymentMode) rows.push({ label: "Mode", value: String(details.paymentMode) });
  if (details.paidOn) rows.push({ label: "Paid on", value: formatDetailValue(details.paidOn) });
  if (details.markedBy) rows.push({ label: "Marked by", value: String(details.markedBy) });
  if (details.referenceNumber) rows.push({ label: "Ref", value: String(details.referenceNumber) });
  // FEE_PAYMENT_REVERSED may have a reason string at top level
  if (typeof details === "string") rows.push({ label: "Reason", value: details });

  return (
    <div className="space-y-0.5">
      {rows.map(({ label, value }) => (
        <div key={label} className="text-xs flex gap-1">
          <span className="font-medium text-gray-500 min-w-[60px]">{label}:</span>
          <span className="text-gray-700">{value}</span>
        </div>
      ))}
    </div>
  );
}

function DetailsCell({
  action,
  details,
}: {
  action: string;
  details: JsonNode | null;
}) {
  if (!details) return <span className="text-gray-300 text-xs">—</span>;

  // Flat string or primitive (e.g. FEE_PAYMENT_REVERSED passes a reason string)
  if (typeof details !== "object") {
    return (
      <span className="text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
        {String(details)}
      </span>
    );
  }

  const obj = details as Record<string, unknown>;

  const hasChanges = obj.changes && typeof obj.changes === "object";
  const ctx = obj.entityContext && typeof obj.entityContext === "object"
    ? (obj.entityContext as Record<string, unknown>)
    : null;

  // Before/after diff (PLAYER_UPDATED, SETTINGS_BATCH_UPDATED, and any forUpdate() action)
  if (hasChanges) {
    return (
      <div>
        <ChangesBlock changes={obj.changes as Record<string, unknown>} />
        {ctx && <EntityContextBlock ctx={ctx} />}
      </div>
    );
  }

  // entityContext alone (no-op update where diff() produced no changes)
  if (ctx) {
    return <EntityContextBlock ctx={ctx} />;
  }

  // Fee-specific curated view
  if (FEE_ACTIONS.has(action)) {
    return <FeeBlock details={obj} />;
  }

  // Generic key→value (e.g. USER_ROLE_CHANGED, USER_DELETED, logCriticalAction)
  const entries = Object.entries(obj).filter(
    ([, v]) => typeof v !== "object" || v === null,
  );
  if (entries.length === 0) return <span className="text-gray-300 text-xs">—</span>;

  return (
    <div className="text-xs text-gray-500 space-y-0.5">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-1">
          <span className="font-medium text-gray-600">{k}:</span>
          <span>{formatDetailValue(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AuditLogPage() {
  const [data, setData] = useState<Page<AuditLogEntry> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actor, setActor] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, size: PAGE_SIZE };
      if (from) params.from = `${from}T00:00:00Z`;
      if (to) params.to = `${to}T23:59:59Z`;
      if (actor) params.actor = actor;
      if (entityType) params.entityType = entityType;
      if (action) params.action = action;

      const res = await api.get<Page<AuditLogEntry>>("/admin/audit-log", {
        headers: authHeader(),
        params,
      });
      setData(res.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load audit log";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, from, to, actor, entityType, action]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    load();
  }

  function clearFilters() {
    setFrom("");
    setTo("");
    setActor("");
    setEntityType("");
    setAction("");
    setPage(0);
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-indigo-600" />
        <h1 className="text-xl font-semibold text-gray-900">Audit Log</h1>
        <span className="text-sm text-gray-500">
          {data ? `${data.totalElements} events` : ""}
        </span>
        <button
          onClick={load}
          className="ml-auto p-1.5 rounded hover:bg-gray-100 text-gray-500"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleSearch}
        className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">From date</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">To date</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Actor</label>
          <input
            type="text"
            placeholder="Email or name"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Entity type</label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="">All types</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Action</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="">All actions</option>
            {Object.keys(ACTION_LABELS).map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-700"
          >
            Filter
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Actor
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Action
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Entity
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && !data && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && data?.content.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No events found for the selected filters.
                  </td>
                </tr>
              )}
              {data?.content.map((entry) => (
                <tr key={entry.publicId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {formatTimestamp(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[180px]">
                    <span
                      className="block truncate"
                      title={entry.actorPublicId}
                    >
                      {entry.actorPublicId}
                    </span>
                    {entry.actorRole && (
                      <span className="text-xs text-gray-400">
                        {entry.actorRole.replace("ROLE_", "")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[140px]">
                    <div className="text-xs text-gray-500">{entry.entityType}</div>
                    <EntityLink
                      entityType={entry.entityType}
                      entityPublicId={entry.entityPublicId}
                    />
                  </td>
                  <td className="px-4 py-3 max-w-[320px]">
                    <DetailsCell action={entry.action} details={entry.details} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination — always visible when there is data */}
        {data && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between text-sm text-gray-600">
            <span>
              {data.totalElements === 0
                ? "No events"
                : `Page ${data.number + 1} of ${data.totalPages} · ${data.totalElements} total`}
            </span>
            <div className="flex gap-2">
              <button
                disabled={data.number === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={data.number >= data.totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
