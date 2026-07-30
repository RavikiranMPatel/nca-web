import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";

type Branch = { id: string; publicId: string; name: string };
type Batch  = { id: string; publicId: string; name: string; branchId?: string };

export default function KitPurchaseOrderPage() {
  const navigate = useNavigate();

  const [season, setSeason]         = useState(new Date().getFullYear().toString());
  const [branches, setBranches]     = useState<Branch[]>([]);
  const [batches, setBatches]       = useState<Batch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedBatch, setSelectedBatch]   = useState("");
  const [generating, setGenerating] = useState(false);
  const [seasons, setSeasons]       = useState<string[]>([]);

  useEffect(() => {
    api.get("/admin/branches").then((r) => setBranches(r.data)).catch(() => {});
    api.get("/admin/batches/active").then((r) => setBatches(r.data)).catch(() => {});
    api.get("/admin/kit/seasons").then((r) => {
      setSeasons(r.data);
      if (r.data.length > 0 && !season) setSeason(r.data[0]);
    }).catch(() => {});
  }, []);

  // When branch changes, reset batch selection
  useEffect(() => { setSelectedBatch(""); }, [selectedBranch]);

  const filteredBatches = selectedBranch
    ? batches.filter((b) => !b.branchId || b.branchId === selectedBranch)
    : batches;

  const handleGenerate = async () => {
    if (!season.trim()) { toast.error("Season / Year is required"); return; }
    setGenerating(true);
    try {
      const params: Record<string, string> = { season: season.trim() };
      if (selectedBranch) params.branch = selectedBranch;
      if (selectedBatch)  params.batch  = selectedBatch;

      const res = await api.get("/admin/kit/purchase-order", {
        params,
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `purchase_order_${season.trim()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Purchase order downloaded");
    } catch (err: any) {
      let message = "Failed to generate purchase order";
      try {
        const text = await err?.response?.data?.text?.();
        const parsed = text ? JSON.parse(text) : null;
        if (parsed?.message) message = parsed.message;
      } catch { /* ignore */ }
      toast.error(message, { duration: 6000 });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kit Purchase Order</h1>
          <p className="text-sm text-gray-500">Generate a supplier-ready Excel listing player kit requirements</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Season */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Season / Year *</label>
          {seasons.length > 0 ? (
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input
              type="text"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              placeholder="e.g. 2025"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <p className="text-xs text-gray-400 mt-1">Only players with kit details for this season will be included in the order.</p>
        </div>

        {/* Branch */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.publicId} value={b.publicId}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Batch */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Batches</option>
            {filteredBatches.map((b) => (
              <option key={b.publicId} value={b.publicId}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">What's included in the export:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>All players in the selected filter who have kit details for the season</li>
            <li>A separate "Missing Kit" section listing players not yet sized</li>
            <li>Columns: Player Name, Jersey Name, Jersey Number, T-Shirt Size, Trouser Size, Cap Needed</li>
          </ul>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
        >
          {generating ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download size={16} />
          )}
          {generating ? "Generating…" : "Download Purchase Order (.xlsx)"}
        </button>
      </div>

      {/* Quick links */}
      <div className="flex gap-3 text-sm">
        <button onClick={() => navigate("/admin/kit")} className="text-blue-600 hover:underline">
          ← Kit Bulk Update
        </button>
        <FileSpreadsheet size={16} className="text-gray-400 self-center" />
        <button onClick={() => navigate("/admin/players")} className="text-blue-600 hover:underline">
          All Players
        </button>
      </div>
    </div>
  );
}
