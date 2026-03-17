import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  IndianRupee,
  TrendingUp,
  Calendar,
  CreditCard,
  BookOpen,
  Download,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import api from "../../api/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeePayment = {
  id: string;
  publicId: string;
  amount: number;
  paymentMode: string;
  otherModeText: string | null;
  referenceNumber: string | null;
  receiptImageUrl: string | null;
  paidOn: string; // "2026-03-16" (LocalDate → string)
  markedByPublicId: string;
  type: string; // "PAYMENT" | "REVERSAL"
  feePlan: {
    name: string;
    amount: number;
    discountAmount: number;
    durationLabel: string | null;
    durationDays: number;
  } | null;
  player: {
    id: string;
    publicId: string;
    displayName: string;
    phone: string | null;
    email: string | null;
    gender: string;
    status: string;
  } | null;
  nextDueOn: string | null;
  feeStatus: string | null;
};

type Booking = {
  bookingPublicId: string;
  playerName: string;
  bookedByEmail: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  resourceType: string;
  amount: number;
  status: string;
  paymentStatus: string | null;
  paymentMode: string | null;
};

type Tab = "overview" | "fees" | "bookings";
type DateRange = "all" | "today" | "this_week" | "this_month" | "custom";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const paymentModeLabel: Record<string, string> = {
  PHONE_PE: "PhonePe",
  PHONEPE: "PhonePe",
  GOOGLE_PAY: "Google Pay",
  GPAY: "Google Pay",
  CASH: "Cash",
  ONLINE: "Online",
  OTHER: "Other",
};

function fmtMode(mode: string | null) {
  if (!mode) return "—";
  return paymentModeLabel[mode] || mode;
}

function getDateBounds(range: DateRange, customFrom: string, customTo: string) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  if (range === "today") return { from: today, to: today };

  if (range === "this_week") {
    const day = now.getDay(); // 0=Sun
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(now.setDate(diff));
    return {
      from: mon.toISOString().split("T")[0],
      to: today,
    };
  }

  if (range === "this_month") {
    return {
      from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
      to: today,
    };
  }

  if (range === "custom") return { from: customFrom, to: customTo };

  return { from: "", to: "" }; // all
}

// ─── Main Component ───────────────────────────────────────────────────────────

function AdminRevenueDashboard() {
  const navigate = useNavigate();

  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [dateRange, setDateRange] = useState<DateRange>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showRangeMenu, setShowRangeMenu] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [feesRes, bookingsRes] = await Promise.all([
        api.get("/admin/fees/payments"), // no playerPublicId → returns ALL
        api.get("/admin/bookings"),
      ]);
      setFeePayments(feesRes.data || []);
      setBookings(bookingsRes.data || []);
    } catch (e: any) {
      setError("Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── Date filtering ─────────────────────────────────────────────────────────
  const { from, to } = getDateBounds(dateRange, customFrom, customTo);

  const inRange = (dateStr: string) => {
    if (!from && !to) return true;
    const d = dateStr?.split("T")[0];
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  const filteredFees = useMemo(
    () => feePayments.filter((p) => p.type !== "REVERSAL" && inRange(p.paidOn)),
    [feePayments, from, to],
  );

  const filteredBookings = useMemo(
    () =>
      bookings.filter((b) => b.paymentStatus === "PAID" && inRange(b.slotDate)),
    [bookings, from, to],
  );

  // ── Summary numbers ────────────────────────────────────────────────────────
  const feesTotal = filteredFees.reduce((s, p) => s + (p.amount || 0), 0);
  const bookingsTotal = filteredBookings.reduce(
    (s, b) => s + (b.amount || 0),
    0,
  );
  const combinedTotal = feesTotal + bookingsTotal;

  // pending fees (overdue or due)
  const pendingBookings = bookings.filter(
    (b) => b.status === "PENDING_PAYMENT",
  ).length;

  // ── Range label ────────────────────────────────────────────────────────────
  const rangeLabels: Record<DateRange, string> = {
    all: "All Time",
    today: "Today",
    this_week: "This Week",
    this_month: "This Month",
    custom: customFrom && customTo ? `${customFrom} → ${customTo}` : "Custom",
  };

  // ── CSV export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows: string[][] = [];
    rows.push([
      "Type",
      "Date",
      "Name / User",
      "Description",
      "Amount",
      "Mode",
      "Reference",
    ]);

    filteredFees.forEach((p) => {
      rows.push([
        "Fee Payment",
        fmtDate(p.paidOn),
        p.player?.displayName || "—",
        p.feePlan?.name || "—",
        String(p.amount),
        fmtMode(p.paymentMode),
        p.referenceNumber || "—",
      ]);
    });

    filteredBookings.forEach((b) => {
      rows.push([
        "Booking",
        fmtDate(b.slotDate),
        b.playerName || b.bookedByEmail || "—",
        `${b.resourceType} · ${b.startTime}-${b.endTime}`,
        String(b.amount),
        fmtMode(b.paymentMode),
        "—",
      ]);
    });

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-${dateRange}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // ── Recent transactions (combined, sorted by date desc) ────────────────────
  type TxRow = {
    key: string;
    date: string;
    type: "fee" | "booking";
    name: string;
    description: string;
    amount: number;
    mode: string;
  };

  const recentTx = useMemo<TxRow[]>(() => {
    const fees: TxRow[] = filteredFees.map((p) => ({
      key: "f-" + p.publicId,
      date: p.paidOn,
      type: "fee",
      name: p.player?.displayName || "Unknown Player",
      description: p.feePlan?.name || "Fee",
      amount: p.amount,
      mode: fmtMode(p.paymentMode),
    }));

    const bks: TxRow[] = filteredBookings.map((b) => ({
      key: "b-" + b.bookingPublicId,
      date: b.slotDate,
      type: "booking",
      name: b.playerName || b.bookedByEmail || "User",
      description: `${b.resourceType} · ${b.startTime}–${b.endTime}`,
      amount: b.amount,
      mode: fmtMode(b.paymentMode),
    }));

    return [...fees, ...bks]
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .slice(0, 20);
  }, [filteredFees, filteredBookings]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading revenue data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertCircle className="mx-auto text-red-400" size={40} />
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={load}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin")}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Revenue Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Fees + Booking payments — Super Admin view
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range picker */}
          <div className="relative">
            <button
              onClick={() => setShowRangeMenu((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <Calendar size={15} />
              {rangeLabels[dateRange]}
              <ChevronDown size={14} />
            </button>
            {showRangeMenu && (
              <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 w-52 py-1">
                {(
                  [
                    ["all", "All Time"],
                    ["today", "Today"],
                    ["this_week", "This Week"],
                    ["this_month", "This Month"],
                    ["custom", "Custom Range"],
                  ] as [DateRange, string][]
                ).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => {
                      setDateRange(val);
                      setShowRangeMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition ${
                      dateRange === val
                        ? "text-emerald-600 font-semibold"
                        : "text-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {dateRange === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
              />
              <span className="text-slate-400 text-sm">→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
              />
            </div>
          )}

          <button
            onClick={load}
            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
            title="Refresh"
          >
            <RefreshCw size={16} className="text-slate-500" />
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition shadow-sm"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Revenue"
          value={fmt(combinedTotal)}
          sub={rangeLabels[dateRange]}
          icon={<TrendingUp size={20} className="text-emerald-600" />}
          bg="bg-gradient-to-br from-emerald-50 to-teal-50"
          border="border-emerald-200"
          valueClass="text-emerald-700"
        />
        <SummaryCard
          label="Fees Collected"
          value={fmt(feesTotal)}
          sub={`${filteredFees.length} payment${filteredFees.length !== 1 ? "s" : ""}`}
          icon={<IndianRupee size={20} className="text-blue-600" />}
          bg="bg-gradient-to-br from-blue-50 to-indigo-50"
          border="border-blue-200"
          valueClass="text-blue-700"
        />
        <SummaryCard
          label="Booking Revenue"
          value={fmt(bookingsTotal)}
          sub={`${filteredBookings.length} booking${filteredBookings.length !== 1 ? "s" : ""}`}
          icon={<BookOpen size={20} className="text-orange-500" />}
          bg="bg-gradient-to-br from-orange-50 to-amber-50"
          border="border-orange-200"
          valueClass="text-orange-600"
        />
        <SummaryCard
          label="Pending Bookings"
          value={String(pendingBookings)}
          sub="awaiting payment"
          icon={<Clock size={20} className="text-rose-500" />}
          bg="bg-gradient-to-br from-rose-50 to-pink-50"
          border="border-rose-200"
          valueClass="text-rose-600"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(
          [
            ["overview", "Overview"],
            ["fees", `Fee Payments (${filteredFees.length})`],
            ["bookings", `Booking Payments (${filteredBookings.length})`],
          ] as [Tab, string][]
        ).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Recent Transactions</h2>
              <span className="text-xs text-slate-400">
                Latest 20 · {rangeLabels[dateRange]}
              </span>
            </div>

            {recentTx.length === 0 ? (
              <EmptyState message="No transactions in this period" />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentTx.map((tx) => (
                  <div
                    key={tx.key}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          tx.type === "fee" ? "bg-blue-100" : "bg-orange-100"
                        }`}
                      >
                        {tx.type === "fee" ? (
                          <CreditCard size={14} className="text-blue-600" />
                        ) : (
                          <BookOpen size={14} className="text-orange-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {tx.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {tx.description} · {tx.mode}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-900">
                        {fmt(tx.amount)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {fmtDate(tx.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FEE PAYMENTS TAB */}
      {activeTab === "fees" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Fee Payments</h2>
            <span className="text-sm font-semibold text-blue-600">
              {fmt(feesTotal)}
            </span>
          </div>

          {filteredFees.length === 0 ? (
            <EmptyState message="No fee payments in this period" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase tracking-wide border-b bg-slate-50/50">
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-left px-5 py-3">Player</th>
                    <th className="text-left px-5 py-3">Plan</th>
                    <th className="text-left px-5 py-3">Amount</th>
                    <th className="text-left px-5 py-3">Mode</th>
                    <th className="text-left px-5 py-3">Reference</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Next Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFees.map((p) => (
                    <tr
                      key={p.publicId}
                      className="hover:bg-slate-50 transition"
                    >
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {fmtDate(p.paidOn)}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-slate-800">
                        {p.player?.displayName || "—"}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {p.feePlan?.name || "—"}
                      </td>
                      <td className="px-5 py-3 text-sm font-bold text-slate-900">
                        {fmt(p.amount)}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {fmtMode(p.paymentMode)}
                      </td>
                      <td className="px-5 py-3">
                        {p.referenceNumber ? (
                          <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {p.referenceNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                          <CheckCircle2 size={11} />
                          Paid
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {p.nextDueOn ? (
                          <span
                            className={`font-medium ${
                              p.feeStatus === "OVERDUE"
                                ? "text-red-600"
                                : p.feeStatus === "DUE"
                                  ? "text-amber-600"
                                  : "text-slate-600"
                            }`}
                          >
                            {fmtDate(p.nextDueOn)}
                            {p.feeStatus === "OVERDUE" && (
                              <span className="ml-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                                Overdue
                              </span>
                            )}
                            {p.feeStatus === "DUE" && (
                              <span className="ml-1 text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">
                                Due Soon
                              </span>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td
                      colSpan={3}
                      className="px-5 py-3 text-sm font-semibold text-slate-700"
                    >
                      Total
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-blue-700">
                      {fmt(feesTotal)}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* BOOKING PAYMENTS TAB */}
      {activeTab === "bookings" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Booking Payments</h2>
            <span className="text-sm font-semibold text-orange-600">
              {fmt(bookingsTotal)}
            </span>
          </div>

          {filteredBookings.length === 0 ? (
            <EmptyState message="No booking payments in this period" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase tracking-wide border-b bg-slate-50/50">
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-left px-5 py-3">User</th>
                    <th className="text-left px-5 py-3">Resource</th>
                    <th className="text-left px-5 py-3">Slot</th>
                    <th className="text-left px-5 py-3">Amount</th>
                    <th className="text-left px-5 py-3">Mode</th>
                    <th className="text-left px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((b) => (
                    <tr
                      key={b.bookingPublicId}
                      className="hover:bg-slate-50 transition"
                    >
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {fmtDate(b.slotDate)}
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-slate-800">
                          {b.playerName || "—"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {b.bookedByEmail}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700 font-medium">
                        {b.resourceType}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {b.startTime}–{b.endTime}
                      </td>
                      <td className="px-5 py-3 text-sm font-bold text-slate-900">
                        {fmt(b.amount)}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {fmtMode(b.paymentMode)}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                          <CheckCircle2 size={11} />
                          Paid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td
                      colSpan={4}
                      className="px-5 py-3 text-sm font-semibold text-slate-700"
                    >
                      Total
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-orange-600">
                      {fmt(bookingsTotal)}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  icon,
  bg,
  border,
  valueClass,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  bg: string;
  border: string;
  valueClass: string;
}) {
  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${bg} ${border} shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {label}
        </p>
        <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-14">
      <IndianRupee className="mx-auto text-slate-200 mb-3" size={40} />
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
}

export default AdminRevenueDashboard;
