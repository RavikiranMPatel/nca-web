import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Download, Calendar } from "lucide-react";
import api from "../../api/axios";

type RangeOption = "this_month" | "last_month" | "custom";

// Local Date parts, not toISOString(): toISOString() converts to UTC, and between
// 00:00–05:29 IST that shifts a date back a day — see AdminRevenueDashboard's
// last_month, the reference this copies. Built from local parts so a report
// generated just after midnight in Mysuru still names the right day.
function isoFromLocalParts(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function computeRange(
  option: RangeOption,
  customFrom: string,
  customTo: string,
): { from: string; to: string; label: string } | null {
  const now = new Date();

  if (option === "this_month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthName = now.toLocaleDateString("en-US", { month: "long" });
    return {
      from: isoFromLocalParts(first),
      to: isoFromLocalParts(now),
      label: `${monthName} ${now.getFullYear()} (month to date)`,
    };
  }

  if (option === "last_month") {
    // Day 0 of the current month is the last day of the previous one — handles
    // year rollover and month length without a lookup table.
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    const monthName = first.toLocaleDateString("en-US", { month: "long" });
    return {
      from: isoFromLocalParts(first),
      to: isoFromLocalParts(last),
      label: `${monthName} ${first.getFullYear()}`,
    };
  }

  if (!customFrom || !customTo) return null;
  return { from: customFrom, to: customTo, label: `${customFrom} to ${customTo}` };
}

function PlayerAttendanceReportTab() {
  const { playerPublicId } = useParams();
  const [option, setOption] = useState<RangeOption>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [downloading, setDownloading] = useState(false);

  const range = computeRange(option, customFrom, customTo);

  const handleDownload = async () => {
    if (!playerPublicId || !range) return;
    if (range.from > range.to) {
      toast.error("Start date must not be after end date");
      return;
    }
    setDownloading(true);
    try {
      const res = await api.get(
        `/admin/players/${playerPublicId}/attendance/report/range.pdf`,
        {
          params: { start: range.from, end: range.to, rangeLabel: range.label },
          responseType: "blob",
        },
      );
      const url = URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${playerPublicId}-${range.from}-to-${range.to}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch {
      toast.error("Failed to generate attendance report");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-blue-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-gray-800">
            Attendance report
          </p>
        </div>
        <p className="text-xs text-gray-500">
          One PDF for this player, with a separate section for each batch they
          have attendance in during the chosen range — not one blended
          percentage.
        </p>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["this_month", "This Month"],
              ["last_month", "Last Month"],
              ["custom", "Custom Range"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setOption(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                option === value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {option === "custom" && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm flex-1 min-w-[140px]"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm flex-1 min-w-[140px]"
            />
          </div>
        )}

        {range && (
          <p className="text-xs text-gray-400">
            Range: {range.label}
          </p>
        )}

        <button
          disabled={!range || downloading}
          onClick={handleDownload}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-40"
        >
          <Download size={15} />
          {downloading ? "Generating..." : "Download PDF"}
        </button>
      </div>
    </div>
  );
}

export default PlayerAttendanceReportTab;
