import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarOff, Plus, Trash2, Loader2 } from "lucide-react";
import api from "../../api/axios";
import { fetchActiveBatches } from "../../api/batchService";
import type { Batch } from "../../types/batch.types";
import { toast } from "react-hot-toast";

type ExcludedDate = {
  publicId: string;
  excludedDate: string;
  reason: string | null;
  batchId: string | null;
  createdBy: string | null;
};

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AttendanceExcludedDatesPage() {
  const navigate = useNavigate();
  const [dates, setDates] = useState<ExcludedDate[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    excludedDate: new Date().toISOString().slice(0, 10),
    reason: "",
    batchId: "",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [datesRes, batchesData] = await Promise.all([
        api.get<ExcludedDate[]>("/admin/attendance/excluded-dates"),
        fetchActiveBatches("REGULAR"),
      ]);
      setDates(datesRes.data);
      setBatches(batchesData);
    } catch {
      toast.error("Failed to load excluded dates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    if (!form.excludedDate) return;
    setSaving(true);
    try {
      await api.post("/admin/attendance/excluded-dates", {
        excludedDate: form.excludedDate,
        reason: form.reason || null,
        batchId: form.batchId || null,
      });
      toast.success("Date excluded");
      setShowForm(false);
      setForm({ excludedDate: new Date().toISOString().slice(0, 10), reason: "", batchId: "" });
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(publicId: string) {
    setDeletingId(publicId);
    try {
      await api.delete(`/admin/attendance/excluded-dates/${publicId}`);
      toast.success("Removed");
      setDates((prev) => prev.filter((d) => d.publicId !== publicId));
    } catch {
      toast.error("Failed to remove");
    } finally {
      setDeletingId(null);
    }
  }

  function batchName(batchId: string | null) {
    if (!batchId) return "All batches";
    return batches.find((b) => b.id === batchId)?.name ?? batchId;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => navigate("/admin/attendance")}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition flex-shrink-0"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <CalendarOff size={18} className="text-orange-500 flex-shrink-0" />
            <h1 className="text-base font-bold text-gray-900 truncate">
              No-Training Dates
            </h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-xs font-medium"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Add form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">
              Exclude a date from attendance reminders
            </p>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-medium">Date</label>
              <input
                type="date"
                value={form.excludedDate}
                onChange={(e) => setForm((f) => ({ ...f, excludedDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-medium">Batch (optional — blank = all batches)</label>
              <select
                value={form.batchId}
                onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              >
                <option value="">All batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-500 font-medium">Reason (optional)</label>
              <input
                type="text"
                placeholder="e.g. Public holiday, Rain, Tournament"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !form.excludedDate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : dates.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <CalendarOff size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No excluded dates yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Add dates when training is cancelled — the attendance reminder will not fire on those days.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
            {dates.map((d) => (
              <div key={d.publicId} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {formatDate(d.excludedDate)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {batchName(d.batchId)}
                    {d.reason ? ` · ${d.reason}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(d.publicId)}
                  disabled={deletingId === d.publicId}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
                >
                  {deletingId === d.publicId
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
