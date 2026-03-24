import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  BookOpen,
  Download,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Pencil,
  Trash2,
  X,
  Users,
  Check,
  RotateCcw,
} from "lucide-react";
import api from "../../api/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeePayment = {
  publicId: string;
  amount: number;
  paymentMode: string;
  referenceNumber: string | null;
  paidOn: string;
  type: string;
  feePlan: { name: string } | null;
  player: { displayName: string } | null;
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
type OtherExpense = {
  publicId: string;
  description: string;
  amount: number;
  expenseDate: string;
  area: string | null;
  discipline: string | null;
  item: string | null;
  costType: string | null;
  budgetHead: string | null;
  paidBy: string | null;
  notes: string | null;
  transactionType: "EXPENSE" | "INCOME";
};
type PartnerSpending = {
  name: string;
  total: number;
  breakdown: { budgetHead: string; amount: number; count: number }[];
};
type RecurringItem = {
  publicId: string;
  name: string;
  defaultAmount: number | null;
  budgetHead: string | null;
  costType: string | null;
};
type MonthlyPayment = {
  publicId?: string;
  item: RecurringItem;
  year: number;
  month: number;
  amount: number;
  paidOn: string | null;
  paidBy: string | null;
  notes: string | null;
  status: string;
};
type Suggestions = {
  area: string[];
  discipline: string[];
  item: string[];
  costType: string[];
  budgetHead: string[];
  paidBy: string[];
};
type Tab = "overview" | "fees" | "bookings" | "expenses";
type ExpenseSubTab = "summary" | "monthly" | "all";
type DateRange = "all" | "today" | "this_week" | "this_month" | "custom";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const EMPTY_EXPENSE_FORM = {
  description: "",
  amount: "",
  expenseDate: new Date().toISOString().split("T")[0],
  area: "",
  discipline: "",
  item: "",
  costType: "",
  budgetHead: "",
  paidBy: "",
  notes: "",
  transactionType: "EXPENSE" as "EXPENSE" | "INCOME",
};

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
const modeLabel: Record<string, string> = {
  PHONE_PE: "PhonePe",
  PHONEPE: "PhonePe",
  GOOGLE_PAY: "Google Pay",
  GPAY: "Google Pay",
  CASH: "Cash",
  ONLINE: "Online",
  OTHER: "Other",
  OFFLINE: "Offline",
};
const fmtMode = (m: string | null) => (m ? modeLabel[m] || m : "—");

const csvEscape = (s: string) =>
  s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;

function getDateBounds(range: DateRange, cf: string, ct: string) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  if (range === "today") return { from: today, to: today };
  if (range === "this_week") {
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
    return { from: mon.toISOString().split("T")[0], to: today };
  }
  if (range === "this_month")
    return {
      from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
      to: today,
    };
  if (range === "custom") return { from: cf, to: ct };
  return { from: "", to: "" };
}

// ─── AutocompleteInput ────────────────────────────────────────────────────────

function AutocompleteInput({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(value.toLowerCase()) &&
      s.toLowerCase() !== value.toLowerCase(),
  );
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
        {label}
        {required && " *"}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-44 overflow-y-auto">
          {filtered.map((s) => (
            <li
              key={s}
              onMouseDown={() => {
                onChange(s);
                setOpen(false);
              }}
              className="px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminRevenueDashboard() {
  const navigate = useNavigate();

  const isSuperAdmin = useMemo(() => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return false;

      const payload = JSON.parse(atob(token.split(".")[1]));

      const roles: string[] = payload.roles || payload.authorities || [];
      const role: string = payload.role || "";

      return roles.includes("ROLE_SUPER_ADMIN") || role === "ROLE_SUPER_ADMIN";
    } catch {
      return false;
    }
  }, []);

  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringForm, setRecurringForm] = useState({
    name: "",
    defaultAmount: "",
    budgetHead: "",
    costType: "",
  });
  const [recurringSaving, setRecurringSaving] = useState(false);

  // ── Data state ────────────────────────────────────────────────────────────
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<OtherExpense[]>([]);
  const [partnerSpending, setPartnerSpending] = useState<PartnerSpending[]>([]);

  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestions>({
    area: [],
    discipline: [],
    item: [],
    costType: [],
    budgetHead: [],
    paidBy: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [expenseSubTab, setExpenseSubTab] = useState<ExpenseSubTab>("summary");

  // ── Date range ────────────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateRange>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showRangeMenu, setShowRangeMenu] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // ── Monthly nav ───────────────────────────────────────────────────────────
  const now = new Date();
  const [monthYear, setMonthYear] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  // ── Expense CRUD modal ────────────────────────────────────────────────────
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OtherExpense | null>(
    null,
  );
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Mark paid modal ───────────────────────────────────────────────────────
  const [payModal, setPayModal] = useState<MonthlyPayment | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", paidBy: "", notes: "" });
  const [paySaving, setPaySaving] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [feesRes, bookingsRes] = await Promise.all([
        api.get("/admin/fees/payments"),
        api.get("/admin/bookings"),
      ]);
      setFeePayments(feesRes.data || []);
      setBookings(bookingsRes.data || []);
      if (isSuperAdmin) {
        const [expRes, partnerRes, sugRes] = await Promise.all([
          api.get("/admin/expenses"),
          api.get("/admin/expenses/partner-spending"),
          api.get("/admin/expenses/suggestions"),
        ]);
        setExpenses(expRes.data || []);
        setPartnerSpending(partnerRes.data || []);

        setSuggestions(sugRes.data);
      }
    } catch {
      setError("Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  };

  const loadMonthly = async (year: number, month: number) => {
    if (!isSuperAdmin) return;
    const res = await api.get(
      `/admin/expenses/monthly?year=${year}&month=${month}`,
    );
    setMonthlyPayments(res.data || []);
  };

  const saveRecurringItem = async () => {
    if (!recurringForm.name.trim()) return;
    setRecurringSaving(true);
    try {
      await api.post("/admin/expenses/recurring", {
        name: recurringForm.name.trim(),
        defaultAmount: recurringForm.defaultAmount
          ? parseFloat(recurringForm.defaultAmount)
          : null,
        budgetHead: recurringForm.budgetHead || null,
        costType: recurringForm.costType || null,
      });
      setShowRecurringModal(false);
      setRecurringForm({
        name: "",
        defaultAmount: "",
        budgetHead: "",
        costType: "",
      });
      await loadMonthly(monthYear.year, monthYear.month);
      await load();
    } catch {
      alert("Failed to save");
    } finally {
      setRecurringSaving(false);
    }
  };

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    loadMonthly(monthYear.year, monthYear.month);
  }, [monthYear, isSuperAdmin]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const { from, to } = getDateBounds(dateRange, customFrom, customTo);
  const inRange = (d: string) => {
    if (!from && !to) return true;
    const day = d?.split("T")[0];
    if (from && day < from) return false;
    if (to && day > to) return false;
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
  const filteredExpenses = useMemo(
    () =>
      expenses.filter(
        (e) => e.transactionType !== "INCOME" && inRange(e.expenseDate),
      ),
    [expenses, from, to],
  );
  const filteredIncomes = useMemo(
    () =>
      expenses.filter(
        (e) => e.transactionType === "INCOME" && inRange(e.expenseDate),
      ),
    [expenses, from, to],
  );

  const groupedBookings = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        name: string;
        contact: string;
        bookings: Booking[];
        total: number;
      }
    >();
    filteredBookings.forEach((b) => {
      const contact = b.bookedByEmail || "unknown";
      if (groups.has(contact)) {
        const g = groups.get(contact)!;
        g.bookings.push(b);
        g.total += b.amount || 0;
      } else
        groups.set(contact, {
          key: contact,
          name: b.playerName || contact,
          contact,
          bookings: [b],
          total: b.amount || 0,
        });
    });
    return Array.from(groups.values()).sort((a, b) => b.total - a.total);
  }, [filteredBookings]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const feesTotal = filteredFees.reduce((s, p) => s + (p.amount || 0), 0);
  const bookingsTotal = filteredBookings.reduce(
    (s, b) => s + (b.amount || 0),
    0,
  );
  const expensesTotal = filteredExpenses.reduce(
    (s, e) => s + (e.amount || 0),
    0,
  );
  const otherIncomeTotal = filteredIncomes.reduce(
    (s, e) => s + (e.amount || 0),
    0,
  );
  const grossRevenue = feesTotal + bookingsTotal + otherIncomeTotal;
  const netRevenue = grossRevenue - expensesTotal;

  const monthlyPaidTotal = monthlyPayments
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + (p.amount || 0), 0);

  const pendingBookings = bookings.filter(
    (b) => b.status === "PENDING_PAYMENT",
  ).length;

  // ── Category summary ──────────────────────────────────────────────────────
  const [summaryGroupBy, setSummaryGroupBy] = useState<
    "budgetHead" | "area" | "discipline" | "costType"
  >("budgetHead");
  const categorySummary = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    filteredExpenses.forEach((e) => {
      const key = (e[summaryGroupBy] || "Uncategorized") as string;
      const existing = map.get(key) || { total: 0, count: 0 };
      map.set(key, {
        total: existing.total + e.amount,
        count: existing.count + 1,
      });
    });
    return Array.from(map.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses, summaryGroupBy]);

  const rangeLabels: Record<DateRange, string> = {
    all: "All Time",
    today: "Today",
    this_week: "This Week",
    this_month: "This Month",
    custom: customFrom && customTo ? `${customFrom} → ${customTo}` : "Custom",
  };

  // ── Expense CRUD ──────────────────────────────────────────────────────────
  const setF = (k: keyof typeof EMPTY_EXPENSE_FORM) => (v: string) =>
    setExpenseForm((f) => ({ ...f, [k]: v }));
  const openAddExpense = () => {
    setEditingExpense(null);
    setExpenseForm(EMPTY_EXPENSE_FORM);
    setShowExpenseModal(true);
  };
  const openEditExpense = (e: OtherExpense) => {
    setEditingExpense(e);
    setExpenseForm({
      description: e.description,
      amount: String(e.amount),
      expenseDate: e.expenseDate,
      area: e.area || "",
      discipline: e.discipline || "",
      item: e.item || "",
      costType: e.costType || "",
      budgetHead: e.budgetHead || "",
      paidBy: e.paidBy || "",
      notes: e.notes || "",
      transactionType: e.transactionType || "EXPENSE",
    });
    setShowExpenseModal(true);
  };
  const saveExpense = async () => {
    if (!expenseForm.description.trim() || !expenseForm.amount) return;
    setExpenseSaving(true);
    try {
      const payload = {
        description: expenseForm.description.trim(),
        amount: parseFloat(expenseForm.amount),
        expenseDate: expenseForm.expenseDate,
        area: expenseForm.area || null,
        discipline: expenseForm.discipline || null,
        item: expenseForm.item || null,
        costType: expenseForm.costType || null,
        budgetHead: expenseForm.budgetHead || null,
        paidBy: expenseForm.paidBy || null,
        notes: expenseForm.notes || null,
        transactionType: expenseForm.transactionType,
      };
      if (editingExpense)
        await api.put(`/admin/expenses/${editingExpense.publicId}`, payload);
      else await api.post("/admin/expenses", payload);
      setShowExpenseModal(false);
      await load();
    } catch {
      alert("Failed to save expense");
    } finally {
      setExpenseSaving(false);
    }
  };
  const deleteExpense = async (publicId: string) => {
    try {
      await api.delete(`/admin/expenses/${publicId}`);
      setDeleteConfirm(null);
      await load();
    } catch {
      alert("Failed to delete");
    }
  };

  // ── Mark Paid ─────────────────────────────────────────────────────────────
  const openPayModal = (p: MonthlyPayment) => {
    setPayModal(p);
    setPayForm({
      amount: String(p.amount || p.item.defaultAmount || ""),
      paidBy: p.paidBy || "",
      notes: p.notes || "",
    });
  };
  const submitPay = async () => {
    if (!payModal || !payForm.amount) return;
    setPaySaving(true);
    try {
      await api.post("/admin/expenses/monthly/pay", {
        itemPublicId: payModal.item.publicId,
        year: payModal.year,
        month: payModal.month,
        amount: parseFloat(payForm.amount),
        paidBy: payForm.paidBy || null,
        notes: payForm.notes || null,
      });
      setPayModal(null);
      await loadMonthly(monthYear.year, monthYear.month);
    } catch {
      alert("Failed to mark as paid");
    } finally {
      setPaySaving(false);
    }
  };
  const unmarkPayment = async (publicId: string) => {
    try {
      await api.put(`/admin/expenses/monthly/${publicId}/unpay`);
      await loadMonthly(monthYear.year, monthYear.month);
    } catch {
      alert("Failed to unmark");
    }
  };

  const deleteRecurringItem = async (publicId: string) => {
    if (
      !confirm(
        "Remove this recurring item? This won't delete past payment records.",
      )
    )
      return;
    try {
      await api.delete(`/admin/expenses/recurring/${publicId}`);
      await loadMonthly(monthYear.year, monthYear.month);
    } catch {
      alert("Failed to delete recurring item");
    }
  };

  // ── CSV ───────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows: string[][] = [
      [
        "Type",
        "Date",
        "Description",
        "Area",
        "Discipline",
        "Item",
        "Cost Type",
        "Budget Head",
        "Paid By",
        "Amount",
        "Mode",
      ],
    ];
    filteredFees.forEach((p) =>
      rows.push([
        "Fee",
        fmtDate(p.paidOn),
        p.feePlan?.name || "",
        "",
        "",
        "",
        "",
        "",
        "",
        String(p.amount),
        fmtMode(p.paymentMode),
      ]),
    );
    filteredBookings.forEach((b) =>
      rows.push([
        "Booking",
        fmtDate(b.slotDate),
        `${b.resourceType} ${b.startTime}-${b.endTime}`,
        "",
        "",
        "",
        "",
        "",
        "",
        String(b.amount),
        fmtMode(b.paymentMode),
      ]),
    );
    if (isSuperAdmin) {
      filteredExpenses.forEach((e) =>
        rows.push([
          "Expense",
          fmtDate(e.expenseDate),
          csvEscape(e.description),
          e.area || "",
          e.discipline || "",
          e.item || "",
          e.costType || "",
          e.budgetHead || "",
          e.paidBy || "",
          `-${e.amount}`,
          "",
        ]),
      );
      filteredIncomes.forEach((e) =>
        rows.push([
          "Income",
          fmtDate(e.expenseDate),
          csvEscape(e.description),
          e.area || "",
          e.discipline || "",
          e.item || "",
          e.costType || "",
          e.budgetHead || "",
          e.paidBy || "",
          `+${e.amount}`,
          "",
        ]),
      );
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `revenue-${dateRange}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const exportSummaryCSV = () => {
    const rows: string[][] = [["Rank", summaryGroupBy, "Entries", "Amount"]];
    categorySummary.forEach((row, idx) =>
      rows.push([
        String(idx + 1),
        row.key,
        String(row.count),
        String(row.total),
      ]),
    );
    rows.push(["", "Total", "", String(expensesTotal)]);
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `expense-summary-${summaryGroupBy}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const exportPartnerSpendingCSV = () => {
    const rows: string[][] = [["Partner", "Budget Head", "Entries", "Amount"]];
    partnerSpending.forEach((partner) => {
      partner.breakdown.forEach((b) =>
        rows.push([
          partner.name,
          b.budgetHead,
          String(b.count),
          String(b.amount),
        ]),
      );
      rows.push([partner.name, "TOTAL", "", String(partner.total)]);
      rows.push(["", "", "", ""]); // blank row between partners
    });
    rows.push([
      "GRAND TOTAL",
      "",
      "",
      String(partnerSpending.reduce((s, p) => s + p.total, 0)),
    ]);
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `partner-spending-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const exportMonthlyCSV = () => {
    const rows: string[][] = [
      ["Item", "Budget Head", "Status", "Amount", "Paid By", "Paid On"],
    ];
    monthlyPayments.forEach((p) =>
      rows.push([
        p.item.name,
        p.item.budgetHead || "",
        p.status,
        String(p.amount),
        p.paidBy || "",
        p.paidOn ? fmtDate(p.paidOn) : "",
      ]),
    );
    rows.push(["", "", "Total Paid", String(monthlyPaidTotal), "", ""]);
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `monthly-expenses-${MONTHS[monthYear.month - 1]}-${monthYear.year}.csv`;
    a.click();
  };

  const exportAllExpensesCSV = () => {
    const rows: string[][] = [
      [
        "Date",
        "Description",
        "Area",
        "Discipline",
        "Item",
        "Cost Type",
        "Budget Head",
        "Paid By",
        "Amount",
        "Notes",
      ],
    ];
    filteredExpenses.forEach((e) =>
      rows.push([
        fmtDate(e.expenseDate),
        csvEscape(e.description),
        e.area || "",
        e.discipline || "",
        e.item || "",
        e.costType || "",
        e.budgetHead || "",
        e.paidBy || "",
        String(e.amount),
        e.notes || "",
      ]),
    );
    rows.push(["", "", "", "", "", "", "", "Total", String(expensesTotal), ""]);
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `all-expenses-${dateRange}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // ── Recent tx ─────────────────────────────────────────────────────────────
  type TxRow = {
    key: string;
    date: string;
    type: "fee" | "booking" | "expense" | "income";
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
      name: p.player?.displayName || "Unknown",
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
    const exps: TxRow[] = isSuperAdmin
      ? filteredExpenses.map((e) => ({
          key: "e-" + e.publicId,
          date: e.expenseDate,
          type: "expense" as const,
          name: e.paidBy || "Unknown source",
          description: e.description,
          amount: e.amount,
          mode: "—",
        }))
      : [];
    const incs: TxRow[] = isSuperAdmin
      ? filteredIncomes.map((e) => ({
          key: "i-" + e.publicId,
          date: e.expenseDate,
          type: "income" as const,
          name: e.paidBy || "Unknown source",
          description: e.description,
          amount: e.amount,
          mode: "—",
        }))
      : [];
    return [...fees, ...bks, ...exps, ...incs]
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .slice(0, 20);
  }, [
    filteredFees,
    filteredBookings,
    filteredExpenses,
    filteredIncomes,
    isSuperAdmin,
  ]);

  // ─── Loading / Error ───────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading revenue data…</p>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertCircle className="mx-auto text-red-400" size={40} />
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={load}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-16 px-3 sm:px-4 lg:px-0">
      {/* ── Add/Edit Expense Modal ── */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-slate-800 text-lg">
                {editingExpense
                  ? expenseForm.transactionType === "INCOME"
                    ? "Edit Income"
                    : "Edit Expense"
                  : expenseForm.transactionType === "INCOME"
                    ? "Add Income"
                    : "Add Expense"}
              </h2>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Transaction Type Toggle */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                {(["EXPENSE", "INCOME"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      setExpenseForm((f) => ({
                        ...f,
                        transactionType: t,
                        ...(t === "INCOME"
                          ? { area: "", discipline: "", item: "", costType: "" }
                          : {}),
                      }))
                    }
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                      expenseForm.transactionType === t
                        ? t === "EXPENSE"
                          ? "bg-red-500 text-white shadow-sm"
                          : "bg-violet-500 text-white shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    {t === "EXPENSE" ? "− Expense" : "+ Income"}
                  </button>
                ))}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Description *
                </label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setF("description")(e.target.value)}
                  placeholder="e.g. Soil purchase"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>

              {/* Amount + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setF("amount")(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={expenseForm.expenseDate}
                    onChange={(e) => setF("expenseDate")(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Conditional fields */}
              {expenseForm.transactionType === "EXPENSE" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <AutocompleteInput
                      label="Area"
                      value={expenseForm.area}
                      onChange={setF("area")}
                      suggestions={suggestions.area}
                      placeholder="e.g. Turf"
                    />
                    <AutocompleteInput
                      label="Discipline"
                      value={expenseForm.discipline}
                      onChange={setF("discipline")}
                      suggestions={suggestions.discipline}
                      placeholder="e.g. Civil"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <AutocompleteInput
                      label="Item"
                      value={expenseForm.item}
                      onChange={setF("item")}
                      suggestions={suggestions.item}
                      placeholder="e.g. Soil"
                    />
                    <AutocompleteInput
                      label="Cost Type"
                      value={expenseForm.costType}
                      onChange={setF("costType")}
                      suggestions={suggestions.costType}
                      placeholder="e.g. Material"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <AutocompleteInput
                      label="Budget Head"
                      value={expenseForm.budgetHead}
                      onChange={setF("budgetHead")}
                      suggestions={suggestions.budgetHead}
                      placeholder="e.g. Ground Maintenance"
                    />
                    <AutocompleteInput
                      label="Paid By"
                      value={expenseForm.paidBy}
                      onChange={setF("paidBy")}
                      suggestions={suggestions.paidBy}
                      placeholder="e.g. Dhanush"
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <AutocompleteInput
                    label="Source"
                    value={expenseForm.budgetHead}
                    onChange={setF("budgetHead")}
                    suggestions={[
                      "Sponsorship",
                      "Ground Hire",
                      "Merchandise",
                      "Donation",
                      "Event",
                      "Other",
                    ]}
                    placeholder="e.g. Sponsorship"
                  />
                  <AutocompleteInput
                    label="Received From"
                    value={expenseForm.paidBy}
                    onChange={setF("paidBy")}
                    suggestions={suggestions.paidBy}
                    placeholder="e.g. Company name"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Notes
                </label>
                <textarea
                  value={expenseForm.notes}
                  onChange={(e) => setF("notes")(e.target.value)}
                  rows={2}
                  placeholder="Additional details…"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end px-5 py-4 border-t border-slate-100 bg-slate-50 sticky bottom-0 rounded-b-2xl">
              <button
                onClick={() => setShowExpenseModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveExpense}
                disabled={
                  expenseSaving ||
                  !expenseForm.description.trim() ||
                  !expenseForm.amount
                }
                className={`px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50 ${
                  expenseForm.transactionType === "INCOME"
                    ? "bg-violet-600 hover:bg-violet-700"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {expenseSaving
                  ? "Saving…"
                  : editingExpense
                    ? "Save Changes"
                    : expenseForm.transactionType === "INCOME"
                      ? "Add Income"
                      : "Add Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Delete Expense?</p>
                <p className="text-sm text-slate-500">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteExpense(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mark Paid Modal ── */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-800">Mark as Paid</p>
                <p className="text-xs text-slate-500">
                  {payModal.item.name} · {MONTHS[payModal.month - 1]}{" "}
                  {payModal.year}
                </p>
              </div>
              <button
                onClick={() => setPayModal(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  value={payForm.amount}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Paid By
                </label>
                <input
                  type="text"
                  value={payForm.paidBy}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, paidBy: e.target.value }))
                  }
                  placeholder="e.g. Dhanush"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Notes
                </label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Optional"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setPayModal(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitPay}
                disabled={paySaving || !payForm.amount}
                className="px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {paySaving ? "Saving…" : "Confirm Paid"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Recurring Item Modal ── */}
      {showRecurringModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-800">Add Monthly Item</p>
                <p className="text-xs text-slate-500">
                  e.g. Coach Salary, Rent, Electricity
                </p>
              </div>
              <button
                onClick={() => setShowRecurringModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Name *
                </label>
                <input
                  type="text"
                  value={recurringForm.name}
                  onChange={(e) =>
                    setRecurringForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Coach Karthik Salary"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Default Amount (₹)
                </label>
                <input
                  type="number"
                  value={recurringForm.defaultAmount}
                  onChange={(e) =>
                    setRecurringForm((f) => ({
                      ...f,
                      defaultAmount: e.target.value,
                    }))
                  }
                  placeholder="e.g. 18000"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Budget Head
                </label>
                <input
                  type="text"
                  value={recurringForm.budgetHead}
                  onChange={(e) =>
                    setRecurringForm((f) => ({
                      ...f,
                      budgetHead: e.target.value,
                    }))
                  }
                  placeholder="e.g. Salaries, Operations"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setShowRecurringModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveRecurringItem}
                disabled={recurringSaving || !recurringForm.name.trim()}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {recurringSaving ? "Saving…" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin")}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Revenue Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Fees + Bookings{isSuperAdmin ? " + Expenses" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <button
              onClick={() => setShowRangeMenu((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <Calendar size={14} />
              {rangeLabels[dateRange]}
              <ChevronDown size={13} />
            </button>
            {showRangeMenu && (
              <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 w-48 py-1">
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
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${dateRange === val ? "text-emerald-600 font-semibold" : "text-slate-700"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {dateRange === "custom" && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-400 focus:outline-none"
              />
              <span className="text-slate-400 text-xs">→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-400 focus:outline-none"
              />
            </div>
          )}
          <button
            onClick={load}
            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw size={15} className="text-slate-500" />
          </button>
          {isSuperAdmin && (
            <button
              onClick={openAddExpense}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 shadow-sm"
            >
              <Plus size={14} />
              Add Expense
            </button>
          )}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm"
          >
            <Download size={14} />
            CSV
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div
        className={`grid gap-3 ${isSuperAdmin ? "grid-cols-2 lg:grid-cols-6" : "grid-cols-2 lg:grid-cols-4"}`}
      >
        {isSuperAdmin && (
          <SummaryCard
            label="Net Revenue"
            value={fmt(netRevenue)}
            sub={`Gross ${fmt(grossRevenue)} − Exp ${fmt(expensesTotal)}`}
            icon={<TrendingUp size={18} className="text-emerald-600" />}
            bg="bg-gradient-to-br from-emerald-50 to-teal-50"
            border="border-emerald-200"
            valueClass={netRevenue >= 0 ? "text-emerald-700" : "text-red-600"}
          />
        )}
        <SummaryCard
          label="Fees Collected"
          value={fmt(feesTotal)}
          sub={`${filteredFees.length} payments`}
          icon={<IndianRupee size={18} className="text-blue-600" />}
          bg="bg-gradient-to-br from-blue-50 to-indigo-50"
          border="border-blue-200"
          valueClass="text-blue-700"
        />
        <SummaryCard
          label="Booking Revenue"
          value={fmt(bookingsTotal)}
          sub={`${filteredBookings.length} bookings`}
          icon={<BookOpen size={18} className="text-orange-500" />}
          bg="bg-gradient-to-br from-orange-50 to-amber-50"
          border="border-orange-200"
          valueClass="text-orange-600"
        />
        {isSuperAdmin && (
          <SummaryCard
            label="Other Income"
            value={fmt(otherIncomeTotal)}
            sub={`${filteredIncomes.length} entries`}
            icon={<TrendingUp size={18} className="text-violet-600" />}
            bg="bg-gradient-to-br from-violet-50 to-purple-50"
            border="border-violet-200"
            valueClass="text-violet-700"
          />
        )}
        {isSuperAdmin && (
          <SummaryCard
            label="Total Expenses"
            value={fmt(expensesTotal)}
            sub={`${filteredExpenses.length} entries`}
            icon={<TrendingDown size={18} className="text-red-500" />}
            bg="bg-gradient-to-br from-red-50 to-rose-50"
            border="border-red-200"
            valueClass="text-red-600"
          />
        )}
        <SummaryCard
          label="Pending Bookings"
          value={String(pendingBookings)}
          sub="awaiting payment"
          icon={<Clock size={18} className="text-rose-500" />}
          bg="bg-gradient-to-br from-rose-50 to-pink-50"
          border="border-rose-200"
          valueClass="text-rose-600"
        />
      </div>

      {/* ── Main Tabs ── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {(
          [
            ["overview", "Overview"],
            ["fees", `Fees (${filteredFees.length})`],
            ["bookings", `Bookings (${filteredBookings.length})`],
            ...(isSuperAdmin
              ? [["expenses", `Expenses (${filteredExpenses.length})`]]
              : []),
          ] as [Tab, string][]
        ).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Recent Transactions</h2>
            <span className="text-xs text-slate-400">Latest 20</span>
          </div>
          {recentTx.length === 0 ? (
            <EmptyState message="No transactions in this period" />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTx.map((tx) => (
                <div
                  key={tx.key}
                  className="flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        tx.type === "fee"
                          ? "bg-blue-100"
                          : tx.type === "booking"
                            ? "bg-orange-100"
                            : tx.type === "income"
                              ? "bg-violet-100"
                              : "bg-red-100"
                      }`}
                    >
                      {tx.type === "fee" ? (
                        <CreditCard size={13} className="text-blue-600" />
                      ) : tx.type === "booking" ? (
                        <BookOpen size={13} className="text-orange-500" />
                      ) : tx.type === "income" ? (
                        <TrendingUp size={13} className="text-violet-500" />
                      ) : (
                        <TrendingDown size={13} className="text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {tx.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-none">
                        {tx.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p
                      className={`text-sm font-bold ${
                        tx.type === "expense"
                          ? "text-red-600"
                          : tx.type === "income"
                            ? "text-violet-600"
                            : "text-slate-900"
                      }`}
                    >
                      {tx.type === "expense"
                        ? "−"
                        : tx.type === "income"
                          ? "+"
                          : ""}
                      {fmt(tx.amount)}
                    </p>
                    <p className="text-xs text-slate-400">{fmtDate(tx.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FEES ── */}
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
                    {[
                      "Date",
                      "Player",
                      "Plan",
                      "Amount",
                      "Mode",
                      "Reference",
                      "Status",
                      "Next Due",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFees.map((p) => (
                    <tr key={p.publicId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {fmtDate(p.paidOn)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {p.player?.displayName || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {p.feePlan?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900">
                        {fmt(p.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {fmtMode(p.paymentMode)}
                      </td>
                      <td className="px-4 py-3">
                        {p.referenceNumber ? (
                          <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {p.referenceNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                          <CheckCircle2 size={11} />
                          Paid
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {p.nextDueOn ? (
                          <span
                            className={`font-medium ${p.feeStatus === "OVERDUE" ? "text-red-600" : p.feeStatus === "DUE" ? "text-amber-600" : "text-slate-600"}`}
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
                      className="px-4 py-3 text-sm font-semibold text-slate-700"
                    >
                      Total
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-blue-700">
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

      {/* ── BOOKINGS ── */}
      {activeTab === "bookings" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Booking Payments</h2>
            <span className="text-sm font-semibold text-orange-600">
              {fmt(bookingsTotal)}
            </span>
          </div>
          {groupedBookings.length === 0 ? (
            <EmptyState message="No booking payments in this period" />
          ) : (
            <div className="divide-y divide-slate-100">
              {groupedBookings.map((group) => (
                <div key={group.key}>
                  <div
                    onClick={() =>
                      setExpandedUser(
                        expandedUser === group.key ? null : group.key,
                      )
                    }
                    className="flex items-center justify-between px-4 sm:px-5 py-4 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-orange-600">
                          {group.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {group.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {group.contact}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xs text-slate-400 hidden sm:block">
                        {group.bookings.length} bookings
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {fmt(group.total)}
                      </p>
                      <span
                        className={`text-slate-400 text-xs transition-transform ${expandedUser === group.key ? "rotate-180" : ""}`}
                      >
                        ▼
                      </span>
                    </div>
                  </div>
                  {expandedUser === group.key && (
                    <div className="bg-slate-50 border-t border-slate-100 overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200">
                            {[
                              "Date",
                              "Slot",
                              "Resource",
                              "Amount",
                              "Mode",
                              "Status",
                            ].map((h) => (
                              <th key={h} className="text-left px-5 py-2">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.bookings
                            .sort((a, b) => (b.slotDate > a.slotDate ? 1 : -1))
                            .map((b) => (
                              <tr
                                key={b.bookingPublicId}
                                className="hover:bg-white"
                              >
                                <td className="px-5 py-2.5 text-sm text-slate-600">
                                  {fmtDate(b.slotDate)}
                                </td>
                                <td className="px-5 py-2.5 text-sm text-slate-600">
                                  {b.startTime}–{b.endTime}
                                </td>
                                <td className="px-5 py-2.5 text-sm text-slate-600">
                                  {b.resourceType}
                                </td>
                                <td className="px-5 py-2.5 text-sm font-bold text-slate-900">
                                  {fmt(b.amount)}
                                </td>
                                <td className="px-5 py-2.5 text-sm text-slate-600">
                                  {fmtMode(b.paymentMode)}
                                </td>
                                <td className="px-5 py-2.5">
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                    <CheckCircle2 size={11} />
                                    Paid
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-t-2 border-slate-200">
                <span className="text-sm font-semibold text-slate-700">
                  Total · {groupedBookings.length} users
                </span>
                <span className="text-sm font-bold text-orange-600">
                  {fmt(bookingsTotal)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EXPENSES (SUPER ADMIN) ── */}
      {activeTab === "expenses" && isSuperAdmin && (
        <div className="space-y-4">
          {/* Expense Sub-tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            {(
              [
                ["summary", "Summary"],
                ["monthly", "Monthly"],
                ["all", "All Expenses"],
              ] as [ExpenseSubTab, string][]
            ).map(([t, l]) => (
              <button
                key={t}
                onClick={() => setExpenseSubTab(t)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${expenseSubTab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* ── SUMMARY SUB-TAB ── */}
          {expenseSubTab === "summary" && (
            <div className="space-y-4">
              {/* Partner Spending Cards */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                  <Users size={16} className="text-slate-500" />
                  <h2 className="font-bold text-slate-800">Partner Spending</h2>
                  <button
                    onClick={exportPartnerSpendingCSV}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 ml-1"
                  >
                    <Download size={12} />
                    CSV
                  </button>
                </div>
                {partnerSpending.length === 0 ? (
                  <div className="text-center py-10">
                    <Users className="mx-auto text-slate-200 mb-2" size={36} />
                    <p className="text-sm text-slate-400">
                      No partner spending data yet
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Add expenses with "Paid By" to see breakdown
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    <div className="divide-y divide-slate-100">
                      {partnerSpending
                        .sort((a, b) => b.total - a.total)
                        .map((partner) => (
                          <div
                            key={partner.name}
                            className="flex items-center justify-between px-5 py-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-bold text-blue-600">
                                  {partner.name.charAt(0)}
                                </span>
                              </div>
                              <span className="text-sm font-semibold text-slate-800">
                                {partner.name}
                              </span>
                            </div>

                            <span className="text-sm font-bold text-red-600">
                              ₹{partner.total.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t-2 border-slate-200">
                      <span className="text-sm font-semibold text-slate-700">
                        Grand Total
                      </span>
                      <span className="text-sm font-bold text-red-600">
                        {fmt(partnerSpending.reduce((s, p) => s + p.total, 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Category Summary */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <h2 className="font-bold text-slate-800">Breakdown by</h2>
                    <button
                      onClick={exportSummaryCSV}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200"
                    >
                      <Download size={12} />
                      CSV
                    </button>
                  </div>
                  <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                    {(
                      [
                        ["budgetHead", "Budget Head"],
                        ["area", "Area"],
                        ["discipline", "Discipline"],
                        ["costType", "Cost Type"],
                      ] as [typeof summaryGroupBy, string][]
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setSummaryGroupBy(key)}
                        className={`px-2 sm:px-3 py-1 rounded-md text-xs font-medium transition ${summaryGroupBy === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {categorySummary.length === 0 ? (
                  <EmptyState message="No data in this period" />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {categorySummary.map((row, idx) => {
                      const maxAmt = categorySummary[0].total;
                      const pct = maxAmt > 0 ? (row.total / maxAmt) * 100 : 0;
                      return (
                        <div key={row.key} className="px-5 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 w-5">
                                #{idx + 1}
                              </span>
                              <span className="text-sm font-medium text-slate-800">
                                {row.key}
                              </span>
                              <span className="text-xs text-slate-400">
                                {row.count} entries
                              </span>
                            </div>
                            <span className="text-sm font-bold text-red-600">
                              −{fmt(row.total)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 ml-7">
                            <div
                              className="h-1.5 rounded-full bg-red-400"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t-2 border-slate-200">
                      <span className="text-sm font-semibold text-slate-700">
                        Total
                      </span>
                      <span className="text-sm font-bold text-red-600">
                        −{fmt(expensesTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MONTHLY SUB-TAB ── */}
          {expenseSubTab === "monthly" && (
            <div className="space-y-4">
              {/* Month navigator */}
              <div className="relative flex items-center justify-between bg-white rounded-xl border border-slate-200 px-5 py-3 shadow-sm">
                <button
                  onClick={() =>
                    setMonthYear((m) => {
                      const d = new Date(m.year, m.month - 2);
                      return { year: d.getFullYear(), month: d.getMonth() + 1 };
                    })
                  }
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <ChevronDown size={18} className="rotate-90 text-slate-600" />
                </button>
                <div className="text-center">
                  <p className="font-bold text-slate-800 text-lg">
                    {MONTHS[monthYear.month - 1]} {monthYear.year}
                  </p>
                  <p className="text-xs text-slate-400">
                    {fmt(monthlyPaidTotal)} paid this month
                  </p>
                </div>
                <button
                  onClick={() =>
                    setMonthYear((m) => {
                      const d = new Date(m.year, m.month);
                      return { year: d.getFullYear(), month: d.getMonth() + 1 };
                    })
                  }
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <ChevronDown
                    size={18}
                    className="-rotate-90 text-slate-600"
                  />
                </button>
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  <button
                    onClick={exportMonthlyCSV}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200"
                    title="Export monthly CSV"
                  >
                    <Download size={12} />
                    CSV
                  </button>
                  <button
                    onClick={() => setShowRecurringModal(true)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg"
                    title="Add recurring item"
                  >
                    <Plus size={16} className="text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Checklist */}
              {monthlyPayments.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-12">
                  <IndianRupee
                    className="mx-auto text-slate-200 mb-3"
                    size={36}
                  />
                  <p className="text-slate-500 text-sm mb-2">
                    No recurring items set up
                  </p>
                  <p className="text-xs text-slate-400 mb-4">
                    Add items like Coach Salary, Rent, Electricity
                  </p>
                  <button
                    onClick={() => setShowRecurringModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
                  >
                    <Plus size={14} /> Add Recurring Item
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-emerald-700">
                        {
                          monthlyPayments.filter((p) => p.status === "PAID")
                            .length
                        }
                      </p>
                      <p className="text-xs text-emerald-600">Paid</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-amber-700">
                        {
                          monthlyPayments.filter((p) => p.status === "PENDING")
                            .length
                        }
                      </p>
                      <p className="text-xs text-amber-600">Pending</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-slate-700">
                        {fmt(monthlyPaidTotal)}
                      </p>
                      <p className="text-xs text-slate-500">Total Paid</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {monthlyPayments.map((payment) => {
                        const isPaid = payment.status === "PAID";
                        return (
                          <div
                            key={payment.item.publicId}
                            className={`flex items-center gap-3 px-4 sm:px-5 py-4 ${isPaid ? "bg-emerald-50/40" : ""}`}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() =>
                                isPaid && payment.publicId
                                  ? unmarkPayment(payment.publicId)
                                  : openPayModal(payment)
                              }
                              className={`w-6 h-6 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition ${isPaid ? "bg-emerald-500 border-emerald-500" : "border-slate-300 hover:border-emerald-400"}`}
                            >
                              {isPaid && (
                                <Check size={13} className="text-white" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-semibold ${isPaid ? "text-slate-500 line-through" : "text-slate-800"}`}
                              >
                                {payment.item.name}
                              </p>
                              {isPaid && (
                                <p className="text-xs text-emerald-600">
                                  {payment.paidBy
                                    ? `Paid by ${payment.paidBy} · `
                                    : ""}
                                  {fmtDate(payment.paidOn)}
                                  {payment.notes && (
                                    <span className="ml-1 text-slate-400">
                                      · {payment.notes}
                                    </span>
                                  )}
                                </p>
                              )}
                              {!isPaid && payment.item.budgetHead && (
                                <p className="text-xs text-slate-400">
                                  {payment.item.budgetHead}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className={`text-sm font-bold ${isPaid ? "text-emerald-600" : "text-slate-700"}`}
                              >
                                {fmt(payment.amount)}
                              </span>
                              {isPaid ? (
                                <button
                                  onClick={() =>
                                    payment.publicId &&
                                    unmarkPayment(payment.publicId)
                                  }
                                  className="p-1.5 hover:bg-slate-100 rounded-lg"
                                  title="Unmark"
                                >
                                  <RotateCcw
                                    size={13}
                                    className="text-slate-400"
                                  />
                                </button>
                              ) : (
                                <button
                                  onClick={() => openPayModal(payment)}
                                  className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-200"
                                >
                                  Pay
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  deleteRecurringItem(payment.item.publicId)
                                }
                                className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-400 rounded-lg transition"
                                title="Remove this recurring item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ALL EXPENSES SUB-TAB ── */}
          {expenseSubTab === "all" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h2 className="font-bold text-slate-800">All Expenses</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-red-600">
                    {fmt(expensesTotal)}
                  </span>
                  <button
                    onClick={exportAllExpensesCSV}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200"
                  >
                    <Download size={12} />
                    CSV
                  </button>
                  <button
                    onClick={openAddExpense}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600"
                  >
                    <Plus size={13} />
                    Add
                  </button>
                </div>
              </div>
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingDown
                    className="mx-auto text-slate-200 mb-3"
                    size={36}
                  />
                  <p className="text-slate-500 text-sm mb-3">
                    No expenses in this period
                  </p>
                  <button
                    onClick={openAddExpense}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600"
                  >
                    <Plus size={14} />
                    Add Expense
                  </button>
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="sm:hidden divide-y divide-slate-100">
                    {filteredExpenses.map((e) => (
                      <div key={e.publicId} className="px-4 py-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {e.description}
                            </p>
                            <p className="text-xs text-slate-500">
                              {fmtDate(e.expenseDate)}
                              {e.paidBy ? ` · ${e.paidBy}` : ""}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-red-600 flex-shrink-0">
                            −{fmt(e.amount)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {[e.area, e.discipline, e.costType, e.budgetHead]
                            .filter(Boolean)
                            .map((tag, i) => (
                              <span
                                key={i}
                                className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                        </div>
                        {e.notes && (
                          <p className="text-xs text-slate-400 mb-2 italic">
                            {e.notes}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditExpense(e)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg"
                          >
                            <Pencil size={11} />
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(e.publicId)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-500 text-xs font-medium rounded-lg"
                          >
                            <Trash2 size={11} />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t-2 border-slate-200">
                      <span className="text-sm font-semibold text-slate-700">
                        Total
                      </span>
                      <span className="text-sm font-bold text-red-600">
                        −{fmt(expensesTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-500 uppercase tracking-wide border-b bg-slate-50/50">
                          {[
                            "Date",
                            "Description",
                            "Area",
                            "Discipline",
                            "Item",
                            "Cost Type",
                            "Budget Head",
                            "Paid By",
                            "Amount",
                            "Notes",
                            "Actions",
                          ].map((h) => (
                            <th
                              key={h}
                              className="text-left px-4 py-3 whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredExpenses.map((e) => (
                          <tr key={e.publicId} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                              {fmtDate(e.expenseDate)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-800 max-w-[180px] truncate">
                              {e.description}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {e.area || <Dash />}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {e.discipline || <Dash />}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {e.item || <Dash />}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {e.costType || <Dash />}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {e.budgetHead || <Dash />}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {e.paidBy || <Dash />}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-red-600 whitespace-nowrap">
                              −{fmt(e.amount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-400 max-w-[140px]">
                              {e.notes ? (
                                <span
                                  title={e.notes}
                                  className="truncate block cursor-help"
                                >
                                  {e.notes}
                                </span>
                              ) : (
                                <Dash />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEditExpense(e)}
                                  className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(e.publicId)}
                                  className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                          <td
                            colSpan={8}
                            className="px-4 py-3 text-sm font-semibold text-slate-700"
                          >
                            Total
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-red-600">
                            −{fmt(expensesTotal)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
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
    <div className={`rounded-xl border p-3 sm:p-4 ${bg} ${border} shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide leading-tight">
          {label}
        </p>
        <div className="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      </div>
      <p className={`text-xl sm:text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1 truncate">{sub}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <IndianRupee className="mx-auto text-slate-200 mb-3" size={36} />
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
}

function Dash() {
  return <span className="text-slate-300">—</span>;
}
