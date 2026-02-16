import { useState } from "react";
import { X, Save, DollarSign, CreditCard } from "lucide-react";
import { toast } from "react-hot-toast";
import { summerCampService } from "../../api/summerCampService";
import type {
  SummerCampEnrollment,
  PaymentRecordRequest,
} from "../../types/summercamp";

interface PaymentRecordModalProps {
  campId: string;
  enrollment: SummerCampEnrollment;
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentRecordModal({
  campId,
  enrollment,
  onClose,
  onSuccess,
}: PaymentRecordModalProps) {
  const [loading, setLoading] = useState(false);

  const safeTotal = enrollment.totalFee ?? 0;
  const safePaid = enrollment.paidAmount ?? 0;
  const safeBalance = enrollment.balanceAmount ?? 0;

  const [formData, setFormData] = useState<PaymentRecordRequest>({
    amount: safeBalance,
    paymentMode: "CASH",
    paymentReference: "",
    notes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.amount <= 0) {
      toast.error("Payment amount must be greater than zero");
      return;
    }

    if (formData.amount > safeBalance) {
      toast.error("Payment amount cannot exceed balance amount");
      return;
    }

    if (!formData.paymentMode) {
      toast.error("Please select a payment method");
      return;
    }

    setLoading(true);

    try {
      await summerCampService.recordPayment(
        campId,
        enrollment.publicId,
        formData,
      );
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CreditCard className="text-emerald-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Record Payment
              </h2>
              <p className="text-sm text-slate-600">{enrollment.playerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* SUMMARY */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Fee:</span>
              <span className="font-semibold">₹{safeTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Already Paid:</span>
              <span className="font-semibold text-emerald-700">
                ₹{safePaid.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-base pt-2 border-t">
              <span className="font-semibold">Balance Due:</span>
              <span className="font-bold text-orange-700 text-lg">
                ₹{safeBalance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Payment Amount (₹)
            </label>

            <div className="relative">
              <DollarSign
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0.01"
                max={safeBalance}
                step="0.01"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  amount: safeBalance,
                }))
              }
              className="mt-2 text-sm text-blue-600 font-medium"
            >
              Pay full balance ₹{safeBalance.toFixed(2)}
            </button>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Payment Method
            </label>
            <select
              name="paymentMode"
              value={formData.paymentMode}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-lg border"
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Transaction Reference
            </label>
            <input
              type="text"
              name="paymentReference"
              value={formData.paymentReference}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg"
            >
              {loading ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PaymentRecordModal;
