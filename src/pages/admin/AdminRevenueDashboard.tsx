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
  SlidersHorizontal,
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

type CampPayment = {
  publicId: string;
  campName: string;
  playerName: string;
  amount: number;
  paidAt: string | null;
  paymentMode: string | null;
  enrolledBatchCount: number;
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

type Tab =
  | "overview"
  | "fees"
  | "bookings"
  | "campfees"
  | "expenses"
  | "income";
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
const fmtDateShort = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};
const modeLabel: Record<string, string> = {
  PHONE_PE: "PhonePe",
  PHONEPE: "PhonePe",
  GOOGLE_PAY: "GPay",
  GPAY: "GPay",
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
        <ul className="absolute z-[60] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-44 overflow-y-auto">
          {filtered.map((s) => (
            <li
              key={s}
              onMouseDown={() => {
                onChange(s);
                setOpen(false);
              }}
              className="px-3 py-2.5 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer"
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

  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<OtherExpense[]>([]);
  const [partnerSpending, setPartnerSpending] = useState<PartnerSpending[]>([]);
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([]);

  const [campPayments, setCampPayments] = useState<CampPayment[]>([]);
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

  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const loadRef = useRef(0);
  const [showRangeMenu, setShowRangeMenu] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseFilterBudgetHead, setExpenseFilterBudgetHead] = useState("");
  const [expenseFilterPaidBy, setExpenseFilterPaidBy] = useState("");
  const [incomeSearch, setIncomeSearch] = useState("");
  const [incomeFilterBudgetHead, setIncomeFilterBudgetHead] = useState("");
  const [incomeFilterPaidBy, setIncomeFilterPaidBy] = useState("");
  const now = new Date();
  const [monthYear, setMonthYear] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OtherExpense | null>(
    null,
  );
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [payModal, setPayModal] = useState<MonthlyPayment | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", paidBy: "", notes: "" });
  const [paySaving, setPaySaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    const thisLoad = ++loadRef.current;
    try {
      const [feesRes, bookingsRes, campPaymentsRes] = await Promise.all([
        api.get("/admin/fees/payments"),
        api.get("/admin/bookings"),
        api
          .get("/admin/summer-camps/revenue-payments-all", {
            skipAuthError: true,
          } as any)
          .catch(() => ({ data: [] })),
      ]);

      if (thisLoad !== loadRef.current) return;

      let newExpenses: OtherExpense[] = [];
      let newPartnerSpending: PartnerSpending[] = [];
      let newSuggestions: Suggestions = {
        area: [],
        discipline: [],
        item: [],
        costType: [],
        budgetHead: [],
        paidBy: [],
      };

      if (isSuperAdmin) {
        const [expRes, partnerRes, sugRes] = await Promise.all([
          api.get("/admin/expenses"),
          api.get("/admin/expenses/partner-spending"),
          api.get("/admin/expenses/suggestions"),
        ]);

        if (thisLoad !== loadRef.current) return;

        newExpenses = expRes.data || [];
        newPartnerSpending = partnerRes.data || [];
        newSuggestions = sugRes.data;
      }

      setFeePayments(feesRes.data || []);
      setBookings(bookingsRes.data || []);
      setCampPayments(campPaymentsRes.data || []);
      setExpenses(newExpenses);
      setPartnerSpending(newPartnerSpending);
      setSuggestions(newSuggestions);
    } catch {
      if (thisLoad !== loadRef.current) return;
      setError("Failed to load revenue data");
    } finally {
      if (thisLoad === loadRef.current) setLoading(false);
    }
  };

  const loadMonthly = async (year: number, month: number) => {
    if (!isSuperAdmin) return;
    try {
      const res = await api.get(
        `/admin/expenses/monthly?year=${year}&month=${month}`,
      );
      setMonthlyPayments(res.data || []);
    } catch {
      // silently fail, don't trigger logout
    }
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

  const filteredCampFees = useMemo(
    () => campPayments.filter((p) => p.paidAt && inRange(p.paidAt)),
    [campPayments, from, to],
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

  const searchedExpenses = useMemo(() => {
    return filteredExpenses.filter((e) => {
      const q = expenseSearch.toLowerCase();
      const matchSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        (e.paidBy || "").toLowerCase().includes(q) ||
        (e.budgetHead || "").toLowerCase().includes(q);
      const matchBudgetHead =
        !expenseFilterBudgetHead || e.budgetHead === expenseFilterBudgetHead;
      const matchPaidBy =
        !expenseFilterPaidBy || e.paidBy === expenseFilterPaidBy;
      return matchSearch && matchBudgetHead && matchPaidBy;
    });
  }, [
    filteredExpenses,
    expenseSearch,
    expenseFilterBudgetHead,
    expenseFilterPaidBy,
  ]);

  const searchedIncomes = useMemo(() => {
    return filteredIncomes.filter((e) => {
      const q = incomeSearch.toLowerCase();
      const matchSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        (e.paidBy || "").toLowerCase().includes(q) ||
        (e.budgetHead || "").toLowerCase().includes(q);
      const matchBudgetHead =
        !incomeFilterBudgetHead || e.budgetHead === incomeFilterBudgetHead;
      const matchPaidBy =
        !incomeFilterPaidBy || e.paidBy === incomeFilterPaidBy;
      return matchSearch && matchBudgetHead && matchPaidBy;
    });
  }, [
    filteredIncomes,
    incomeSearch,
    incomeFilterBudgetHead,
    incomeFilterPaidBy,
  ]);

  const feesTotal = filteredFees.reduce((s, p) => s + (p.amount || 0), 0);
  const bookingsTotal = filteredBookings.reduce(
    (s, b) => s + (b.amount || 0),
    0,
  );
  const campFeesTotal = filteredCampFees.reduce(
    (s, p) => s + (p.amount || 0),
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
  const grossRevenue =
    feesTotal + bookingsTotal + campFeesTotal + otherIncomeTotal;
  const netRevenue = grossRevenue - expensesTotal;
  const monthlyPaidTotal = monthlyPayments
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + (p.amount || 0), 0);
  const pendingBookings = bookings.filter(
    (b) => b.status === "PENDING_PAYMENT",
  ).length;

  const rangeLabels: Record<DateRange, string> = {
    all: "All Time",
    today: "Today",
    this_week: "This Week",
    this_month: "This Month",
    custom: customFrom && customTo ? `${customFrom} → ${customTo}` : "Custom",
  };

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
    filteredCampFees.forEach((p) =>
      rows.push([
        "Camp Fee",
        fmtDate(p.paidAt),
        `${p.campName} (${p.enrolledBatchCount} sessions)`,
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
      rows.push(["", "", "", ""]);
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
    const camps: TxRow[] = filteredCampFees.map((p) => ({
      key: "c-" + p.publicId,
      date: p.paidAt || "",
      type: "fee" as const,
      name: p.playerName,
      description: `${p.campName} · ${p.enrolledBatchCount} session${p.enrolledBatchCount !== 1 ? "s" : ""}`,
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
    return [...fees, ...camps, ...bks, ...exps, ...incs]
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .slice(0, 20);
  }, [
    filteredFees,
    filteredCampFees,
    filteredBookings,
    filteredExpenses,
    filteredIncomes,
    isSuperAdmin,
  ]);

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
    <div className="max-w-7xl mx-auto space-y-4 pb-20 px-3 sm:px-4 lg:px-0">
      {/* ── Add/Edit Expense Modal ── */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-slate-800 text-base">
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
            <div className="px-4 py-4 space-y-3 overflow-y-auto flex-1">
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
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${expenseForm.transactionType === t ? (t === "EXPENSE" ? "bg-red-500 text-white shadow-sm" : "bg-violet-500 text-white shadow-sm") : "text-slate-500"}`}
                  >
                    {t === "EXPENSE" ? "− Expense" : "+ Income"}
                  </button>
                ))}
              </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
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
              {expenseForm.transactionType === "EXPENSE" ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="flex gap-3 justify-end px-4 py-3 border-t border-slate-100 bg-slate-50 sticky bottom-0 rounded-b-2xl">
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
                className={`px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50 ${expenseForm.transactionType === "INCOME" ? "bg-violet-600 hover:bg-violet-700" : "bg-red-500 hover:bg-red-600"}`}
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
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
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
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
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
            <div className="px-4 py-4 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  inputMode="numeric"
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
            <div className="flex gap-3 justify-end px-4 py-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
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
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
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
            <div className="px-4 py-4 space-y-3 overflow-y-auto flex-1">
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
                  inputMode="numeric"
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
            <div className="flex gap-3 justify-end px-4 py-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
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

      {/* ── Mobile Filter Bottom Sheet ── */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:hidden">
          <div className="bg-white w-full rounded-t-2xl shadow-2xl px-5 pt-5 pb-8 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-slate-800">Filter by Date</p>
              <button
                onClick={() => setShowFilterSheet(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
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
                    if (val !== "custom") setShowFilterSheet(false);
                  }}
                  className={`py-3 rounded-xl text-sm font-medium border-2 transition ${dateRange === val ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 text-slate-700 bg-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {dateRange === "custom" && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    From
                  </label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    To
                  </label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowFilterSheet(false)}
                  className="w-full py-3 bg-emerald-600 text-white text-sm font-semibold rounded-xl"
                >
                  Apply Filter
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate("/admin")}
            className="p-2 hover:bg-slate-100 rounded-lg flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">
              Revenue
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Fees + Camp Fees + Bookings{isSuperAdmin ? " + Expenses" : ""}
            </p>
          </div>
        </div>

        {/* Desktop controls */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
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

        {/* Mobile controls */}
        <div className="flex sm:hidden items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowFilterSheet(true)}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
          >
            <SlidersHorizontal size={13} className="text-slate-500" />
            <span className="max-w-[56px] truncate text-slate-600">
              {rangeLabels[dateRange]}
            </span>
          </button>
          <button
            onClick={load}
            className="p-2 bg-white border border-slate-200 rounded-lg"
          >
            <RefreshCw size={14} className="text-slate-500" />
          </button>
          <button
            onClick={exportCSV}
            className="p-2 bg-emerald-600 text-white rounded-lg"
          >
            <Download size={14} />
          </button>
          {isSuperAdmin && (
            <>
              <button
                onClick={openAddExpense}
                className="flex items-center gap-1 px-2.5 py-2 bg-red-500 text-white rounded-lg text-xs font-semibold"
              >
                <Plus size={13} />
                Exp
              </button>
              <button
                onClick={() => {
                  setEditingExpense(null);
                  setExpenseForm({
                    ...EMPTY_EXPENSE_FORM,
                    transactionType: "INCOME",
                  });
                  setShowExpenseModal(true);
                }}
                className="flex items-center gap-1 px-2.5 py-2 bg-violet-500 text-white rounded-lg text-xs font-semibold"
              >
                <Plus size={13} />
                Inc
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div
        className={`grid gap-2 sm:gap-3 ${isSuperAdmin ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-7" : "grid-cols-2 lg:grid-cols-4"}`}
      >
        {isSuperAdmin && (
          <SummaryCard
            label="Net Revenue"
            value={fmt(netRevenue)}
            sub={`Gross ${fmt(grossRevenue)} − Exp ${fmt(expensesTotal)}`}
            icon={<TrendingUp size={15} className="text-emerald-600" />}
            bg="bg-gradient-to-br from-emerald-50 to-teal-50"
            border="border-emerald-200"
            valueClass={netRevenue >= 0 ? "text-emerald-700" : "text-red-600"}
            spanFull
          />
        )}
        <SummaryCard
          label="Fees"
          value={fmt(feesTotal)}
          sub={`${filteredFees.length} payments`}
          icon={<IndianRupee size={15} className="text-blue-600" />}
          bg="bg-gradient-to-br from-blue-50 to-indigo-50"
          border="border-blue-200"
          valueClass="text-blue-700"
        />
        <SummaryCard
          label="Camp Fees"
          value={fmt(campFeesTotal)}
          sub={`${filteredCampFees.length} paid`}
          icon={<Users size={15} className="text-teal-600" />}
          bg="bg-gradient-to-br from-teal-50 to-cyan-50"
          border="border-teal-200"
          valueClass="text-teal-700"
        />
        <SummaryCard
          label="Bookings"
          value={fmt(bookingsTotal)}
          sub={`${filteredBookings.length} paid`}
          icon={<BookOpen size={15} className="text-orange-500" />}
          bg="bg-gradient-to-br from-orange-50 to-amber-50"
          border="border-orange-200"
          valueClass="text-orange-600"
        />
        {isSuperAdmin && (
          <SummaryCard
            label="Other Income"
            value={fmt(otherIncomeTotal)}
            sub={`${filteredIncomes.length} entries`}
            icon={<TrendingUp size={15} className="text-violet-600" />}
            bg="bg-gradient-to-br from-violet-50 to-purple-50"
            border="border-violet-200"
            valueClass="text-violet-700"
          />
        )}
        {isSuperAdmin && (
          <SummaryCard
            label="Expenses"
            value={fmt(expensesTotal)}
            sub={`${filteredExpenses.length} entries`}
            icon={<TrendingDown size={15} className="text-red-500" />}
            bg="bg-gradient-to-br from-red-50 to-rose-50"
            border="border-red-200"
            valueClass="text-red-600"
          />
        )}
        <SummaryCard
          label="Pending"
          value={String(pendingBookings)}
          sub="awaiting payment"
          icon={<Clock size={15} className="text-rose-500" />}
          bg="bg-gradient-to-br from-rose-50 to-pink-50"
          border="border-rose-200"
          valueClass="text-rose-600"
        />
      </div>

      {/* ── Main Tabs ── */}
      <div
        className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {(
          [
            ["overview", "Overview"],
            ["fees", `Fees (${filteredFees.length})`],
            ["bookings", `Bookings (${filteredBookings.length})`],
            ["campfees", `Camp Fees (${filteredCampFees.length})`],
            ...(isSuperAdmin
              ? [
                  ["expenses", `Expenses (${filteredExpenses.length})`],
                  ["income", `Income (${filteredIncomes.length})`],
                ]
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
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">
              Recent Transactions
            </h2>
            <span className="text-xs text-slate-400">Latest 20</span>
          </div>
          {recentTx.length === 0 ? (
            <EmptyState message="No transactions in this period" />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTx.map((tx) => (
                <div
                  key={tx.key}
                  className="flex items-center justify-between px-3 sm:px-5 py-3 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === "fee" ? "bg-blue-100" : tx.type === "booking" ? "bg-orange-100" : tx.type === "income" ? "bg-violet-100" : "bg-red-100"}`}
                    >
                      {tx.type === "fee" ? (
                        <CreditCard size={12} className="text-blue-600" />
                      ) : tx.type === "booking" ? (
                        <BookOpen size={12} className="text-orange-500" />
                      ) : tx.type === "income" ? (
                        <TrendingUp size={12} className="text-violet-500" />
                      ) : (
                        <TrendingDown size={12} className="text-red-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {tx.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {tx.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p
                      className={`text-sm font-bold ${tx.type === "expense" ? "text-red-600" : tx.type === "income" ? "text-violet-600" : "text-slate-900"}`}
                    >
                      {tx.type === "expense"
                        ? "−"
                        : tx.type === "income"
                          ? "+"
                          : ""}
                      {fmt(tx.amount)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {fmtDateShort(tx.date)}
                    </p>
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
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">
              Fee Payments
            </h2>
            <span className="text-sm font-semibold text-blue-600">
              {fmt(feesTotal)}
            </span>
          </div>
          {filteredFees.length === 0 ? (
            <EmptyState message="No fee payments in this period" />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-slate-100">
                {filteredFees.map((p) => (
                  <div key={p.publicId} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {p.player?.displayName || "—"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {p.feePlan?.name || "—"}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-slate-900 flex-shrink-0">
                        {fmt(p.amount)}
                      </p>
                    </div>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
                      <span className="text-xs text-slate-400">
                        {fmtDate(p.paidOn)}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {fmtMode(p.paymentMode)}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={10} />
                        Paid
                      </span>
                      {p.nextDueOn && (
                        <span
                          className={`text-xs font-medium ${p.feeStatus === "OVERDUE" ? "text-red-600" : p.feeStatus === "DUE" ? "text-amber-600" : "text-slate-500"}`}
                        >
                          Due: {fmtDateShort(p.nextDueOn)}
                          {p.feeStatus === "OVERDUE" && " ⚠"}
                        </span>
                      )}
                    </div>
                    {p.referenceNumber && (
                      <p className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded mt-1.5 w-fit">
                        {p.referenceNumber}
                      </p>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t-2 border-slate-200">
                  <span className="text-sm font-semibold text-slate-700">
                    Total · {filteredFees.length} payments
                  </span>
                  <span className="text-sm font-bold text-blue-700">
                    {fmt(feesTotal)}
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
            </>
          )}
        </div>
      )}

      {/* ── BOOKINGS ── */}
      {activeTab === "bookings" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">
              Booking Payments
            </h2>
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
                    className="flex items-center justify-between px-3 sm:px-5 py-3.5 hover:bg-slate-50 cursor-pointer active:bg-slate-100"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-orange-600">
                          {group.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {group.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {group.bookings.length} booking
                          {group.bookings.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <p className="text-sm font-bold text-slate-900">
                        {fmt(group.total)}
                      </p>
                      <ChevronDown
                        size={15}
                        className={`text-slate-400 transition-transform ${expandedUser === group.key ? "rotate-180" : ""}`}
                      />
                    </div>
                  </div>
                  {expandedUser === group.key && (
                    <div className="bg-slate-50 border-t border-slate-100">
                      {/* Mobile: simple list */}
                      <div className="sm:hidden divide-y divide-slate-100">
                        {group.bookings
                          .sort((a, b) => (b.slotDate > a.slotDate ? 1 : -1))
                          .map((b) => (
                            <div
                              key={b.bookingPublicId}
                              className="flex items-center justify-between px-4 py-3"
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  {fmtDateShort(b.slotDate)} · {b.startTime}–
                                  {b.endTime}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {b.resourceType} · {fmtMode(b.paymentMode)}
                                </p>
                              </div>
                              <p className="text-sm font-bold text-slate-900">
                                {fmt(b.amount)}
                              </p>
                            </div>
                          ))}
                      </div>
                      {/* Desktop: table */}
                      <div className="hidden sm:block overflow-x-auto">
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
                              .sort((a, b) =>
                                b.slotDate > a.slotDate ? 1 : -1,
                              )
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
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-slate-50 border-t-2 border-slate-200">
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

      {/* ── CAMP FEES ── */}
      {activeTab === "campfees" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">
              Camp Fee Payments
            </h2>
            <span className="text-sm font-semibold text-teal-600">
              {fmt(campFeesTotal)}
            </span>
          </div>
          {filteredCampFees.length === 0 ? (
            <EmptyState message="No camp fee payments in this period" />
          ) : (
            <>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-slate-100">
                {filteredCampFees.map((p) => (
                  <div key={p.publicId} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {p.playerName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {p.campName}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-teal-700 flex-shrink-0">
                        {fmt(p.amount)}
                      </p>
                    </div>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
                      <span className="text-xs text-slate-400">
                        {fmtDate(p.paidAt)}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {p.enrolledBatchCount} session
                        {p.enrolledBatchCount !== 1 ? "s" : ""}
                      </span>
                      {p.paymentMode && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {fmtMode(p.paymentMode)}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={10} /> Paid
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t-2 border-slate-200">
                  <span className="text-sm font-semibold text-slate-700">
                    Total · {filteredCampFees.length} payments
                  </span>
                  <span className="text-sm font-bold text-teal-700">
                    {fmt(campFeesTotal)}
                  </span>
                </div>
              </div>
              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-wide border-b bg-slate-50/50">
                      {[
                        "Date",
                        "Student",
                        "Camp",
                        "Sessions",
                        "Amount",
                        "Mode",
                        "Status",
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
                    {filteredCampFees.map((p) => (
                      <tr key={p.publicId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {fmtDate(p.paidAt)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">
                          {p.playerName}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {p.campName}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {p.enrolledBatchCount}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-teal-700">
                          {fmt(p.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {fmtMode(p.paymentMode)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            <CheckCircle2 size={11} /> Paid
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-sm font-semibold text-slate-700"
                      >
                        Total
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-teal-700">
                        {fmt(campFeesTotal)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── EXPENSES (SUPER ADMIN) ── */}
      {activeTab === "expenses" && isSuperAdmin && (
        <div className="space-y-4">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            {(
              [
                ["summary", "Summary"],
                ["monthly", "Monthly"],
                ["all", "All"],
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

          {/* SUMMARY */}
          {expenseSubTab === "summary" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                  <Users size={15} className="text-slate-500" />
                  <h2 className="font-bold text-slate-800 text-sm sm:text-base flex-1">
                    Partner Spending
                  </h2>
                  <button
                    onClick={exportPartnerSpendingCSV}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200"
                  >
                    <Download size={11} />
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
                    {partnerSpending
                      .sort((a, b) => b.total - a.total)
                      .map((partner) => (
                        <div
                          key={partner.name}
                          className="flex items-center justify-between px-4 sm:px-5 py-3.5"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
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
                    <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-slate-50 border-t-2 border-slate-200">
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
            </div>
          )}

          {/* MONTHLY */}
          {expenseSubTab === "monthly" && (
            <div className="space-y-3">
              <div className="relative flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
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
                  <p className="font-bold text-slate-800 text-base sm:text-lg">
                    {MONTHS[monthYear.month - 1]} {monthYear.year}
                  </p>
                  <p className="text-xs text-slate-400">
                    {fmt(monthlyPaidTotal)} paid
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
                    className="p-1.5 hover:bg-slate-100 rounded-lg"
                    title="Export CSV"
                  >
                    <Download size={13} className="text-slate-400" />
                  </button>
                  <button
                    onClick={() => setShowRecurringModal(true)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg"
                    title="Add recurring item"
                  >
                    <Plus size={15} className="text-slate-500" />
                  </button>
                </div>
              </div>

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
                    <Plus size={14} />
                    Add Recurring Item
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
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
                      <p className="text-base sm:text-lg font-bold text-slate-700 truncate">
                        {fmt(monthlyPaidTotal)}
                      </p>
                      <p className="text-xs text-slate-500">Total</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {monthlyPayments.map((payment) => {
                        const isPaid = payment.status === "PAID";
                        return (
                          <div
                            key={payment.item.publicId}
                            className={`flex items-center gap-3 px-3 sm:px-5 py-3.5 ${isPaid ? "bg-emerald-50/40" : ""}`}
                          >
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
                                className={`text-sm font-semibold truncate ${isPaid ? "text-slate-400 line-through" : "text-slate-800"}`}
                              >
                                {payment.item.name}
                              </p>
                              {isPaid && (
                                <p className="text-xs text-emerald-600 truncate">
                                  {payment.paidBy ? `${payment.paidBy} · ` : ""}
                                  {fmtDateShort(payment.paidOn)}
                                </p>
                              )}
                              {!isPaid && payment.item.budgetHead && (
                                <p className="text-xs text-slate-400 truncate">
                                  {payment.item.budgetHead}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
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
                                    size={12}
                                    className="text-slate-400"
                                  />
                                </button>
                              ) : (
                                <button
                                  onClick={() => openPayModal(payment)}
                                  className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-200"
                                >
                                  Pay
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  deleteRecurringItem(payment.item.publicId)
                                }
                                className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-400 rounded-lg transition"
                                title="Remove"
                              >
                                <Trash2 size={12} />
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

          {/* ALL EXPENSES */}
          {expenseSubTab === "all" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-100">
                <div className="px-4 py-3 bg-slate-50 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800 text-sm sm:text-base">
                    All Expenses
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-red-600">
                      {fmt(searchedExpenses.reduce((s, e) => s + e.amount, 0))}
                    </span>
                    <button
                      onClick={exportAllExpensesCSV}
                      className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200"
                    >
                      <Download size={11} />
                      CSV
                    </button>
                    <button
                      onClick={openAddExpense}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600"
                    >
                      <Plus size={12} />
                      Add
                    </button>
                  </div>
                </div>
                <div className="px-4 py-2.5 bg-white flex flex-wrap gap-2 border-t border-slate-100">
                  <input
                    type="text"
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    placeholder="Search description, paid by…"
                    className="flex-1 min-w-[160px] px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-300 focus:outline-none"
                  />
                  <select
                    value={expenseFilterBudgetHead}
                    onChange={(e) => setExpenseFilterBudgetHead(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-red-300 focus:outline-none bg-white"
                  >
                    <option value="">All Budget Heads</option>
                    {[
                      ...new Set(
                        filteredExpenses
                          .map((e) => e.budgetHead)
                          .filter(Boolean),
                      ),
                    ].map((b) => (
                      <option key={b!} value={b!}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <select
                    value={expenseFilterPaidBy}
                    onChange={(e) => setExpenseFilterPaidBy(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-red-300 focus:outline-none bg-white"
                  >
                    <option value="">All Partners</option>
                    {[
                      ...new Set(
                        filteredExpenses.map((e) => e.paidBy).filter(Boolean),
                      ),
                    ].map((p) => (
                      <option key={p!} value={p!}>
                        {p}
                      </option>
                    ))}
                  </select>
                  {(expenseSearch ||
                    expenseFilterBudgetHead ||
                    expenseFilterPaidBy) && (
                    <button
                      onClick={() => {
                        setExpenseSearch("");
                        setExpenseFilterBudgetHead("");
                        setExpenseFilterPaidBy("");
                      }}
                      className="px-3 py-2 bg-slate-100 text-slate-500 text-xs font-medium rounded-lg hover:bg-slate-200"
                    >
                      Clear
                    </button>
                  )}
                  {(expenseSearch ||
                    expenseFilterBudgetHead ||
                    expenseFilterPaidBy) && (
                    <span className="self-center text-xs text-slate-400">
                      {searchedExpenses.length} of {filteredExpenses.length}{" "}
                      results
                    </span>
                  )}
                </div>
              </div>
              {searchedExpenses.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingDown
                    className="mx-auto text-slate-200 mb-3"
                    size={36}
                  />
                  {expenseSearch ||
                  expenseFilterBudgetHead ||
                  expenseFilterPaidBy ? (
                    <p className="text-slate-500 text-sm">
                      No expenses match your search
                    </p>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="sm:hidden divide-y divide-slate-100">
                    {searchedExpenses.map((e) => (
                      <div key={e.publicId} className="px-4 py-3.5">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {e.description}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {fmtDate(e.expenseDate)}
                              {e.paidBy ? ` · ${e.paidBy}` : ""}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-red-600 flex-shrink-0">
                            −{fmt(e.amount)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
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
                          <p className="text-xs text-slate-400 mb-2 italic truncate">
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
                        −
                        {fmt(
                          searchedExpenses.reduce((s, e) => s + e.amount, 0),
                        )}
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
                        {searchedExpenses.map((e) => (
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
                            −
                            {fmt(
                              searchedExpenses.reduce(
                                (s, e) => s + e.amount,
                                0,
                              ),
                            )}
                          </td>
                          <td colSpan={2} />
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

      {/* ── INCOME (SUPER ADMIN) ── */}
      {activeTab === "income" && isSuperAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100">
            <div className="px-4 py-3 bg-slate-50 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-sm sm:text-base">
                Other Income
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-violet-600">
                  {fmt(searchedIncomes.reduce((s, e) => s + e.amount, 0))}
                </span>
                <button
                  onClick={() => {
                    setEditingExpense(null);
                    setExpenseForm({
                      ...EMPTY_EXPENSE_FORM,
                      transactionType: "INCOME",
                    });
                    setShowExpenseModal(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-500 text-white text-xs font-semibold rounded-lg hover:bg-violet-600"
                >
                  <Plus size={12} />
                  Add
                </button>
              </div>
            </div>
            <div className="px-4 py-2.5 bg-white flex flex-wrap gap-2 border-t border-slate-100">
              <input
                type="text"
                value={incomeSearch}
                onChange={(e) => setIncomeSearch(e.target.value)}
                placeholder="Search description, received from…"
                className="flex-1 min-w-[160px] px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-300 focus:outline-none"
              />
              <select
                value={incomeFilterBudgetHead}
                onChange={(e) => setIncomeFilterBudgetHead(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-violet-300 focus:outline-none bg-white"
              >
                <option value="">All Sources</option>
                {[
                  ...new Set(
                    filteredIncomes.map((e) => e.budgetHead).filter(Boolean),
                  ),
                ].map((b) => (
                  <option key={b!} value={b!}>
                    {b}
                  </option>
                ))}
              </select>
              <select
                value={incomeFilterPaidBy}
                onChange={(e) => setIncomeFilterPaidBy(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-violet-300 focus:outline-none bg-white"
              >
                <option value="">All Received From</option>
                {[
                  ...new Set(
                    filteredIncomes.map((e) => e.paidBy).filter(Boolean),
                  ),
                ].map((p) => (
                  <option key={p!} value={p!}>
                    {p}
                  </option>
                ))}
              </select>
              {(incomeSearch ||
                incomeFilterBudgetHead ||
                incomeFilterPaidBy) && (
                <button
                  onClick={() => {
                    setIncomeSearch("");
                    setIncomeFilterBudgetHead("");
                    setIncomeFilterPaidBy("");
                  }}
                  className="px-3 py-2 bg-slate-100 text-slate-500 text-xs font-medium rounded-lg hover:bg-slate-200"
                >
                  Clear
                </button>
              )}
              {(incomeSearch ||
                incomeFilterBudgetHead ||
                incomeFilterPaidBy) && (
                <span className="self-center text-xs text-slate-400">
                  {searchedIncomes.length} of {filteredIncomes.length} results
                </span>
              )}
            </div>
          </div>

          {searchedIncomes.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="mx-auto text-slate-200 mb-3" size={36} />
              {incomeSearch || incomeFilterBudgetHead || incomeFilterPaidBy ? (
                <p className="text-slate-500 text-sm">
                  No income entries match your search
                </p>
              ) : (
                <>
                  <p className="text-slate-500 text-sm mb-3">
                    No income entries in this period
                  </p>
                  <button
                    onClick={() => {
                      setEditingExpense(null);
                      setExpenseForm({
                        ...EMPTY_EXPENSE_FORM,
                        transactionType: "INCOME",
                      });
                      setShowExpenseModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500 text-white text-sm font-semibold rounded-lg hover:bg-violet-600"
                  >
                    <Plus size={14} />
                    Add Income
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-slate-100">
                {searchedIncomes.map((e) => (
                  <div key={e.publicId} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {e.description}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {fmtDate(e.expenseDate)}
                          {e.paidBy ? ` · ${e.paidBy}` : ""}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-violet-600 flex-shrink-0">
                        +{fmt(e.amount)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {[e.budgetHead, e.paidBy]
                        .filter(Boolean)
                        .map((tag, i) => (
                          <span
                            key={i}
                            className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>
                    {e.notes && (
                      <p className="text-xs text-slate-400 mb-2 italic truncate">
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
                    Total · {filteredIncomes.length} entries
                  </span>
                  <span className="text-sm font-bold text-violet-600">
                    +{fmt(searchedIncomes.reduce((s, e) => s + e.amount, 0))}
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
                        "Source",
                        "Received From",
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
                    {searchedIncomes.map((e) => (
                      <tr key={e.publicId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {fmtDate(e.expenseDate)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800 max-w-[180px] truncate">
                          {e.description}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {e.budgetHead || <Dash />}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {e.paidBy || <Dash />}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-violet-600 whitespace-nowrap">
                          +{fmt(e.amount)}
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
                        colSpan={4}
                        className="px-4 py-3 text-sm font-semibold text-slate-700"
                      >
                        Total · {filteredIncomes.length} entries
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-violet-600">
                        +
                        {fmt(searchedIncomes.reduce((s, e) => s + e.amount, 0))}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
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
  spanFull,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  bg: string;
  border: string;
  valueClass: string;
  spanFull?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 ${bg} ${border} shadow-sm ${spanFull ? "col-span-2 sm:col-span-1" : ""}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide leading-tight">
          {label}
        </p>
        <div className="w-6 h-6 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      </div>
      <p className={`text-lg sm:text-2xl font-bold ${valueClass} truncate`}>
        {value}
      </p>
      <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
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
