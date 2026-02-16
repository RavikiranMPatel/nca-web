import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ClipboardList, Users } from "lucide-react";
import api from "../../api/axios";
import { toast } from "react-hot-toast";

type PlayerOption = {
  publicId: string;
  displayName: string;
  active: boolean;
};

function PlayerAssessmentDashboardPage() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/players?activeOnly=true");
      setPlayers(
        res.data.map((p: any) => ({
          publicId: p.publicId,
          displayName: p.displayName,
          active: p.active,
        })),
      );
    } catch (error) {
      toast.error("Failed to load players");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlayer = (publicId: string) => {
    navigate(`/admin/players/${publicId}/analysis`);
  };

  const filtered = players.filter((p) =>
    p.displayName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin")}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Performance Analysis
          </h1>
          <p className="text-sm text-slate-500">
            Select a player to view or add assessments
          </p>
        </div>
      </div>

      {/* Player Selector Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-blue-600" />
          <h2 className="text-base font-semibold text-slate-800">
            Select Player
          </h2>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player by name..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Player List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500 mt-3">Loading players...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">
              {search
                ? "No players match your search"
                : "No active players found"}
            </p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {filtered.map((player) => (
              <button
                key={player.publicId}
                onClick={() => handleSelectPlayer(player.publicId)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-left hover:bg-blue-50 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                    {player.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 group-hover:text-blue-700">
                      {player.displayName}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {player.publicId}
                    </p>
                  </div>
                </div>
                <ClipboardList
                  size={16}
                  className="text-slate-300 group-hover:text-blue-500 transition flex-shrink-0"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerAssessmentDashboardPage;
