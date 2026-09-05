import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import { useAuth } from "../../auth/useAuth";
import KitDetailsForm, {
  emptyKitForm, KIT_SIZES, type KitFormValues,
} from "../../components/kit/KitDetailsForm";

const ITEMS_PER_PAGE = 10;   // matches PlayersListPage

type KitRow = {
  playerPublicId: string;
  playerName: string;
  branchId: string | null;
  branchName: string | null;
  batchName: string | null;
  active: boolean;
  kitPublicId: string | null;
  seasonYear: string;
  tshirtSize: string | null;
  trouserSize: string | null;
  jerseyName: string | null;
  jerseyNumber: string | null;
  tshirtGiven: boolean;
  trouserGiven: boolean;
  capGiven: boolean;
  deliveryStatus: "NOT_DELIVERED" | "PARTIAL" | "DELIVERED";
  deliveredAt: string | null;
  deliveredByName: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  NOT_DELIVERED: "Not delivered",
  PARTIAL: "Partial",
  DELIVERED: "Delivered",
};
const STATUS_CLASS: Record<string, string> = {
  NOT_DELIVERED: "bg-gray-200 text-gray-800",
  PARTIAL: "bg-amber-200 text-amber-900",
  DELIVERED: "bg-emerald-200 text-emerald-900",
};

export default function KitListPage() {
  const { userRole } = useAuth();
  // COACH is read-only: the list is the only kit endpoint SecurityConfig admits
  // them to, and the backend rejects save, bulk-deliver and export for them. The
  // controls below are hidden rather than disabled so the page does not offer an
  // action that would 403.
  const canEdit = userRole === "ROLE_ADMIN" || userRole === "ROLE_SUPER_ADMIN";

  const [seasons, setSeasons] = useState<string[]>([]);
  const [season, setSeason] = useState<string>("");
  const [rows, setRows] = useState<KitRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | KitRow["deliveryStatus"]>("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerRow, setDrawerRow] = useState<KitRow | null>(null);
  const [form, setForm] = useState<KitFormValues>(emptyKitForm());
  const [saving, setSaving] = useState(false);
  const [bulking, setBulking] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get("/admin/kit/seasons")
      .then((res) => {
        const list: string[] = res.data ?? [];
        const fallback = new Date().getFullYear().toString();
        const all = list.length ? list : [fallback];
        setSeasons(all);
        setSeason((s) => s || all[0]);
      })
      .catch(() => {
        const fallback = new Date().getFullYear().toString();
        setSeasons([fallback]); setSeason((s) => s || fallback);
      });
  }, []);

  const load = (forSeason: string) => {
    if (!forSeason) return;
    setLoading(true);
    api.get("/admin/kit/list", { params: { season: forSeason } })
      .then((res) => setRows(res.data ?? []))
      .catch(() => toast.error("Failed to load kit list"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(season); /* eslint-disable-next-line */ }, [season]);

  const batches = useMemo(
    () => Array.from(new Set(rows.map((r) => r.batchName).filter(Boolean))) as string[],
    [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (statusFilter !== "all" && r.deliveryStatus !== statusFilter) return false;
    if (batchFilter !== "all" && r.batchName !== batchFilter) return false;
    if (sizeFilter !== "all" && r.tshirtSize !== sizeFilter) return false;
    if (search.trim() && !r.playerName.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  }), [rows, statusFilter, batchFilter, sizeFilter, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  useEffect(() => { setCurrentPage(1); }, [statusFilter, batchFilter, sizeFilter, search, season]);

  const counts = useMemo(() => ({
    DELIVERED: rows.filter((r) => r.deliveryStatus === "DELIVERED").length,
    PARTIAL: rows.filter((r) => r.deliveryStatus === "PARTIAL").length,
    NOT_DELIVERED: rows.filter((r) => r.deliveryStatus === "NOT_DELIVERED").length,
  }), [rows]);

  const openDrawer = (row: KitRow) => {
    setDrawerRow(row);
    setForm({
      seasonYear: row.seasonYear,
      tshirtSize: row.tshirtSize ?? "",
      trouserSize: row.trouserSize ?? "",
      capGiven: row.capGiven,
      tshirtGiven: row.tshirtGiven,
      trouserGiven: row.trouserGiven,
      jerseyName: row.jerseyName ?? "",
      jerseyNumber: row.jerseyNumber ?? "",
    });
  };

  // Same endpoint the Kit tab posts to — one editor, one write path, no cache.
  const saveDrawer = async () => {
    if (!drawerRow) return;
    setSaving(true);
    try {
      await api.post(`/admin/players/${drawerRow.playerPublicId}/kit`, {
        seasonYear: form.seasonYear.trim(),
        tshirtSize: form.tshirtSize || null,
        trouserSize: form.trouserSize || null,
        capGiven: form.capGiven,
        tshirtGiven: form.tshirtGiven,
        trouserGiven: form.trouserGiven,
        jerseyName: form.jerseyName || null,
        jerseyNumber: form.jerseyNumber || null,
      });
      setDrawerRow(null);
      load(season);
      toast.success("Kit details saved");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save kit details");
    } finally { setSaving(false); }
  };

  const bulkDeliver = async () => {
    if (!selected.size) return;
    setBulking(true);
    try {
      const res = await api.post("/admin/kit/bulk-deliver", {
        seasonYear: season,
        playerPublicIds: Array.from(selected),
        tshirtGiven: true, trouserGiven: true, capGiven: true,
      });
      setSelected(new Set());
      load(season);
      toast.success(`Marked ${res.data?.updated ?? selected.size} delivered`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Bulk update failed");
    } finally { setBulking(false); }
  };

  const exportXlsx = async () => {
    setExporting(true);
    try {
      const res = await api.get("/admin/kit/list/export",
        { params: { season }, responseType: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(res.data);
      link.download = `kit-${season}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Export downloaded");
    } catch { toast.error("Export failed"); }
    finally { setExporting(false); }
  };

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const allOnPageSelected = paged.length > 0 && paged.every((r) => selected.has(r.playerPublicId));

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto" data-testid="kit-list-page">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kit / Merchandise</h1>
          <p className="text-sm text-gray-500">Who has and hasn't received their kit.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            data-testid="kit-list-season"
          >
            {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {canEdit && (
            <button
              onClick={exportXlsx}
              disabled={exporting}
              className="px-4 py-2 text-sm font-medium bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-60"
              data-testid="kit-list-export"
            >
              {exporting ? "Exporting…" : "Export XLSX"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {(["DELIVERED", "PARTIAL", "NOT_DELIVERED"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setStatusFilter(statusFilter === k ? "all" : k)}
            className={`rounded-xl border p-3 text-left transition ${
              statusFilter === k ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
            data-testid={`kit-stat-${k.toLowerCase()}`}
          >
            <div className="text-2xl font-bold text-gray-900">{counts[k]}</div>
            <div className="text-xs text-gray-500">{STATUS_LABEL[k]}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search player…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px]"
          data-testid="kit-filter-search"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          data-testid="kit-filter-status">
          <option value="all">All statuses</option>
          <option value="NOT_DELIVERED">Not delivered</option>
          <option value="PARTIAL">Partial</option>
          <option value="DELIVERED">Delivered</option>
        </select>
        <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          data-testid="kit-filter-batch">
          <option value="all">All batches</option>
          {batches.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          data-testid="kit-filter-size">
          <option value="all">All sizes</option>
          {KIT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {canEdit && selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-900" data-testid="kit-selected-count">
            {selected.size} selected
          </span>
          <button
            onClick={bulkDeliver}
            disabled={bulking}
            className="px-4 py-1.5 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60"
            data-testid="kit-bulk-deliver"
          >
            {bulking ? "Marking…" : "Mark delivered"}
          </button>
          <button onClick={() => setSelected(new Set())}
            className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Loading kit list…</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm" data-testid="kit-list-table">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                {canEdit && (
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={(e) => setSelected((prev) => {
                        const next = new Set(prev);
                        paged.forEach((r) => e.target.checked
                          ? next.add(r.playerPublicId) : next.delete(r.playerPublicId));
                        return next;
                      })}
                      data-testid="kit-select-all"
                    />
                  </th>
                )}
                <th className="p-3 text-left">Player</th>
                <th className="p-3 text-left hidden sm:table-cell">Batch</th>
                <th className="p-3 text-left">T-Shirt</th>
                <th className="p-3 text-left hidden sm:table-cell">Trouser</th>
                <th className="p-3 text-left">Status</th>
                {canEdit && <th className="p-3 w-16"></th>}
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => (
                <tr key={r.playerPublicId} className="border-t border-gray-100"
                    data-testid={`kit-row-${r.playerPublicId}`}>
                  {canEdit && (
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.playerPublicId)}
                        onChange={() => toggle(r.playerPublicId)}
                        data-testid={`kit-select-${r.playerPublicId}`}
                      />
                    </td>
                  )}
                  <td className="p-3 font-medium text-gray-900">
                    {/* Player Overview is ADMIN-only, so a coach is never linked into it. */}
                    {canEdit ? (
                      <Link to={`/admin/players/${r.playerPublicId}/kit`}
                            className="hover:underline"
                            data-testid={`kit-player-link-${r.playerPublicId}`}>
                        {r.playerName}
                      </Link>
                    ) : (
                      <span data-testid={`kit-player-name-${r.playerPublicId}`}>{r.playerName}</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-600 hidden sm:table-cell">{r.batchName ?? "—"}</td>
                  <td className="p-3 text-gray-600" data-testid={`kit-tshirt-${r.playerPublicId}`}>
                    {r.tshirtSize ?? "—"}
                  </td>
                  <td className="p-3 text-gray-600 hidden sm:table-cell">{r.trouserSize ?? "—"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[r.deliveryStatus]}`}
                          data-testid={`kit-status-${r.playerPublicId}`}>
                      {STATUS_LABEL[r.deliveryStatus]}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="p-3">
                      <button onClick={() => openDrawer(r)}
                        className="text-blue-600 text-sm font-medium hover:underline"
                        data-testid={`kit-edit-${r.playerPublicId}`}>
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400 text-sm"
                        data-testid="kit-list-empty">No players match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4" data-testid="kit-pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg disabled:opacity-50">Prev</button>
          <span className="text-sm text-gray-600">{currentPage} / {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg disabled:opacity-50">Next</button>
        </div>
      )}

      {/* Inline edit drawer — the same KitDetailsForm the Kit tab renders.
          Mobile-sticky action bar pattern: bottom-16 on mobile clears BottomNav. */}
      {drawerRow && canEdit && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center sm:justify-center"
             onClick={() => setDrawerRow(null)}>
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-xl rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}
               data-testid="kit-drawer">
            <h3 className="font-semibold text-gray-900 mb-4">
              {drawerRow.playerName} — Season {drawerRow.seasonYear}
            </h3>
            <KitDetailsForm values={form} onChange={setForm} lockSeason idPrefix="kit-drawer" />
            <div className="flex gap-3 pt-5">
              <button onClick={saveDrawer} disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60"
                data-testid="kit-drawer-save">
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setDrawerRow(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                data-testid="kit-drawer-cancel">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
