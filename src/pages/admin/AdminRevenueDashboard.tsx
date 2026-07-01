import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FeeSummaryTable } from "./FeeSummaryTable";
import type { FeeCollectionSummaryRow } from "./FeeSummaryTable";
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
  Award,
} from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-hot-toast";

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
  reversedPaymentPublicId?: string;
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

// ── NEW: Registration Fee type ──
type RegFeeRow = {
  playerPublicId: string;
  playerName: string;
  phone: string | null;
  parentsPhone: string | null;
  regFeePaid: boolean;
  regFeePaidOn: string | null;
  regFeePaymentMode: string | null;
  regFeeAmount: number;
};

type SubRevenueRow = {
  publicId: string;
  userName: string;
  userPhone: string;
  pricePaid: number;
  paymentMode: string;
  activatedAt: string | null;
  status: string;
  sessionsPerMonth: number;
  planMonths: number;
  isHistorical: boolean;
};

type Tab =
  | "fees"
  | "bookings"
  | "campfees"
  | "feesummary"
  | "regfees"
  | "subscriptions"
  | "expenses"
  | "income"
  | "installments"
  | "commission";

type CommissionRow = {
  memberName: string;
  memberPhone: string;
  subscriptionPublicId?: string;
  sessionsUsed: number;
  pricePaid: number;
  totalSessions: number;
  sessionValue: number;
  source: "Subscription" | "Direct Booking";
  ballCount?: number | null;
  bookingPublicId?: string;
};
type CommissionRateMode = "10" | "15" | "custom";
type UsageEntry = { id: string; usedAt: string; sessionsUsed: number };
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

const REG_FEE_PAYMENT_MODES = [
  { value: "PHONE_PE", label: "PhonePe" },
  { value: "GOOGLE_PAY", label: "Google Pay" },
  { value: "CASH", label: "Cash" },
  { value: "ONLINE", label: "Online / Bank Transfer" },
  { value: "OTHER", label: "Other" },
];

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
  const [feeSummary, setFeeSummary] = useState<FeeCollectionSummaryRow[]>([]);
  const [feeSummaryLoaded, setFeeSummaryLoaded] = useState(false);
  const [feeSummaryLoading, setFeeSummaryLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions>({
    area: [],
    discipline: [],
    item: [],
    costType: [],
    budgetHead: [],
    paidBy: [],
  });

  // ── NEW: Registration Fee state ──
  const [regFees, setRegFees] = useState<RegFeeRow[]>([]);
  const [regFeeSearch, setRegFeeSearch] = useState("");
  const [showRegFeeModal, setShowRegFeeModal] = useState<RegFeeRow | null>(
    null,
  );
  const [regFeeMode, setRegFeeMode] = useState("PHONE_PE");
  const [regFeePaidOn, setRegFeePaidOn] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [savingRegFee, setSavingRegFee] = useState(false);

  const [subRevenue, setSubRevenue] = useState<SubRevenueRow[]>([]);
  const [subRevenueSearch, setSubRevenueSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("fees");
  const [expenseSubTab, setExpenseSubTab] = useState<ExpenseSubTab>("summary");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const loadRef = useRef(0);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [tabFade, setTabFade] = useState({ left: false, right: false });
  const [showRangeMenu, setShowRangeMenu] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [bookingResourceFilter, setBookingResourceFilter] =
    useState<string>("ALL");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<
    "PAID" | "PENDING"
  >("PAID");
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

  type InstallmentPaymentRow = {
    publicId: string;
    amount: number;
    paymentMode: string;
    referenceNumber: string | null;
    paidOn: string;
    playerName: string;
    playerPublicId: string;
    planDescription: string | null;
    installmentNumber: number;
  };

  const [installmentPayments, setInstallmentPayments] = useState<
    InstallmentPaymentRow[]
  >([]);

  // ── Commission state ──
  const nowIso = new Date().toISOString();
  const [commissionMonth, setCommissionMonth] = useState(nowIso.substring(0, 7));
  const [commissionData, setCommissionData] = useState<CommissionRow[]>([]);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [commissionRateMode, setCommissionRateMode] = useState<CommissionRateMode>("10");
  const [commissionRateCustom, setCommissionRateCustom] = useState("");
  const [defaultRate, setDefaultRate] = useState<number>(10);
  const [savingRate, setSavingRate] = useState(false);
  // Part A — direct booking edit
  const [editDirectModal, setEditDirectModal] = useState<CommissionRow | null>(null);
  const [editBallCount, setEditBallCount] = useState<60 | 120 | 180 | 240>(60);
  const [editAmount, setEditAmount] = useState("");
  const [editDirectSaving, setEditDirectSaving] = useState(false);
  // Part B — subscription usage log expand/edit
  const [expandedSubKeys, setExpandedSubKeys] = useState<Set<string>>(new Set());
  const [usageEntries, setUsageEntries] = useState<Record<string, UsageEntry[]>>({});
  const [usageEntriesLoading, setUsageEntriesLoading] = useState<Set<string>>(new Set());
  const [editingEntry, setEditingEntry] = useState<{ id: string; usedAt: string; sessionsUsed: number; subKey: string } | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<{ id: string; subKey: string } | null>(null);

  // ── NEW: Registration Fee handlers ──
  const handleMarkRegFeePaid = async () => {
    if (!showRegFeeModal) return;
    setSavingRegFee(true);
    try {
      await api.post(
        `/admin/fees/players/${showRegFeeModal.playerPublicId}/registration-fee?paymentMode=${regFeeMode}&paidOn=${regFeePaidOn}`,
      );
      toast.success(
        `Registration fee marked paid for ${showRegFeeModal.playerName}`,
      );
      setShowRegFeeModal(null);
      await load();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to mark registration fee",
      );
    } finally {
      setSavingRegFee(false);
    }
  };

  const handleUnmarkRegFee = async (
    playerPublicId: string,
    playerName: string,
  ) => {
    if (!window.confirm(`Unmark registration fee for ${playerName}?`)) return;
    try {
      await api.delete(
        `/admin/fees/players/${playerPublicId}/registration-fee`,
      );
      toast.success("Registration fee unmarked");
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to unmark");
    }
  };

  const load = async () => {
    setLoading(true);
    setError("");
    const thisLoad = ++loadRef.current;
    try {
      const [
        feesRes,
        bookingsRes,
        campPaymentsRes,
        regFeesRes,
        subRevenueRes,
        installmentPaymentsRes,
      ] = await Promise.all([
        api.get("/admin/fees/payments"),
        api.get("/admin/bookings"),
        api
          .get("/admin/camp-revenue/payments", { skipAuthError: true } as any)
          .catch(() => ({ data: [] })),
        api.get("/admin/fees/registration-fees").catch(() => ({ data: [] })),
        api.get("/admin/subscriptions/revenue").catch(() => ({ data: [] })),
        api
          .get("/admin/fee-installments/all-payments")
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
      setRegFees(regFeesRes.data || []);
      setSubRevenue(subRevenueRes.data || []);
      setExpenses(newExpenses);
      setPartnerSpending(newPartnerSpending);
      setSuggestions(newSuggestions);
      setInstallmentPayments(installmentPaymentsRes.data || []);
      setFeeSummaryLoaded(false);
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
      /* silently fail */
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
    // Load commission rate and eagerly populate badge count
    api.get("/admin/bowling/commission-rate")
      .then(res => {
        const rate = parseFloat(res.data?.rate ?? 10);
        setDefaultRate(rate);
        if (rate === 10) setCommissionRateMode("10");
        else if (rate === 15) setCommissionRateMode("15");
        else { setCommissionRateMode("custom"); setCommissionRateCustom(String(rate)); }
      })
      .catch(() => {/* keep default 10 */});
    // Eagerly fetch commission data so the tab badge shows a real count on first render
    loadCommissionData(new Date().toISOString().substring(0, 7));
  }, []);
  useEffect(() => {
    loadMonthly(monthYear.year, monthYear.month);
  }, [monthYear, isSuperAdmin]);
  useEffect(() => {
    if (activeTab === "commission") {
      loadCommissionData(commissionMonth);
    }
  }, [activeTab]);
  useEffect(() => {
    if (activeTab !== "feesummary" || feeSummaryLoaded) return;
    setFeeSummaryLoading(true);
    api
      .get("/admin/fees/collection-summary")
      .then((res) => {
        setFeeSummary(res.data || []);
        setFeeSummaryLoaded(true);
      })
      .catch(() => setFeeSummary([]))
      .finally(() => setFeeSummaryLoading(false));
  }, [activeTab, feeSummaryLoaded]);
  useEffect(() => {
    const el = tabBarRef.current;
    if (!el) return;
    const update = () =>
      setTabFade({
        left: el.scrollLeft > 2,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
      });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Scroll the active tab pill into view whenever it changes (desktop pill row)
  useEffect(() => {
    const el = tabBarRef.current;
    if (!el) return;
    const btn = el.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement | null;
    if (btn) btn.scrollIntoView({ inline: "nearest", behavior: "smooth", block: "nearest" });
  }, [activeTab]);

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
  // Set of NORMAL row publicIds that have a matching REVERSAL row. Used to show
  // "Reversed" status badge in the Fees table without hiding the original row.
  const reversedNormalIds = useMemo(
    () =>
      new Set(
        feePayments
          .filter((p) => p.type === "REVERSAL" && p.reversedPaymentPublicId)
          .map((p) => p.reversedPaymentPublicId!),
      ),
    [feePayments],
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
      const contact =
        b.playerName?.trim().toLowerCase() || b.bookedByEmail || "unknown";
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

  const searchedExpenses = useMemo(
    () =>
      filteredExpenses.filter((e) => {
        const q = expenseSearch.toLowerCase();
        return (
          (!q ||
            e.description.toLowerCase().includes(q) ||
            (e.paidBy || "").toLowerCase().includes(q) ||
            (e.budgetHead || "").toLowerCase().includes(q)) &&
          (!expenseFilterBudgetHead ||
            e.budgetHead === expenseFilterBudgetHead) &&
          (!expenseFilterPaidBy || e.paidBy === expenseFilterPaidBy)
        );
      }),
    [
      filteredExpenses,
      expenseSearch,
      expenseFilterBudgetHead,
      expenseFilterPaidBy,
    ],
  );

  const searchedIncomes = useMemo(
    () =>
      filteredIncomes.filter((e) => {
        const q = incomeSearch.toLowerCase();
        return (
          (!q ||
            e.description.toLowerCase().includes(q) ||
            (e.paidBy || "").toLowerCase().includes(q) ||
            (e.budgetHead || "").toLowerCase().includes(q)) &&
          (!incomeFilterBudgetHead ||
            e.budgetHead === incomeFilterBudgetHead) &&
          (!incomeFilterPaidBy || e.paidBy === incomeFilterPaidBy)
        );
      }),
    [filteredIncomes, incomeSearch, incomeFilterBudgetHead, incomeFilterPaidBy],
  );

  // Subtract in-range REVERSAL rows — they are excluded from filteredFees (the display list)
  // but their positive amounts must still offset the original NORMAL rows in the sum.
  // Without this, a reversed ₹15k NORMAL row remains counted while the ₹15k REVERSAL row
  // is simply discarded, leaving revenue overstated by the full reversal amount.
  const feesReversalAdjustment = feePayments
    .filter((p) => p.type === "REVERSAL" && inRange(p.paidOn))
    .reduce((s, p) => s + (p.amount || 0), 0);
  const feesTotal =
    filteredFees.reduce((s, p) => s + (p.amount || 0), 0) - feesReversalAdjustment;
  const bookingsTotal = filteredBookings.reduce(
    (s, b) => s + (b.amount || 0),
    0,
  );
  const campFeesTotal = filteredCampFees.reduce(
    (s, p) => s + (p.amount || 0),
    0,
  );
  const monthlyPaidTotal = monthlyPayments
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + (p.amount || 0), 0);
  const pendingBookings = bookings.filter(
    (b) => b.status === "PENDING_PAYMENT",
  ).length;
  const pendingBookingsList = useMemo(
    () => bookings.filter((b) => b.status === "PENDING_PAYMENT"),
    [bookings],
  );
  const expensesTotal =
    filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0) +
    monthlyPaidTotal;
  const otherIncomeTotal = filteredIncomes.reduce(
    (s, e) => s + (e.amount || 0),
    0,
  );

  // ── NEW: Registration Fee totals ──
  const regFeesTotal = regFees
    .filter((r) => r.regFeePaid && inRange(r.regFeePaidOn || ""))
    .reduce((s, r) => s + (r.regFeeAmount || 1500), 0);
  const regFeesPaidCount = regFees.filter((r) => r.regFeePaid).length;
  const filteredRegFees = useMemo(
    () =>
      regFees.filter(
        (r) =>
          !regFeeSearch ||
          r.playerName.toLowerCase().includes(regFeeSearch.toLowerCase()),
      ),
    [regFees, regFeeSearch],
  );

  const subRevenueTotal = subRevenue
    .filter((r) => !r.isHistorical && r.activatedAt && inRange(r.activatedAt))
    .reduce((s, r) => s + (r.pricePaid || 0), 0);

  const subRevenueInRangeCount = subRevenue.filter(
    (r) => !r.isHistorical && r.activatedAt && inRange(r.activatedAt),
  ).length;

  const bmCount = filteredBookings.filter(
    (b) => b.resourceType === "BOWLING_MACHINE",
  ).length;
  const astroCount = filteredBookings.filter(
    (b) => b.resourceType === "ASTRO",
  ).length;
  const tennisCount = filteredBookings.filter(
    (b) => b.resourceType === "TENNIS_BALL",
  ).length;

  const membershipBookingsTotal = filteredBookings
    .filter((b) => b.resourceType === "BOWLING_MACHINE_MEMBERSHIP")
    .reduce((s, b) => s + (b.amount || 0), 0);

  const astroTurfTotal = filteredBookings
    .filter((b) => b.resourceType === "ASTRO")
    .reduce((s, b) => s + (b.amount || 0), 0);

  const tennisBallTotal = filteredBookings
    .filter((b) => b.resourceType === "TENNIS_BALL")
    .reduce((s, b) => s + (b.amount || 0), 0);

  const bowlingMachineTotal = filteredBookings
    .filter((b) => b.resourceType === "BOWLING_MACHINE")
    .reduce((s, b) => s + (b.amount || 0), 0);

  const regularBookingsTotal = bookingsTotal - membershipBookingsTotal;

  const filteredBookingsTotal = useMemo(() => {
    if (bookingResourceFilter === "ALL") {
      return filteredBookings.reduce((s, b) => s + (b.amount || 0), 0);
    }
    return filteredBookings
      .filter((b) => b.resourceType === bookingResourceFilter)
      .reduce((s, b) => s + (b.amount || 0), 0);
  }, [filteredBookings, bookingResourceFilter]);

  const filteredSubRevenue = useMemo(
    () =>
      subRevenue.filter(
        (r) =>
          !subRevenueSearch ||
          r.userName.toLowerCase().includes(subRevenueSearch.toLowerCase()),
      ),
    [subRevenue, subRevenueSearch],
  );

  const filteredInstallmentPayments = useMemo(
    () => installmentPayments.filter((p) => inRange(p.paidOn)),
    [installmentPayments, from, to],
  );

  const installmentPaymentsTotal = filteredInstallmentPayments.reduce(
    (s, p) => s + Number(p.amount),
    0,
  );

  // ── Commission computed values (client-side, updates instantly with rate change) ──
  const effectiveRate =
    commissionRateMode === "10" ? 10
    : commissionRateMode === "15" ? 15
    : parseFloat(commissionRateCustom) || 0;
  const commTotalSessions = commissionData.reduce((s, r) => s + r.sessionsUsed, 0);
  const commTotalValue = commissionData.reduce((s, r) => s + Number(r.sessionValue), 0);
  const commTotalDue = commTotalValue * effectiveRate / 100;

  // ── grossRevenue now includes reg fees ──
  const grossRevenue =
    feesTotal +
    bookingsTotal +
    campFeesTotal +
    otherIncomeTotal +
    regFeesTotal +
    subRevenueTotal +
    installmentPaymentsTotal;
  const netRevenue = grossRevenue - expensesTotal;

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
  const loadCommissionData = async (month: string) => {
    setCommissionLoading(true);
    let subRows: CommissionRow[] = [];
    let directRows: CommissionRow[] = [];

    // Fetch both independently so one failure doesn't wipe the other
    try {
      const res = await api.get(`/admin/bowling/usage-report?month=${month}`);
      subRows = (res.data || []).map((r: CommissionRow) => ({
        ...r,
        source: "Subscription" as const,
      }));
      console.log(`[Commission] /usage-report ${month}: ${subRows.length} row(s)`, subRows);
    } catch (e) {
      console.error("[Commission] /usage-report failed:", e);
      toast.error("Failed to load subscription session data");
    }

    try {
      const res = await api.get(`/admin/bowling/direct-bookings?month=${month}`);
      console.log(`[Commission] /direct-bookings ${month}: raw response`, res.data);
      directRows = (res.data || []).map(
        (r: { memberName: string; memberPhone: string; sessionValue: number; bookingPublicId: string; ballCount: number | null }) => {
          const sessions = r.ballCount ? Math.round(r.ballCount / 60) : 1;
          return {
            memberName: r.memberName,
            memberPhone: r.memberPhone,
            subscriptionPublicId: undefined,
            sessionsUsed: sessions,
            pricePaid: Number(r.sessionValue),
            totalSessions: 1,
            sessionValue: Number(r.sessionValue),
            source: "Direct Booking" as const,
            ballCount: r.ballCount,
            bookingPublicId: r.bookingPublicId,
          };
        },
      );
      console.log(`[Commission] /direct-bookings ${month}: ${directRows.length} mapped row(s)`, directRows);
    } catch (e) {
      console.error("[Commission] /direct-bookings failed:", e);
      toast.error("Failed to load direct booking data");
    }

    console.log(`[Commission] merged total for ${month}:`, [...subRows, ...directRows]);
    setCommissionData([...subRows, ...directRows]);
    setCommissionLoading(false);
  };

  const saveCommissionRate = async () => {
    const rate =
      commissionRateMode === "10" ? "10.00"
      : commissionRateMode === "15" ? "15.00"
      : commissionRateCustom;
    if (!rate || isNaN(parseFloat(rate))) return;
    setSavingRate(true);
    try {
      await api.put("/admin/bowling/commission-rate", { rate });
      setDefaultRate(parseFloat(rate));
      toast.success("Commission rate saved");
    } catch {
      toast.error("Failed to save rate");
    } finally {
      setSavingRate(false);
    }
  };

  // ── Part A: direct booking edit ──────────────────────────────────────────
  const openDirectEdit = (row: CommissionRow) => {
    setEditDirectModal(row);
    setEditBallCount(([60, 120, 180, 240].includes(row.ballCount ?? 0)
      ? row.ballCount
      : 60) as 60 | 120 | 180 | 240);
    setEditAmount(String(row.pricePaid));
  };

  const saveDirectBookingEdit = async () => {
    if (!editDirectModal?.bookingPublicId) return;
    setEditDirectSaving(true);
    try {
      await api.patch(`/admin/bookings/${editDirectModal.bookingPublicId}/edit`, {
        ballCount: editBallCount,
        amount: parseFloat(editAmount) || undefined,
      });
      toast.success("Booking updated");
      setEditDirectModal(null);
      loadCommissionData(commissionMonth);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update booking");
    } finally {
      setEditDirectSaving(false);
    }
  };

  // ── Part B: subscription usage log expand/edit ────────────────────────────
  const loadUsageEntries = async (subPublicId: string) => {
    setUsageEntriesLoading((prev) => new Set(prev).add(subPublicId));
    try {
      const res = await api.get(
        `/admin/bowling/usage-entries?subscriptionPublicId=${subPublicId}&month=${commissionMonth}`,
      );
      setUsageEntries((prev) => ({ ...prev, [subPublicId]: res.data || [] }));
    } catch {
      toast.error("Failed to load usage log");
    } finally {
      setUsageEntriesLoading((prev) => {
        const next = new Set(prev);
        next.delete(subPublicId);
        return next;
      });
    }
  };

  const toggleSubExpand = (subKey: string) => {
    setExpandedSubKeys((prev) => {
      const next = new Set(prev);
      if (next.has(subKey)) {
        next.delete(subKey);
      } else {
        next.add(subKey);
        if (!usageEntries[subKey]) loadUsageEntries(subKey);
      }
      return next;
    });
  };

  // Stub — full endpoint built after UI approval
  const saveUsageEntryEdit = async () => {
    if (!editingEntry) return;
    console.log("[TODO] PATCH /admin/bowling/usage-entries/" + editingEntry.id, editingEntry);
    toast("(stub) Save wired after UI approval");
    setEditingEntry(null);
  };

  // Stub — full endpoint built after UI approval
  const confirmDeleteUsageEntry = async () => {
    if (!deletingEntry) return;
    console.log("[TODO] DELETE /admin/bowling/usage-entries/" + deletingEntry.id);
    toast("(stub) Delete wired after UI approval");
    setDeletingEntry(null);
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
    // ── NEW: include reg fees in CSV ──
    regFees
      .filter((r) => r.regFeePaid && inRange(r.regFeePaidOn || ""))
      .forEach((r) =>
        rows.push([
          "Reg Fee",
          fmtDate(r.regFeePaidOn),
          `${r.playerName} - Registration Fee`,
          "",
          "",
          "",
          "",
          "",
          "",
          String(r.regFeeAmount),
          fmtMode(r.regFeePaymentMode),
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
    type: "fee" | "booking" | "expense" | "income" | "regfee";
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
    const instTx: TxRow[] = filteredInstallmentPayments.map((p) => ({
      key: "inst-" + p.publicId,
      date: p.paidOn,
      type: "fee" as const,
      name: p.playerName,
      description: `Installment #${p.installmentNumber}${p.planDescription ? " · " + p.planDescription : ""}`,
      amount: Number(p.amount),
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
      description: `${b.resourceType}${b.startTime && b.endTime ? ` · ${b.startTime}–${b.endTime}` : ""}`,
      amount: b.amount,
      mode: fmtMode(b.paymentMode),
    }));
    // ── NEW: reg fees in overview ──
    const regs: TxRow[] = regFees
      .filter((r) => r.regFeePaid && inRange(r.regFeePaidOn || ""))
      .map((r) => ({
        key: "reg-" + r.playerPublicId,
        date: r.regFeePaidOn || "",
        type: "regfee" as const,
        name: r.playerName,
        description: "Registration Fee",
        amount: r.regFeeAmount,
        mode: fmtMode(r.regFeePaymentMode),
      }));
    const subs: TxRow[] = subRevenue
      .filter((r) => r.activatedAt && inRange(r.activatedAt))
      .map((r) => ({
        key: "sub-" + r.publicId,
        date: r.activatedAt || "",
        type: "fee" as const,
        name: r.userName,
        description: `Membership · ${r.sessionsPerMonth} sessions × ${r.planMonths}mo`,
        amount: r.pricePaid,
        mode: fmtMode(r.paymentMode),
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
    return [
      ...fees,
      ...instTx,
      ...camps,
      ...bks,
      ...regs,
      ...subs,
      ...exps,
      ...incs,
    ]
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .slice(0, 20);
  }, [
    filteredFees,
    filteredInstallmentPayments,
    filteredCampFees,
    filteredBookings,
    regFees,
    filteredExpenses,
    filteredIncomes,
    isSuperAdmin,
    from,
    subRevenue,
    to,
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
      {/* ── NEW: Registration Fee Modal ── */}
      {showRegFeeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50 rounded-t-2xl sm:rounded-t-xl">
              <div>
                <h3 className="font-bold text-slate-800">
                  Mark Registration Fee Paid
                </h3>
                <p className="text-xs text-slate-500">
                  {showRegFeeModal.playerName} · ₹1,500
                </p>
              </div>
              <button onClick={() => setShowRegFeeModal(null)}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-purple-700">₹1,500</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  One-time registration fee
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={regFeePaidOn}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setRegFeePaidOn(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Payment Mode
                </label>
                <select
                  value={regFeeMode}
                  onChange={(e) => setRegFeeMode(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {REG_FEE_PAYMENT_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1 pb-4">
                <button
                  onClick={() => setShowRegFeeModal(null)}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkRegFeePaid}
                  disabled={savingRegFee}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingRegFee ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  {savingRegFee ? "Saving…" : "Confirm Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    if (val !== "custom") {
                      setShowFilterSheet(false);
                    }
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
      <div className="flex items-center justify-between gap-2 bg-white rounded-xl border border-slate-200 shadow-sm px-3 sm:px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate("/admin")}
            className="p-2 hover:bg-slate-100 rounded-lg flex-shrink-0 text-slate-600 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Revenue
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Fees + Camp Fees + Bookings + Reg Fees
              {isSuperAdmin ? " + Expenses" : ""}
            </p>
          </div>
        </div>
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
          <button
            onClick={() => navigate("/admin/revenue/import")}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm"
          >
            <Plus size={14} />
            Import Excel
          </button>
        </div>
        <div className="flex sm:hidden items-center gap-1.5 flex-shrink-0 flex-wrap">
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
          <button
            onClick={() => navigate("/admin/revenue/import")}
            className="p-2 bg-blue-600 text-white rounded-lg"
            title="Import Excel"
          >
            <Plus size={14} />
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
        className={`grid gap-2 sm:gap-3 ${isSuperAdmin ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"}`}
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
          onClick={() => setActiveTab("fees")}
          value={fmt(feesTotal)}
          sub={`${filteredFees.length} payments`}
          icon={<IndianRupee size={15} className="text-blue-600" />}
          bg="bg-gradient-to-br from-blue-50 to-indigo-50"
          border="border-blue-200"
          valueClass="text-blue-700"
        />
        <SummaryCard
          label="Installments Fees"
          onClick={() => setActiveTab("installments")}
          value={fmt(installmentPaymentsTotal)}
          sub={`${filteredInstallmentPayments.length} payments`}
          icon={<CreditCard size={15} className="text-blue-600" />}
          bg="bg-gradient-to-br from-blue-50 to-indigo-50"
          border="border-blue-200"
          valueClass="text-blue-700"
        />
        <SummaryCard
          label="Camp Fees"
          onClick={() => setActiveTab("campfees")}
          value={fmt(campFeesTotal)}
          sub={`${filteredCampFees.length} paid`}
          icon={<Users size={15} className="text-teal-600" />}
          bg="bg-gradient-to-br from-teal-50 to-cyan-50"
          border="border-teal-200"
          valueClass="text-teal-700"
        />
        <SummaryCard
          label="Bookings"
          value={fmt(regularBookingsTotal)}
          onClick={() => setActiveTab("bookings")}
          sub={`${bmCount + astroCount + tennisCount} paid sessions`}
          icon={<BookOpen size={15} className="text-orange-500" />}
          bg="bg-gradient-to-br from-orange-50 to-amber-50"
          border="border-orange-200"
          valueClass="text-orange-600"
        />

        <SummaryCard
          label="Bowling Machine"
          value={fmt(bowlingMachineTotal)}
          onClick={() => {
            setActiveTab("bookings");
            setBookingResourceFilter("BOWLING_MACHINE");
          }}
          sub={`${bmCount} paid`}
          icon={<BookOpen size={15} className="text-orange-500" />}
          bg="bg-gradient-to-br from-orange-50 to-amber-50"
          border="border-orange-200"
          valueClass="text-orange-600"
        />
        <SummaryCard
          label="Astro Turf"
          value={fmt(astroTurfTotal)}
          onClick={() => {
            setActiveTab("bookings");
            setBookingResourceFilter("ASTRO");
          }}
          sub={`${astroCount} paid`}
          icon={<BookOpen size={15} className="text-green-600" />}
          bg="bg-gradient-to-br from-green-50 to-emerald-50"
          border="border-green-200"
          valueClass="text-green-700"
        />
        <SummaryCard
          label="Tennis Ball"
          value={fmt(tennisBallTotal)}
          sub={`${tennisCount} paid`}
          onClick={() => {
            setActiveTab("bookings");
            setBookingResourceFilter("TENNIS_BALL");
          }}
          icon={<BookOpen size={15} className="text-yellow-600" />}
          bg="bg-gradient-to-br from-yellow-50 to-lime-50"
          border="border-yellow-200"
          valueClass="text-yellow-700"
        />
        {/* ── NEW: Reg Fees summary card ── */}
        <SummaryCard
          label="Reg Fees"
          value={fmt(regFeesTotal)}
          sub={`${regFeesPaidCount} of ${regFees.length} paid`}
          onClick={() => setActiveTab("regfees")}
          icon={<CreditCard size={15} className="text-purple-600" />}
          bg="bg-gradient-to-br from-purple-50 to-fuchsia-50"
          border="border-purple-200"
          valueClass="text-purple-700"
        />
        <SummaryCard
          label="Bowling Machine Memberships"
          value={fmt(subRevenueTotal + membershipBookingsTotal)}
          onClick={() => setActiveTab("subscriptions")}
          sub={`${subRevenueInRangeCount} activated · ${fmt(membershipBookingsTotal)} historical`}
          icon={<CreditCard size={15} className="text-cyan-600" />}
          bg="bg-gradient-to-br from-cyan-50 to-sky-50"
          border="border-cyan-200"
          valueClass="text-cyan-700"
        />
        <SummaryCard
          label="Coach Commission"
          value={fmt(commTotalDue)}
          onClick={() => setActiveTab("commission")}
          sub={`${commTotalSessions} session${commTotalSessions !== 1 ? "s" : ""} · ${effectiveRate}% rate · ${commissionMonth}`}
          icon={<Award size={15} className="text-amber-600" />}
          bg="bg-gradient-to-br from-amber-50 to-orange-50"
          border="border-amber-200"
          valueClass="text-amber-700"
        />
        {isSuperAdmin && (
          <SummaryCard
            label="Other Income"
            value={fmt(otherIncomeTotal)}
            sub={`${filteredIncomes.length} entries`}
            onClick={() => setActiveTab("income")}
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
            sub={`${filteredExpenses.length} entries · ${monthlyPayments.filter((p) => p.status === "PAID").length} monthly paid`}
            icon={<TrendingDown size={15} className="text-red-500" />}
            bg="bg-gradient-to-br from-red-50 to-rose-50"
            onClick={() => setActiveTab("expenses")}
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
          onClick={() => {
            setActiveTab("bookings");
            setBookingStatusFilter("PENDING");
            setBookingResourceFilter("ALL");
          }}
        />
      </div>

      {/* ── Main Tabs ── */}
      {(() => {
        const allTabs: [Tab, string, number][] = [
          ["fees", "Fees", filteredFees.length],
          ["bookings", "Bookings", filteredBookings.length],
          ["campfees", "Camp Fees", filteredCampFees.length],
          ["feesummary", "Fee Summary", feeSummary.length],
          ["regfees", "Reg Fees", regFees.length],
          ["subscriptions", "Memberships", subRevenue.length],
          ["installments", "Installments", filteredInstallmentPayments.length],
          ...(isSuperAdmin
            ? [
                ["expenses", "Expenses", filteredExpenses.length + monthlyPayments.filter((p) => p.status === "PAID").length],
                ["income", "Income", filteredIncomes.length],
                ["commission", "Coach Commission", commTotalSessions],
              ]
            : [["commission", "Coach Commission", commTotalSessions]]),
        ] as [Tab, string, number][];

        return (
          <>
            {/* Mobile: native dropdown — cleaner than scrolling 10 pills at 375 px */}
            <div className="sm:hidden">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as Tab)}
                className="w-full bg-slate-100 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "32px" }}
              >
                {allTabs.map(([tab, label, count]) => (
                  <option key={tab} value={tab}>{label} ({count})</option>
                ))}
              </select>
            </div>

            {/* Desktop: scrollable pill row */}
            <div className="relative hidden sm:block">
              <div
                ref={tabBarRef}
                className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto"
                style={{ scrollbarWidth: "none" }}
              >
                {allTabs.map(([tab, label, count]) => (
                  <button
                    key={tab}
                    data-tab={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {label}
                    <span className={`text-[10px] font-semibold px-1.5 py-px rounded leading-none ${activeTab === tab ? "bg-slate-100 text-slate-500" : "bg-slate-200 text-slate-500"}`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
              <div className={`pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-xl bg-gradient-to-l from-slate-100 to-transparent transition-opacity duration-150 ${tabFade.right ? "opacity-100" : "opacity-0"}`} />
              <div className={`pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-xl bg-gradient-to-r from-slate-100 to-transparent transition-opacity duration-150 ${tabFade.left ? "opacity-100" : "opacity-0"}`} />
            </div>
          </>
        );
      })()}

      {activeTab === "installments" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">
              Installment Payments
            </h2>
            <span className="text-sm font-semibold text-blue-600">
              {fmt(installmentPaymentsTotal)}
            </span>
          </div>
          {filteredInstallmentPayments.length === 0 ? (
            <EmptyState message="No installment payments in this period" />
          ) : (
            <>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-slate-100">
                {filteredInstallmentPayments.map((p) => (
                  <div key={p.publicId} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {p.playerName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Installment #{p.installmentNumber}
                          {p.planDescription ? ` · ${p.planDescription}` : ""}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-slate-900 flex-shrink-0">
                        {fmt(Number(p.amount))}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span>{fmtDate(p.paidOn)}</span>
                      <span>{fmtMode(p.paymentMode)}</span>
                      {p.referenceNumber && (
                        <span className="font-mono">{p.referenceNumber}</span>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t-2 border-slate-200">
                  <span className="text-sm font-semibold text-slate-700">
                    Total · {filteredInstallmentPayments.length} payments
                  </span>
                  <span className="text-sm font-bold text-blue-700">
                    {fmt(installmentPaymentsTotal)}
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
                        "Player",
                        "Installment",
                        "Plan",
                        "Amount",
                        "Mode",
                        "Reference",
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
                    {filteredInstallmentPayments
                      .sort((a, b) => (b.paidOn > a.paidOn ? 1 : -1))
                      .map((p) => (
                        <tr key={p.publicId} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {fmtDate(p.paidOn)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800">
                            {p.playerName}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            #{p.installmentNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {p.planDescription || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-900">
                            {fmt(Number(p.amount))}
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
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-sm font-semibold text-slate-700"
                      >
                        Total · {filteredInstallmentPayments.length} payments
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-blue-700">
                        {fmt(installmentPaymentsTotal)}
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
                      {reversedNormalIds.has(p.publicId) ? (
                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          <X size={10} />
                          Reversed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          <CheckCircle2 size={10} />
                          Paid
                        </span>
                      )}
                      {p.nextDueOn && !reversedNormalIds.has(p.publicId) && (
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
                          {reversedNormalIds.has(p.publicId) ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                              <X size={11} />
                              Reversed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                              <CheckCircle2 size={11} />
                              Paid
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {reversedNormalIds.has(p.publicId) ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : p.nextDueOn ? (
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
              {bookingStatusFilter === "PENDING"
                ? `${pendingBookingsList.length} pending`
                : fmt(filteredBookingsTotal)}
            </span>
          </div>
          {/* Status filter: Paid | Pending */}
          <div className="px-4 py-2 border-b border-slate-100 flex gap-1">
            <button
              onClick={() => setBookingStatusFilter("PAID")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                bookingStatusFilter === "PAID"
                  ? "bg-orange-100 text-orange-700 font-semibold"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              Paid ({filteredBookings.length})
            </button>
            <button
              onClick={() => setBookingStatusFilter("PENDING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                bookingStatusFilter === "PENDING"
                  ? "bg-rose-100 text-rose-700 font-semibold"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              Pending ({pendingBookings})
            </button>
          </div>
          {bookingStatusFilter === "PENDING" ? (
            pendingBookingsList.length === 0 ? (
              <EmptyState message="No pending bookings" />
            ) : (
              <>
                <div className="sm:hidden divide-y divide-slate-100">
                  {pendingBookingsList.map((b) => (
                    <div key={b.bookingPublicId} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {b.playerName || b.bookedByEmail || "—"}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {b.resourceType}
                            {b.startTime && b.endTime
                              ? ` · ${b.startTime}–${b.endTime}`
                              : ""}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-slate-900 flex-shrink-0">
                          {fmt(b.amount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-slate-400">
                          {fmtDate(b.slotDate)}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          <Clock size={10} />
                          Pending
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-slate-500 uppercase tracking-wide border-b bg-slate-50/50">
                        {["Date", "Player", "Resource", "Slot", "Amount", "Status"].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-left px-4 py-3 whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingBookingsList.map((b) => (
                        <tr key={b.bookingPublicId} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {fmtDate(b.slotDate)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800">
                            {b.playerName || b.bookedByEmail || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {b.resourceType}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {b.startTime && b.endTime
                              ? `${b.startTime}–${b.endTime}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-900">
                            {fmt(b.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                              <Clock size={11} />
                              Pending
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )
          ) : (
            <>
              {/* Resource type sub-tabs */}
              <div
                className="px-4 py-2 border-b border-slate-100 flex gap-1 overflow-x-auto"
                style={{ scrollbarWidth: "none" }}
              >
                {(
                  [
                    "ALL",
                    "BOWLING_MACHINE",
                    "BOWLING_MACHINE_MEMBERSHIP",
                    "TENNIS_BALL",
                    "ASTRO",
                  ] as const
                ).map((rt) => {
                  const count =
                    rt === "ALL"
                      ? filteredBookings.length
                      : filteredBookings.filter((b) => b.resourceType === rt)
                          .length;
                  const labels: Record<string, string> = {
                    ALL: "All",
                    BOWLING_MACHINE: "Bowling Machine",
                    BOWLING_MACHINE_MEMBERSHIP: "BM Memberships",
                    TENNIS_BALL: "Tennis Ball",
                    ASTRO: "Astro Turf",
                  };
                  return (
                    <button
                      key={rt}
                      onClick={() => {
                        setBookingResourceFilter(rt);
                        setExpandedUser(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                        bookingResourceFilter === rt
                          ? "bg-orange-100 text-orange-700 font-semibold"
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {labels[rt]} ({count})
                    </button>
                  );
                })}
              </div>
              {groupedBookings.length === 0 ? (
                <EmptyState message="No booking payments in this period" />
              ) : (
                <div className="divide-y divide-slate-100">
                  {groupedBookings
                    .filter(
                      (group) =>
                        bookingResourceFilter === "ALL" ||
                        group.bookings.some(
                          (b) => b.resourceType === bookingResourceFilter,
                        ),
                    )
                    .map((group) => ({
                      ...group,
                      bookings:
                        bookingResourceFilter === "ALL"
                          ? group.bookings
                          : group.bookings.filter(
                              (b) => b.resourceType === bookingResourceFilter,
                            ),
                      total:
                        bookingResourceFilter === "ALL"
                          ? group.total
                          : group.bookings
                              .filter(
                                (b) => b.resourceType === bookingResourceFilter,
                              )
                              .reduce((s, b) => s + (b.amount || 0), 0),
                    }))
                    .filter((group) => group.bookings.length > 0)
                    .map((group) => (
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
                            <div className="sm:hidden divide-y divide-slate-100">
                              {group.bookings
                                .sort((a, b) =>
                                  b.slotDate > a.slotDate ? 1 : -1,
                                )
                                .map((b) => (
                                  <div
                                    key={b.bookingPublicId}
                                    className="flex items-center justify-between px-4 py-3"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-slate-800">
                                        {fmtDateShort(b.slotDate)} ·{" "}
                                        {b.startTime}–{b.endTime}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {b.resourceType} ·{" "}
                                        {fmtMode(b.paymentMode)}
                                      </p>
                                    </div>
                                    <p className="text-sm font-bold text-slate-900">
                                      {fmt(b.amount)}
                                    </p>
                                  </div>
                                ))}
                            </div>
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
                                      <th
                                        key={h}
                                        className="text-left px-5 py-2"
                                      >
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
                                          {b.startTime && b.endTime
                                            ? `${b.startTime}–${b.endTime}`
                                            : "—"}
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
                      Total ·{" "}
                      {bookingResourceFilter === "ALL"
                        ? groupedBookings.length
                        : groupedBookings.filter((g) =>
                            g.bookings.some(
                              (b) => b.resourceType === bookingResourceFilter,
                            ),
                          ).length}{" "}
                      users
                    </span>
                    <span className="text-sm font-bold text-orange-600">
                      {fmt(filteredBookingsTotal)}
                    </span>
                  </div>
                </div>
              )}
            </>
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

      {/* ── FEE COLLECTION SUMMARY ── */}
      {activeTab === "feesummary" && (
        feeSummaryLoading ? (
          <div className="flex items-center justify-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : (
          <FeeSummaryTable rows={feeSummary} onRefresh={load} />
        )
      )}

      {/* ── NEW: REGISTRATION FEES TAB ── */}
      {activeTab === "regfees" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-slate-800 text-sm sm:text-base">
                Registration Fees
              </h2>
              <p className="text-xs text-slate-400">
                {regFeesPaidCount} paid · {regFees.length - regFeesPaidCount}{" "}
                pending · ₹1,500 each
              </p>
            </div>
            <span className="text-sm font-semibold text-purple-600">
              {fmt(regFeesTotal)}
            </span>
          </div>

          {/* Search */}
          <div className="px-4 py-2.5 border-b border-slate-100">
            <input
              type="text"
              value={regFeeSearch}
              onChange={(e) => setRegFeeSearch(e.target.value)}
              placeholder="Search player…"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
            />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 p-4 border-b border-slate-100">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-purple-700">
                {regFees.length}
              </p>
              <p className="text-xs text-purple-500">Total</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-emerald-700">
                {regFeesPaidCount}
              </p>
              <p className="text-xs text-emerald-500">Paid</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-amber-700">
                {regFees.length - regFeesPaidCount}
              </p>
              <p className="text-xs text-amber-500">Pending</p>
            </div>
          </div>

          {/* Mobile list */}
          <div className="sm:hidden divide-y divide-slate-100">
            {filteredRegFees.map((r) => (
              <div
                key={r.playerPublicId}
                className="px-4 py-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {r.playerName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {r.regFeePaid
                      ? `✓ Paid · ${fmtDate(r.regFeePaidOn)} · ${fmtMode(r.regFeePaymentMode)}`
                      : "Not paid"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.regFeePaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {r.regFeePaid ? "Paid" : "Pending"}
                  </span>
                  {!r.regFeePaid ? (
                    <button
                      onClick={() => {
                        setRegFeeMode("PHONE_PE");
                        setRegFeePaidOn(new Date().toISOString().split("T")[0]);
                        setShowRegFeeModal(r);
                      }}
                      className="px-2.5 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition"
                    >
                      Mark Paid
                    </button>
                  ) : isSuperAdmin ? (
                    <button
                      onClick={() =>
                        handleUnmarkRegFee(r.playerPublicId, r.playerName)
                      }
                      className="px-2.5 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition"
                    >
                      Unmark
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wide border-b bg-slate-50/50">
                  {[
                    "Player",
                    "Status",
                    "Paid On",
                    "Mode",
                    "Amount",
                    "Action",
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
                {filteredRegFees.map((r) => (
                  <tr key={r.playerPublicId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                      {r.playerName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.regFeePaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {r.regFeePaid ? "✓ Paid" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {fmtDate(r.regFeePaidOn)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {fmtMode(r.regFeePaymentMode)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-purple-700">
                      {r.regFeePaid ? fmt(r.regFeeAmount) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {!r.regFeePaid ? (
                        <button
                          onClick={() => {
                            setRegFeeMode("PHONE_PE");
                            setRegFeePaidOn(
                              new Date().toISOString().split("T")[0],
                            );
                            setShowRegFeeModal(r);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition"
                        >
                          Mark as Paid
                        </button>
                      ) : isSuperAdmin ? (
                        <button
                          onClick={() =>
                            handleUnmarkRegFee(r.playerPublicId, r.playerName)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition"
                        >
                          Unmark
                        </button>
                      ) : null}
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
                    Total Collected · {regFeesPaidCount} players
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-purple-700">
                    {fmt(regFeesTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── MEMBERSHIPS / SUBSCRIPTION REVENUE ── */}
      {activeTab === "subscriptions" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-slate-800 text-sm sm:text-base">
                Membership Revenue
              </h2>
              <p className="text-xs text-slate-400">
                Bowling machine subscriptions
              </p>
            </div>
            <span className="text-sm font-semibold text-cyan-600">
              {fmt(subRevenueTotal)}
            </span>
          </div>

          <div className="px-4 py-2.5 border-b border-slate-100">
            <input
              type="text"
              value={subRevenueSearch}
              onChange={(e) => setSubRevenueSearch(e.target.value)}
              placeholder="Search member…"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 focus:outline-none"
            />
          </div>

          {filteredSubRevenue.length === 0 ? (
            <EmptyState message="No membership revenue in this period" />
          ) : (
            <>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-slate-100">
                {filteredSubRevenue.map((r) => (
                  <div key={r.publicId} className="px-4 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {r.userName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {r.sessionsPerMonth} sessions × {r.planMonths}mo
                          {r.activatedAt && ` · ${fmtDate(r.activatedAt)}`}
                          {r.paymentMode && ` · ${fmtMode(r.paymentMode)}`}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-cyan-700 flex-shrink-0">
                        {fmt(r.pricePaid)}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t-2 border-slate-200">
                  <span className="text-sm font-semibold text-slate-700">
                    Total · {filteredSubRevenue.length}
                  </span>
                  <span className="text-sm font-bold text-cyan-700">
                    {fmt(subRevenueTotal)}
                  </span>
                </div>
              </div>

              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-wide border-b bg-slate-50/50">
                      {[
                        "Member",
                        "Plan",
                        "Activated On",
                        "Mode",
                        "Status",
                        "Amount",
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
                    {filteredSubRevenue.map((r) => (
                      <tr key={r.publicId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-800">
                            {r.userName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {r.userPhone}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {r.sessionsPerMonth} sessions × {r.planMonths} month
                          {r.planMonths > 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {fmtDate(r.activatedAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {fmtMode(r.paymentMode)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              r.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-700"
                                : r.status === "EXPIRED"
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-red-100 text-red-600"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-cyan-700">
                          {fmt(r.pricePaid)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td
                        colSpan={5}
                        className="px-4 py-3 text-sm font-semibold text-slate-700"
                      >
                        Total · {filteredSubRevenue.length} memberships
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-cyan-700">
                        {fmt(subRevenueTotal)}
                      </td>
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

          {expenseSubTab === "monthly" && (
            <div className="space-y-3">
              <div className="relative flex items-center justify-between bg-white rounded-xl border border-slate-200 pl-4 pr-20 sm:px-4 py-3 shadow-sm">
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
                <div className="absolute right-2 top-2 flex items-center gap-3">
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
      {/* ── COACH COMMISSION TAB ───────────────────────────────────────── */}
      {activeTab === "commission" && (
        <div className="space-y-4">
          {/* Header card: month + rate controls */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <h2 className="font-bold text-slate-800 text-sm sm:text-base">Coach Commission</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  BM sessions × per-session price × commission rate
                </p>
              </div>
              <input
                type="month"
                value={commissionMonth}
                onChange={(e) => {
                  setCommissionMonth(e.target.value);
                  loadCommissionData(e.target.value);
                }}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Rate control row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Rate:
              </span>
              {(["10", "15"] as CommissionRateMode[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setCommissionRateMode(r)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
                    commissionRateMode === r
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {r}%
                </button>
              ))}
              <button
                onClick={() => setCommissionRateMode("custom")}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
                  commissionRateMode === "custom"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Custom
              </button>
              {commissionRateMode === "custom" && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={commissionRateCustom}
                    onChange={(e) => setCommissionRateCustom(e.target.value)}
                    min="0"
                    max="100"
                    step="0.5"
                    placeholder="e.g. 12.5"
                    className="w-24 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
              )}
              <button
                onClick={saveCommissionRate}
                disabled={savingRate}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition"
              >
                <Check size={12} />
                {savingRate ? "Saving…" : "Save as default"}
              </button>
            </div>
            {defaultRate !== effectiveRate && (
              <p className="text-xs text-amber-600">
                Showing preview at {effectiveRate}% — default is {defaultRate}%. Click "Save as default" to persist.
              </p>
            )}
          </div>

          {/* Summary cards */}
          {(() => {
            const subRows = commissionData.filter(r => r.source === "Subscription");
            const directRows = commissionData.filter(r => r.source === "Direct Booking");
            const subSessions = subRows.reduce((s, r) => s + r.sessionsUsed, 0);
            const directCount = directRows.length;
            return (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Sessions / Bookings</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{commTotalSessions}</p>
                  <p className="text-xs text-blue-400 mt-0.5 leading-snug">
                    {subSessions > 0 && `${subSessions} sub`}
                    {subSessions > 0 && directCount > 0 && " · "}
                    {directCount > 0 && `${directCount} direct`}
                    {subSessions === 0 && directCount === 0 && "—"}
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-500 uppercase tracking-wide">Session Value</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">{fmt(commTotalValue)}</p>
                  <p className="text-xs text-green-400 mt-0.5">subscription + direct bookings</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Commission @ {effectiveRate}%</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{fmt(commTotalDue)}</p>
                  <p className="text-xs text-amber-500 mt-0.5">payable to coach</p>
                </div>
              </div>
            );
          })()}

          {/* Drill-down */}
          {commissionLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : commissionData.length === 0 ? (
            <EmptyState message="No BM sessions logged for this month yet" />
          ) : (
            <>
              {/* ── Mobile cards ── */}
              <div className="sm:hidden space-y-3">
                {commissionData.map((row, i) => {
                  const isDirect = row.source === "Direct Booking";
                  const subKey = row.subscriptionPublicId || `sub-${i}`;
                  const isExpanded = !isDirect && expandedSubKeys.has(subKey);
                  return (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-slate-900 text-sm">{row.memberName}</p>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isDirect ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                                {isDirect ? "Direct" : "Sub"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">{row.memberPhone}</p>
                            {isDirect && row.ballCount && (
                              <p className="text-xs text-slate-400">{row.ballCount} balls · {row.sessionsUsed} session{row.sessionsUsed !== 1 ? "s" : ""}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                              {row.sessionsUsed}
                            </span>
                            {isDirect ? (
                              <button onClick={() => openDirectEdit(row)}
                                className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-600">
                                <Pencil size={13} />
                              </button>
                            ) : (
                              <button onClick={() => toggleSubExpand(subKey)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                                <ChevronDown size={14} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              </button>
                            )}
                          </div>
                        </div>
                        {!isDirect && (
                          <div className="text-xs text-slate-500" title={row.subscriptionPublicId}>
                            Plan: {row.totalSessions} sessions · {fmt(row.pricePaid)}
                          </div>
                        )}
                        <div className="flex justify-between text-sm pt-1 border-t border-slate-100">
                          <span className="text-slate-500">Session value</span>
                          <span className="font-medium">{fmt(Number(row.sessionValue))}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Commission</span>
                          <span className="font-bold text-amber-700">
                            {fmt(Number(row.sessionValue) * effectiveRate / 100)}
                          </span>
                        </div>
                      </div>

                      {/* Mobile: expanded usage entries for subscription rows */}
                      {!isDirect && isExpanded && (
                        <div className="border-t border-blue-100 bg-blue-50 p-3">
                          <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide mb-2">
                            Usage Log · {commissionMonth}
                          </p>
                          {usageEntriesLoading.has(subKey) ? (
                            <div className="flex justify-center py-4">
                              <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                            </div>
                          ) : (usageEntries[subKey] || []).length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-2">No entries found</p>
                          ) : (
                            <div className="space-y-2">
                              {(usageEntries[subKey] || []).map((entry) =>
                                editingEntry?.id === entry.id ? (
                                  <div key={entry.id} className="bg-white rounded-lg p-2 space-y-2 border border-blue-200">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px] font-semibold text-slate-500">Date</label>
                                        <input type="date" value={editingEntry.usedAt}
                                          onChange={(e) => setEditingEntry({ ...editingEntry, usedAt: e.target.value })}
                                          className="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-semibold text-slate-500">Sessions</label>
                                        <select value={editingEntry.sessionsUsed}
                                          onChange={(e) => setEditingEntry({ ...editingEntry, sessionsUsed: +e.target.value })}
                                          className="w-full border border-slate-300 rounded px-2 py-1 text-xs">
                                          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                      </div>
                                    </div>
                                    {editingEntry.usedAt.substring(0, 7) !== commissionMonth && (
                                      <p className="text-[10px] text-amber-600">Moving this to {editingEntry.usedAt.substring(0, 7)} will reduce this month's total.</p>
                                    )}
                                    <div className="flex gap-2">
                                      <button onClick={saveUsageEntryEdit} className="flex-1 text-xs bg-blue-600 text-white rounded py-1 font-semibold">Save</button>
                                      <button onClick={() => setEditingEntry(null)} className="flex-1 text-xs border border-slate-300 text-slate-600 rounded py-1">Cancel</button>
                                    </div>
                                  </div>
                                ) : deletingEntry?.id === entry.id ? (
                                  <div key={entry.id} className="bg-red-50 rounded-lg p-2 border border-red-200 space-y-1">
                                    <p className="text-xs text-red-700 font-medium">Delete {entry.usedAt} · {entry.sessionsUsed} session(s)?</p>
                                    <p className="text-[10px] text-slate-500">This removes the log entry only — subscription counter is NOT automatically restored.</p>
                                    <div className="flex gap-2">
                                      <button onClick={confirmDeleteUsageEntry} className="flex-1 text-xs bg-red-600 text-white rounded py-1 font-semibold">Delete</button>
                                      <button onClick={() => setDeletingEntry(null)} className="flex-1 text-xs border border-slate-300 rounded py-1 text-slate-600">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div key={entry.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-100">
                                    <div>
                                      <span className="text-xs font-medium text-slate-800">{entry.usedAt}</span>
                                      <span className="text-xs text-slate-500 ml-2">{entry.sessionsUsed} session{entry.sessionsUsed !== 1 ? "s" : ""}</span>
                                    </div>
                                    <div className="flex gap-1">
                                      <button onClick={() => setEditingEntry({ id: entry.id, usedAt: entry.usedAt, sessionsUsed: entry.sessionsUsed, subKey })}
                                        className="p-1 hover:bg-blue-50 text-blue-600 rounded">
                                        <Pencil size={11} />
                                      </button>
                                      <button onClick={() => setDeletingEntry({ id: entry.id, subKey })}
                                        className="p-1 hover:bg-red-50 text-red-500 rounded">
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Mobile totals */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total · {commTotalSessions} sessions</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Session value</span>
                    <span className="font-semibold text-green-700">{fmt(commTotalValue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Commission @ {effectiveRate}%</span>
                    <span className="font-bold text-amber-700">{fmt(commTotalDue)}</span>
                  </div>
                </div>
              </div>

              {/* ── Desktop table ── */}
              <div className="hidden sm:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Member</th>
                      <th className="px-4 py-3 text-left font-medium">Source</th>
                      <th className="px-4 py-3 text-left font-medium">Plan / Amount</th>
                      <th className="px-4 py-3 text-center font-medium">Sessions</th>
                      <th className="px-4 py-3 text-right font-medium">Session Value</th>
                      <th className="px-4 py-3 text-right font-medium">Commission ({effectiveRate}%)</th>
                      <th className="px-4 py-3 text-right font-medium w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissionData.map((row, i) => {
                      const isDirect = row.source === "Direct Booking";
                      const subKey = row.subscriptionPublicId || `sub-${i}`;
                      const isExpanded = !isDirect && expandedSubKeys.has(subKey);
                      const rowCommission = Number(row.sessionValue) * effectiveRate / 100;
                      return (
                        <tr key={`row-${i}`} className={`${isExpanded ? "" : "border-b border-slate-100"} ${!isDirect ? "cursor-pointer select-none" : ""} hover:bg-slate-50`}
                            onClick={!isDirect ? () => toggleSubExpand(subKey) : undefined}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{row.memberName}</p>
                            <p className="text-xs text-slate-400">{row.memberPhone}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${isDirect ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                                {row.source}
                              </span>
                              {!isDirect && (
                                <ChevronDown size={12} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {isDirect ? (
                              row.ballCount ? (
                                <p className="text-slate-700 text-xs">{row.ballCount} balls · {row.sessionsUsed} session{row.sessionsUsed !== 1 ? "s" : ""}</p>
                              ) : (
                                <p className="text-slate-400 text-xs italic">one-off booking</p>
                              )
                            ) : (
                              <>
                                <p className="text-slate-700" title={row.subscriptionPublicId}>
                                  {row.totalSessions} sessions · {fmt(row.pricePaid)}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {fmt(row.pricePaid / row.totalSessions)}/session
                                </p>
                              </>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold">
                              {row.sessionsUsed}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-green-700">
                            {fmt(Number(row.sessionValue))}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-amber-700">
                            {fmt(rowCommission)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isDirect && (
                              <button onClick={(e) => { e.stopPropagation(); openDirectEdit(row); }}
                                className="p-1.5 hover:bg-violet-50 text-violet-600 rounded-lg transition">
                                <Pencil size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Expandable usage-entries rows — rendered outside tbody row loop */}
                    {commissionData.map((row, i) => {
                      const isDirect = row.source === "Direct Booking";
                      if (isDirect) return null;
                      const subKey = row.subscriptionPublicId || `sub-${i}`;
                      const isExpanded = expandedSubKeys.has(subKey);
                      if (!isExpanded) return null;
                      return (
                        <tr key={`expand-${i}`} className="border-b border-slate-100">
                          <td colSpan={7} className="p-0">
                            <div className="bg-blue-50 px-6 py-3 space-y-2">
                              <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                                Usage Log · {commissionMonth}
                              </p>
                              {usageEntriesLoading.has(subKey) ? (
                                <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                                  <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                                  Loading…
                                </div>
                              ) : (usageEntries[subKey] || []).length === 0 ? (
                                <p className="text-xs text-slate-400 py-1">No individual entries found for this month.</p>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-slate-500 uppercase tracking-wide">
                                      <th className="text-left pr-6 pb-1 font-medium">Date</th>
                                      <th className="text-center pr-6 pb-1 font-medium">Sessions</th>
                                      <th className="pb-1"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-blue-100">
                                    {(usageEntries[subKey] || []).map((entry) =>
                                      editingEntry?.id === entry.id ? (
                                        <tr key={entry.id}>
                                          <td className="py-1.5 pr-4">
                                            <input type="date" value={editingEntry.usedAt}
                                              onChange={(e) => setEditingEntry({ ...editingEntry, usedAt: e.target.value })}
                                              className="border border-slate-300 rounded px-2 py-1 text-xs" />
                                            {editingEntry.usedAt.substring(0, 7) !== commissionMonth && (
                                              <p className="text-[10px] text-amber-600 mt-0.5">
                                                ⚠ Moving to {editingEntry.usedAt.substring(0, 7)} will reduce this month&apos;s total.
                                              </p>
                                            )}
                                          </td>
                                          <td className="py-1.5 pr-4 text-center">
                                            <select value={editingEntry.sessionsUsed}
                                              onChange={(e) => setEditingEntry({ ...editingEntry, sessionsUsed: +e.target.value })}
                                              className="border border-slate-300 rounded px-2 py-1 text-xs">
                                              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                          </td>
                                          <td className="py-1.5">
                                            <div className="flex gap-1 justify-end">
                                              <button onClick={saveUsageEntryEdit}
                                                className="px-2 py-1 bg-blue-600 text-white rounded text-[11px] font-semibold">
                                                Save
                                              </button>
                                              <button onClick={() => setEditingEntry(null)}
                                                className="px-2 py-1 border border-slate-300 text-slate-600 rounded text-[11px]">
                                                Cancel
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ) : deletingEntry?.id === entry.id ? (
                                        <tr key={entry.id} className="bg-red-50">
                                          <td colSpan={3} className="py-2 px-1">
                                            <div className="flex items-start gap-3">
                                              <div className="flex-1">
                                                <p className="text-red-700 font-medium">Delete entry: {entry.usedAt} · {entry.sessionsUsed} session(s)?</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">
                                                  This removes the log entry only — the subscription&apos;s session counter is NOT automatically restored.
                                                </p>
                                              </div>
                                              <div className="flex gap-1 shrink-0">
                                                <button onClick={confirmDeleteUsageEntry}
                                                  className="px-2 py-1 bg-red-600 text-white rounded text-[11px] font-semibold">
                                                  Delete
                                                </button>
                                                <button onClick={() => setDeletingEntry(null)}
                                                  className="px-2 py-1 border border-slate-300 text-slate-600 rounded text-[11px]">
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      ) : (
                                        <tr key={entry.id} className="hover:bg-blue-100/40">
                                          <td className="py-1.5 pr-6 font-medium text-slate-800">{entry.usedAt}</td>
                                          <td className="py-1.5 pr-6 text-center text-slate-600">{entry.sessionsUsed}</td>
                                          <td className="py-1.5">
                                            <div className="flex gap-1 justify-end">
                                              <button onClick={() => setEditingEntry({ id: entry.id, usedAt: entry.usedAt, sessionsUsed: entry.sessionsUsed, subKey })}
                                                className="p-1 hover:bg-blue-200 text-blue-700 rounded">
                                                <Pencil size={11} />
                                              </button>
                                              <button onClick={() => setDeletingEntry({ id: entry.id, subKey })}
                                                className="p-1 hover:bg-red-100 text-red-500 rounded">
                                                <Trash2 size={11} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-sm font-semibold">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-slate-600">
                        Total · {commTotalSessions} session(s) across {commissionData.length} row(s)
                      </td>
                      <td className="px-4 py-3 text-center text-slate-800">{commTotalSessions}</td>
                      <td className="px-4 py-3 text-right text-green-700">{fmt(commTotalValue)}</td>
                      <td className="px-4 py-3 text-right text-amber-700">{fmt(commTotalDue)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ── Part A: Direct booking edit modal ── */}
              {editDirectModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900">Edit Booking</h3>
                        <p className="text-xs text-slate-500">{editDirectModal.memberName} · Direct BM booking</p>
                      </div>
                      <button onClick={() => setEditDirectModal(null)} className="text-slate-400 hover:text-slate-600">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ball Count</label>
                      <div className="grid grid-cols-4 gap-2">
                        {([60, 120, 180, 240] as const).map((bc) => (
                          <button key={bc} onClick={() => setEditBallCount(bc)}
                            className={`py-2.5 rounded-lg text-sm font-bold border transition ${
                              editBallCount === bc
                                ? "bg-blue-600 text-white border-blue-600"
                                : "border-slate-300 text-slate-600 hover:bg-slate-50"
                            }`}>
                            {bc}
                            <span className="block text-[10px] font-normal opacity-75">{bc / 60} sess.</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Amount (₹)</label>
                      <input type="number" min="0" step="any" value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <p className="text-[10px] text-slate-400">Saving also updates the linked payment record and the All Bookings page.</p>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button onClick={() => setEditDirectModal(null)}
                        className="flex-1 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
                        Cancel
                      </button>
                      <button onClick={saveDirectBookingEdit} disabled={editDirectSaving}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
                        {editDirectSaving ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  bg: string;
  border: string;
  valueClass: string;
  spanFull?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-3 sm:p-4 ${bg} ${border} shadow-sm 
    ${spanFull ? "col-span-2 sm:col-span-1" : ""}
    ${onClick ? "cursor-pointer hover:shadow-md active:scale-95 transition-all" : "transition"}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide leading-tight truncate">
          {label}
        </p>
        <div className="w-6 h-6 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      </div>
      <p className={`text-lg sm:text-2xl font-bold ${valueClass} truncate`}>
        {value}
      </p>
      <p className="text-xs text-slate-400 mt-0.5 truncate" title={sub}>
        {sub}
      </p>
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
