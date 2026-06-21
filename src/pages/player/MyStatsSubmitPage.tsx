import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import Button from "../../components/Button";

type StatFormData = {
  matchDate: string;
  opponentName: string;
  groundName: string;
  place: string;
  tournamentName: string;
  format: string;
  runs: string;
  ballsFaced: string;
  minutesFaced: string;
  fours: string;
  sixes: string;
  oversBowled: string;
  maidens: string;
  runsConceded: string;
  wicketsTaken: string;
  dotBallsBowled: string;
  foursConceded: string;
  sixesConceded: string;
  widesConceded: string;
  noBallsConceded: string;
  catchesTaken: string;
};

const EMPTY_FORM: StatFormData = {
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
};

export default function MyStatsSubmitPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [formData, setFormData] = useState<StatFormData>({ ...EMPTY_FORM });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.opponentName.trim()) {
      toast.error("Opponent name is required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        matchDate: formData.matchDate,
        opponentName: formData.opponentName,
        groundName: formData.groundName || null,
        place: formData.place || null,
        tournamentName: formData.tournamentName || null,
        format: formData.format || null,

        runs: formData.runs ? parseInt(formData.runs) : null,
        ballsFaced: formData.ballsFaced ? parseInt(formData.ballsFaced) : null,
        minutesFaced: formData.minutesFaced ? parseInt(formData.minutesFaced) : null,
        fours: formData.fours ? parseInt(formData.fours) : null,
        sixes: formData.sixes ? parseInt(formData.sixes) : null,

        oversBowled: formData.oversBowled ? parseFloat(formData.oversBowled) : null,
        maidens: formData.maidens ? parseInt(formData.maidens) : null,
        runsConceded: formData.runsConceded ? parseInt(formData.runsConceded) : null,
        wicketsTaken: formData.wicketsTaken ? parseInt(formData.wicketsTaken) : null,
        dotBallsBowled: formData.dotBallsBowled ? parseInt(formData.dotBallsBowled) : null,
        foursConceded: formData.foursConceded ? parseInt(formData.foursConceded) : null,
        sixesConceded: formData.sixesConceded ? parseInt(formData.sixesConceded) : null,
        widesConceded: formData.widesConceded ? parseInt(formData.widesConceded) : null,
        noBallsConceded: formData.noBallsConceded ? parseInt(formData.noBallsConceded) : null,

        catchesTaken: formData.catchesTaken ? parseInt(formData.catchesTaken) : null,
      };

      await api.post("/player/cricket-stats", payload);
      setShowSuccessDialog(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to submit stats");
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-xl md:text-2xl font-bold">Submit Match Stats</h1>
          <p className="text-sm text-gray-500">
            Your submission will be reviewed by the academy before going live
          </p>
        </div>
      </div>

      {/* INFO BANNER */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        <strong>Note:</strong> Stats you submit are marked as <strong>pending review</strong> until an admin approves them. They won't appear in the public leaderboard until approved.
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
              <label className="block text-sm font-medium mb-1">Tournament</label>
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
          <p className="text-sm text-gray-500">Leave blank if you did not bat</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: "runs", label: "Runs", placeholder: "R" },
              { name: "ballsFaced", label: "Balls Faced", placeholder: "B" },
              { name: "minutesFaced", label: "Minutes", placeholder: "M" },
              { name: "fours", label: "Fours", placeholder: "4s" },
              { name: "sixes", label: "Sixes", placeholder: "6s" },
            ].map(({ name, label, placeholder }) => (
              <div key={name}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input
                  type="number"
                  name={name}
                  value={formData[name as keyof StatFormData]}
                  onChange={handleChange}
                  min="0"
                  placeholder={placeholder}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          {formData.runs && formData.ballsFaced && (
            <div className="bg-blue-50 p-3 rounded-md text-sm">
              <strong>Strike Rate:</strong>{" "}
              {((parseInt(formData.runs) / parseInt(formData.ballsFaced)) * 100).toFixed(2)}
            </div>
          )}
        </div>

        {/* BOWLING STATS */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold">Bowling Stats</h2>
          <p className="text-sm text-gray-500">Leave blank if you did not bowl</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: "oversBowled", label: "Overs", placeholder: "O", step: "0.1" },
              { name: "maidens", label: "Maidens", placeholder: "M" },
              { name: "runsConceded", label: "Runs Conceded", placeholder: "R" },
              { name: "wicketsTaken", label: "Wickets", placeholder: "W" },
              { name: "dotBallsBowled", label: "Dot Balls", placeholder: "0s" },
              { name: "foursConceded", label: "Fours Conceded", placeholder: "4s" },
              { name: "sixesConceded", label: "Sixes Conceded", placeholder: "6s" },
              { name: "widesConceded", label: "Wides", placeholder: "WD" },
              { name: "noBallsConceded", label: "No Balls", placeholder: "NB" },
            ].map(({ name, label, placeholder, step }) => (
              <div key={name}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input
                  type="number"
                  name={name}
                  value={formData[name as keyof StatFormData]}
                  onChange={handleChange}
                  min="0"
                  step={step}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          {formData.oversBowled && formData.runsConceded && (
            <div className="bg-blue-50 p-3 rounded-md text-sm">
              <strong>Economy:</strong>{" "}
              {(parseFloat(formData.runsConceded) / parseFloat(formData.oversBowled)).toFixed(2)}
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

        {/* SUBMIT */}
        <div className="flex flex-col md:flex-row gap-3 md:justify-end">
          <Button type="button" variant="secondary" onClick={() => navigate("/my-stats")}>
            View My Submissions
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Submitting…" : "Submit for Review"}
          </Button>
        </div>
      </form>

      {/* SUCCESS DIALOG */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="text-center">
              <div className="text-6xl mb-4">📬</div>
              <h2 className="text-2xl font-bold text-blue-700 mb-2">Submitted!</h2>
              <p className="text-gray-600 mb-2">
                Your match stats have been submitted for review.
              </p>
              <p className="text-sm text-gray-400 mb-6">
                An admin will review and approve them before they appear in the public leaderboard.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowSuccessDialog(false);
                    setFormData({ ...EMPTY_FORM });
                  }}
                >
                  Submit Another
                </Button>
                <Button variant="primary" onClick={() => navigate("/my-stats")}>
                  My Submissions
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
