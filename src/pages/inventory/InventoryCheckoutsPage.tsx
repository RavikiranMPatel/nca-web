import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, RotateCcw, Plus, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";

type Checkout = {
  publicId: string;
  itemPublicId: string;
  itemName: string;
  itemUnit: string | null;
  quantityCheckedOut: number;
  checkedOutToPlayerId: string | null;
  checkedOutToPlayerName: string | null;
  checkedOutToBatchId: string | null;
  checkedOutToBatchName: string | null;
  checkedOutDate: string;
  expectedReturnDate: string | null;
  actualReturnDate: string | null;
  active: boolean;
  notes: string | null;
};

type InventoryItem = { publicId: string; name: string; availableQty: number; totalQuantity: number };
type Player = { publicId: string; displayName: string };
type Batch  = { publicId: string; name: string };

const emptyForm = {
  itemPublicId: "",
  quantity: 1,
  targetType: "player" as "player" | "batch",
  playerPublicId: "",
  batchPublicId: "",
  checkedOutDate: new Date().toISOString().slice(0, 10),
  expectedReturnDate: "",
  notes: "",
};

export default function InventoryCheckoutsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterItem = searchParams.get("item");

  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);

  const loadCheckouts = () => {
    const url = filterItem
      ? `/admin/inventory/items/${filterItem}/checkouts`
      : `/admin/inventory/checkouts?activeOnly=${activeOnly}`;
    return api.get(url).then((r) => setCheckouts(r.data)).catch(() => toast.error("Failed to load checkouts"));
  };

  useEffect(() => {
    Promise.all([
      loadCheckouts(),
      api.get("/admin/inventory/items").then((r) => setItems(r.data)).catch(() => {}),
      api.get("/admin/players").then((r) => setPlayers(r.data)).catch(() => {}),
      api.get("/admin/batches/active").then((r) => setBatches(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) loadCheckouts();
  }, [activeOnly]);

  const handleCheckout = async () => {
    if (!form.itemPublicId) { toast.error("Select an item"); return; }
    if (form.targetType === "player" && !form.playerPublicId) { toast.error("Select a player"); return; }
    if (form.targetType === "batch"  && !form.batchPublicId)  { toast.error("Select a batch");  return; }
    setSaving(true);
    try {
      await api.post("/admin/inventory/checkouts", {
        itemPublicId:       form.itemPublicId,
        quantity:           form.quantity,
        playerPublicId:     form.targetType === "player" ? form.playerPublicId : null,
        batchPublicId:      form.targetType === "batch"  ? form.batchPublicId  : null,
        checkedOutDate:     form.checkedOutDate,
        expectedReturnDate: form.expectedReturnDate || null,
        notes:              form.notes || null,
      });
      toast.success("Checkout recorded");
      setShowForm(false);
      setForm({ ...emptyForm });
      loadCheckouts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Checkout failed");
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async (checkout: Checkout) => {
    if (!window.confirm(`Mark ${checkout.quantityCheckedOut} × "${checkout.itemName}" as returned?`)) return;
    setReturningId(checkout.publicId);
    try {
      await api.post(`/admin/inventory/checkouts/${checkout.publicId}/return`, {
        returnDate: new Date().toISOString().slice(0, 10),
      });
      toast.success("Return recorded");
      loadCheckouts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Return failed");
    } finally {
      setReturningId(null);
    }
  };

  const selectedItem = items.find((i) => i.publicId === form.itemPublicId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/inventory")} className="p-2 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {filterItem ? "Item Checkout History" : "Checkouts & Returns"}
            </h1>
            <p className="text-sm text-gray-500">Track which items are out and when they're returned</p>
          </div>
        </div>
        {!filterItem && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={16} /> New Checkout
          </button>
        )}
      </div>

      {/* New Checkout Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">New Checkout</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Item *</label>
              <select value={form.itemPublicId} onChange={(e) => setForm({ ...form, itemPublicId: e.target.value, quantity: 1 })} className={inputClass}>
                <option value="">— Select item —</option>
                {items.filter((i) => i.availableQty > 0).map((i) => (
                  <option key={i.publicId} value={i.publicId}>
                    {i.name} ({i.availableQty} available)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Quantity *</label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                min={1}
                max={selectedItem?.availableQty ?? 999}
                className={inputClass}
              />
              {selectedItem && (
                <p className="text-xs text-gray-400 mt-1">{selectedItem.availableQty} available</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Check Out To *</label>
              <div className="flex gap-3 mb-2">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" value="player" checked={form.targetType === "player"} onChange={() => setForm({ ...form, targetType: "player", batchPublicId: "" })} />
                  Player
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" value="batch" checked={form.targetType === "batch"} onChange={() => setForm({ ...form, targetType: "batch", playerPublicId: "" })} />
                  Batch
                </label>
              </div>
              {form.targetType === "player" ? (
                <select value={form.playerPublicId} onChange={(e) => setForm({ ...form, playerPublicId: e.target.value })} className={inputClass}>
                  <option value="">— Select player —</option>
                  {players.map((p) => <option key={p.publicId} value={p.publicId}>{p.displayName}</option>)}
                </select>
              ) : (
                <select value={form.batchPublicId} onChange={(e) => setForm({ ...form, batchPublicId: e.target.value })} className={inputClass}>
                  <option value="">— Select batch —</option>
                  {batches.map((b) => <option key={b.publicId} value={b.publicId}>{b.name}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Checkout Date *</label>
              <input type="date" value={form.checkedOutDate} onChange={(e) => setForm({ ...form, checkedOutDate: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Expected Return Date</label>
              <input type="date" value={form.expectedReturnDate} onChange={(e) => setForm({ ...form, expectedReturnDate: e.target.value })} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className={inputClass + " resize-none"}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={handleCheckout} disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition">
              {saving ? "Saving…" : "Confirm Checkout"}
            </button>
            <button onClick={() => { setShowForm(false); setForm({ ...emptyForm }); }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter toggle */}
      {!filterItem && (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="font-medium text-gray-700">Active checkouts only</span>
          </label>
          <span className="text-sm text-gray-400">({checkouts.length} records)</span>
        </div>
      )}

      {/* Checkouts Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : checkouts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CheckCircle size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No checkouts found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Item</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Qty</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Checked Out To</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Date Out</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Expected Back</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {checkouts.map((c) => (
                  <tr key={c.publicId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.itemName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.quantityCheckedOut}{c.itemUnit ? ` ${c.itemUnit}` : ""}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {c.checkedOutToPlayerName
                        ? <span className="flex items-center gap-1"><span className="text-blue-500">👤</span>{c.checkedOutToPlayerName}</span>
                        : c.checkedOutToBatchName
                        ? <span className="flex items-center gap-1"><span className="text-emerald-500">👥</span>{c.checkedOutToBatchName}</span>
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.checkedOutDate}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.expectedReturnDate ?? <span className="text-gray-300">—</span>}
                      {c.expectedReturnDate && c.active && new Date(c.expectedReturnDate) < new Date() && (
                        <span className="ml-1 text-xs text-red-500 font-medium">Overdue</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Out</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle size={11} /> Returned {c.actualReturnDate}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.active && (
                        <button
                          onClick={() => handleReturn(c)}
                          disabled={returningId === c.publicId}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition"
                        >
                          <RotateCcw size={12} />
                          {returningId === c.publicId ? "…" : "Return"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
