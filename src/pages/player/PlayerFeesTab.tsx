import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  ArrowRightLeft,
  History,
  Upload,
  X,
  Image as ImageIcon,
  FileText,
  Eye,
} from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-hot-toast";

type FeePlan = {
  id: string;
  publicId: string;
  name: string;
  amount: number;
  discountAmount: number;
  durationDays: number;
  durationLabel: string;
  campType: string;
  finalAmount?: number;
};

type FeeAccount = {
  publicId: string;
  feePlan: FeePlan;
  lastPaidOn: string | null;
  nextDueOn: string;
  status: "PAID" | "DUE" | "OVERDUE";
};

// Add to FeePayment type
type FeePayment = {
  id: string;
  publicId: string;
  amount: number;
  paymentMode: string;
  paidOn: string;
  markedByPublicId: string;
  type: string;
  feePlan: FeePlan;
  referenceNumber: string | null;
  receiptImageUrl: string | null;
  player?: { phone?: string; parentsPhone?: string; displayName?: string };
  nextDueOn?: string;
};

const PAYMENT_MODES = [
  { value: "PHONE_PE", label: "PhonePe", refLabel: "PhonePe UTR / Txn ID" },
  { value: "GOOGLE_PAY", label: "Google Pay", refLabel: "GPay Transaction ID" },
  { value: "CASH", label: "Cash", refLabel: "Receipt Number" },
  {
    value: "ONLINE",
    label: "Online / Bank Transfer",
    refLabel: "NEFT / IMPS Ref No",
  },
  { value: "OTHER", label: "Other", refLabel: "Reference Number" },
];

function PlayerFeesTab() {
  const { playerPublicId } = useParams();
  const role = localStorage.getItem("userRole");
  const isSuperAdmin = role === "ROLE_SUPER_ADMIN";

  const [showSendReceiptModal, setShowSendReceiptModal] =
    useState<FeePayment | null>(null);
  const [receiptPhone, setReceiptPhone] = useState("");
  const [sendingReceipt, setSendingReceipt] = useState(false);

  const handleSendReceipt = async () => {
    if (!showSendReceiptModal) return;
    if (!receiptPhone.trim()) {
      toast.error("Enter a phone number");
      return;
    }
    setSendingReceipt(true);
    try {
      await api.post(
        `/admin/fees/payments/${showSendReceiptModal.publicId}/send-receipt?phone=${encodeURIComponent(receiptPhone.trim())}`,
      );
      toast.success("Receipt sent via WhatsApp!");
      setShowSendReceiptModal(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send receipt");
    } finally {
      setSendingReceipt(false);
    }
  };

  const [account, setAccount] = useState<FeeAccount | null>(null);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [plans, setPlans] = useState<FeePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [showReceiptViewer, setShowReceiptViewer] = useState<string | null>(
    null,
  );

  // Mark paid form
  const [paymentMode, setPaymentMode] = useState("PHONE_PE");
  const [otherModeText, setOtherModeText] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [markingPaid, setMarkingPaid] = useState(false);

  // Assign form
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (playerPublicId) loadAll();
  }, [playerPublicId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [accountRes, paymentsRes, plansRes] = await Promise.all([
        api.get(`/admin/fees/accounts/${playerPublicId}`).catch(() => null),
        api
          .get(`/admin/fees/payments?playerPublicId=${playerPublicId}`)
          .catch(() => ({ data: [] })),
        api.get("/admin/fees/plans/active"),
      ]);
      if (accountRes && accountRes.status === 200 && accountRes.data) {
        setAccount(accountRes.data);
      } else {
        setAccount(null);
      }
      setPayments(paymentsRes.data || []);
      setPlans(plansRes.data || []);
    } catch {
      toast.error("Failed to load fee data");
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      toast.error("Only JPG, PNG, and WebP images are supported");
      return;
    }
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  const removeReceipt = () => {
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptFile(null);
    setReceiptPreview("");
  };

  const resetPayForm = () => {
    setPaymentMode("PHONE_PE");
    setOtherModeText("");
    setReferenceNumber("");
    removeReceipt();
  };

  const handleMarkPaid = async () => {
    if (!account) return;
    setMarkingPaid(true);
    try {
      const formData = new FormData();
      formData.append("feeAccountPublicId", account.publicId);
      formData.append("paymentMode", paymentMode);
      if (paymentMode === "OTHER" && otherModeText)
        formData.append("otherModeText", otherModeText);
      if (referenceNumber.trim())
        formData.append("referenceNumber", referenceNumber.trim());
      if (receiptFile) formData.append("receiptImage", receiptFile);

      await api.post("/admin/fees/pay", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Payment recorded successfully!");
      setShowPayModal(false);
      resetPayForm();
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedPlanId) {
      toast.error("Select a fee plan");
      return;
    }
    setAssigning(true);
    try {
      await api.post(
        `/admin/fees/accounts/assign?playerPublicId=${playerPublicId}&feePlanPublicId=${selectedPlanId}`,
      );
      toast.success("Fee plan assigned!");
      setShowAssignModal(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to assign plan");
    } finally {
      setAssigning(false);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedPlanId || !account) return;
    setAssigning(true);
    try {
      await api.put(
        `/admin/fees/accounts/${account.publicId}/change-plan?newPlanPublicId=${selectedPlanId}`,
      );
      toast.success("Plan changed! Due date recalculated.");
      setShowChangePlanModal(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to change plan");
    } finally {
      setAssigning(false);
    }
  };

  const handleDownloadReceipt = async (publicId: string) => {
    try {
      const response = await api.get(
        `/admin/fees/payments/${publicId}/receipt-pdf`,
        { responseType: "blob" },
      );
      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const newTab = window.open(blobUrl, "_blank");
      if (!newTab) {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute("download", `receipt-${publicId}.pdf`);
        link.setAttribute("target", "_blank");
        link.click();
      }
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      toast.error("Failed to download receipt");
    }
  };

  const handleReverse = async (paymentId: string) => {
    const reason = prompt("Reason for reversal:");
    if (!reason) return;
    try {
      await api.post(
        `/admin/fees/reverse?paymentId=${paymentId}&reason=${encodeURIComponent(reason)}`,
      );
      toast.success("Payment reversed");
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reverse payment");
    }
  };

  const getFinalAmount = (plan: FeePlan) =>
    plan.amount - (plan.discountAmount || 0);
  const getRefLabel = () =>
    PAYMENT_MODES.find((m) => m.value === paymentMode)?.refLabel ||
    "Reference Number";

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "PAID":
        return {
          color: "text-emerald-700",
          bg: "bg-emerald-50 border-emerald-200",
          badgeBg: "bg-emerald-100 text-emerald-700",
          icon: <CheckCircle2 size={20} className="text-emerald-600" />,
          label: "Paid",
        };
      case "OVERDUE":
        return {
          color: "text-red-700",
          bg: "bg-red-50 border-red-200",
          badgeBg: "bg-red-100 text-red-700",
          icon: <AlertCircle size={20} className="text-red-600" />,
          label: "Overdue",
        };
      default:
        return {
          color: "text-amber-700",
          bg: "bg-amber-50 border-amber-200",
          badgeBg: "bg-amber-100 text-amber-700",
          icon: <Clock size={20} className="text-amber-600" />,
          label: "Due",
        };
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // ==================== NO ACCOUNT ====================
  if (!account) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 sm:p-12 text-center">
          <IndianRupee size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-2">
            No Fee Plan Assigned
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Assign a fee plan to start tracking payments and due dates for this
            player.
          </p>
          <button
            onClick={() => {
              setSelectedPlanId("");
              setShowAssignModal(true);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            <CreditCard size={18} /> Assign Fee Plan
          </button>
        </div>
        {showAssignModal && (
          <PlanSelectorModal
            title="Assign Fee Plan"
            plans={plans}
            selectedPlanId={selectedPlanId}
            setSelectedPlanId={setSelectedPlanId}
            onConfirm={handleAssignPlan}
            onClose={() => setShowAssignModal(false)}
            loading={assigning}
            confirmLabel="Assign Plan"
            getFinalAmount={getFinalAmount}
          />
        )}
      </div>
    );
  }

  // ==================== ACCOUNT EXISTS ====================
  const statusConfig = getStatusConfig(account.status);
  const daysUntilDue = getDaysUntilDue(account.nextDueOn);
  const plan = account.feePlan;

  return (
    <div className="space-y-4">
      {/* ── FEE STATUS CARD ── */}
      <div className={`rounded-xl border-2 p-4 sm:p-6 ${statusConfig.bg}`}>
        {/* Plan name + status badge */}
        <div className="flex items-center gap-2 mb-3">
          {statusConfig.icon}
          <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
          <span
            className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${statusConfig.badgeBg}`}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Amount */}
        <div className="flex items-center gap-3 mb-3">
          {plan.discountAmount > 0 ? (
            <>
              <span className="text-sm text-slate-400 line-through">
                ₹{plan.amount.toLocaleString("en-IN")}
              </span>
              <span className="text-2xl font-bold text-slate-900">
                ₹{getFinalAmount(plan).toLocaleString("en-IN")}
              </span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                ₹{plan.discountAmount.toLocaleString("en-IN")} off
              </span>
            </>
          ) : (
            <span className="text-2xl font-bold text-slate-900">
              ₹{plan.amount.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {/* Info grid — always 3 cols, compact */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              Duration
            </p>
            <p className="text-xs font-medium text-slate-800 mt-0.5">
              {plan.durationLabel || `${plan.durationDays}d`}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              Last Paid
            </p>
            <p className="text-xs font-medium text-slate-800 mt-0.5">
              {formatDate(account.lastPaidOn)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              Next Due
            </p>
            <p
              className={`text-xs font-medium mt-0.5 ${account.status === "OVERDUE" ? "text-red-600" : "text-slate-800"}`}
            >
              {formatDate(account.nextDueOn)}
              {daysUntilDue > 0 && account.status !== "OVERDUE" && (
                <span className="text-[10px] text-slate-400 ml-1">
                  ({daysUntilDue}d)
                </span>
              )}
              {daysUntilDue < 0 && (
                <span className="text-[10px] text-red-500 ml-1">
                  ({Math.abs(daysUntilDue)}d overdue)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action buttons — stacked on mobile */}
        <div className="flex flex-col sm:flex-row gap-2">
          {account.status !== "PAID" ? (
            <button
              onClick={() => {
                resetPayForm();
                setShowPayModal(true);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm"
            >
              <CheckCircle2 size={16} /> Mark as Paid
            </button>
          ) : (
            <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-center">
              <p className="text-xs text-emerald-600 font-medium">
                Next payment opens
              </p>
              <p className="text-sm font-bold text-emerald-800">
                {formatDate(account.nextDueOn)}
              </p>
            </div>
          )}
          <button
            onClick={() => {
              setSelectedPlanId("");
              setShowChangePlanModal(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition text-sm"
          >
            <ArrowRightLeft size={15} /> Change Plan
          </button>
        </div>
      </div>

      {/* ── PAYMENT HISTORY ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
          <History size={17} className="text-slate-500" />
          <h3 className="font-bold text-slate-800 text-sm">Payment History</h3>
          <span className="text-xs text-slate-400">({payments.length})</span>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-10">
            <History size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-500">No payments recorded yet</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase tracking-wide border-b bg-slate-50/50">
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-left px-5 py-3">Plan</th>
                    <th className="text-left px-5 py-3">Amount</th>
                    <th className="text-left px-5 py-3">Mode</th>
                    <th className="text-left px-5 py-3">Ref / Receipt</th>
                    <th className="text-left px-5 py-3">Send</th>
                    <th className="text-left px-5 py-3">Status</th>
                    {isSuperAdmin && (
                      <th className="text-right px-5 py-3">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr
                      key={p.publicId}
                      className={`hover:bg-slate-50 transition ${p.type === "REVERSAL" ? "bg-red-50/30" : ""}`}
                    >
                      <td className="px-5 py-3 text-sm text-slate-700">
                        {formatDate(p.paidOn)}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {p.feePlan?.name || "—"}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-slate-800">
                        ₹{p.amount?.toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {formatPaymentMode(p.paymentMode)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {p.referenceNumber && (
                            <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {p.referenceNumber}
                            </span>
                          )}
                          {p.receiptImageUrl && (
                            <button
                              onClick={() =>
                                setShowReceiptViewer(p.receiptImageUrl)
                              }
                              className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded"
                              title="View receipt"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                          {!p.referenceNumber && !p.receiptImageUrl && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {p.type !== "REVERSAL" && (
                          <div className="flex items-center gap-2">
                            {/* WhatsApp Receipt */}
                            <button
                              onClick={() => {
                                const phone =
                                  p.player?.parentsPhone ||
                                  p.player?.phone ||
                                  "";
                                setReceiptPhone(phone);
                                setShowSendReceiptModal(p);
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition"
                              title="Send WhatsApp Receipt"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="w-3.5 h-3.5 fill-current"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.098.546 4.07 1.5 5.785L0 24l6.435-1.635A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.887 0-3.655-.487-5.194-1.344l-.372-.22-3.818.97.994-3.71-.242-.383A9.938 9.938 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                              </svg>
                              Receipt
                            </button>

                            {/* PDF Download */}
                            <button
                              onClick={() => handleDownloadReceipt(p.publicId)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 transition"
                              title="Download PDF Receipt"
                            >
                              <FileText size={13} />
                              PDF
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${p.type === "REVERSAL" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}
                        >
                          {p.type === "REVERSAL" ? "Reversed" : "Paid"}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-5 py-3 text-right">
                          {p.type !== "REVERSAL" && (
                            <button
                              onClick={() => handleReverse(p.id)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline"
                            >
                              Reverse
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {payments.map((p) => (
                <div
                  key={p.publicId}
                  className={`p-4 ${p.type === "REVERSAL" ? "bg-red-50/30" : ""}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      {formatDate(p.paidOn)}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.type === "REVERSAL" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}
                    >
                      {p.type === "REVERSAL" ? "Reversed" : "Paid"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-lg font-bold text-slate-900">
                      ₹{p.amount?.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatPaymentMode(p.paymentMode)}
                    </span>
                  </div>
                  {/* Ref & Receipt */}
                  {(p.referenceNumber || p.receiptImageUrl) && (
                    <div className="flex items-center gap-2 mb-1.5">
                      {p.referenceNumber && (
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          Ref: {p.referenceNumber}
                        </span>
                      )}
                      {p.receiptImageUrl && (
                        <button
                          onClick={() =>
                            setShowReceiptViewer(p.receiptImageUrl)
                          }
                          className="text-[11px] text-blue-600 flex items-center gap-1"
                        >
                          <ImageIcon size={12} /> Receipt
                        </button>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {p.feePlan?.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {p.type !== "REVERSAL" && (
                        <>
                          {/* WhatsApp */}
                          <button
                            onClick={() => {
                              const phone =
                                p.player?.parentsPhone || p.player?.phone || "";
                              setReceiptPhone(phone);
                              setShowSendReceiptModal(p);
                            }}
                            className="text-[11px] text-emerald-600 font-medium flex items-center gap-1"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="w-3 h-3 fill-current"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.098.546 4.07 1.5 5.785L0 24l6.435-1.635A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.887 0-3.655-.487-5.194-1.344l-.372-.22-3.818.97.994-3.71-.242-.383A9.938 9.938 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                            </svg>
                            Receipt
                          </button>

                          {/* PDF */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDownloadReceipt(p.publicId);
                            }}
                            className="text-[11px] text-blue-600 font-medium flex items-center gap-1"
                          >
                            <FileText size={12} />
                            PDF
                          </button>
                        </>
                      )}
                      {isSuperAdmin && p.type !== "REVERSAL" && (
                        <button
                          onClick={() => handleReverse(p.id)}
                          className="text-xs text-red-500 font-medium"
                        >
                          Reverse
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── MARK AS PAID MODAL ── */}
      {showPayModal && account && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl sm:rounded-t-xl sticky top-0">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-base">
                  Record Payment
                </h3>
                <button
                  onClick={() => {
                    setShowPayModal(false);
                    resetPayForm();
                  }}
                  className="text-white/70 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Amount */}
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                {plan.discountAmount > 0 && (
                  <p className="text-sm text-slate-400 line-through mb-0.5">
                    ₹{plan.amount.toLocaleString("en-IN")}
                  </p>
                )}
                <p className="text-3xl font-bold text-blue-700">
                  ₹{getFinalAmount(plan).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {plan.name} •{" "}
                  {plan.durationLabel || `${plan.durationDays} days`}
                </p>
                {plan.discountAmount > 0 && (
                  <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium">
                    ₹{plan.discountAmount.toLocaleString("en-IN")} discount
                    applied
                  </span>
                )}
              </div>

              {/* Payment Mode */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PAYMENT_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {paymentMode === "OTHER" && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                    Specify Mode
                  </label>
                  <input
                    type="text"
                    value={otherModeText}
                    onChange={(e) => setOtherModeText(e.target.value)}
                    placeholder="e.g., Bank NEFT"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Reference Number */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText size={12} /> {getRefLabel()}
                    <span className="text-slate-400 font-normal">
                      (optional)
                    </span>
                  </span>
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder={`Enter ${getRefLabel().toLowerCase()}`}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Receipt Screenshot */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon size={12} /> Payment Screenshot
                    <span className="text-slate-400 font-normal">
                      (optional)
                    </span>
                  </span>
                </label>
                {receiptPreview ? (
                  <div className="relative border-2 border-blue-200 rounded-xl overflow-hidden bg-slate-50">
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="w-full max-h-48 object-contain"
                    />
                    <button
                      type="button"
                      onClick={removeReceipt}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition shadow-md"
                    >
                      <X size={14} />
                    </button>
                    <div className="px-3 py-1.5 bg-blue-50 text-xs text-blue-700 flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> {receiptFile?.name}
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer block border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-300 hover:bg-blue-50/30 transition">
                    <Upload
                      size={20}
                      className="mx-auto text-slate-400 mb-1.5"
                    />
                    <p className="text-xs text-slate-500">
                      Tap to upload PhonePe / GPay screenshot
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      JPG, PNG, WebP • Max 5MB
                    </p>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleReceiptSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Next due preview */}
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="text-slate-600">
                  Next due date:{" "}
                  <span className="font-semibold text-slate-800">
                    {formatDate(
                      new Date(
                        Date.now() + plan.durationDays * 86400000,
                      ).toISOString(),
                    )}
                  </span>
                </p>
              </div>

              <div className="flex gap-2 pt-1 pb-8">
                <button
                  onClick={() => {
                    setShowPayModal(false);
                    resetPayForm();
                  }}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkPaid}
                  disabled={markingPaid}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {markingPaid ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  {markingPaid ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RECEIPT VIEWER ── */}
      {showReceiptViewer && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowReceiptViewer(null)}
        >
          <div
            className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
              <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                <ImageIcon size={16} /> Payment Receipt
              </h4>
              <button
                onClick={() => setShowReceiptViewer(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-100 min-h-[200px]">
              <img
                src={showReceiptViewer}
                alt="Payment receipt"
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── CHANGE PLAN MODAL ── */}
      {showChangePlanModal && (
        <PlanSelectorModal
          title="Change Fee Plan"
          plans={plans.filter((p) => p.publicId !== account?.feePlan?.publicId)}
          selectedPlanId={selectedPlanId}
          setSelectedPlanId={setSelectedPlanId}
          onConfirm={handleChangePlan}
          onClose={() => setShowChangePlanModal(false)}
          loading={assigning}
          confirmLabel="Change Plan"
          getFinalAmount={getFinalAmount}
          note="Next due date will be recalculated from today."
        />
      )}

      {showAssignModal && (
        <PlanSelectorModal
          title="Assign Fee Plan"
          plans={plans}
          selectedPlanId={selectedPlanId}
          setSelectedPlanId={setSelectedPlanId}
          onConfirm={handleAssignPlan}
          onClose={() => setShowAssignModal(false)}
          loading={assigning}
          confirmLabel="Assign Plan"
          getFinalAmount={getFinalAmount}
        />
      )}

      {/* ── SEND WHATSAPP RECEIPT MODAL ── */}
      {showSendReceiptModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-sm">
            <div className="px-5 py-4 bg-gradient-to-br from-blue-700 to-blue-900 rounded-t-2xl sm:rounded-t-xl text-white text-center relative">
              <button
                onClick={() => setShowSendReceiptModal(null)}
                className="absolute right-4 top-4 text-white/60 hover:text-white"
              >
                <X size={18} />
              </button>
              <img
                src="/apple-touch-icon.png"
                alt="NCA"
                className="w-14 h-14 rounded-full mx-auto mb-2 border-2 border-white/30 shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <p className="font-bold text-base">Send Fee Receipt</p>
              <p className="text-xs text-blue-200 mt-0.5">via WhatsApp</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3.5 space-y-1.5 border border-slate-100">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Plan</span>
                  <span className="font-medium text-slate-800">
                    {showSendReceiptModal.feePlan?.name}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold text-emerald-700">
                    ₹{showSendReceiptModal.amount?.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Paid On</span>
                  <span className="font-medium text-slate-800">
                    {formatDate(showSendReceiptModal.paidOn)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Mode</span>
                  <span className="font-medium text-slate-800">
                    {formatPaymentMode(showSendReceiptModal.paymentMode)}
                  </span>
                </div>
                {showSendReceiptModal.referenceNumber && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Ref No.</span>
                    <span className="font-mono text-slate-700">
                      {showSendReceiptModal.referenceNumber}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  WhatsApp Number
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    value={receiptPhone.replace(/^\+?91/, "")}
                    onChange={(e) =>
                      setReceiptPhone(
                        e.target.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    placeholder="10-digit mobile number"
                    className="w-full pl-16 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wide"
                    maxLength={10}
                  />
                </div>
                {receiptPhone && receiptPhone.length !== 10 && (
                  <p className="text-[11px] text-red-500 mt-1">
                    Enter a valid 10-digit number
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-1 pb-8">
                <button
                  onClick={() => setShowSendReceiptModal(null)}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendReceipt}
                  disabled={sendingReceipt || receiptPhone.length !== 10}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {sendingReceipt ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="w-4 h-4 fill-current"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.098.546 4.07 1.5 5.785L0 24l6.435-1.635A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.887 0-3.655-.487-5.194-1.344l-.372-.22-3.818.97.994-3.71-.242-.383A9.938 9.938 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                    </svg>
                  )}
                  {sendingReceipt ? "Sending..." : "Send Receipt"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== PLAN SELECTOR MODAL ====================

function PlanSelectorModal({
  title,
  plans,
  selectedPlanId,
  setSelectedPlanId,
  onConfirm,
  onClose,
  loading,
  confirmLabel,
  getFinalAmount,
  note,
}: {
  title: string;
  plans: FeePlan[];
  selectedPlanId: string;
  setSelectedPlanId: (id: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
  confirmLabel: string;
  getFinalAmount: (plan: FeePlan) => number;
  note?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="px-5 py-4 border-b bg-slate-50 rounded-t-2xl sm:rounded-t-xl sticky top-0">
          <h3 className="font-bold text-base">{title}</h3>
        </div>
        <div className="p-4 space-y-3">
          {plans.map((plan) => (
            <button
              key={plan.publicId}
              onClick={() => setSelectedPlanId(plan.publicId)}
              className={`w-full text-left p-4 rounded-xl border-2 transition ${
                selectedPlanId === plan.publicId
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-blue-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{plan.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {plan.durationLabel || `${plan.durationDays} days`}
                    {plan.campType === "SUMMER_CAMP" && " • Summer Camp"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  {plan.discountAmount > 0 && (
                    <p className="text-xs text-slate-400 line-through">
                      ₹{plan.amount.toLocaleString("en-IN")}
                    </p>
                  )}
                  <p className="text-base font-bold text-blue-700">
                    ₹{getFinalAmount(plan).toLocaleString("en-IN")}
                  </p>
                  {plan.discountAmount > 0 && (
                    <p className="text-[10px] text-green-600 font-semibold">
                      ₹{plan.discountAmount.toLocaleString("en-IN")} off
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
          {plans.length === 0 && (
            <p className="text-center py-6 text-slate-500 text-sm">
              No plans available
            </p>
          )}
          {note && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              {note}
            </p>
          )}
          <div className="flex gap-2 pt-2 pb-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading || !selectedPlanId}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Processing..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== HELPERS ====================

function formatPaymentMode(mode: string): string {
  const map: Record<string, string> = {
    PHONE_PE: "PhonePe",
    PHONEPE: "PhonePe",
    GOOGLE_PAY: "Google Pay",
    GPAY: "Google Pay",
    CASH: "Cash",
    ONLINE: "Online",
    OFFLINE: "Offline",
    OTHER: "Other",
  };
  return map[mode] || mode;
}

export default PlayerFeesTab;
