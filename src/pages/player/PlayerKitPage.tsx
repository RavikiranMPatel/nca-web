import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import KitDetailsForm, { emptyKitForm, type KitFormValues } from "../../components/kit/KitDetailsForm";

type KitDetails = {
  publicId: string;
  seasonYear: string;
  tshirtSize: string | null;
  trouserSize: string | null;
  capGiven: boolean;
  tshirtGiven: boolean;
  trouserGiven: boolean;
  jerseyName: string | null;
  jerseyNumber: string | null;
  deliveryStatus?: string;
};

type SeasonEntry = KitDetails & { playerName?: string };

const toForm = (k: KitDetails): KitFormValues => ({
  seasonYear: k.seasonYear,
  tshirtSize: k.tshirtSize ?? "",
  trouserSize: k.trouserSize ?? "",
  capGiven: k.capGiven,
  tshirtGiven: k.tshirtGiven ?? false,
  trouserGiven: k.trouserGiven ?? false,
  jerseyName: k.jerseyName ?? "",
  jerseyNumber: k.jerseyNumber ?? "",
});

export default function PlayerKitPage() {
  const { playerPublicId } = useParams<{ playerPublicId: string }>();

  const [seasons, setSeasons] = useState<SeasonEntry[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [kit, setKit] = useState<KitDetails | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state — shape owned by the shared editor
  const [form, setForm] = useState<KitFormValues>(emptyKitForm());

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
          setForm(toForm(res.data));
        }
      })
      .catch(() => setKit(null));
  }, [selectedSeason, playerPublicId]);

  const startAddNew = () => {
    setKit(null);
    const newSeason = new Date().getFullYear().toString();
    setSelectedSeason(newSeason);
    setForm({ ...emptyKitForm(), seasonYear: newSeason });
    setEditing(true);
  };

  const startEdit = () => {
    if (!kit) return;
    setForm(toForm(kit));
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
        tshirtGiven: form.tshirtGiven,
        trouserGiven: form.trouserGiven,
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
            <KitDetailsForm values={form} onChange={setForm} idPrefix="kit-tab" />
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



function KitField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-sm font-semibold ${highlight ? "text-emerald-600" : "text-gray-800"}`}>{value}</div>
    </div>
  );
}
