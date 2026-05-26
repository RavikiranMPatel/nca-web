import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  RotateCcw,
  IndianRupee,
  X,
} from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type ResourceType = "BOWLING_MACHINE" | "TENNIS_BALL" | "ASTRO";

type BulkImportRow = {
  sessionDate: string;
  playerName: string;
  phone: string | null;
  resourceType: ResourceType;
  amount: number;
  paymentMode: string;
  receivedBy: string | null;
  ballCount: number | null;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
};

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

type SheetKey = "BOWLING_MACHINE" | "TENNIS_BALL" | "ASTRO";

const SHEET_NAMES: Record<SheetKey, string> = {
  BOWLING_MACHINE: "Bowling machine Payments",
  TENNIS_BALL: "Tennis Ball Payments",
  ASTRO: "Astro turf rent",
};

const SHEET_LABELS: Record<SheetKey, string> = {
  BOWLING_MACHINE: "Bowling Machine",
  TENNIS_BALL: "Tennis Ball",
  ASTRO: "Astro Turf",
};

const SHEET_COLORS: Record<SheetKey, string> = {
  BOWLING_MACHINE: "bg-orange-100 text-orange-700 border-orange-200",
  TENNIS_BALL: "bg-green-100 text-green-700 border-green-200",
  ASTRO: "bg-blue-100 text-blue-700 border-blue-200",
};

const PAYMENT_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "PHONE_PE", label: "PhonePe" },
  { value: "GOOGLE_PAY", label: "GPay" },
  { value: "ONLINE", label: "Online" },
  { value: "OTHER", label: "Other" },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function parseExcelDate(raw: unknown): string | null {
  if (raw == null || raw === "") return null;

  // JS Date serial (number) from SheetJS when cellDates: false
  if (typeof raw === "number") {
    const d = XLSX.SSF.parse_date_code(raw);
    if (!d) return null;
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${d.y}-${mm}-${dd}`;
  }

  // Already a JS Date object (when cellDates: true)
  if (raw instanceof Date) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, "0");
    const d = String(raw.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // String like "6-3-2026" (d-m-yyyy)
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    // Try d-m-yyyy or d/m/yyyy
    const match = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    // Try yyyy-mm-dd passthrough
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }

  return null;
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function num(v: unknown): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

// ─── Sheet parsers ────────────────────────────────────────────────────────────

function parseBallSheet(
  ws: XLSX.WorkSheet,
  resourceType: "BOWLING_MACHINE" | "TENNIS_BALL",
): BulkImportRow[] {
  // Use index-based parsing to avoid header name mismatch
  // Columns: Date(0) | Name(1) | Session balls(2) | Payment(3) | Received by(4)
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
    raw: true,
  });

  // Skip header row (index 0)
  return raw
    .slice(1)
    .map((row): BulkImportRow | null => {
      const dateVal = (row as unknown[])[0];
      const nameVal = (row as unknown[])[1];
      const ballsVal = (row as unknown[])[2];
      const paymentVal = (row as unknown[])[3];
      const receivedByVal = (row as unknown[])[4];

      const sessionDate = parseExcelDate(dateVal);
      const playerName = str(nameVal);
      const amount = num(paymentVal);

      if (!sessionDate || !playerName || amount <= 0) return null;

      return {
        sessionDate,
        playerName,
        phone: null,
        resourceType,
        amount,
        paymentMode: "CASH",
        receivedBy: receivedByVal ? str(receivedByVal) : null,
        ballCount: ballsVal ? num(ballsVal) : null,
        startTime: null,
        endTime: null,
        notes: null,
      };
    })
    .filter((r): r is BulkImportRow => r !== null);
}

function parseAstroSheet(ws: XLSX.WorkSheet): BulkImportRow[] {
  // Columns: Date | Name | Payment | Number of hours | Payment received by
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: null,
    raw: true,
  });

  return raw
    .map((row): BulkImportRow | null => {
      const dateVal = row["Date"] ?? row["date"] ?? row["DATE"];
      const nameVal =
        row["Name"] ??
        row["name"] ??
        row["NAME"] ??
        row["Player"] ??
        row["player"];
      const paymentVal =
        row["Payment"] ?? row["payment"] ?? row["Amount"] ?? row["amount"];
      const receivedByVal =
        row["Payment received by"] ??
        row["payment received by"] ??
        row["Received by"] ??
        row["Received By"];

      const sessionDate = parseExcelDate(dateVal);
      const playerName = str(nameVal);
      const amount = num(paymentVal);

      if (!sessionDate || !playerName || amount <= 0) return null;

      return {
        sessionDate,
        playerName,
        phone: null,
        resourceType: "ASTRO",
        amount,
        paymentMode: "CASH",
        receivedBy: receivedByVal ? str(receivedByVal) : null,
        ballCount: null,
        startTime: null,
        endTime: null,
        notes: null,
      };
    })
    .filter((r): r is BulkImportRow => r !== null);
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StepDot({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
          done
            ? "bg-emerald-500 text-white"
            : active
              ? "bg-blue-600 text-white"
              : "bg-slate-200 text-slate-500"
        }`}
      >
        {done ? <CheckCircle2 size={14} /> : n}
      </div>
      <span
        className={`text-xs sm:text-sm font-medium ${active ? "text-slate-900" : done ? "text-emerald-700" : "text-slate-400"}`}
      >
        {label}
      </span>
    </div>
  );
}

function ResourceBadge({ type }: { type: ResourceType }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${SHEET_COLORS[type]}`}
    >
      {SHEET_LABELS[type]}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminExcelImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step: 1=upload, 2=preview, 3=result
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Upload step state
  const [fileName, setFileName] = useState("");
  const [parsedSheets, setParsedSheets] = useState<
    Partial<Record<SheetKey, BulkImportRow[]>>
  >({});
  const [detectedSheets, setDetectedSheets] = useState<SheetKey[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<Set<SheetKey>>(
    new Set(),
  );
  const [parseError, setParseError] = useState("");

  // Preview step state — rows with mutable paymentMode
  const [previewRows, setPreviewRows] = useState<BulkImportRow[]>([]);

  // Import result
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // ── File parsing ──────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError("");
    setParsedSheets({});
    setDetectedSheets([]);
    setSelectedSheets(new Set());

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: false });

        const found: Partial<Record<SheetKey, BulkImportRow[]>> = {};
        const keys: SheetKey[] = [];

        for (const [key, sheetName] of Object.entries(SHEET_NAMES) as [
          SheetKey,
          string,
        ][]) {
          // Case-insensitive match
          const wsName = wb.SheetNames.find(
            (n) => n.toLowerCase().trim() === sheetName.toLowerCase().trim(),
          );
          if (!wsName) continue;

          const ws = wb.Sheets[wsName];
          let rows: BulkImportRow[];

          if (key === "ASTRO") {
            rows = parseAstroSheet(ws);
          } else {
            rows = parseBallSheet(ws, key);
          }

          found[key] = rows;
          keys.push(key);
        }

        if (keys.length === 0) {
          setParseError(
            'No supported sheets found. Expected,"Bowling machine Payments", "Tennis Ball Payments", or "Astro turf rent".',
          );
          return;
        }

        setParsedSheets(found);
        setDetectedSheets(keys);
        setSelectedSheets(new Set(keys));
      } catch (err) {
        setParseError(
          "Failed to parse the Excel file. Make sure it is a valid .xlsx or .xls file.",
        );
      }
    };
    reader.readAsArrayBuffer(file);

    // reset input so same file can be re-selected
    e.target.value = "";
  };

  const toggleSheet = (key: SheetKey) => {
    setSelectedSheets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const goToPreview = () => {
    const rows: BulkImportRow[] = [];
    for (const key of detectedSheets) {
      if (!selectedSheets.has(key)) continue;
      rows.push(...(parsedSheets[key] ?? []));
    }
    setPreviewRows(rows);
    setStep(2);
  };

  // ── Preview row edit ──────────────────────────────────────────────────────

  const updatePaymentMode = (idx: number, mode: string) => {
    setPreviewRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, paymentMode: mode } : r)),
    );
  };

  const removeRow = (idx: number) => {
    setPreviewRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Import ────────────────────────────────────────────────────────────────

  const doImport = async () => {
    if (previewRows.length === 0) return;
    setImporting(true);
    try {
      const res = await api.post("/admin/bookings/bulk-import", previewRows);
      setResult(res.data as ImportResult);
      setStep(3);
      toast.success(`Import complete: ${res.data.imported} rows imported`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const reset = () => {
    setStep(1);
    setFileName("");
    setParsedSheets({});
    setDetectedSheets([]);
    setSelectedSheets(new Set());
    setPreviewRows([]);
    setResult(null);
    setParseError("");
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const previewTotal = previewRows.reduce((s, r) => s + r.amount, 0);
  const rowCountByType = (key: SheetKey) =>
    previewRows.filter((r) => r.resourceType === key).length;

  const fmt = (n: number) =>
    "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-20 px-3 sm:px-4 lg:px-0">
      {/* Header */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={() => navigate("/admin/revenue")}
          className="p-2 hover:bg-slate-100 rounded-lg flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">
            Import Excel
          </h1>
          <p className="text-xs text-slate-500">
            Bulk-import historical NCA Mysuru payment rows
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto">
          <StepDot n={1} label="Upload" active={step === 1} done={step > 1} />
          <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
          <StepDot n={2} label="Preview" active={step === 2} done={step > 2} />
          <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
          <StepDot n={3} label="Result" active={step === 3} done={false} />
        </div>
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-8 sm:p-12 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors group"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
              <FileSpreadsheet
                size={28}
                className="text-slate-400 group-hover:text-blue-500 transition-colors"
              />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">
                {fileName ? fileName : "Click to select Excel file"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports .xlsx and .xls — NCA Mysuru tracker format
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg group-hover:bg-blue-700 transition-colors">
              <Upload size={14} />
              Choose File
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Parse error */}
          {parseError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle
                size={16}
                className="text-red-500 mt-0.5 flex-shrink-0"
              />
              <p className="text-sm text-red-700">{parseError}</p>
            </div>
          )}

          {/* Detected sheets */}
          {detectedSheets.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-sm font-semibold text-slate-700">
                  Detected Sheets — select which to import
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {detectedSheets.map((key) => {
                  const rows = parsedSheets[key] ?? [];
                  const checked = selectedSheets.has(key);
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSheet(key)}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <div className="flex-1 flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-medium text-slate-800">
                          {SHEET_NAMES[key]}
                        </span>
                        <ResourceBadge type={key} />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            rows.length === 0
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {rows.length} rows
                        </span>
                        {rows.length === 0 && (
                          <span className="text-xs text-amber-600">
                            0 parseable rows
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {Array.from(selectedSheets)
                    .reduce((s, k) => s + (parsedSheets[k]?.length ?? 0), 0)
                    .toLocaleString()}{" "}
                  total rows selected
                </p>
                <button
                  onClick={goToPreview}
                  disabled={
                    selectedSheets.size === 0 ||
                    Array.from(selectedSheets).every(
                      (k) => (parsedSheets[k]?.length ?? 0) === 0,
                    )
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Preview
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Sheet reference */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Expected sheet names
            </p>
            <div className="space-y-1">
              {(Object.keys(SHEET_NAMES) as SheetKey[]).map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <ResourceBadge type={k} />
                  <span className="text-xs text-slate-600 font-mono">
                    "{SHEET_NAMES[k]}"
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Preview ── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              {(["BOWLING_MACHINE", "TENNIS_BALL", "ASTRO"] as SheetKey[]).map(
                (key) => {
                  const count = rowCountByType(key);
                  if (count === 0) return null;
                  return (
                    <div key={key} className="flex items-center gap-1.5">
                      <ResourceBadge type={key} />
                      <span className="text-xs font-semibold text-slate-600">
                        {count} rows
                      </span>
                    </div>
                  );
                },
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <IndianRupee size={13} className="text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700">
                {fmt(previewTotal)}
              </span>
              <span className="text-xs text-emerald-500">total</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                {previewRows.length} rows to import
              </p>
              <p className="text-xs text-slate-400">
                Edit payment mode per row if needed
              </p>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Date
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Name
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Resource
                    </th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Balls
                    </th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Amount
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Received By
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Mode
                    </th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {previewRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap font-mono text-xs">
                        {row.sessionDate}
                      </td>
                      <td className="px-4 py-2.5 text-slate-800 font-medium">
                        {row.playerName}
                      </td>
                      <td className="px-4 py-2.5">
                        <ResourceBadge type={row.resourceType} />
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500">
                        {row.ballCount ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                        {fmt(row.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">
                        {row.receivedBy ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={row.paymentMode}
                          onChange={(e) =>
                            updatePaymentMode(idx, e.target.value)
                          }
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        >
                          {PAYMENT_MODES.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => removeRow(idx)}
                          className="p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {previewRows.map((row, idx) => (
                <div key={idx} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-slate-800 text-sm truncate">
                        {row.playerName}
                      </span>
                      <ResourceBadge type={row.resourceType} />
                    </div>
                    <button
                      onClick={() => removeRow(idx)}
                      className="p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-500 flex-shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="font-mono">{row.sessionDate}</span>
                    {row.ballCount && <span>{row.ballCount} balls</span>}
                    {row.receivedBy && <span>by {row.receivedBy}</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800">
                      {fmt(row.amount)}
                    </span>
                    <select
                      value={row.paymentMode}
                      onChange={(e) => updatePaymentMode(idx, e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    >
                      {PAYMENT_MODES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              onClick={doImport}
              disabled={importing || previewRows.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] justify-center"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Import {previewRows.length} rows
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Result ── */}
      {step === 3 && result && (
        <div className="space-y-4">
          {/* Success banner */}
          <div
            className={`rounded-xl border p-5 flex items-start gap-4 ${
              result.skipped === 0
                ? "bg-emerald-50 border-emerald-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                result.skipped === 0 ? "bg-emerald-100" : "bg-amber-100"
              }`}
            >
              {result.skipped === 0 ? (
                <CheckCircle2 size={20} className="text-emerald-600" />
              ) : (
                <AlertCircle size={20} className="text-amber-600" />
              )}
            </div>
            <div>
              <p
                className={`font-bold text-lg ${
                  result.skipped === 0 ? "text-emerald-800" : "text-amber-800"
                }`}
              >
                Import complete
              </p>
              <p
                className={`text-sm mt-0.5 ${
                  result.skipped === 0 ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {result.imported} imported
                {result.skipped > 0 && `, ${result.skipped} skipped`}
              </p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600">
                {result.imported}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">
                Imported
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p
                className={`text-3xl font-bold ${
                  result.skipped > 0 ? "text-amber-600" : "text-slate-400"
                }`}
              >
                {result.skipped}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">
                Skipped
              </p>
            </div>
          </div>

          {/* Errors list */}
          {result.errors && result.errors.length > 0 && (
            <div className="bg-white border border-red-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-red-100 bg-red-50">
                <p className="text-sm font-semibold text-red-700">
                  Skipped rows ({result.errors.length})
                </p>
              </div>
              <ul className="divide-y divide-red-50 max-h-64 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <li key={i} className="flex items-start gap-2 px-4 py-2.5">
                    <AlertCircle
                      size={13}
                      className="text-red-400 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-xs text-red-700">{err}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/revenue")}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              <ArrowLeft size={14} />
              Back to Revenue
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
            >
              <RotateCcw size={14} />
              Import More
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
