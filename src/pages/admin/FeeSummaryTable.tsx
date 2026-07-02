import { useState } from "react";
import { Calendar, X } from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-hot-toast";
import PlayerAvatar from "../../components/player/PlayerAvatar";

export type FeeCollectionSummaryRow = {
  playerPublicId: string;
  feeAccountPublicId: string;
  playerName: string;
  phone: string | null;
  parentsPhone: string | null;
  feePlanName: string;
  feeType: "MONTHLY" | "ANNUAL" | "OTHER";
  feeStatus: "PAID" | "DUE" | "OVERDUE";
  planAmount: number;
  lastPaidOn: string | null;
  nextDueOn: string | null;
  hasInstallmentPlan: boolean;
  installmentTotal: number | null;
  installmentPaid: number | null;
  installmentBalance: number | null;
  overdueInstallments: number;
  pendingInstallments: number;
  photoUrl?: string | null;
  gender?: string | null;
};

type StatusFilter = "ALL" | "DUE" | "OVERDUE" | "PAID";
type TypeFilter = "ALL" | "MONTHLY" | "ANNUAL" | "OTHER";

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

type Props = {
  rows: FeeCollectionSummaryRow[];
  initialStatusFilter?: string | null;
  onRefresh: () => Promise<void>;
  upiId?: string;
  academyName?: string;
  bookingPhone?: string;
};

export function FeeSummaryTable({
  rows,
  initialStatusFilter,
  onRefresh,
  upiId,
  academyName,
  bookingPhone,
}: Props) {
  const [feeStatusFilter, setFeeStatusFilter] = useState<StatusFilter>(() => {
    const s = (initialStatusFilter ?? "").toUpperCase();
    // Both ?status=DUE and ?status=OVERDUE resolve to the combined Due/Overdue tab.
    // ?status=PAID selects the Paid tab. Everything else defaults to Due/Overdue.
    return s === "PAID" ? "PAID" : "DUE";
  });
  const [feeTypeFilter, setFeeTypeFilter] = useState<TypeFilter>("ALL");
  const [feeSummarySearch, setFeeSummarySearch] = useState("");
  const [editDueDateRow, setEditDueDateRow] =
    useState<FeeCollectionSummaryRow | null>(null);
  const [editDueDateValue, setEditDueDateValue] = useState("");
  const [savingDueDate, setSavingDueDate] = useState(false);

  const handleUpdateDueDate = async () => {
    if (!editDueDateRow || !editDueDateValue) return;
    setSavingDueDate(true);
    try {
      await api.patch(
        `/admin/fees/accounts/${editDueDateRow.feeAccountPublicId}/due-date?dueDate=${editDueDateValue}`,
      );
      toast.success(`Due date updated for ${editDueDateRow.playerName}`);
      setEditDueDateRow(null);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update due date");
    } finally {
      setSavingDueDate(false);
    }
  };

  const monthly = rows.filter((r) => r.feeType === "MONTHLY");
  const annual = rows.filter((r) => r.feeType === "ANNUAL");
  const overdue = rows.filter((r) => r.feeStatus === "OVERDUE");
  const due = rows.filter((r) => r.feeStatus === "DUE");

  const filtered = rows.filter((r) => {
    const matchType = feeTypeFilter === "ALL" || r.feeType === feeTypeFilter;
    const matchStatus =
      feeStatusFilter === "ALL" ||
      r.feeStatus === feeStatusFilter ||
      (feeStatusFilter === "DUE" &&
        (r.feeStatus === "DUE" || r.feeStatus === "OVERDUE"));
    const matchSearch =
      !feeSummarySearch ||
      r.playerName.toLowerCase().includes(feeSummarySearch.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  const whatsappHref = (row: FeeCollectionSummaryRow) => {
    const phone = (row.parentsPhone || row.phone || "").replace(/\D/g, "");
    const academy = academyName?.trim() || "NextGen Cricket Academy";

    const WAVE   = "\u{1F44B}"; // 👋
    const CAL    = "\u{1F4C5}"; // 📅
    const MONY   = "\u{1F4B0}"; // 💰
    const PRAY   = "\u{1F64F}"; // 🙏
    const CAMERA = "\u{1F4F8}"; // 📸

    // Real pending balance: installmentBalance covers partial-payment cases;
    // planAmount is the fallback for non-installment accounts.
    const amount = row.hasInstallmentPlan && row.installmentBalance
      ? row.installmentBalance
      : row.planAmount;

    const dueLine   = `${CAL} Due date: *${fmtDate(row.nextDueOn)}*`;
    const amountLine = `${MONY} Amount due: *₹${Number(amount).toLocaleString("en-IN")}*`;

    const dueMonth = row.nextDueOn
      ? new Date(row.nextDueOn)
          .toLocaleString("en-US", { month: "short", year: "numeric" })
          .replace(" ", "")
      : "";
    const safePn = encodeURIComponent(academy);
    const tn = encodeURIComponent(
      `Fee-${row.playerName.replace(/[^\w\s]/g, "").trim()}-${dueMonth}`,
    );
    const upiDeepLink = upiId?.trim()
      ? `upi://pay?pa=${upiId.trim()}&pn=${safePn}&am=${amount}&cu=INR&tn=${tn}`
      : "";

    const closingLine = bookingPhone?.trim()
      ? `Just a friendly reminder. Questions? Call *${bookingPhone.trim()}*.`
      : "Just a friendly reminder.";

    const msg = [
      `Hi ${row.playerName} ${WAVE}`,
      ``,
      `*${academy}* fee reminder:`,
      ``,
      dueLine,
      amountLine,
      ...(upiDeepLink ? [upiDeepLink] : []),
      `${CAMERA} Please share a screenshot/UPI ref after paying — helps us confirm faster!`,
      ``,
      closingLine,
      ``,
      `Thank you! ${PRAY}`,
      `- Team ${academy}`,
    ].join("\n");

    // ── DEBUG: open browser DevTools console before clicking ──────────────────
    // Check 1: are the emoji intact in the JS string right before encoding?
    const emojiCheck: Record<string, string> = {};
    Array.from(msg).forEach((ch) => {
      const cp = ch.codePointAt(0)!;
      if (cp > 0x7f) {
        emojiCheck[`U+${cp.toString(16).toUpperCase().padStart(5, "0")}`] = ch;
      }
    });
    console.log("[WA-DEBUG] Non-ASCII chars in msg (should include all 5 emoji):", emojiCheck);

    // Check 2: produce both encodings and compare
    const encodedFull = encodeURIComponent(msg);
    const encodedPerChar = Array.from(msg).map((c) => encodeURIComponent(c)).join("");
    console.log("[WA-DEBUG] Full encodeURIComponent === per-char:", encodedFull === encodedPerChar);

    // Check 3: confirm the correct 4-byte sequences are present
    const expected: Record<string, string> = {
      "👋": "%F0%9F%91%8B",
      "📅": "%F0%9F%93%85",
      "💰": "%F0%9F%92%B0",
      "🙏": "%F0%9F%99%8F",
      "📸": "%F0%9F%93%B8",
    };
    Object.entries(expected).forEach(([emoji, hex]) => {
      console.log(`[WA-DEBUG] ${emoji} → ${hex}: ${encodedPerChar.includes(hex) ? "✅ PRESENT" : "❌ MISSING — corrupt encoding detected"}`);
    });

    const encoded = encodedPerChar;
    // Check 4: log the full URL so you can paste it into the browser bar directly
    console.log("[WA-DEBUG] Full URL:\n", `https://api.whatsapp.com/send/?phone=91${phone}&text=${encoded}`);
    // ── END DEBUG ─────────────────────────────────────────────────────────────

    // Use api.whatsapp.com/send directly — skips the wa.me redirect server which
    // may corrupt multi-byte percent-encoded sequences during its server-side
    // re-encoding step before handing off to WhatsApp Desktop/Web.
    return `https://api.whatsapp.com/send/?phone=91${phone}&text=${encoded}`;
  };

  const openEditDueDate = (row: FeeCollectionSummaryRow) => {
    setEditDueDateValue(row.nextDueOn ? row.nextDueOn.split("T")[0] : "");
    setEditDueDateRow(row);
  };

  return (
    <div className="space-y-4">
      {/* ── Stat cards — 2-col on mobile, 4-col on sm+ ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFeeTypeFilter("ALL")}
          className={`rounded-xl p-4 border-2 text-left transition ${
            feeTypeFilter === "ALL"
              ? "bg-slate-800 border-slate-800 text-white"
              : "bg-white border-slate-200 hover:border-slate-400"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase mb-1 ${
              feeTypeFilter === "ALL" ? "text-slate-300" : "text-slate-500"
            }`}
          >
            All Players
          </p>
          <p
            className={`text-2xl font-bold ${
              feeTypeFilter === "ALL" ? "text-white" : "text-slate-800"
            }`}
          >
            {rows.length}
          </p>
          <p className="text-xs mt-0.5 text-slate-400">
            {overdue.length + due.length} pending / overdue
          </p>
        </button>
        <button
          onClick={() =>
            setFeeTypeFilter(feeTypeFilter === "MONTHLY" ? "ALL" : "MONTHLY")
          }
          className={`rounded-xl p-4 border-2 text-left transition ${
            feeTypeFilter === "MONTHLY"
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-blue-50 border-blue-200 hover:border-blue-400"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase mb-1 ${
              feeTypeFilter === "MONTHLY" ? "text-blue-100" : "text-blue-500"
            }`}
          >
            Monthly
          </p>
          <p
            className={`text-2xl font-bold ${
              feeTypeFilter === "MONTHLY" ? "text-white" : "text-blue-700"
            }`}
          >
            {monthly.length}
          </p>
          <p
            className={`text-xs mt-0.5 ${
              feeTypeFilter === "MONTHLY" ? "text-blue-200" : "text-slate-400"
            }`}
          >
            {monthly.filter((r) => r.feeStatus !== "PAID").length} pending /
            overdue
          </p>
        </button>
        <button
          onClick={() =>
            setFeeTypeFilter(feeTypeFilter === "ANNUAL" ? "ALL" : "ANNUAL")
          }
          className={`rounded-xl p-4 border-2 text-left transition ${
            feeTypeFilter === "ANNUAL"
              ? "bg-indigo-600 border-indigo-600 text-white"
              : "bg-indigo-50 border-indigo-200 hover:border-indigo-400"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase mb-1 ${
              feeTypeFilter === "ANNUAL" ? "text-indigo-100" : "text-indigo-500"
            }`}
          >
            Annual
          </p>
          <p
            className={`text-2xl font-bold ${
              feeTypeFilter === "ANNUAL" ? "text-white" : "text-indigo-700"
            }`}
          >
            {annual.length}
          </p>
          <p
            className={`text-xs mt-0.5 ${
              feeTypeFilter === "ANNUAL" ? "text-indigo-200" : "text-slate-400"
            }`}
          >
            {annual.filter((r) => r.feeStatus !== "PAID").length} pending /
            overdue
          </p>
        </button>
        <button
          onClick={() =>
            setFeeStatusFilter(
              feeStatusFilter === "OVERDUE" ? "DUE" : "OVERDUE",
            )
          }
          className={`rounded-xl p-4 border-2 text-left transition ${
            feeStatusFilter === "OVERDUE"
              ? "bg-red-600 border-red-600 text-white"
              : "bg-red-50 border-red-200 hover:border-red-400"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase mb-1 ${
              feeStatusFilter === "OVERDUE" ? "text-red-100" : "text-red-500"
            }`}
          >
            ⚠ Overdue
          </p>
          <p
            className={`text-2xl font-bold ${
              feeStatusFilter === "OVERDUE" ? "text-white" : "text-red-700"
            }`}
          >
            {overdue.length}
          </p>
          <p
            className={`text-xs mt-0.5 ${
              feeStatusFilter === "OVERDUE" ? "text-red-200" : "text-slate-400"
            }`}
          >
            {due.length} due soon
          </p>
        </button>
      </div>

      {/* ── Table / card container ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search + filter bar */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={feeSummarySearch}
                onChange={(e) => setFeeSummarySearch(e.target.value)}
                placeholder="Search player…"
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">
              {filtered.length} players
            </span>
          </div>
          {/* Filter chips — scrollable on narrow screens */}
          <div className="overflow-x-auto -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
              {(
                [
                  [
                    "DUE",
                    `Due / Overdue (${
                      rows.filter(
                        (r) =>
                          (feeTypeFilter === "ALL" ||
                            r.feeType === feeTypeFilter) &&
                          (r.feeStatus === "DUE" || r.feeStatus === "OVERDUE"),
                      ).length
                    })`,
                  ],
                  [
                    "PAID",
                    `Paid (${
                      rows.filter(
                        (r) =>
                          (feeTypeFilter === "ALL" ||
                            r.feeType === feeTypeFilter) &&
                          r.feeStatus === "PAID",
                      ).length
                    })`,
                  ],
                ] as [StatusFilter, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFeeStatusFilter(val)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
                    feeStatusFilter === val
                      ? val === "PAID"
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-red-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">
              No players match the current filters
            </p>
          </div>
        ) : (
          <>
            {/* ── MOBILE — card-per-player, md breakpoint matches PlayersListPage ── */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map((row) => (
                <div
                  key={row.playerPublicId}
                  className={`p-4 ${
                    row.feeStatus === "OVERDUE" ? "bg-red-50/40" : ""
                  }`}
                >
                  {/* Avatar + name + status badge */}
                  <div className="flex items-start gap-3 mb-2">
                    <PlayerAvatar
                      displayName={row.playerName}
                      photoUrl={row.photoUrl}
                      gender={row.gender}
                      size="md"
                    />
                    <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800 leading-snug truncate">
                        {row.playerName}
                      </p>
                      <span
                        className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          row.feeStatus === "PAID"
                            ? "bg-emerald-100 text-emerald-700"
                            : row.feeStatus === "OVERDUE"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {row.feeStatus === "OVERDUE" ? "⚠ OVERDUE" : row.feeStatus}
                      </span>
                    </div>
                  </div>

                  {/* Info rows */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          row.feeType === "ANNUAL"
                            ? "bg-indigo-100 text-indigo-700"
                            : row.feeType === "MONTHLY"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {row.feeType}
                      </span>
                      <span className="text-xs text-slate-400 truncate">
                        {row.feePlanName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Next due</span>
                      <span
                        className={`font-medium ${
                          row.feeStatus === "OVERDUE"
                            ? "text-red-600"
                            : row.feeStatus === "DUE"
                              ? "text-amber-600"
                              : "text-slate-600"
                        }`}
                      >
                        {row.nextDueOn ? fmtDate(row.nextDueOn) : "—"}
                      </span>
                    </div>
                    {row.hasInstallmentPlan && row.installmentBalance !== null && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Installment</span>
                        <span
                          className={
                            row.installmentBalance > 0
                              ? "text-red-600 font-semibold"
                              : "text-emerald-600 font-semibold"
                          }
                        >
                          {row.installmentBalance > 0
                            ? `₹${row.installmentBalance.toLocaleString("en-IN")} due`
                            : "✓ Fully paid"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons — full-area, touch-friendly */}
                  {(row.feeStatus === "OVERDUE" ||
                    row.feeStatus === "DUE" ||
                    row.feeAccountPublicId) && (
                    <div className="flex gap-2">
                      {(row.feeStatus === "OVERDUE" ||
                        row.feeStatus === "DUE") && (
                        <a
                          href={whatsappHref(row)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 active:bg-green-700 transition"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="w-3.5 h-3.5 fill-white flex-shrink-0"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.112 1.523 5.838L.057 23.6l5.916-1.447A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.888 9.888 0 01-5.032-1.372l-.361-.214-3.741.981.998-3.648-.235-.374A9.868 9.868 0 012.107 12C2.107 6.539 6.539 2.107 12 2.107S21.893 6.539 21.893 12 17.461 21.894 12 21.894z" />
                          </svg>
                          WhatsApp
                        </a>
                      )}
                      {row.feeAccountPublicId && (
                        <button
                          onClick={() => openEditDueDate(row)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 active:bg-slate-300 transition"
                        >
                          <Calendar size={13} />
                          Edit Due Date
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── DESKTOP TABLE ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase tracking-wide border-b bg-slate-50/50">
                    {[
                      "Player",
                      "Fee Type",
                      "Plan",
                      "Status",
                      "Installment",
                      "Next Due",
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
                  {filtered.map((row) => (
                    <tr
                      key={row.playerPublicId}
                      className={`hover:bg-slate-50 transition-colors ${
                        row.feeStatus === "OVERDUE" ? "bg-red-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <PlayerAvatar
                            displayName={row.playerName}
                            photoUrl={row.photoUrl}
                            gender={row.gender}
                            size="sm"
                          />
                          <p className="text-sm font-semibold text-slate-800">
                            {row.playerName}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            row.feeType === "ANNUAL"
                              ? "bg-indigo-100 text-indigo-700"
                              : row.feeType === "MONTHLY"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {row.feeType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {row.feePlanName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                            row.feeStatus === "PAID"
                              ? "bg-emerald-100 text-emerald-700"
                              : row.feeStatus === "OVERDUE"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {row.feeStatus === "OVERDUE" && "⚠ "}
                          {row.feeStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {row.hasInstallmentPlan &&
                        row.installmentBalance !== null ? (
                          <div>
                            <span
                              className={
                                row.installmentBalance > 0
                                  ? "text-red-600 font-semibold"
                                  : "text-emerald-600 font-semibold"
                              }
                            >
                              {row.installmentBalance > 0
                                ? `₹${row.installmentBalance.toLocaleString("en-IN")} due`
                                : "✓ Fully paid"}
                            </span>
                            {row.installmentPaid !== null &&
                              row.installmentPaid > 0 && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  ₹
                                  {row.installmentPaid.toLocaleString("en-IN")}{" "}
                                  paid
                                </p>
                              )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {row.nextDueOn ? (
                          <span
                            className={`font-medium ${
                              row.feeStatus === "OVERDUE"
                                ? "text-red-600"
                                : row.feeStatus === "DUE"
                                  ? "text-amber-600"
                                  : "text-slate-600"
                            }`}
                          >
                            {fmtDate(row.nextDueOn)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {(row.feeStatus === "OVERDUE" ||
                            row.feeStatus === "DUE") && (
                            <a
                              href={whatsappHref(row)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="w-3 h-3 fill-white"
                              >
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.112 1.523 5.838L.057 23.6l5.916-1.447A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.888 9.888 0 01-5.032-1.372l-.361-.214-3.741.981.998-3.648-.235-.374A9.868 9.868 0 012.107 12C2.107 6.539 6.539 2.107 12 2.107S21.893 6.539 21.893 12 17.461 21.894 12 21.894z" />
                              </svg>
                              WhatsApp
                            </a>
                          )}
                          {row.feeAccountPublicId && (
                            <button
                              onClick={() => openEditDueDate(row)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition"
                            >
                              <Calendar size={11} />
                              Edit Due
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Edit Due Date modal — slides up from bottom on mobile ── */}
      {editDueDateRow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50 rounded-t-2xl sm:rounded-t-xl">
              <div>
                <h3 className="font-bold text-slate-800">Edit Due Date</h3>
                <p className="text-xs text-slate-500">
                  {editDueDateRow.playerName} · {editDueDateRow.feePlanName}
                </p>
              </div>
              <button onClick={() => setEditDueDateRow(null)}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  New Due Date *
                </label>
                <input
                  type="date"
                  value={editDueDateValue}
                  onChange={(e) => setEditDueDateValue(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                This only changes the due date. It does not record a payment.
              </p>
              <div className="flex gap-2 pt-1 pb-4">
                <button
                  onClick={() => setEditDueDateRow(null)}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateDueDate}
                  disabled={savingDueDate || !editDueDateValue}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingDueDate ? "Saving…" : "Save Due Date"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
