import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  IndianRupee,
  Users,
  TrendingUp,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-hot-toast";

type Summary = {
  month: string;
  directFeeCollected: number;
  installmentFeeCollected: number;
  totalFeeCollected: number;
  outstandingAmount: number;
  activePlayers: number;
  avgAttendanceRate: number;
};

function fmt(n: number) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

export default function MonthSummaryPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<Summary>("/admin/reports/month-summary", { params: { year, month } })
      .then((r) => setSummary(r.data))
      .catch(() => toast.error("Failed to load summary"))
      .finally(() => setLoading(false));
  }, [year, month]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    const next = new Date(year, month); // month is 1-based, Date uses 0-based → this gives 1st of next month
    if (next > now) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => navigate("/admin")}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition flex-shrink-0"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <IndianRupee size={18} className="text-emerald-600 flex-shrink-0" />
            <h1 className="text-base font-bold text-gray-900 truncate">Month Summary</h1>
          </div>
          {/* Month navigator */}
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-semibold text-gray-700 w-28 text-center">
              {summary?.month ?? `${year}-${String(month).padStart(2, "0")}`}
            </span>
            <button
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
              disabled={new Date(year, month) > now}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-gray-400" />
          </div>
        ) : summary ? (
          <>
            {/* Fee cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-xs text-emerald-600 font-medium mb-1">Total Collected</p>
                <p className="text-2xl font-bold text-emerald-700">{fmt(summary.totalFeeCollected)}</p>
                <div className="mt-2 space-y-0.5 text-[11px] text-emerald-600">
                  <p>Direct: {fmt(summary.directFeeCollected)}</p>
                  <p>Installment: {fmt(summary.installmentFeeCollected)}</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs text-red-600 font-medium mb-1 flex items-center gap-1">
                  <AlertTriangle size={11} /> Outstanding
                </p>
                <p className="text-2xl font-bold text-red-700">{fmt(summary.outstandingAmount)}</p>
                <p className="mt-2 text-[11px] text-red-500">Pending installments</p>
              </div>
            </div>

            {/* Players + Attendance */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-1">
                <Users size={20} className="text-blue-500" />
                <p className="text-2xl font-bold text-gray-800">{summary.activePlayers}</p>
                <p className="text-xs text-gray-500">Active Players</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-1">
                <TrendingUp size={20} className={summary.avgAttendanceRate >= 75 ? "text-emerald-500" : "text-amber-500"} />
                <p className={`text-2xl font-bold ${summary.avgAttendanceRate >= 75 ? "text-emerald-700" : "text-amber-700"}`}>
                  {summary.avgAttendanceRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">Avg Attendance</p>
              </div>
            </div>

            {/* Breakdown bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">Collection Breakdown</p>
              {(summary.totalFeeCollected + summary.outstandingAmount) > 0 ? (
                <>
                  <div className="w-full h-3 rounded-full overflow-hidden bg-gray-100 flex">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${(summary.totalFeeCollected / (summary.totalFeeCollected + summary.outstandingAmount)) * 100}%`
                      }}
                    />
                    <div className="h-full bg-red-300 flex-1" />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" /> Collected</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-300 rounded-full inline-block" /> Outstanding</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400">No fee data this month</p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
