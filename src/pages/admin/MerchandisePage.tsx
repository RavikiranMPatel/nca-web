import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Ban,
  Boxes,
  ChevronDown,
  History,
  PackagePlus,
  Plus,
  Search,
  Shirt,
  UserRound,
  X,
} from "lucide-react";
import PlayerAvatar from "../../components/player/PlayerAvatar";
import { formatDate } from "../../utils/date";
import {
  displaySize,
  itemLabel,
  merchandiseService,
  type ItemType,
  type MerchandiseIssue,
  type MerchandiseRecipient,
  type MerchandiseStock,
} from "../../api/merchandiseService";

type Tab = "stock" | "issue" | "history";

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const today = () => new Date().toISOString().slice(0, 10);

const apiMessage = (err: any, fallback: string): string =>
  err?.response?.data?.message || fallback;

// ─── Shared modal shell ─────────────────────────────────────────
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

const fieldLabel =
  "block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide";
const fieldInput =
  "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent";

// ─── Item chip: "T-Shirt L" / "Cap" ─────────────────────────────
function ItemChip({
  itemType,
  size,
  count,
}: {
  itemType: ItemType;
  size: string;
  /** When given, renders "× n" inside the chip. */
  count?: number;
}) {
  const s = displaySize(size);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">
      <Shirt size={12} className="flex-shrink-0" />
      {itemType === "CAP" ? "Cap" : "T-Shirt"}
      {s && <span className="text-slate-500">{s}</span>}
      {count !== undefined && (
        <span className="text-slate-900 font-bold">× {count}</span>
      )}
    </span>
  );
}

function MerchandisePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("stock");

  const [stock, setStock] = useState<MerchandiseStock[]>([]);
  const [issues, setIssues] = useState<MerchandiseIssue[]>([]);
  const [recipients, setRecipients] = useState<MerchandiseRecipient[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, i, r] = await Promise.all([
        merchandiseService.getStock(),
        merchandiseService.getIssues(),
        merchandiseService.getRecipients(),
      ]);
      setStock(s);
      setIssues(i);
      setRecipients(r);
    } catch (err) {
      toast.error(apiMessage(err, "Failed to load merchandise"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading merchandise…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* ── HEADER ── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Merchandise
          </h1>
          <p className="text-xs text-slate-500">
            Caps and t-shirts given to players — stock and full issue history
          </p>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-fit">
        {(
          [
            ["stock", "Stock", Boxes],
            ["issue", "Issue", PackagePlus],
            ["history", "History", History],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === key
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === "stock" && <StockTab stock={stock} onChanged={load} />}
      {tab === "issue" && (
        <IssueTab
          stock={stock}
          recipients={recipients}
          onIssued={async () => {
            await load();
            setTab("history");
          }}
        />
      )}
      {tab === "history" && <HistoryTab issues={issues} onChanged={load} />}
    </div>
  );
}

// ═══════════════════ STOCK ═══════════════════

function StockTab({
  stock,
  onChanged,
}: {
  stock: MerchandiseStock[];
  onChanged: () => Promise<void> | void;
}) {
  const [showItem, setShowItem] = useState(false);
  const [purchaseFor, setPurchaseFor] = useState<MerchandiseStock | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowItem(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <Plus size={15} /> Add item
        </button>
      </div>

      {stock.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700 mb-1">
            No stock lines yet
          </p>
          <p className="text-xs text-slate-500">
            Add a cap or a t-shirt size to start tracking stock.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Mobile */}
          <div className="md:hidden divide-y divide-slate-100">
            {stock.map((s) => (
              <div key={s.publicId} className="p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <ItemChip itemType={s.itemType} size={s.size} />
                  <OnHandBadge value={s.onHand} />
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>Purchased {s.purchased}</span>
                  <span>Issued {s.issued}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPurchaseFor(s)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100"
                >
                  <PackagePlus size={14} /> Record purchase
                </button>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Item
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Purchased
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Issued
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    On hand
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stock.map((s) => (
                  <tr key={s.publicId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <ItemChip itemType={s.itemType} size={s.size} />
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      {s.purchased}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      {s.issued}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <OnHandBadge value={s.onHand} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setPurchaseFor(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100"
                      >
                        <PackagePlus size={13} /> Purchase
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showItem && (
        <AddItemModal
          onClose={() => setShowItem(false)}
          onSaved={async () => {
            setShowItem(false);
            await onChanged();
          }}
        />
      )}
      {purchaseFor && (
        <PurchaseModal
          item={purchaseFor}
          onClose={() => setPurchaseFor(null)}
          onSaved={async () => {
            setPurchaseFor(null);
            await onChanged();
          }}
        />
      )}
    </div>
  );
}

function OnHandBadge({ value }: { value: number }) {
  const tone =
    value <= 0
      ? "bg-red-100 text-red-700"
      : value < 5
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";
  return (
    <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${tone}`}>
      {value}
    </span>
  );
}

function AddItemModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [itemType, setItemType] = useState<ItemType>("TSHIRT");
  const [size, setSize] = useState("M");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      // Caps are one size — the backend normalises this too.
      await merchandiseService.createItem(
        itemType,
        itemType === "CAP" ? "" : size,
        label.trim() || undefined,
      );
      toast.success("Item added");
      onSaved();
    } catch (err) {
      toast.error(apiMessage(err, "Failed to add item"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add item" onClose={onClose}>
      <div>
        <label className={fieldLabel}>Item</label>
        <div className="grid grid-cols-2 gap-2">
          {(["CAP", "TSHIRT"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setItemType(t)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                itemType === t
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {t === "CAP" ? "Cap" : "T-Shirt"}
            </button>
          ))}
        </div>
      </div>

      {itemType === "TSHIRT" ? (
        <div>
          <label className={fieldLabel}>Size</label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className={fieldInput}
          >
            {TSHIRT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Caps are one size — no size to choose.
        </p>
      )}

      <div>
        <label className={fieldLabel}>Label (optional)</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={itemType === "CAP" ? "Cap" : `T-Shirt ${size}`}
          className={fieldInput}
        />
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Add item"}
      </button>
    </Modal>
  );
}

function PurchaseModal({
  item,
  onClose,
  onSaved,
}: {
  item: MerchandiseStock;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [unitCost, setUnitCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    setSaving(true);
    try {
      await merchandiseService.recordPurchase({
        itemPublicId: item.publicId,
        quantity: qty,
        purchaseDate,
        unitCost: unitCost.trim() || undefined,
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Purchase recorded");
      onSaved();
    } catch (err) {
      toast.error(apiMessage(err, "Failed to record purchase"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Record purchase — ${itemLabel(item)}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabel}>Quantity</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={fieldInput}
          />
        </div>
        <div>
          <label className={fieldLabel}>Date</label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className={fieldInput}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabel}>Unit cost (optional)</label>
          <input
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder="e.g. 250"
            className={fieldInput}
          />
        </div>
        <div>
          <label className={fieldLabel}>Supplier (optional)</label>
          <input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className={fieldInput}
          />
        </div>
      </div>

      <div>
        <label className={fieldLabel}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={fieldInput}
        />
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Record purchase"}
      </button>
    </Modal>
  );
}

// ═══════════════════ ISSUE ═══════════════════

function IssueTab({
  stock,
  recipients,
  onIssued,
}: {
  stock: MerchandiseStock[];
  recipients: MerchandiseRecipient[];
  onIssued: () => Promise<void> | void;
}) {
  const [mode, setMode] = useState<"PLAYER" | "OTHER">("PLAYER");
  const [search, setSearch] = useState("");
  const [player, setPlayer] = useState<MerchandiseRecipient | null>(null);
  const [otherName, setOtherName] = useState("");
  const [itemPublicId, setItemPublicId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [issuedDate, setIssuedDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter((r) => r.displayName.toLowerCase().includes(q));
  }, [recipients, search]);

  const selectedStock = stock.find((s) => s.publicId === itemPublicId) || null;

  const reset = () => {
    setPlayer(null);
    setOtherName("");
    setSearch("");
    setQuantity("1");
    setNotes("");
  };

  const save = async () => {
    const qty = Number(quantity);
    if (!itemPublicId) {
      toast.error("Choose an item");
      return;
    }
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    if (mode === "PLAYER" && !player) {
      toast.error("Choose a player");
      return;
    }
    if (mode === "OTHER" && !otherName.trim()) {
      toast.error("Enter a recipient name");
      return;
    }

    setSaving(true);
    try {
      // Exactly one recipient is sent — the API and a DB check constraint both
      // reject a request carrying a player and a name together.
      await merchandiseService.issue({
        itemPublicId,
        quantity: qty,
        issuedDate,
        notes: notes.trim() || undefined,
        ...(mode === "PLAYER"
          ? { playerPublicId: player!.publicId }
          : { recipientName: otherName.trim() }),
      });
      toast.success("Issued");
      reset();
      await onIssued();
    } catch (err) {
      toast.error(apiMessage(err, "Failed to issue"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5 max-w-2xl">
      {/* Player / Other toggle */}
      <div>
        <label className={fieldLabel}>Issue to</label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["PLAYER", "Player", UserRound],
              ["OTHER", "Other", UserRound],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                mode === key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        {mode === "OTHER" && (
          <p className="text-xs text-slate-500 mt-2">
            For someone with no player record — security guard, visitor, coach.
          </p>
        )}
      </div>

      {/* Recipient */}
      {mode === "PLAYER" ? (
        <div>
          <label className={fieldLabel}>Player</label>
          {player ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50/50">
              <PlayerAvatar
                displayName={player.displayName}
                photoUrl={player.photoUrl}
                gender={player.gender}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {player.displayName}
                </p>
                <RecipientBadges recipient={player} />
              </div>
              <button
                type="button"
                onClick={() => setPlayer(null)}
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="relative mb-2">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${recipients.length} players…`}
                  className={`${fieldInput} pl-9`}
                />
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500 text-center">
                    No players match
                  </p>
                ) : (
                  filtered.map((r) => (
                    <button
                      key={r.publicId}
                      type="button"
                      onClick={() => setPlayer(r)}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 text-left"
                    >
                      <PlayerAvatar
                        displayName={r.displayName}
                        photoUrl={r.photoUrl}
                        gender={r.gender}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {r.displayName}
                        </p>
                        <RecipientBadges recipient={r} />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div>
          <label className={fieldLabel}>Recipient name</label>
          <input
            value={otherName}
            onChange={(e) => setOtherName(e.target.value)}
            placeholder="e.g. Ramesh (security)"
            className={fieldInput}
          />
        </div>
      )}

      {/* Item */}
      <div>
        <label className={fieldLabel}>Item</label>
        <select
          value={itemPublicId}
          onChange={(e) => setItemPublicId(e.target.value)}
          className={fieldInput}
        >
          <option value="">Select item…</option>
          {stock.map((s) => (
            <option key={s.publicId} value={s.publicId}>
              {itemLabel(s)} — {s.onHand} in stock
            </option>
          ))}
        </select>
        {selectedStock && selectedStock.onHand <= 0 && (
          <p className="text-xs text-red-600 mt-1.5 font-medium">
            Nothing in stock for this item — record a purchase first.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabel}>Quantity</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={fieldInput}
          />
        </div>
        <div>
          <label className={fieldLabel}>Issued date</label>
          <input
            type="date"
            value={issuedDate}
            onChange={(e) => setIssuedDate(e.target.value)}
            className={fieldInput}
          />
        </div>
      </div>

      <div>
        <label className={fieldLabel}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything worth recording about this issue"
          className={fieldInput}
        />
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Issuing…" : "Issue"}
      </button>
    </div>
  );
}

function RecipientBadges({ recipient }: { recipient: MerchandiseRecipient }) {
  if (recipient.active && !recipient.external) return null;
  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      {!recipient.active && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
          INACTIVE
        </span>
      )}
      {recipient.external && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
          EXTERNAL
        </span>
      )}
    </div>
  );
}

// ═══════════════════ HISTORY ═══════════════════

/**
 * One recipient's whole merchandise record, collapsed to a single row.
 * A player given a cap and a t-shirt appears once, with both items in that row;
 * the individual issues (dates, notes, void) expand underneath.
 */
type RecipientGroup = {
  key: string;
  recipientType: "PLAYER" | "OTHER";
  name: string;
  photoUrl?: string | null;
  gender?: string | null;
  issues: MerchandiseIssue[];
  /** Live (non-voided) quantity per item+size, in stable item order. */
  items: { itemType: ItemType; size: string; quantity: number }[];
  totalLive: number;
  voidedCount: number;
  lastIssuedDate: string;
};

const groupIssues = (issues: MerchandiseIssue[]): RecipientGroup[] => {
  const groups = new Map<string, RecipientGroup>();

  for (const i of issues) {
    // Key on the player when we still have one. A hard-deleted player keeps its
    // snapshot name, so fall back to that rather than merging all of them.
    const key =
      i.recipientType === "PLAYER"
        ? (i.playerPublicId ?? `player-name:${i.recipientName}`)
        : `other:${i.recipientName}`;

    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        recipientType: i.recipientType,
        name: i.recipientName,
        photoUrl: i.playerPhotoUrl,
        gender: i.playerGender,
        issues: [],
        items: [],
        totalLive: 0,
        voidedCount: 0,
        lastIssuedDate: i.issuedDate,
      };
      groups.set(key, g);
    }

    g.issues.push(i);
    if (i.issuedDate > g.lastIssuedDate) g.lastIssuedDate = i.issuedDate;

    if (i.voided) {
      g.voidedCount += 1;
      continue; // voided issues never count toward what the recipient holds
    }

    g.totalLive += i.quantity;
    const line = g.items.find(
      (x) => x.itemType === i.itemType && x.size === i.size,
    );
    if (line) line.quantity += i.quantity;
    else
      g.items.push({
        itemType: i.itemType,
        size: i.size,
        quantity: i.quantity,
      });
  }

  for (const g of groups.values()) {
    // Caps before t-shirts, then by size, so a row reads the same way every time.
    g.items.sort(
      (a, b) =>
        a.itemType.localeCompare(b.itemType) || a.size.localeCompare(b.size),
    );
    g.issues.sort((a, b) => b.issuedDate.localeCompare(a.issuedDate));
  }

  return [...groups.values()].sort((a, b) =>
    b.lastIssuedDate.localeCompare(a.lastIssuedDate),
  );
};

function HistoryTab({
  issues,
  onChanged,
}: {
  issues: MerchandiseIssue[];
  onChanged: () => Promise<void> | void;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [voidTarget, setVoidTarget] = useState<MerchandiseIssue | null>(null);

  const groups = useMemo(() => groupIssues(issues), [issues]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.items.some(
          (it) =>
            it.itemType.toLowerCase().includes(q) ||
            displaySize(it.size).toLowerCase().includes(q),
        ),
    );
  }, [groups, search]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const totalLive = groups.reduce((s, g) => s + g.totalLive, 0);

  if (issues.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
        <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700 mb-1">
          Nothing issued yet
        </p>
        <p className="text-xs text-slate-500">
          Issues appear here and are never removed — only voided.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipient or item…"
            className={`${fieldInput} pl-9`}
          />
        </div>
        <p className="text-xs text-slate-500">
          {filtered.length} of {groups.length} recipients · {totalLive} items
          issued
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Recipient
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Items received
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Total
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">
                  Last issued
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">
                  Issues
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((g) => {
                const isOpen = expanded.has(g.key);
                return (
                  <Fragment key={g.key}>
                    <tr
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => toggle(g.key)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <GroupAvatar group={g} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {g.name}
                            </p>
                            {g.recipientType === "OTHER" && (
                              <span className="text-[10px] font-bold text-slate-500">
                                NON-PLAYER
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Every item this recipient has, on the one row */}
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {g.items.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">
                              all voided
                            </span>
                          ) : (
                            g.items.map((it) => (
                              <ItemChip
                                key={`${it.itemType}-${it.size}`}
                                itemType={it.itemType}
                                size={it.size}
                                count={it.quantity}
                              />
                            ))
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 text-right text-sm font-semibold text-slate-700">
                        {g.totalLive}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-slate-500 whitespace-nowrap">
                        {formatDate(g.lastIssuedDate)}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                          {g.voidedCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                              <Ban size={10} /> {g.voidedCount}
                            </span>
                          )}
                          {g.issues.length}
                          <ChevronDown
                            size={15}
                            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                        </span>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr>
                        <td colSpan={5} className="px-4 pb-3 pt-0 bg-slate-50/60">
                          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                            {g.issues.map((i) => (
                              <div
                                key={i.publicId}
                                className={`flex items-center gap-3 px-3 py-2 ${i.voided ? "bg-slate-50" : ""}`}
                              >
                                <ItemChip
                                  itemType={i.itemType}
                                  size={i.size}
                                  count={i.quantity}
                                />
                                <span className="text-xs text-slate-500 whitespace-nowrap">
                                  {formatDate(i.issuedDate)}
                                </span>
                                <span className="flex-1 min-w-0 text-xs text-slate-500 truncate">
                                  {i.voided ? (
                                    <span className="text-red-600 font-medium">
                                      Voided: {i.voidReason}
                                      {i.voidedBy ? ` — ${i.voidedBy}` : ""}
                                    </span>
                                  ) : (
                                    i.notes || ""
                                  )}
                                </span>
                                {i.voided ? (
                                  <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">
                                    <Ban size={11} /> VOIDED
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setVoidTarget(i);
                                    }}
                                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50"
                                  >
                                    <Ban size={13} /> Void
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {voidTarget && (
        <VoidModal
          issue={voidTarget}
          onClose={() => setVoidTarget(null)}
          onVoided={async () => {
            setVoidTarget(null);
            await onChanged();
          }}
        />
      )}
    </div>
  );
}

/** Player photo for player recipients, neutral icon for everyone else. */
function GroupAvatar({ group }: { group: RecipientGroup }) {
  if (group.recipientType === "PLAYER") {
    return (
      <PlayerAvatar
        displayName={group.name}
        photoUrl={group.photoUrl}
        gender={group.gender}
        size="sm"
      />
    );
  }
  return (
    <div
      className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-200 text-slate-500 shadow-md"
      title="Not a registered player"
    >
      <UserRound size={16} />
    </div>
  );
}
function VoidModal({
  issue,
  onClose,
  onVoided,
}: {
  issue: MerchandiseIssue;
  onClose: () => void;
  onVoided: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!reason.trim()) {
      toast.error("A reason is required");
      return;
    }
    setSaving(true);
    try {
      await merchandiseService.voidIssue(issue.publicId, reason.trim());
      toast.success("Issue voided — stock returned");
      onVoided();
    } catch (err) {
      toast.error(apiMessage(err, "Failed to void"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Void issue" onClose={onClose}>
      <p className="text-sm text-slate-600">
        {itemLabel(issue)} × {issue.quantity} to{" "}
        <span className="font-semibold text-slate-800">
          {issue.recipientName}
        </span>{" "}
        on {formatDate(issue.issuedDate)}.
      </p>
      <p className="text-xs text-slate-500">
        The row stays in history, marked as voided, and the quantity returns to
        stock on hand.
      </p>
      <div>
        <label className={fieldLabel}>Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="e.g. recorded against the wrong player"
          className={fieldInput}
        />
      </div>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
      >
        {saving ? "Voiding…" : "Void issue"}
      </button>
    </Modal>
  );
}

export default MerchandisePage;
