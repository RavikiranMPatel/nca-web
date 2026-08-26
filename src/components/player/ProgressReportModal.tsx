import { useState } from "react";
import { Calendar } from "lucide-react";
import Button from "../Button";
import ModalOverlay from "../ModalOverlay";
import api from "../../api/axios";
import { toast } from "react-hot-toast";

type Props = {
  open: boolean;
  playerPublicId: string;
  playerName: string;
  onClose: () => void;
};

type PresetKey = "LAST_MONTH" | "LAST_QUARTER" | "ALL_TIME";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "LAST_MONTH", label: "Last Month" },
  { key: "LAST_QUARTER", label: "Last Quarter" },
  { key: "ALL_TIME", label: "All Time" },
];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeFor(preset: PresetKey): { from: string; to: string } {
  const to = new Date();
  if (preset === "ALL_TIME") {
    return { from: toIsoDate(new Date(2000, 0, 1)), to: toIsoDate(to) };
  }
  const from = new Date(to);
  from.setMonth(from.getMonth() - (preset === "LAST_MONTH" ? 1 : 3));
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

function formatRangeLabel(from: string, to: string): string {
  const fmt = (s: string) =>
    new Date(s + "T00:00:00").toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  return `${fmt(from)} – ${fmt(to)}`;
}

function ProgressReportModal({ open, playerPublicId, playerName, onClose }: Props) {
  const [preset, setPreset] = useState<PresetKey>("LAST_MONTH");
  const [downloading, setDownloading] = useState(false);

  if (!open) return null;

  const { from, to } = rangeFor(preset);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get(
        `/admin/players/${playerPublicId}/progress-report.pdf`,
        { params: { from, to }, responseType: "blob" },
      );
      const url = window.URL.createObjectURL(res.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `progress-report-${playerPublicId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Progress report downloaded");
      onClose();
    } catch {
      toast.error("Failed to generate progress report");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ModalOverlay
      className="bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClose={downloading ? undefined : onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <Calendar size={22} className="text-slate-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Progress Report</h2>
            <p className="text-sm text-slate-600 mt-1">
              For <strong>{playerName}</strong> — sent to nobody, downloaded only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date range
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPreset(p.key)}
                  className={`px-2 py-2 rounded-lg text-xs font-semibold border transition ${
                    preset === p.key
                      ? "bg-slate-800 border-slate-800 text-white"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">{formatRangeLabel(from, to)}</p>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={downloading}>
              Cancel
            </Button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-2.5 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {downloading ? "Generating…" : "Download PDF"}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

export default ProgressReportModal;
