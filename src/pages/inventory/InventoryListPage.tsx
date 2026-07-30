import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Edit2, Trash2, Package, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";

const CATEGORIES = ["EQUIPMENT", "FITNESS", "APPAREL", "OTHER"] as const;
type Category = typeof CATEGORIES[number];

type InventoryItem = {
  publicId: string;
  name: string;
  category: Category;
  totalQuantity: number;
  availableQty: number;
  checkedOutQty: number;
  unit: string | null;
  conditionNotes: string | null;
};

const emptyForm = {
  name: "",
  category: "EQUIPMENT" as Category,
  totalQuantity: 1,
  unit: "",
  conditionNotes: "",
};

const CATEGORY_COLORS: Record<Category, string> = {
  EQUIPMENT: "bg-blue-100 text-blue-700",
  FITNESS:   "bg-emerald-100 text-emerald-700",
  APPAREL:   "bg-purple-100 text-purple-700",
  OTHER:     "bg-gray-100 text-gray-600",
};

export default function InventoryListPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPublicId, setEditingPublicId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get("/admin/inventory/items")
      .then((r) => setItems(r.data))
      .catch(() => toast.error("Failed to load inventory"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingPublicId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingPublicId(item.publicId);
    setForm({
      name: item.name,
      category: item.category,
      totalQuantity: item.totalQuantity,
      unit: item.unit ?? "",
      conditionNotes: item.conditionNotes ?? "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Item name is required"); return; }
    if (form.totalQuantity < 1) { toast.error("Quantity must be at least 1"); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      totalQuantity: form.totalQuantity,
      unit: form.unit || null,
      conditionNotes: form.conditionNotes || null,
    };
    try {
      if (editingPublicId) {
        await api.put(`/admin/inventory/items/${editingPublicId}`, payload);
        toast.success("Item updated");
      } else {
        await api.post("/admin/inventory/items", payload);
        toast.success("Item added");
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (item.checkedOutQty > 0) {
      toast.error("Return all checked-out units before deleting.");
      return;
    }
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/inventory/items/${item.publicId}`);
      toast.success("Item deleted");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to delete item");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="p-2 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-sm text-gray-500">Track equipment, kits, and gear across the academy</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/admin/inventory/checkouts")}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            View Checkouts
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">{editingPublicId ? "Edit Item" : "Add New Item"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Item Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={100}
                placeholder="e.g. Cricket Bat"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })} className={inputClass}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Total Quantity *</label>
              <input
                type="number"
                value={form.totalQuantity}
                onChange={(e) => setForm({ ...form, totalQuantity: Math.max(0, parseInt(e.target.value) || 0) })}
                min={0}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                maxLength={30}
                placeholder="e.g. pcs, pairs, sets"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Condition Notes</label>
              <textarea
                value={form.conditionNotes}
                onChange={(e) => setForm({ ...form, conditionNotes: e.target.value })}
                rows={2}
                placeholder="Optional notes about condition, storage, etc."
                className={inputClass + " resize-none"}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition"
            >
              {saving ? "Saving…" : editingPublicId ? "Update Item" : "Add Item"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Item List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading inventory…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No inventory items yet</p>
          <p className="text-sm mt-1">Add bats, balls, stumps, and other equipment to get started.</p>
          <button onClick={openCreate} className="mt-4 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
            Add First Item
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.publicId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setExpandedId(expandedId === item.publicId ? null : item.publicId)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{item.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[item.category]}`}>
                      {item.category}
                    </span>
                  </div>
                  {item.unit && <p className="text-xs text-gray-400 mt-0.5">Unit: {item.unit}</p>}
                </div>

                <div className="flex items-center gap-6 text-sm text-center shrink-0">
                  <div>
                    <div className="font-bold text-gray-900">{item.totalQuantity}</div>
                    <div className="text-xs text-gray-400">Total</div>
                  </div>
                  <div>
                    <div className={`font-bold ${item.availableQty === 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {item.availableQty}
                    </div>
                    <div className="text-xs text-gray-400">Available</div>
                  </div>
                  <div>
                    <div className={`font-bold ${item.checkedOutQty > 0 ? "text-amber-600" : "text-gray-400"}`}>
                      {item.checkedOutQty}
                    </div>
                    <div className="text-xs text-gray-400">Out</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500"
                    title="Edit"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                  {expandedId === item.publicId ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </div>

              {expandedId === item.publicId && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-3">
                  {item.conditionNotes && (
                    <p className="text-sm text-gray-600"><span className="font-medium">Notes:</span> {item.conditionNotes}</p>
                  )}
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => navigate("/admin/inventory/checkouts", { state: { itemPublicId: item.publicId, itemName: item.name } })}
                      className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Checkout / Return
                    </button>
                    <button
                      onClick={() => navigate(`/admin/inventory/checkouts?item=${item.publicId}`)}
                      className="px-4 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-white transition"
                    >
                      View History
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
