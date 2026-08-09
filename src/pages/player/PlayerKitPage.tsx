import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../api/axios";

// Keep in sync with PlayerKitDetails.VALID_SIZES on the backend
const KIT_SIZES = ["22","24","26","28","30","32","34","36","S","M","L","XL","XXL"];

type KitDetails = {
  publicId: string;
  seasonYear: string;
  tshirtSize: string | null;
  trouserSize: string | null;
  capGiven: boolean;
  jerseyName: string | null;
  jerseyNumber: string | null;
};

type SeasonEntry = KitDetails & { playerName?: string };

export default function PlayerKitPage() {
  const { playerPublicId } = useParams<{ playerPublicId: string }>();

  const [seasons, setSeasons] = useState<SeasonEntry[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [kit, setKit] = useState<KitDetails | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [form, setForm] = useState({
    seasonYear: new Date().getFullYear().toString(),
    tshirtSize: "",
    trouserSize: "",
    capGiven: false,
    jerseyName: "",
    jerseyNumber: "",
  });

  // Load all seasons for this player
  useEffect(() => {
    if (!playerPublicId) return;
    api.get(`/admin/players/${playerPublicId}/kit/seasons`)
      .then((res) => {
        setSeasons(res.data);
        if (res.data.length > 0) {
          setSelectedSeason(res.data[0].seasonYear);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [playerPublicId]);

  // Load kit for selected season
  useEffect(() => {
    if (!selectedSeason || !playerPublicId) return;
    api.get(`/admin/players/${playerPublicId}/kit`, { params: { season: selectedSeason } })
      .then((res) => {
        if (res.status === 204 || !res.data) {
          setKit(null);
        } else {
          setKit(res.data);
          setForm({
            seasonYear: res.data.seasonYear,
            tshirtSize: res.data.tshirtSize ?? "",
            trouserSize: res.data.trouserSize ?? "",
            capGiven: res.data.capGiven,
            jerseyName: res.data.jerseyName ?? "",
            jerseyNumber: res.data.jerseyNumber ?? "",
          });
        }
      })
      .catch(() => setKit(null));
  }, [selectedSeason, playerPublicId]);

  const startAddNew = () => {
    setKit(null);
    const newSeason = new Date().getFullYear().toString();
    setSelectedSeason(newSeason);
    setForm({ seasonYear: newSeason, tshirtSize: "", trouserSize: "", capGiven: false, jerseyName: "", jerseyNumber: "" });
    setEditing(true);
  };

  const startEdit = () => {
    if (!kit) return;
    setForm({
      seasonYear: kit.seasonYear,
      tshirtSize: kit.tshirtSize ?? "",
      trouserSize: kit.trouserSize ?? "",
      capGiven: kit.capGiven,
      jerseyName: kit.jerseyName ?? "",
      jerseyNumber: kit.jerseyNumber ?? "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form.seasonYear.trim()) { toast.error("Season / Year is required"); return; }
    setSaving(true);
    try {
      const res = await api.post(`/admin/players/${playerPublicId}/kit`, {
        seasonYear: form.seasonYear.trim(),
        tshirtSize: form.tshirtSize || null,
        trouserSize: form.trouserSize || null,
        capGiven: form.capGiven,
        jerseyName: form.jerseyName || null,
        jerseyNumber: form.jerseyNumber || null,
      });
      setKit(res.data);
      setSelectedSeason(res.data.seasonYear);
      // Refresh season list
      const seasonsRes = await api.get(`/admin/players/${playerPublicId}/kit/seasons`);
      setSeasons(seasonsRes.data);
      setEditing(false);
      toast.success("Kit details saved");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save kit details");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-gray-400 text-sm">Loading kit details…</div>;
  }

  return (
    <div className="space-y-5">
      {/* Season selector + Add button */}
      <div className="flex items-center gap-3 flex-wrap">
        {seasons.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Season:</label>
            <select
              value={selectedSeason}
              onChange={(e) => { setSelectedSeason(e.target.value); setEditing(false); }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {seasons.map((s) => (
                <option key={s.seasonYear} value={s.seasonYear}>{s.seasonYear}</option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={startAddNew}
          className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Add New Season
        </button>
      </div>

      {/* Kit display / edit card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {editing ? (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 text-base">
              {kit ? "Edit Kit Details" : "Add Kit Details"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Season / Year *">
                <input
                  type="text"
                  value={form.seasonYear}
                  onChange={(e) => setForm({ ...form, seasonYear: e.target.value })}
                  placeholder="e.g. 2025"
                  className={inputClass}
                />
              </Field>
              <Field label="T-Shirt Size">
                <select value={form.tshirtSize} onChange={(e) => setForm({ ...form, tshirtSize: e.target.value })} className={inputClass}>
                  <option value="">— Select —</option>
                  {KIT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Trouser Size">
                <select value={form.trouserSize} onChange={(e) => setForm({ ...form, trouserSize: e.target.value })} className={inputClass}>
                  <option value="">— Select —</option>
                  {KIT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Jersey Name">
                <input
                  type="text"
                  value={form.jerseyName}
                  onChange={(e) => setForm({ ...form, jerseyName: e.target.value })}
                  maxLength={50}
                  placeholder="Name on jersey"
                  className={inputClass}
                />
              </Field>
              <Field label="Jersey Number">
                <input
                  type="text"
                  value={form.jerseyNumber}
                  onChange={(e) => setForm({ ...form, jerseyNumber: e.target.value })}
                  maxLength={10}
                  placeholder="e.g. 7"
                  className={inputClass}
                />
              </Field>
              <Field label="Cap Given">
                <div className="flex items-center gap-3 h-10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.capGiven}
                      onChange={(e) => setForm({ ...form, capGiven: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-700">Cap has been issued to player</span>
                  </label>
                </div>
              </Field>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                {saving ? "Saving…" : "Save Kit Details"}
              </button>
              <button
                onClick={() => { setEditing(false); }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : kit ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-base">Kit Details — {kit.seasonYear}</h3>
              <button
                onClick={startEdit}
                className="px-4 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Edit
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <KitField label="T-Shirt Size" value={kit.tshirtSize ?? "—"} />
              <KitField label="Trouser Size" value={kit.trouserSize ?? "—"} />
              <KitField label="Cap Given" value={kit.capGiven ? "Yes" : "No"} highlight={kit.capGiven} />
              <KitField label="Jersey Name" value={kit.jerseyName ?? "—"} />
              <KitField label="Jersey Number" value={kit.jerseyNumber ?? "—"} />
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm mb-3">
              {seasons.length > 0
                ? `No kit details recorded for season ${selectedSeason}.`
                : "No kit details recorded yet."}
            </p>
            <button
              onClick={startAddNew}
              className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Add Kit Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function KitField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-sm font-semibold ${highlight ? "text-emerald-600" : "text-gray-800"}`}>{value}</div>
    </div>
  );
}
