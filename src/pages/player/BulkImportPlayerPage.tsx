import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Upload, CheckCircle, XCircle, FileSpreadsheet, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";

type RowError = {
  row: number;
  field: string;
  message: string;
};

type PreviewResult = {
  valid: boolean;
  totalRows: number;
  errors: RowError[];
};

type CommitResult = {
  importBatchId: string;
  importedCount: number;
};

type Stage = "idle" | "validating" | "preview" | "committing" | "done";

export default function BulkImportPlayerPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith(".xlsx")) {
      toast.error("Only .xlsx files are supported");
      return;
    }
    setSelectedFile(file);
    setPreview(null);
    setStage("idle");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleValidate = async () => {
    if (!selectedFile) return;
    setStage("validating");
    const fd = new FormData();
    fd.append("file", selectedFile);
    try {
      const res = await api.post<PreviewResult>("/admin/players/import/preview", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreview(res.data);
      setStage("preview");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Validation failed");
      setStage("idle");
    }
  };

  const handleCommit = async () => {
    if (!selectedFile || !preview?.valid) return;
    setStage("committing");
    const fd = new FormData();
    fd.append("file", selectedFile);
    try {
      const res = await api.post<CommitResult>("/admin/players/import/commit", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCommitResult(res.data);
      setStage("done");
      toast.success(`${res.data.importedCount} players imported successfully`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Import failed");
      setStage("preview");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get("/admin/players/import/template", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "player_import_template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      // The server returns a JSON error body even for blob requests — parse it
      // to surface the specific validation message (e.g. missing branches/batches).
      let message = "Failed to download template";
      try {
        const text = await err?.response?.data?.text?.();
        const parsed = text ? JSON.parse(text) : null;
        if (parsed?.message) message = parsed.message;
      } catch {
        // ignore parse errors — fall back to generic message
      }
      toast.error(message, { duration: 6000 });
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setPreview(null);
    setCommitResult(null);
    setStage("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin/players")}
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Player Import</h1>
          <p className="text-sm text-gray-500">Upload an Excel file to register multiple players at once</p>
        </div>
      </div>

      {/* Step 1: Download template */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Step 1 — Download the Template
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Fill in the provided template. Required columns are marked with *. See the Instructions
          sheet inside the file for valid values per field.
        </p>
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          <Download size={16} />
          Download Template (.xlsx)
        </button>
      </div>

      {/* Step 2: Upload file */}
      {stage !== "done" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Step 2 — Upload Your Filled File
          </h2>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
              selectedFile
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            }`}
          >
            <FileSpreadsheet
              size={36}
              className={`mx-auto mb-3 ${selectedFile ? "text-blue-500" : "text-gray-400"}`}
            />
            {selectedFile ? (
              <>
                <p className="font-semibold text-gray-800">{selectedFile.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(selectedFile.size / 1024).toFixed(1)} KB — click to change
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-600 font-medium">Drag & drop or click to select</p>
                <p className="text-sm text-gray-400 mt-1">.xlsx files only</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />

          {selectedFile && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleValidate}
                disabled={stage === "validating"}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
              >
                <Upload size={15} />
                {stage === "validating" ? "Validating…" : "Validate File"}
              </button>
              <button
                onClick={reset}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Preview results */}
      {preview && stage === "preview" && (
        <div className={`bg-white rounded-xl border p-5 ${preview.valid ? "border-green-200" : "border-red-200"}`}>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Step 3 — Validation Results
          </h2>

          {/* Summary badges */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-500" />
              <span className="text-sm text-gray-700">
                <strong>{preview.totalRows}</strong> row{preview.totalRows !== 1 ? "s" : ""} found
              </span>
            </div>
            {preview.valid ? (
              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-sm font-medium">
                <CheckCircle size={14} />
                All rows valid — ready to import
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-red-700 bg-red-50 px-3 py-1 rounded-full text-sm font-medium">
                <XCircle size={14} />
                {preview.errors.length} error{preview.errors.length !== 1 ? "s" : ""} found — fix and re-upload
              </div>
            )}
          </div>

          {/* Error table */}
          {!preview.valid && (
            <div className="overflow-x-auto rounded-lg border border-red-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-red-50 text-red-800">
                    <th className="text-left px-4 py-2 font-semibold w-16">Row</th>
                    <th className="text-left px-4 py-2 font-semibold w-40">Field</th>
                    <th className="text-left px-4 py-2 font-semibold">Problem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100">
                  {preview.errors.map((err, i) => (
                    <tr key={i} className="hover:bg-red-50">
                      <td className="px-4 py-2 text-red-600 font-mono font-semibold">{err.row}</td>
                      <td className="px-4 py-2 text-gray-700">{err.field}</td>
                      <td className="px-4 py-2 text-gray-600">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Confirm or re-upload */}
          <div className="mt-5 flex items-center gap-3">
            {preview.valid ? (
              <button
                onClick={handleCommit}
                disabled={stage === "committing"}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                <CheckCircle size={16} />
                {stage === "committing"
                  ? "Importing…"
                  : `Confirm Import (${preview.totalRows} players)`}
              </button>
            ) : (
              <button
                onClick={reset}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
              >
                <Upload size={15} />
                Upload Fixed File
              </button>
            )}
            <button
              onClick={reset}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Start over
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {stage === "done" && commitResult && (
        <div className="bg-white rounded-xl border border-emerald-200 p-8 text-center">
          <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-emerald-700 mb-2">Import Successful!</h2>
          <p className="text-gray-600 mb-2">
            <strong>{commitResult.importedCount}</strong> players registered successfully.
          </p>
          <p className="text-xs text-gray-400 mb-6 font-mono">
            Batch ID: {commitResult.importBatchId}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Import Another File
            </button>
            <button
              onClick={() => navigate("/admin/players")}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              View All Players
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
