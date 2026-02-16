import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import Button from "../../components/Button";
import { playerService } from "../../api/playerService/playerService";

type Player = {
  id: string;
  publicId: string;
  displayName: string;
};

type CricketStatFormData = {
  playerPublicId: string;
  matchDate: string;
  opponentName: string;
  groundName: string;
  place: string;
  tournamentName: string;
  format: string;

  // Batting
  runs: string;
  ballsFaced: string;
  minutesFaced: string;
  fours: string;
  sixes: string;

  // Bowling
  oversBowled: string;
  maidens: string;
  runsConceded: string;
  wicketsTaken: string;
  dotBallsBowled: string;
  foursConceded: string;
  sixesConceded: string;
  widesConceded: string;
  noBallsConceded: string;

  // Fielding
  catchesTaken: string;
};

function AddCricketStats() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [savedPlayerName, setSavedPlayerName] = useState("");

  const [formData, setFormData] = useState<CricketStatFormData>({
    playerPublicId: "",
    matchDate: new Date().toISOString().split("T")[0],
    opponentName: "",
    groundName: "",
    place: "",
    tournamentName: "",
    format: "",

    runs: "",
    ballsFaced: "",
    minutesFaced: "",
    fours: "",
    sixes: "",

    oversBowled: "",
    maidens: "",
    runsConceded: "",
    wicketsTaken: "",
    dotBallsBowled: "",
    foursConceded: "",
    sixesConceded: "",
    widesConceded: "",
    noBallsConceded: "",

    catchesTaken: "",
  });

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      const players = await playerService.getAllPlayers(); //
      setPlayers(players);
    } catch (error) {
      toast.error("Failed to load players");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.playerPublicId) {
      toast.error("Please select a player");
      return;
    }

    if (!formData.opponentName.trim()) {
      toast.error("Opponent name is required");
      return;
    }

    setLoading(true);

    try {
      // Convert empty strings to null for numeric fields
      const payload = {
        matchDate: formData.matchDate,
        opponentName: formData.opponentName,
        groundName: formData.groundName || null,
        place: formData.place || null,
        tournamentName: formData.tournamentName || null,
        format: formData.format || null,

        runs: formData.runs ? parseInt(formData.runs) : null,
        ballsFaced: formData.ballsFaced ? parseInt(formData.ballsFaced) : null,
        minutesFaced: formData.minutesFaced
          ? parseInt(formData.minutesFaced)
          : null,
        fours: formData.fours ? parseInt(formData.fours) : null,
        sixes: formData.sixes ? parseInt(formData.sixes) : null,

        oversBowled: formData.oversBowled
          ? parseFloat(formData.oversBowled)
          : null,
        maidens: formData.maidens ? parseInt(formData.maidens) : null,
        runsConceded: formData.runsConceded
          ? parseInt(formData.runsConceded)
          : null,
        wicketsTaken: formData.wicketsTaken
          ? parseInt(formData.wicketsTaken)
          : null,
        dotBallsBowled: formData.dotBallsBowled
          ? parseInt(formData.dotBallsBowled)
          : null,
        foursConceded: formData.foursConceded
          ? parseInt(formData.foursConceded)
          : null,
        sixesConceded: formData.sixesConceded
          ? parseInt(formData.sixesConceded)
          : null,
        widesConceded: formData.widesConceded
          ? parseInt(formData.widesConceded)
          : null,
        noBallsConceded: formData.noBallsConceded
          ? parseInt(formData.noBallsConceded)
          : null,

        catchesTaken: formData.catchesTaken
          ? parseInt(formData.catchesTaken)
          : null,
      };

      await api.post(
        `/admin/cricket-stats/${formData.playerPublicId}`,
        payload,
      );

      const selectedPlayer = players.find(
        (p) => p.publicId === formData.playerPublicId,
      );
      setSavedPlayerName(selectedPlayer?.displayName || "");
      setShowSuccessDialog(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save stats");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      playerPublicId: "",
      matchDate: new Date().toISOString().split("T")[0],
      opponentName: "",
      groundName: "",
      place: "",
      tournamentName: "",
      format: "",
      runs: "",
      ballsFaced: "",
      minutesFaced: "",
      fours: "",
      sixes: "",
      oversBowled: "",
      maidens: "",
      runsConceded: "",
      wicketsTaken: "",
      dotBallsBowled: "",
      foursConceded: "",
      sixesConceded: "",
      widesConceded: "",
      noBallsConceded: "",
      catchesTaken: "",
    });
  };

  const filteredPlayers = players.filter((p) =>
    p.displayName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8 px-4 md:px-0">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Add Cricket Stats</h1>
          <p className="text-sm text-gray-500">
            Record match performance for a player
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PLAYER SELECTION */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            Select Player
          </h2>

          <div>
            <input
              type="text"
              placeholder="Search player by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              name="playerPublicId"
              value={formData.playerPublicId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a player</option>
              {filteredPlayers.map((player) => (
                <option key={player.publicId} value={player.publicId}>
                  {player.displayName} ({player.publicId})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* MATCH DETAILS */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy size={20} className="text-blue-600" />
            Match Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Match Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="matchDate"
                value={formData.matchDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Opponent <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="opponentName"
                value={formData.opponentName}
                onChange={handleChange}
                required
                placeholder="e.g., RBNCC"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ground</label>
              <input
                type="text"
                name="groundName"
                value={formData.groundName}
                onChange={handleChange}
                placeholder="e.g., SJCE Grounds"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Place</label>
              <input
                type="text"
                name="place"
                value={formData.place}
                onChange={handleChange}
                placeholder="e.g., Mysore"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tournament
              </label>
              <input
                type="text"
                name="tournamentName"
                value={formData.tournamentName}
                onChange={handleChange}
                placeholder="e.g., KSCA League"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Format</label>
              <select
                name="format"
                value={formData.format}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Format</option>
                <option value="T20">T20</option>
                <option value="ODI">ODI</option>
                <option value="TEST">Test</option>
              </select>
            </div>
          </div>
        </div>

        {/* BATTING STATS */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold">Batting Stats</h2>
          <p className="text-sm text-gray-500">
            Leave blank if player did not bat
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Runs</label>
              <input
                type="number"
                name="runs"
                value={formData.runs}
                onChange={handleChange}
                min="0"
                placeholder="R"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Balls Faced
              </label>
              <input
                type="number"
                name="ballsFaced"
                value={formData.ballsFaced}
                onChange={handleChange}
                min="0"
                placeholder="B"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Minutes</label>
              <input
                type="number"
                name="minutesFaced"
                value={formData.minutesFaced}
                onChange={handleChange}
                min="0"
                placeholder="M"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fours</label>
              <input
                type="number"
                name="fours"
                value={formData.fours}
                onChange={handleChange}
                min="0"
                placeholder="4s"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sixes</label>
              <input
                type="number"
                name="sixes"
                value={formData.sixes}
                onChange={handleChange}
                min="0"
                placeholder="6s"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {formData.runs && formData.ballsFaced && (
            <div className="bg-blue-50 p-3 rounded-md text-sm">
              <strong>Strike Rate:</strong>{" "}
              {(
                (parseInt(formData.runs) / parseInt(formData.ballsFaced)) *
                100
              ).toFixed(2)}
            </div>
          )}
        </div>

        {/* BOWLING STATS */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold">Bowling Stats</h2>
          <p className="text-sm text-gray-500">
            Leave blank if player did not bowl
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Overs</label>
              <input
                type="number"
                name="oversBowled"
                value={formData.oversBowled}
                onChange={handleChange}
                min="0"
                step="0.1"
                placeholder="O"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Maidens</label>
              <input
                type="number"
                name="maidens"
                value={formData.maidens}
                onChange={handleChange}
                min="0"
                placeholder="M"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Runs Conceded
              </label>
              <input
                type="number"
                name="runsConceded"
                value={formData.runsConceded}
                onChange={handleChange}
                min="0"
                placeholder="R"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Wickets</label>
              <input
                type="number"
                name="wicketsTaken"
                value={formData.wicketsTaken}
                onChange={handleChange}
                min="0"
                placeholder="W"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Dot Balls
              </label>
              <input
                type="number"
                name="dotBallsBowled"
                value={formData.dotBallsBowled}
                onChange={handleChange}
                min="0"
                placeholder="0s"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Fours Conceded
              </label>
              <input
                type="number"
                name="foursConceded"
                value={formData.foursConceded}
                onChange={handleChange}
                min="0"
                placeholder="4s"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Sixes Conceded
              </label>
              <input
                type="number"
                name="sixesConceded"
                value={formData.sixesConceded}
                onChange={handleChange}
                min="0"
                placeholder="6s"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Wides</label>
              <input
                type="number"
                name="widesConceded"
                value={formData.widesConceded}
                onChange={handleChange}
                min="0"
                placeholder="WD"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">No Balls</label>
              <input
                type="number"
                name="noBallsConceded"
                value={formData.noBallsConceded}
                onChange={handleChange}
                min="0"
                placeholder="NB"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {formData.oversBowled && formData.runsConceded && (
            <div className="bg-blue-50 p-3 rounded-md text-sm">
              <strong>Economy:</strong>{" "}
              {(
                parseFloat(formData.runsConceded) /
                parseFloat(formData.oversBowled)
              ).toFixed(2)}
            </div>
          )}
        </div>

        {/* FIELDING STATS */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold">Fielding Stats</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Catches</label>
              <input
                type="number"
                name="catchesTaken"
                value={formData.catchesTaken}
                onChange={handleChange}
                min="0"
                placeholder="Catches"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTONS */}
        <div className="flex flex-col md:flex-row gap-3 md:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Saving..." : "Save Stats"}
          </Button>
        </div>
      </form>

      {/* SUCCESS DIALOG */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl animate-modal-in">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">
                Stats Saved!
              </h2>
              <p className="text-gray-600 mb-6">
                Cricket stats for{" "}
                <span className="font-semibold">{savedPlayerName}</span> have
                been recorded successfully.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowSuccessDialog(false);
                    resetForm();
                  }}
                >
                  Add Another
                </Button>
                <Button variant="primary" onClick={() => navigate("/admin")}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddCricketStats;
