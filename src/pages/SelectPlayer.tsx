import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

type Player = {
  id: string;
  displayName: string;
};

function SelectPlayer() {
  const navigate = useNavigate();

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------
  // FETCH PLAYERS
  // --------------------
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await api.get<Player[]>("/players/my");
        setPlayers(res.data);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Failed to load players"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  // --------------------
  // SELECT PLAYER
  // --------------------
  const handleSelect = (player: Player) => {
    localStorage.setItem("playerId", player.id);
    localStorage.setItem("playerName", player.displayName);
    console.log("✅ Player selected:", player);
    navigate("/home", { replace: true });
  };

  // --------------------
  // UI STATES
  // --------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading players…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-12 space-y-6">
      <h1 className="text-2xl font-semibold text-center">
        Select Player
      </h1>

      <p className="text-center text-gray-600">
        Choose which child you want to book for
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {players.map((player) => (
          <div
            key={player.id}
            onClick={() => handleSelect(player)}
            className="cursor-pointer border rounded-lg p-6 hover:shadow-md transition bg-white"
          >
            <h3 className="text-lg font-semibold">
              {player.displayName}
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Player ID: {player.id}
            </p>

            <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Select
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SelectPlayer;
