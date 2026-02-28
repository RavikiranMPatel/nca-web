import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Zap, AlertTriangle } from "lucide-react";
import api from "../../api/axios";

type ResultState = {
  type: "success" | "error";
  message: string;
} | null;

function GenerateSlots() {
  const navigate = useNavigate();

  // Single date
  const [singleDate, setSingleDate] = useState("");
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<ResultState>(null);

  // Bulk
  const [bulkDays, setBulkDays] = useState(30);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<ResultState>(null);

  // Regenerate single date
  const [regenDate, setRegenDate] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenResult, setRegenResult] = useState<ResultState>(null);

  // Regenerate bulk
  const [regenBulkDays, setRegenBulkDays] = useState(30);
  const [regenBulkLoading, setRegenBulkLoading] = useState(false);
  const [regenBulkResult, setRegenBulkResult] = useState<ResultState>(null);

  const today = new Date().toLocaleDateString("en-CA");

  const handleGenerate = async () => {
    if (!singleDate) return;
    setSingleLoading(true);
    setSingleResult(null);
    try {
      await api.post(`/slot/admin/generate?date=${singleDate}`);
      setSingleResult({
        type: "success",
        message: `✅ Slots generated for ${singleDate}`,
      });
    } catch (err: any) {
      setSingleResult({
        type: "error",
        message: err?.response?.data?.message || "Failed to generate slots",
      });
    } finally {
      setSingleLoading(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (
      !confirm(
        `Generate slots for next ${bulkDays} days? This will skip dates that already have slots.`,
      )
    )
      return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const res = await api.post(`/slot/admin/generate-bulk?days=${bulkDays}`);
      setBulkResult({
        type: "success",
        message: `✅ Generated slots for ${res.data.daysGenerated} days (${res.data.durationMs}ms)`,
      });
    } catch (err: any) {
      setBulkResult({
        type: "error",
        message:
          err?.response?.data?.message || "Failed to bulk generate slots",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!regenDate) return;
    if (
      !confirm(
        `Regenerate slots for ${regenDate}? This will DELETE existing slots and recreate them from the current template. Bookings are NOT affected.`,
      )
    )
      return;
    setRegenLoading(true);
    setRegenResult(null);
    try {
      await api.post(`/slot/admin/regenerate?date=${regenDate}`);
      setRegenResult({
        type: "success",
        message: `✅ Slots regenerated for ${regenDate} with latest template prices`,
      });
    } catch (err: any) {
      setRegenResult({
        type: "error",
        message: err?.response?.data?.message || "Failed to regenerate slots",
      });
    } finally {
      setRegenLoading(false);
    }
  };

  const handleBulkRegenerate = async () => {
    if (
      !confirm(
        `Regenerate slots for next ${regenBulkDays} days? This will DELETE and RECREATE all slots from current templates. Existing bookings are NOT affected.`,
      )
    )
      return;
    setRegenBulkLoading(true);
    setRegenBulkResult(null);
    try {
      const res = await api.post(
        `/slot/admin/regenerate-bulk?days=${regenBulkDays}`,
      );
      setRegenBulkResult({
        type: "success",
        message: `✅ Regenerated slots for ${res.data.daysRegenerated} days (${res.data.durationMs}ms)`,
      });
    } catch (err: any) {
      setRegenBulkResult({
        type: "error",
        message: err?.response?.data?.message || "Failed to bulk regenerate",
      });
    } finally {
      setRegenBulkLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin/slot-templates")}
          className="p-2 hover:bg-gray-100 rounded transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Generate Slots</h1>
          <p className="text-gray-600 text-sm mt-1">
            Generate or regenerate booking slots from templates
          </p>
        </div>
      </div>

      {/* SECTION 1: Generate for single date */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Zap size={20} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Generate for a Date</h2>
            <p className="text-sm text-gray-500">
              Creates slots for a date that doesn't have any yet
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              min={today}
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={!singleDate || singleLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 text-sm"
          >
            {singleLoading ? "Generating..." : "Generate"}
          </button>
        </div>

        {singleResult && <ResultBanner result={singleResult} />}
      </div>

      {/* SECTION 2: Bulk generate */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Zap size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Bulk Generate</h2>
            <p className="text-sm text-gray-500">
              Generate slots for multiple upcoming days (skips dates that
              already have slots)
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Days
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={bulkDays}
              onChange={(e) => setBulkDays(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleBulkGenerate}
            disabled={bulkLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 text-sm"
          >
            {bulkLoading ? "Generating..." : `Generate ${bulkDays} Days`}
          </button>
        </div>

        {bulkResult && <ResultBanner result={bulkResult} />}
      </div>

      {/* DIVIDER */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-gray-500 font-medium">
          REGENERATE (use when template prices changed)
        </span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* WARNING BOX */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle
          size={20}
          className="text-amber-600 flex-shrink-0 mt-0.5"
        />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">What is Regenerate?</p>
          <p>
            Regenerate <strong>deletes existing unbooked slots</strong> and
            recreates them fresh from the current template. Use this when you've
            updated prices or timings in a template and want those changes to
            reflect on already-generated slots.
            <strong> Existing bookings are never deleted.</strong>
          </p>
        </div>
      </div>

      {/* SECTION 3: Regenerate single date */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <RefreshCw size={20} className="text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Regenerate for a Date</h2>
            <p className="text-sm text-gray-500">
              Delete and recreate slots for a specific date using the latest
              template
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={regenDate}
              onChange={(e) => setRegenDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            onClick={handleRegenerate}
            disabled={!regenDate || regenLoading}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium disabled:opacity-50 text-sm"
          >
            {regenLoading ? "Regenerating..." : "Regenerate"}
          </button>
        </div>

        {regenResult && <ResultBanner result={regenResult} />}
      </div>

      {/* SECTION 4: Bulk regenerate */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <RefreshCw size={20} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Bulk Regenerate</h2>
            <p className="text-sm text-gray-500">
              Delete and recreate slots for multiple days — use after major
              template price updates
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Days
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={regenBulkDays}
              onChange={(e) => setRegenBulkDays(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <button
            onClick={handleBulkRegenerate}
            disabled={regenBulkLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 text-sm"
          >
            {regenBulkLoading
              ? "Regenerating..."
              : `Regenerate ${regenBulkDays} Days`}
          </button>
        </div>

        {regenBulkResult && <ResultBanner result={regenBulkResult} />}
      </div>
    </div>
  );
}

function ResultBanner({
  result,
}: {
  result: { type: "success" | "error"; message: string };
}) {
  return (
    <div
      className={`px-4 py-3 rounded-lg text-sm font-medium ${
        result.type === "success"
          ? "bg-green-50 border border-green-200 text-green-800"
          : "bg-red-50 border border-red-200 text-red-800"
      }`}
    >
      {result.message}
    </div>
  );
}

export default GenerateSlots;
