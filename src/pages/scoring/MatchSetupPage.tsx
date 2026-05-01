import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  createMatch,
  setTeams,
  recordToss,
  startMatch,
  getTeams,
  getBranchPlayers,
  getMatch,
} from "../../api/scoring/matchApi";
import type {
  CricketMatch,
  CricketTeam,
  PlayerOption,
  PlayerSelection,
} from "../../types/match";
import api from "../../api/axios";

const STEPS = ["Match Details", "Team A", "Team B", "Toss", "Review"];

// FIX 1: Removed unused ChevronRight icon
const Check = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);
const Cricket = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
    <path strokeLinecap="round" strokeWidth={2} d="M8 16l8-8M6 12h12" />
  </svg>
);
const X = () => (
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

export default function MatchSetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allPlayers, setAllPlayers] = useState<PlayerOption[]>([]);
  const creatingRef = useRef(false);
  const [teamBExternalName, setTeamBExternalName] = useState("");
  const [addingExternal, setAddingExternal] = useState(false);

  const [matchDetails, setMatchDetails] = useState({
    title: "",
    matchDate: new Date().toISOString().split("T")[0],
    matchType: "INTERNAL" as const,
    venue: "",
    totalOvers: 20,
    dataSource: "BALL_BY_BALL" as const,
  });

  const [createdMatch, setCreatedMatch] = useState<CricketMatch | null>(null);
  const [teams, setTeams_] = useState<CricketTeam[]>([]);

  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");
  const [teamAPlayers, setTeamAPlayers] = useState<PlayerSelection[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<PlayerSelection[]>([]);
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");

  const [tossWinner, setTossWinner] = useState("");
  const [tossDecision, setTossDecision] = useState<"BAT" | "FIELD">("BAT");

  useEffect(() => {
    getBranchPlayers()
      .then((data: any[]) => {
        setAllPlayers(
          data.map((p: any) => ({
            publicId: p.publicId,
            displayName: p.displayName,
            battingStyle: p.battingStyle,
            bowlingStyle: p.bowlingStyle,
          })),
        );
      })
      .catch(() => setError("Failed to load players"));
  }, []);

  const selectedAIds = teamAPlayers.map((p) => p.playerPublicId);
  const selectedBIds = teamBPlayers.map((p) => p.playerPublicId);

  const filteredA = allPlayers
    .filter((p) => !selectedBIds.includes(p.publicId))
    .filter((p) => p.displayName.toLowerCase().includes(searchA.toLowerCase()));
  const filteredB = allPlayers
    .filter((p) => !selectedAIds.includes(p.publicId))
    .filter((p) => p.displayName.toLowerCase().includes(searchB.toLowerCase()));

  const togglePlayer = (
    player: PlayerOption,
    selected: PlayerSelection[],
    setSelected: (s: PlayerSelection[]) => void,
  ) => {
    const exists = selected.find((s) => s.playerPublicId === player.publicId);
    if (exists) {
      // Remove and re-number batting orders
      const updated = selected
        .filter((s) => s.playerPublicId !== player.publicId)
        .map((s, idx) => ({ ...s, battingOrder: idx + 1 }));
      setSelected(updated);
    } else {
      if (selected.length >= 11) {
        setError("Playing XI cannot have more than 11 players");
        return;
      }
      setSelected([
        ...selected,
        {
          playerPublicId: player.publicId,
          battingOrder: selected.length + 1,
          isCaptain: false,
          isWicketkeeper: false,
          isImpactPlayer: false,
        },
      ]);
    }
    setError("");
  };

  // FIX 2: Remove player directly from selected list (for the selected summary chips)
  const removePlayer = (
    publicId: string,
    selected: PlayerSelection[],
    setSelected: (s: PlayerSelection[]) => void,
  ) => {
    const updated = selected
      .filter((s) => s.playerPublicId !== publicId)
      .map((s, idx) => ({ ...s, battingOrder: idx + 1 }));
    setSelected(updated);
    setError("");
  };

  const addExternalPlayerToTeamB = async () => {
    const name = teamBExternalName.trim();
    if (!name) return;
    if (teamBPlayers.length >= 11) {
      setError("Team B already has 11 players");
      return;
    }
    setAddingExternal(true);
    try {
      const res = await api.post("/admin/players/external", {
        displayName: name,
        gender: "MALE",
      });
      const newPlayer: PlayerOption = {
        publicId: res.data.publicId,
        displayName: res.data.displayName,
      };
      setAllPlayers((prev) => [...prev, newPlayer]);
      setTeamBPlayers((prev) => [
        ...prev,
        {
          playerPublicId: newPlayer.publicId,
          battingOrder: prev.length + 1,
          isCaptain: false,
          isWicketkeeper: false,
          isImpactPlayer: false,
        },
      ]);
      setTeamBExternalName("");
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to add player");
    } finally {
      setAddingExternal(false);
    }
  };

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const resumeId = searchParams.get("resume");
    if (!resumeId) return;
    getMatch(resumeId)
      .then((match) => {
        setCreatedMatch(match);
        setStep(1);
      })
      .catch(() => setError("Failed to load match"));
  }, []);

  const toggleRole = (
    publicId: string,
    role: "isCaptain" | "isWicketkeeper",
    selected: PlayerSelection[],
    setSelected: (s: PlayerSelection[]) => void,
  ) => {
    setSelected(
      selected.map((p) =>
        p.playerPublicId === publicId
          ? { ...p, [role]: !p[role] }
          : role === "isCaptain"
            ? { ...p, isCaptain: false }
            : p,
      ),
    );
  };

  const handleCreateMatch = async () => {
    if (!matchDetails.title.trim()) {
      setError("Match title is required");
      return;
    }
    if (!matchDetails.matchDate) {
      setError("Match date is required");
      return;
    }
    if (creatingRef.current) return;
    creatingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const match = await createMatch(matchDetails);
      setCreatedMatch(match);
      setStep(1);
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to create match");
    } finally {
      setLoading(false);
      creatingRef.current = false;
    }
  };

  const handleSetTeams = async () => {
    if (!createdMatch) return;
    if (teamAPlayers.length < 1) {
      setError("Add at least 1 player to Team A");
      return;
    }
    if (teamBPlayers.length < 1) {
      setError("Add at least 1 player to Team B");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await setTeams(createdMatch.publicId, {
        teamAName,
        teamBName,
        teamAPlayers,
        teamBPlayers,
      });
      const fetchedTeams = await getTeams(createdMatch.publicId);
      setTeams_(fetchedTeams);
      setStep(3);
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to set teams");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToTeamB = () => {
    if (teamAPlayers.length < 1) {
      setError("Add at least 1 player to Team A");
      return;
    }
    setError("");
    setStep(2);
  };

  // FIX 3: Removed unused handleTeamB — step 2 button now calls handleSetTeams directly

  const handleToss = async () => {
    if (!tossWinner) {
      setError("Select toss winner");
      return;
    }
    if (!createdMatch) return;
    setLoading(true);
    setError("");
    try {
      await recordToss(createdMatch.publicId, {
        winnerTeamPublicId: tossWinner,
        decision: tossDecision,
      });
      setStep(4);
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to record toss");
    } finally {
      setLoading(false);
    }
  };

  const handleStartMatch = async () => {
    if (!createdMatch) return;
    setLoading(true);
    setError("");
    try {
      await startMatch(createdMatch.publicId);
      navigate(`/admin/cricket/matches/${createdMatch.publicId}/score`);
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to start match");
    } finally {
      setLoading(false);
    }
  };

  const PlayerCard = ({
    player,
    selected,
    onToggle,
    onRoleToggle,
  }: {
    player: PlayerOption;
    selected: PlayerSelection[];
    onToggle: () => void;
    onRoleToggle: (role: "isCaptain" | "isWicketkeeper") => void;
  }) => {
    const sel = selected.find((s) => s.playerPublicId === player.publicId);
    const isSelected = !!sel;

    return (
      <div
        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
          isSelected
            ? "bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-600"
            : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
        }`}
      >
        <button
          className="flex items-center gap-3 flex-1 text-left"
          onClick={onToggle}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              isSelected
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-500"
            }`}
          >
            {isSelected
              ? sel!.battingOrder
              : player.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {player.displayName}
            </div>
            {(player.battingStyle || player.bowlingStyle) && (
              <div className="text-xs text-gray-400">
                {[player.battingStyle, player.bowlingStyle]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
          </div>
        </button>
        {isSelected && (
          <div className="flex gap-2 ml-2">
            <button
              onClick={() => onRoleToggle("isCaptain")}
              className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                sel!.isCaptain
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              C
            </button>
            <button
              onClick={() => onRoleToggle("isWicketkeeper")}
              className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                sel!.isWicketkeeper
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              WK
            </button>
          </div>
        )}
      </div>
    );
  };

  const currentPlayers = step === 1 ? teamAPlayers : teamBPlayers;
  const setCurrentPlayers = step === 1 ? setTeamAPlayers : setTeamBPlayers;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Cricket />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">
              New Match
            </h1>
            <p className="text-xs text-gray-500">{STEPS[step]}</p>
          </div>
        </div>
        <div className="flex gap-1 mt-3">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 max-w-2xl mx-auto">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* STEP 0: Match Details */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Match Title *
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. NCA Practice Match — Batch A vs B"
                value={matchDetails.title}
                onChange={(e) =>
                  setMatchDetails((p) => ({ ...p, title: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={matchDetails.matchDate}
                  onChange={(e) =>
                    setMatchDetails((p) => ({
                      ...p,
                      matchDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Overs
                </label>
                <select
                  className="w-full px-3 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={matchDetails.totalOvers}
                  onChange={(e) =>
                    setMatchDetails((p) => ({
                      ...p,
                      totalOvers: Number(e.target.value),
                    }))
                  }
                >
                  {[5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50].map((o) => (
                    <option key={o} value={o}>
                      {o} overs
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Match Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  ["INTERNAL", "INTER_ACADEMY", "KSCA_TOURNAMENT"] as const
                ).map((type) => (
                  <button
                    key={type}
                    onClick={() =>
                      setMatchDetails((p) => ({ ...p, matchType: type }))
                    }
                    className={`py-2.5 px-2 rounded-xl text-xs font-medium border transition-all active:scale-95 ${
                      matchDetails.matchType === type
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {type === "INTERNAL"
                      ? "Internal"
                      : type === "INTER_ACADEMY"
                        ? "Inter-Academy"
                        : "KSCA"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Venue
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. NCA Ground A"
                value={matchDetails.venue}
                onChange={(e) =>
                  setMatchDetails((p) => ({ ...p, venue: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Scoring Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      val: "BALL_BY_BALL",
                      label: "Live Ball-by-Ball",
                      desc: "Score in real time",
                    },
                    {
                      val: "MANUAL",
                      label: "Post-match Entry",
                      desc: "Enter final scorecard",
                    },
                  ] as const
                ).map(({ val, label, desc }) => (
                  <button
                    key={val}
                    onClick={() =>
                      setMatchDetails((p) => ({ ...p, dataSource: val }))
                    }
                    className={`p-3 rounded-xl border text-left transition-all active:scale-95 ${
                      matchDetails.dataSource === val
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {label}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 1 & 2: Team A / Team B */}
        {(step === 1 || step === 2) && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {step === 1 ? "Team A Name" : "Team B Name"}
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={step === 1 ? teamAName : teamBName}
                onChange={(e) =>
                  step === 1
                    ? setTeamAName(e.target.value)
                    : setTeamBName(e.target.value)
                }
              />
            </div>

            {/* FIX 4: External player add input — Team B only */}
            {step === 2 && (
              <>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Add opposition players by name, or select academy players
                  below.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add player by name..."
                    value={teamBExternalName}
                    onChange={(e) => setTeamBExternalName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && addExternalPlayerToTeamB()
                    }
                  />
                  <button
                    onClick={addExternalPlayerToTeamB}
                    disabled={
                      !teamBExternalName.trim() ||
                      addingExternal ||
                      teamBPlayers.length >= 11
                    }
                    className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40 active:scale-95 transition-all flex-shrink-0"
                  >
                    {addingExternal ? "..." : "+ Add"}
                  </button>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Select Players
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  currentPlayers.length === 11
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                }`}
              >
                {currentPlayers.length}/11
              </span>
            </div>

            <input
              type="text"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
              placeholder="Search players..."
              value={step === 1 ? searchA : searchB}
              onChange={(e) =>
                step === 1
                  ? setSearchA(e.target.value)
                  : setSearchB(e.target.value)
              }
            />

            <div className="space-y-2">
              {(step === 1 ? filteredA : filteredB).map((player) => (
                <PlayerCard
                  key={player.publicId}
                  player={player}
                  selected={currentPlayers}
                  onToggle={() =>
                    togglePlayer(player, currentPlayers, setCurrentPlayers)
                  }
                  onRoleToggle={(role) =>
                    toggleRole(
                      player.publicId,
                      role,
                      currentPlayers,
                      setCurrentPlayers,
                    )
                  }
                />
              ))}
              {(step === 1 ? filteredA : filteredB).length === 0 && (
                <div className="text-center py-8 text-sm text-gray-400">
                  No players found
                </div>
              )}
            </div>

            {/* FIX 5: Selected summary with remove button on each chip */}
            {currentPlayers.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3">
                <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">
                  Selected ({currentPlayers.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentPlayers.map((sel) => {
                    const p = allPlayers.find(
                      (pl) => pl.publicId === sel.playerPublicId,
                    );
                    return (
                      <span
                        key={sel.playerPublicId}
                        className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 pl-2 pr-1 py-0.5 rounded-full"
                      >
                        {sel.battingOrder}. {p?.displayName}
                        {sel.isCaptain ? " (C)" : ""}
                        {sel.isWicketkeeper ? " (WK)" : ""}
                        {/* FIX 5: Remove button on each selected player chip */}
                        <button
                          onClick={() =>
                            removePlayer(
                              sel.playerPublicId,
                              currentPlayers,
                              setCurrentPlayers,
                            )
                          }
                          className="ml-0.5 w-4 h-4 rounded-full bg-blue-200 dark:bg-blue-800 hover:bg-red-200 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400 flex items-center justify-center transition-colors flex-shrink-0"
                        >
                          <X />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Toss */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">🏏</span>
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Toss
              </h2>
              <p className="text-sm text-gray-500 mt-1">Who won the toss?</p>
            </div>
            <div className="space-y-2">
              {teams.map((team) => (
                <button
                  key={team.publicId}
                  onClick={() => setTossWinner(team.publicId)}
                  className={`w-full p-4 rounded-xl border text-left transition-all active:scale-95 ${
                    tossWinner === team.publicId
                      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {team.name}
                    </span>
                    {tossWinner === team.publicId && (
                      <span className="text-yellow-600 dark:text-yellow-400">
                        <Check />
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {tossWinner && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">
                  elected to...
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(["BAT", "FIELD"] as const).map((dec) => (
                    <button
                      key={dec}
                      onClick={() => setTossDecision(dec)}
                      className={`py-4 rounded-xl border font-semibold transition-all active:scale-95 ${
                        tossDecision === dec
                          ? dec === "BAT"
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-blue-600 text-white border-blue-600"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      {dec === "BAT" ? "🏏 BAT" : "⚾ FIELD"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Review & Start */}
        {step === 4 && createdMatch && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {[
                { label: "Match", value: matchDetails.title },
                { label: "Date", value: matchDetails.matchDate },
                { label: "Overs", value: `${matchDetails.totalOvers} overs` },
                {
                  label: "Type",
                  value: matchDetails.matchType.replace("_", " "),
                },
                { label: "Venue", value: matchDetails.venue || "—" },
                {
                  label: "Team A",
                  value: `${teamAName} (${teamAPlayers.length} players)`,
                },
                {
                  label: "Team B",
                  value: `${teamBName} (${teamBPlayers.length} players)`,
                },
                {
                  label: "Toss",
                  value: `${teams.find((t) => t.publicId === tossWinner)?.name} chose to ${tossDecision}`,
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between px-4 py-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {label}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right max-w-[60%]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-xl p-4 text-sm text-green-700 dark:text-green-400">
              Everything looks good! Tap <strong>Start Match</strong> to open
              the live scorer.
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-3 flex gap-3">
        {step > 0 && (
          <button
            onClick={() => {
              setStep((s) => s - 1);
              setError("");
            }}
            className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 active:scale-95 transition-all"
          >
            Back
          </button>
        )}
        <button
          disabled={loading}
          onClick={
            step === 0
              ? handleCreateMatch
              : step === 1
                ? handleGoToTeamB
                : step === 2
                  ? handleSetTeams
                  : step === 3
                    ? handleToss
                    : handleStartMatch
          }
          className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2 ${
            loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading && (
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {step === 0 && "Create Match"}
          {step === 1 && "Next: Team B →"}
          {step === 2 && "Next: Toss →"}
          {step === 3 && "Record Toss"}
          {step === 4 && "🏏 Start Match"}
        </button>
      </div>
    </div>
  );
}
