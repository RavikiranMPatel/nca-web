import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import api from "../../api/axios";
import { FeeSummaryTable } from "./FeeSummaryTable";
import type { FeeCollectionSummaryRow } from "./FeeSummaryTable";

export default function FeesDuePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [rows, setRows] = useState<FeeCollectionSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resynced, setResynced] = useState<number | null>(null);
  const [upiId, setUpiId] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setResynced(null);
    try {
      // Resync stale accounts first (idempotent — skips already-PAID accounts).
      // This ensures any FeeAccount whose status hasn't caught up with a completed
      // installment plan is corrected at the data level before we read the list.
      const [syncRes, settingsRes, summaryRes] = await Promise.all([
        api.post("/admin/fees/resync-installment-accounts").catch(() => null),
        api.get("/admin/settings").catch(() => null),
        api.get("/admin/fees/collection-summary"),
      ]);
      const syncCount: number = syncRes?.data?.resynced ?? 0;
      if (syncCount > 0) setResynced(syncCount);
      const s = settingsRes?.data ?? {};
      setUpiId(s.UPI_ID?.trim() ?? "");
      setAcademyName(s.ACADEMY_NAME?.trim() ?? "");
      setBookingPhone(s.BOOKING_PHONE?.trim() ?? "");
      setRows(summaryRes.data || []);
    } catch {
      setError("Failed to load fee data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const overdueCnt = rows.filter((r) => r.feeStatus === "OVERDUE").length;
  const dueCnt = rows.filter((r) => r.feeStatus === "DUE").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-800">
                Fees Due &amp; Overdue
              </h1>
              {!loading && (
                <p className="text-xs text-slate-400">
                  {overdueCnt} overdue · {dueCnt} due soon · {rows.length} total
                  {resynced !== null && resynced > 0 && (
                    <span className="ml-2 text-emerald-600 font-medium">
                      · {resynced} account{resynced !== 1 ? "s" : ""} auto-corrected
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-14 bg-white rounded-xl border border-slate-200 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500 text-sm font-medium">{error}</p>
            <button
              onClick={load}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <FeeSummaryTable
            rows={rows}
            initialStatusFilter={searchParams.get("status")}
            onRefresh={load}
            upiId={upiId}
            academyName={academyName}
            bookingPhone={bookingPhone}
          />
        )}
      </div>
    </div>
  );
}
