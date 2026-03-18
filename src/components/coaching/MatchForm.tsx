import { useState, useEffect } from "react";
import { Save, ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import { coachingService } from "../../api/playerService/coachingService";
import type {
  MatchPerformanceRequest,
  MatchType,
  MatchResult,
} from "../../api/playerService/coachingService";

const ROLES = ["BATSMEN", "BOWLER", "ALL_ROUNDER", "WICKET_KEEPER"];

type Props = {
  playerPublicId: string;
  matchPublicId?: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function MatchForm({
  playerPublicId,
  matchPublicId,
  onSuccess,
  onCancel,
}: Props) {
  const isEdit = !!matchPublicId;

  const [matchDate, setMatchDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [matchType, setMatchType] = useState<MatchType>("PRACTICE_MATCH");
  const [oppositionTeam, setOppositionTeam] = useState("");
  const [venue, setVenue] = useState("");
  const [result, setResult] = useState<MatchResult | "">("");
  const [playerRole, setPlayerRole] = useState("BATSMEN");
  const [isSharedWithPlayer, setIsSharedWithPlayer] = useState(false);
  const [coachObservations, setCoachObservations] = useState("");
  const [playerReflection, setPlayerReflection] = useState("");

  // Stats
  const [runs, setRuns] = useState("");
  const [balls, setBalls] = useState("");
  const [fours, setFours] = useState("");
  const [sixes, setSixes] = useState("");
  const [dismissalType, setDismissal] = useState("");
  const [overs, setOvers] = useState("");
  const [wickets, setWickets] = useState("");
  const [runsConceded, setRunsConceded] = useState("");
  const [maidens, setMaidens] = useState("");
  const [economy, setEconomy] = useState("");
  const [catches, setCatches] = useState("");
  const [runouts, setRunouts] = useState("");
  const [stumpings, setStumpings] = useState("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && matchPublicId) loadExisting();
  }, []);

  const loadExisting = async () => {
    setLoading(true);
    try {
      const data = await coachingService.getMatch(
        playerPublicId,
        matchPublicId!,
      );
      setMatchDate(data.matchDate);
      setMatchType(data.matchType);
      setOppositionTeam(data.oppositionTeam || "");
      setVenue(data.venue || "");
      setResult((data.result || "") as MatchResult | "");
      setPlayerRole(data.playerRole);
      setIsSharedWithPlayer(data.isSharedWithPlayer);
      setCoachObservations(data.coachObservations || "");
      setPlayerReflection(data.playerReflection || "");
      const b = (data.battingStats as any) || {};
      setRuns(b.runs ?? "");
      setBalls(b.balls ?? "");
      setFours(b.fours ?? "");
      setSixes(b.sixes ?? "");
      setDismissal(b.dismissalType ?? "");
      const bw = (data.bowlingStats as any) || {};
      setOvers(bw.overs ?? "");
      setWickets(bw.wickets ?? "");
      setRunsConceded(bw.runsConceded ?? "");
      setMaidens(bw.maidens ?? "");
      setEconomy(bw.economy ?? "");
      const f = (data.fieldingStats as any) || {};
      setCatches(f.catches ?? "");
      setRunouts(f.runouts ?? "");
      setStumpings(f.stumpings ?? "");
    } catch {
      toast.error("Failed to load match");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!matchDate) {
      toast.error("Match date is required");
      return;
    }
    if (!playerRole) {
      toast.error("Player role is required");
      return;
    }

    setSaving(true);
    const payload: MatchPerformanceRequest = {
      matchDate,
      matchType,
      oppositionTeam: oppositionTeam || undefined,
      venue: venue || undefined,
      result: (result || undefined) as MatchResult | undefined,
      playerRole,
      isSharedWithPlayer,
      coachObservations: coachObservations || undefined,
      playerReflection: playerReflection || undefined,
      battingStats:
        runs || balls || fours || sixes || dismissalType
          ? {
              runs: runs ? parseInt(runs) : undefined,
              balls: balls ? parseInt(balls) : undefined,
              fours: fours ? parseInt(fours) : undefined,
              sixes: sixes ? parseInt(sixes) : undefined,
              strikeRate:
                runs && balls
                  ? parseFloat(
                      ((parseInt(runs) / parseInt(balls)) * 100).toFixed(2),
                    )
                  : undefined,
              dismissalType: dismissalType || undefined,
            }
          : undefined,
      bowlingStats:
        overs || wickets || runsConceded
          ? {
              overs: overs ? parseFloat(overs) : undefined,
              wickets: wickets ? parseInt(wickets) : undefined,
              runsConceded: runsConceded ? parseInt(runsConceded) : undefined,
              maidens: maidens ? parseInt(maidens) : undefined,
              economy: economy ? parseFloat(economy) : undefined,
            }
          : undefined,
      fieldingStats:
        catches || runouts || stumpings
          ? {
              catches: catches ? parseInt(catches) : undefined,
              runouts: runouts ? parseInt(runouts) : undefined,
              stumpings: stumpings ? parseInt(stumpings) : undefined,
            }
          : undefined,
    };

    try {
      if (isEdit) {
        await coachingService.updateMatch(
          playerPublicId,
          matchPublicId!,
          payload,
        );
        toast.success("Match updated");
      } else {
        await coachingService.createMatch(playerPublicId, payload);
        toast.success("Match added");
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const inputCls =
    "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-4">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-700"
      >
        <ArrowLeft size={16} /> Back to Matches
      </button>

      {/* Match details */}
      <div className="bg-white rounded-lg shadow p-5 space-y-4">
        <h2 className="font-bold text-slate-900">
          {isEdit ? "Edit Match" : "Log Match Performance"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Match Date *
            </label>
            <input
              type="date"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Match Type *
            </label>
            <select
              value={matchType}
              onChange={(e) => setMatchType(e.target.value as MatchType)}
              className={inputCls}
            >
              <option value="PRACTICE_MATCH">Practice Match</option>
              <option value="TOURNAMENT">Tournament</option>
              <option value="LEAGUE">League</option>
              <option value="FRIENDLY">Friendly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Opposition Team
            </label>
            <input
              type="text"
              value={oppositionTeam}
              onChange={(e) => setOppositionTeam(e.target.value)}
              placeholder="e.g. RBNCC"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Venue
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Ground name"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Result
            </label>
            <select
              value={result}
              onChange={(e) => setResult(e.target.value as MatchResult | "")}
              className={inputCls}
            >
              <option value="">Not set</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
              <option value="DRAW">Draw</option>
              <option value="NO_RESULT">No Result</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Player Role *
            </label>
            <select
              value={playerRole}
              onChange={(e) => setPlayerRole(e.target.value)}
              className={inputCls}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Batting */}
      <div className="bg-white rounded-lg shadow p-5 space-y-3">
        <h3 className="font-bold text-slate-800 text-sm">
          🏏 Batting (leave blank if did not bat)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Runs", val: runs, set: setRuns },
            { label: "Balls", val: balls, set: setBalls },
            { label: "Fours", val: fours, set: setFours },
            { label: "Sixes", val: sixes, set: setSixes },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                {label}
              </label>
              <input
                type="number"
                min={0}
                value={val}
                onChange={(e) => set(e.target.value)}
                placeholder="—"
                className={inputCls}
              />
            </div>
          ))}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
              Dismissal
            </label>
            <select
              value={dismissalType}
              onChange={(e) => setDismissal(e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              {[
                "Bowled",
                "Caught",
                "LBW",
                "Run Out",
                "Stumped",
                "Hit Wicket",
                "Not Out",
                "Retired",
              ].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          {runs && balls && (
            <div className="flex items-end">
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs w-full">
                <span className="text-blue-400 font-semibold">SR: </span>
                <span className="text-blue-700 font-bold">
                  {((parseInt(runs) / parseInt(balls)) * 100).toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bowling */}
      <div className="bg-white rounded-lg shadow p-5 space-y-3">
        <h3 className="font-bold text-slate-800 text-sm">
          🎯 Bowling (leave blank if did not bowl)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Overs", val: overs, set: setOvers, step: "0.1" },
            { label: "Wickets", val: wickets, set: setWickets },
            { label: "Runs Conceded", val: runsConceded, set: setRunsConceded },
            { label: "Maidens", val: maidens, set: setMaidens },
          ].map(({ label, val, set, step }) => (
            <div key={label}>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                {label}
              </label>
              <input
                type="number"
                min={0}
                step={step || "1"}
                value={val}
                onChange={(e) => set(e.target.value)}
                placeholder="—"
                className={inputCls}
              />
            </div>
          ))}
          {overs && runsConceded && (
            <div className="flex items-end">
              <div className="bg-green-50 rounded-lg px-3 py-2 text-xs w-full">
                <span className="text-green-400 font-semibold">Econ: </span>
                <span className="text-green-700 font-bold">
                  {(parseInt(runsConceded) / parseFloat(overs)).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fielding */}
      <div className="bg-white rounded-lg shadow p-5 space-y-3">
        <h3 className="font-bold text-slate-800 text-sm">🥊 Fielding</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Catches", val: catches, set: setCatches },
            { label: "Run Outs", val: runouts, set: setRunouts },
            { label: "Stumpings", val: stumpings, set: setStumpings },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                {label}
              </label>
              <input
                type="number"
                min={0}
                value={val}
                onChange={(e) => set(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Observations */}
      <div className="bg-white rounded-lg shadow p-5 space-y-3">
        <h3 className="font-bold text-slate-800 text-sm">Notes</h3>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Coach Observations (private)
          </label>
          <textarea
            value={coachObservations}
            rows={3}
            onChange={(e) => setCoachObservations(e.target.value)}
            placeholder="Private coaching observations..."
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-slate-50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Player Reflection (shared)
          </label>
          <textarea
            value={playerReflection}
            rows={3}
            onChange={(e) => setPlayerReflection(e.target.value)}
            placeholder="Player's own reflection after the match..."
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-slate-50"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="match-shared"
            checked={isSharedWithPlayer}
            onChange={(e) => setIsSharedWithPlayer(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          <label htmlFor="match-shared" className="text-sm text-slate-700">
            Share with player
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pb-8">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-200"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 shadow-sm"
        >
          <Save size={15} />
          {saving ? "Saving..." : isEdit ? "Update Match" : "Save Match"}
        </button>
      </div>
    </div>
  );
}
