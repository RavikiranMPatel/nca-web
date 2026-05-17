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
import { linkMatchToFixture } from "../../api/scoring/tournamentApi";
import type {
  CricketMatch,
  CricketTeam,
  PlayerOption,
  PlayerSelection,
} from "../../types/match";
import api from "../../api/axios";

const STEPS = [
  "Match Details",
  "Team A",
  "Team B",
  "Toss",
  "Officials",
  "Review",
];

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

// ── Official roles ────────────────────────────────────────────────────────────
const OFFICIAL_ROLES = [
  { role: "UMPIRE_1", label: "Umpire 1", required: false },
  { role: "UMPIRE_2", label: "Umpire 2", required: false },
  { role: "TV_UMPIRE", label: "TV / Third Umpire", required: false },
  { role: "SCORER", label: "Scorer", required: false },
  { role: "REFEREE", label: "Match Referee", required: false },
];

const PlayerCard = ({
  player,
  selected,
  onToggle,
  onRoleToggle,
  onForeignToggle,
  isInSquad,
  squadIsForeign,
}: {
  player: PlayerOption;
  selected: PlayerSelection[];
  onToggle: () => void;
  onRoleToggle: (role: "isCaptain" | "isWicketkeeper") => void;
  onForeignToggle: () => void;
  isInSquad?: boolean;
  squadIsForeign?: boolean;
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
          <div className="flex items-center gap-1.5">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {player.displayName}
            </div>
            {isInSquad && !isSelected && (
              <span className="text-xs px-1.5 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded font-medium">
                Squad
              </span>
            )}
            {/* Show ✈ if squad marks them as foreign */}
            {isInSquad && squadIsForeign && !isSelected && (
              <span className="text-xs text-orange-500">✈</span>
            )}
          </div>
          {(player.battingStyle ||
            player.bowlingStyle ||
            player.playerRole) && (
            <div className="text-xs text-gray-400">
              {[
                player.playerRole === "WK_BATSMAN"
                  ? "🧤 WK"
                  : player.playerRole === "BATSMAN"
                    ? "🏏 Bat"
                    : player.playerRole === "BOWLER"
                      ? "⚾ Bowl"
                      : player.playerRole === "ALL_ROUNDER"
                        ? "⭐ AR"
                        : null,
                player.battingStyle,
                player.bowlingStyle,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
        </div>
      </button>
      {isSelected && (
        <div className="flex gap-1.5 ml-2 flex-wrap justify-end">
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
          <button
            onClick={onForeignToggle}
            className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
              sel!.isForeign
                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}
            title="Mark as foreign/overseas player"
          >
            ✈
          </button>
        </div>
      )}
    </div>
  );
};

export default function MatchSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allPlayers, setAllPlayers] = useState<PlayerOption[]>([]);
  const creatingRef = useRef(false);

  const [wagonWheelEnabled, setWagonWheelEnabled] = useState(
    () => localStorage.getItem("nca_ww_enabled") !== "false",
  );

  const [teamAExternalName, setTeamAExternalName] = useState("");
  const [addingExternalA, setAddingExternalA] = useState(false);
  const [teamBExternalName, setTeamBExternalName] = useState("");
  const [addingExternal, setAddingExternal] = useState(false);

  const [teamAExternalBattingStyle, setTeamAExternalBattingStyle] = useState<
    "RIGHT_HAND_BAT" | "LEFT_HAND_BAT"
  >("RIGHT_HAND_BAT");
  const [teamBExternalBattingStyle, setTeamBExternalBattingStyle] = useState<
    "RIGHT_HAND_BAT" | "LEFT_HAND_BAT"
  >("RIGHT_HAND_BAT");

  const [fixtureId, setFixtureId] = useState<string | null>(null);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [homeSquadIds, setHomeSquadIds] = useState<Set<string>>(new Set());
  const [awaySquadIds, setAwaySquadIds] = useState<Set<string>>(new Set());
  const [homeSquadPlayers, setHomeSquadPlayers] = useState<PlayerOption[]>([]);
  const [awaySquadPlayers, setAwaySquadPlayers] = useState<PlayerOption[]>([]);
  // Track which squad players are foreign
  const [homeSquadForeign, setHomeSquadForeign] = useState<Set<string>>(
    new Set(),
  );
  const [awaySquadForeign, setAwaySquadForeign] = useState<Set<string>>(
    new Set(),
  );

  // ── Officials state ───────────────────────────────────────────────────────
  // Map of role → official search text + selected official publicId
  const [officialSearch, setOfficialSearch] = useState<Record<string, string>>(
    {},
  );
  const [officialResults, setOfficialResults] = useState<Record<string, any[]>>(
    {},
  );
  const [officialSelections, setOfficialSelections] = useState<
    Record<string, { publicId: string; name: string }>
  >({});

  const [matchDetails, setMatchDetails] = useState({
    title: "",
    matchDate: new Date().toISOString().split("T")[0],
    matchType: "INTERNAL" as "INTERNAL" | "INTER_ACADEMY" | "KSCA_TOURNAMENT",
    venue: "",
    totalOvers: 20,
    dataSource: "BALL_BY_BALL" as "BALL_BY_BALL" | "MANUAL",
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
            playerRole: p.playerRole,
          })),
        );
      })
      .catch(() => setError("Failed to load players"));
  }, []);

  useEffect(() => {
    const fid = searchParams.get("fixtureId");
    const tid = searchParams.get("tournamentId");
    if (!fid || !tid) return;
    setFixtureId(fid);
    setTournamentId(tid);

    const raw = sessionStorage.getItem("fixture_prefill");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      sessionStorage.removeItem("fixture_prefill");

      setMatchDetails((p) => ({
        ...p,
        title: data.suggestedTitle ?? p.title,
        totalOvers: data.defaultOvers ?? p.totalOvers,
        matchType: "KSCA_TOURNAMENT",
      }));

      setTeamAName(data.homeTeam?.name ?? "Team A");
      setTeamBName(data.awayTeam?.name ?? "Team B");

      const homePlayers: PlayerOption[] = (data.homeTeam?.squad ?? []).map(
        (p: any) => ({
          publicId: p.publicId,
          displayName: p.displayName,
          battingStyle: p.battingStyle,
          bowlingStyle: p.bowlingStyle,
        }),
      );
      const awayPlayers: PlayerOption[] = (data.awayTeam?.squad ?? []).map(
        (p: any) => ({
          publicId: p.publicId,
          displayName: p.displayName,
          battingStyle: p.battingStyle,
          bowlingStyle: p.bowlingStyle,
        }),
      );

      // Track foreign players from squad
      const homeForeign = new Set<string>(
        (data.homeTeam?.squad ?? [])
          .filter((p: any) => p.isForeign)
          .map((p: any) => p.publicId as string),
      );
      const awayForeign = new Set<string>(
        (data.awayTeam?.squad ?? [])
          .filter((p: any) => p.isForeign)
          .map((p: any) => p.publicId as string),
      );

      setHomeSquadIds(new Set(homePlayers.map((p) => p.publicId)));
      setAwaySquadIds(new Set(awayPlayers.map((p) => p.publicId)));
      setHomeSquadPlayers(homePlayers);
      setAwaySquadPlayers(awayPlayers);
      setHomeSquadForeign(homeForeign);
      setAwaySquadForeign(awayForeign);

      setAllPlayers((prev) => {
        const existingIds = new Set(prev.map((p) => p.publicId));
        const newPlayers = [...homePlayers, ...awayPlayers].filter(
          (p) => !existingIds.has(p.publicId),
        );
        return [...prev, ...newPlayers];
      });
    } catch {
      /* ignore */
    }
  }, [searchParams]);

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

  // ── Official search ───────────────────────────────────────────────────────
  const searchOfficials = async (role: string, query: string) => {
    setOfficialSearch((prev) => ({ ...prev, [role]: query }));
    if (!query.trim() || query.length < 2) {
      setOfficialResults((prev) => ({ ...prev, [role]: [] }));
      return;
    }
    try {
      const res = await api.get(
        `/admin/cricket/officials?search=${encodeURIComponent(query)}`,
      );
      setOfficialResults((prev) => ({ ...prev, [role]: res.data ?? [] }));
    } catch {
      setOfficialResults((prev) => ({ ...prev, [role]: [] }));
    }
  };

  const selectOfficial = (
    role: string,
    official: { publicId: string; name: string },
  ) => {
    setOfficialSelections((prev) => ({ ...prev, [role]: official }));
    setOfficialSearch((prev) => ({ ...prev, [role]: official.name }));
    setOfficialResults((prev) => ({ ...prev, [role]: [] }));
  };

  const clearOfficial = (role: string) => {
    setOfficialSelections((prev) => {
      const next = { ...prev };
      delete next[role];
      return next;
    });
    setOfficialSearch((prev) => ({ ...prev, [role]: "" }));
  };

  const saveOfficials = async () => {
    if (!createdMatch) return;

    // Tournament — save selected from dropdown
    for (const [role, official] of Object.entries(officialSelections)) {
      try {
        await api.post(
          `/admin/cricket/matches/${createdMatch.publicId}/officials`,
          {
            role,
            officialPublicId: official.publicId,
          },
        );
      } catch {
        /* non-fatal */
      }
    }

    // Internal match — create official on-the-fly from free text
    if (!fixtureId) {
      for (const [role, name] of Object.entries(officialSearch)) {
        if (!name.trim() || officialSelections[role]) continue;
        try {
          const res = await api.post("/admin/cricket/officials", {
            name: name.trim(),
            defaultRole: "UMPIRE",
            isActive: true,
          });
          await api.post(
            `/admin/cricket/matches/${createdMatch.publicId}/officials`,
            {
              role,
              officialPublicId: res.data.publicId,
            },
          );
        } catch {
          /* non-fatal */
        }
      }
    }
  };

  const selectedAIds = teamAPlayers.map((p) => p.playerPublicId);
  const selectedBIds = teamBPlayers.map((p) => p.playerPublicId);

  const filteredA = (
    fixtureId && homeSquadPlayers.length > 0 ? homeSquadPlayers : allPlayers
  )
    .filter((p) => !selectedBIds.includes(p.publicId))
    .filter((p) => p.displayName.toLowerCase().includes(searchA.toLowerCase()))
    .sort(
      (a, b) =>
        (homeSquadIds.has(a.publicId) ? 0 : 1) -
        (homeSquadIds.has(b.publicId) ? 0 : 1),
    );

  const filteredB = (
    fixtureId && awaySquadPlayers.length > 0 ? awaySquadPlayers : allPlayers
  )
    .filter((p) => !selectedAIds.includes(p.publicId))
    .filter((p) => p.displayName.toLowerCase().includes(searchB.toLowerCase()))
    .sort(
      (a, b) =>
        (awaySquadIds.has(a.publicId) ? 0 : 1) -
        (awaySquadIds.has(b.publicId) ? 0 : 1),
    );

  const togglePlayer = (
    player: PlayerOption,
    selected: PlayerSelection[],
    setSelected: (s: PlayerSelection[]) => void,
    squadForeignIds: Set<string>,
  ) => {
    const exists = selected.find((s) => s.playerPublicId === player.publicId);
    if (exists) {
      setSelected(
        selected
          .filter((s) => s.playerPublicId !== player.publicId)
          .map((s, idx) => ({ ...s, battingOrder: idx + 1 })),
      );
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
          isWicketkeeper: player.playerRole === "WK_BATSMAN",
          isImpactPlayer: false,
          isForeign: squadForeignIds.has(player.publicId),
        },
      ]);
    }
    setError("");
  };

  const removePlayer = (
    publicId: string,
    selected: PlayerSelection[],
    setSelected: (s: PlayerSelection[]) => void,
  ) => {
    setSelected(
      selected
        .filter((s) => s.playerPublicId !== publicId)
        .map((s, idx) => ({ ...s, battingOrder: idx + 1 })),
    );
    setError("");
  };

  const addExternalPlayerToTeamA = async () => {
    const name = teamAExternalName.trim();
    if (!name) return;
    if (teamAPlayers.length >= 11) {
      setError("Team A already has 11 players");
      return;
    }
    setAddingExternalA(true);
    try {
      const res = await api.post("/admin/players/external/tournament-guest", {
        displayName: name,
        gender: "MALE",
        battingStyle: teamAExternalBattingStyle,
      });
      const newPlayer: PlayerOption = {
        publicId: res.data.publicId,
        displayName: res.data.displayName,
        battingStyle:
          teamAExternalBattingStyle === "RIGHT_HAND_BAT"
            ? "Right Hand Bat"
            : "Left Hand Bat",
      };
      setAllPlayers((prev) => [...prev, newPlayer]);
      setTeamAPlayers((prev) => [
        ...prev,
        {
          playerPublicId: newPlayer.publicId,
          battingOrder: prev.length + 1,
          isCaptain: false,
          isWicketkeeper: false,
          isImpactPlayer: false,
          isForeign: false,
        },
      ]);
      setTeamAExternalName("");
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to add player");
    } finally {
      setAddingExternalA(false);
    }
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
      const res = await api.post("/admin/players/external/tournament-guest", {
        displayName: name,
        gender: "MALE",
        battingStyle: teamBExternalBattingStyle,
      });
      const newPlayer: PlayerOption = {
        publicId: res.data.publicId,
        displayName: res.data.displayName,
        battingStyle:
          teamBExternalBattingStyle === "RIGHT_HAND_BAT"
            ? "Right Hand Bat"
            : "Left Hand Bat",
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
          isForeign: false,
        },
      ]);
      setTeamBExternalName("");
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to add player");
    } finally {
      setAddingExternal(false);
    }
  };

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

  const toggleForeign = (
    publicId: string,
    selected: PlayerSelection[],
    setSelected: (s: PlayerSelection[]) => void,
  ) => {
    setSelected(
      selected.map((p) =>
        p.playerPublicId === publicId ? { ...p, isForeign: !p.isForeign } : p,
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
      const match = await createMatch({
        ...matchDetails,
        tournamentPublicId: tournamentId ?? undefined,
      });
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
    if (!teamBPlayers.some((p) => p.isCaptain)) {
      setError("Select a captain for Team B");
      return;
    }
    if (!teamBPlayers.some((p) => p.isWicketkeeper)) {
      setError("Select a wicketkeeper for Team B");
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
      setTossWinner("");
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
    if (!teamAPlayers.some((p) => p.isCaptain)) {
      setError("Select a captain for Team A");
      return;
    }
    if (!teamAPlayers.some((p) => p.isWicketkeeper)) {
      setError("Select a wicketkeeper for Team A");
      return;
    }
    setError("");
    setStep(2);
  };

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
      setStep(4); // → Officials
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
      // Save officials first (non-fatal)
      await saveOfficials();

      if (fixtureId && tournamentId) {
        try {
          await linkMatchToFixture(
            tournamentId,
            fixtureId,
            createdMatch.publicId,
          );
        } catch {
          /* non-fatal */
        }
      }
      localStorage.setItem("nca_ww_enabled", String(wagonWheelEnabled));
      await startMatch(createdMatch.publicId);
      navigate(`/admin/cricket/matches/${createdMatch.publicId}/score`);
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to start match");
    } finally {
      setLoading(false);
    }
  };

  const currentPlayers = step === 1 ? teamAPlayers : teamBPlayers;
  const setCurrentPlayers = step === 1 ? setTeamAPlayers : setTeamBPlayers;
  const currentSquadIds = step === 1 ? homeSquadIds : awaySquadIds;
  const currentSquadForeign = step === 1 ? homeSquadForeign : awaySquadForeign;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-48">
      {/* Header + progress */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Cricket />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">
              {fixtureId ? "Match from Fixture" : "New Match"}
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

        {/* ── STEP 0: Match Details ─────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            {fixtureId && (
              <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-xl text-xs text-green-700 dark:text-green-400">
                🏆 Match pre-filled from tournament fixture. Squad members will
                appear first in player selection.
              </div>
            )}
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
            {matchDetails.dataSource === "BALL_BY_BALL" && (
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    🎯 Wagon Wheel
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Scorer taps field after each scoring shot
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = !wagonWheelEnabled;
                    setWagonWheelEnabled(next);
                    localStorage.setItem("nca_ww_enabled", String(next));
                  }}
                  className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${wagonWheelEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-all ${wagonWheelEnabled ? "left-6" : "left-0.5"}`}
                  />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 1 & 2: Teams ─────────────────────────────────────────────── */}
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

            {fixtureId && currentSquadIds.size > 0 && (
              <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-xl text-xs text-blue-600 dark:text-blue-400">
                💡 {currentSquadIds.size} squad members shown — select your
                playing XI. Tap ✈ to mark overseas players.
              </div>
            )}

            {!fixtureId && (
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs text-gray-500 dark:text-gray-400">
                Tap <strong>C</strong> for captain, <strong>WK</strong> for
                keeper, <strong>✈</strong> for overseas player.
              </div>
            )}

            {/* Guest player input */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                className="flex-1 min-w-0 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add guest by name..."
                value={step === 1 ? teamAExternalName : teamBExternalName}
                onChange={(e) =>
                  step === 1
                    ? setTeamAExternalName(e.target.value)
                    : setTeamBExternalName(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (step === 1) addExternalPlayerToTeamA();
                    else addExternalPlayerToTeamB();
                  }
                }}
              />
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-0.5 gap-0.5 flex-shrink-0">
                <button
                  onClick={() =>
                    step === 1
                      ? setTeamAExternalBattingStyle("RIGHT_HAND_BAT")
                      : setTeamBExternalBattingStyle("RIGHT_HAND_BAT")
                  }
                  className={`px-2.5 py-2 text-xs font-bold rounded-lg transition-all ${(step === 1 ? teamAExternalBattingStyle : teamBExternalBattingStyle) === "RIGHT_HAND_BAT" ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400"}`}
                >
                  RHB
                </button>
                <button
                  onClick={() =>
                    step === 1
                      ? setTeamAExternalBattingStyle("LEFT_HAND_BAT")
                      : setTeamBExternalBattingStyle("LEFT_HAND_BAT")
                  }
                  className={`px-2.5 py-2 text-xs font-bold rounded-lg transition-all ${(step === 1 ? teamAExternalBattingStyle : teamBExternalBattingStyle) === "LEFT_HAND_BAT" ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400"}`}
                >
                  LHB
                </button>
              </div>
              <button
                onClick={
                  step === 1
                    ? addExternalPlayerToTeamA
                    : addExternalPlayerToTeamB
                }
                disabled={
                  step === 1
                    ? !teamAExternalName.trim() ||
                      addingExternalA ||
                      teamAPlayers.length >= 11
                    : !teamBExternalName.trim() ||
                      addingExternal ||
                      teamBPlayers.length >= 11
                }
                className="px-3 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all flex-shrink-0"
              >
                {(step === 1 ? addingExternalA : addingExternal)
                  ? "…"
                  : "+ Add"}
              </button>
            </div>

            {/* Select All / Clear All */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Select Players
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const currentFiltered = step === 1 ? filteredA : filteredB;
                    if (currentPlayers.length > 0) {
                      setCurrentPlayers([]);
                    } else {
                      setCurrentPlayers(
                        currentFiltered.slice(0, 11).map((p, idx) => ({
                          playerPublicId: p.publicId,
                          battingOrder: idx + 1,
                          isCaptain: false,
                          isWicketkeeper: false,
                          isImpactPlayer: false,
                          isForeign: currentSquadForeign.has(p.publicId),
                        })),
                      );
                    }
                    setError("");
                  }}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 active:scale-95 transition-all"
                >
                  {currentPlayers.length > 0 ? "Clear All" : "Select All"}
                </button>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${currentPlayers.length === 11 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}
                >
                  {currentPlayers.length}/11
                </span>
              </div>
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
                  isInSquad={currentSquadIds.has(player.publicId)}
                  squadIsForeign={currentSquadForeign.has(player.publicId)}
                  onToggle={() =>
                    togglePlayer(
                      player,
                      currentPlayers,
                      setCurrentPlayers,
                      currentSquadForeign,
                    )
                  }
                  onRoleToggle={(role) =>
                    toggleRole(
                      player.publicId,
                      role,
                      currentPlayers,
                      setCurrentPlayers,
                    )
                  }
                  onForeignToggle={() =>
                    toggleForeign(
                      player.publicId,
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
                        {sel.isForeign ? " ✈" : ""}
                        <button
                          onClick={() =>
                            removePlayer(
                              sel.playerPublicId,
                              currentPlayers,
                              setCurrentPlayers,
                            )
                          }
                          className="ml-0.5 w-4 h-4 rounded-full bg-blue-200 dark:bg-blue-800 hover:bg-red-200 hover:text-red-600 flex items-center justify-center transition-colors flex-shrink-0"
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

        {/* ── STEP 3: Toss ──────────────────────────────────────────────────── */}
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

        {/* ── STEP 4: Officials ─────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🦺</span>
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Match Officials
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Optional — skip if not applicable
              </p>
            </div>

            {OFFICIAL_ROLES.map(({ role, label }) => {
              const selected = officialSelections[role];
              const query = officialSearch[role] ?? "";
              const results = officialResults[role] ?? [];
              const isTournament = !!fixtureId; // tournament → search, else → free text

              return (
                <div key={role} className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {label}
                  </label>

                  {isTournament ? (
                    // ── TOURNAMENT: search dropdown ──────────────────────────────
                    <div className="relative">
                      <input
                        type="text"
                        className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          selected
                            ? "border-blue-300 dark:border-blue-600"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                        placeholder={`Search ${label.toLowerCase()}...`}
                        value={query}
                        onChange={(e) => {
                          if (selected) clearOfficial(role);
                          searchOfficials(role, e.target.value);
                        }}
                      />
                      {selected && (
                        <button
                          onClick={() => clearOfficial(role)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                        >
                          <X />
                        </button>
                      )}
                      {!selected && results.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                          {results.slice(0, 5).map((o: any) => (
                            <button
                              key={o.publicId}
                              onClick={() =>
                                selectOfficial(role, {
                                  publicId: o.publicId,
                                  name: o.name,
                                })
                              }
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                            >
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {o.name}
                              </div>
                              {o.kscaId && (
                                <div className="text-xs text-gray-400">
                                  KSCA: {o.kscaId}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {selected && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg mt-1">
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            ✓ {selected.name}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    // ── INTERNAL MATCH: free text ────────────────────────────────
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Enter ${label.toLowerCase()} name`}
                      value={query}
                      onChange={(e) =>
                        setOfficialSearch((prev) => ({
                          ...prev,
                          [role]: e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── STEP 5: Review ────────────────────────────────────────────────── */}
        {step === 5 && createdMatch && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {[
                {
                  label: "Match",
                  value: matchDetails.title,
                  onEdit: undefined as (() => void) | undefined,
                },
                {
                  label: "Date",
                  value: matchDetails.matchDate,
                  onEdit: undefined,
                },
                {
                  label: "Overs",
                  value: `${matchDetails.totalOvers} overs`,
                  onEdit: undefined,
                },
                {
                  label: "Type",
                  value: matchDetails.matchType.replace(/_/g, " "),
                  onEdit: undefined,
                },
                {
                  label: "Venue",
                  value: matchDetails.venue || "—",
                  onEdit: undefined,
                },
                {
                  label: "Team A",
                  value: `${teamAName} (${teamAPlayers.length}p)`,
                  onEdit: () => {
                    setStep(1);
                    setError("");
                  },
                },
                {
                  label: "Team B",
                  value: `${teamBName} (${teamBPlayers.length}p)`,
                  onEdit: () => {
                    setStep(2);
                    setError("");
                  },
                },
                {
                  label: "Toss",
                  value: `${teams.find((t) => t.publicId === tossWinner)?.name} chose to ${tossDecision}`,
                  onEdit: () => {
                    setStep(3);
                    setError("");
                  },
                },
                {
                  label: "Officials",
                  value: (() => {
                    const roleLabel = (role: string) =>
                      role === "UMPIRE_1"
                        ? "U1"
                        : role === "UMPIRE_2"
                          ? "U2"
                          : role === "TV_UMPIRE"
                            ? "TV"
                            : role === "SCORER"
                              ? "SC"
                              : "RF";

                    const fromSelected = Object.entries(officialSelections).map(
                      ([role, o]) => `${roleLabel(role)}: ${o.name}`,
                    );

                    const fromFreeText = fixtureId
                      ? []
                      : Object.entries(officialSearch)
                          .filter(
                            ([role, q]) =>
                              q.trim() && !officialSelections[role],
                          )
                          .map(
                            ([role, q]) => `${roleLabel(role)}: ${q.trim()}`,
                          );

                    const all = [...fromSelected, ...fromFreeText];
                    return all.length > 0 ? all.join(" · ") : "None";
                  })(),
                  onEdit: () => {
                    setStep(4);
                    setError("");
                  },
                },
              ].map(({ label, value, onEdit }) => (
                <div
                  key={label}
                  onClick={onEdit}
                  className={`px-4 py-3 flex justify-between items-start gap-3 ${onEdit ? "active:bg-gray-50 dark:active:bg-gray-700/50 cursor-pointer" : ""}`}
                >
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {label}
                  </span>
                  <div className="flex items-center gap-1.5 text-right min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words text-right">
                      {value}
                    </span>
                    {onEdit && (
                      <span className="text-blue-400 flex-shrink-0">✏️</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {matchDetails.dataSource === "BALL_BY_BALL" && (
              <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    🎯 Wagon Wheel
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${wagonWheelEnabled ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"}`}
                  >
                    {wagonWheelEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setStep(0);
                    setError("");
                  }}
                  className="text-xs text-blue-500 font-semibold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-all"
                >
                  Edit
                </button>
              </div>
            )}

            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-xl p-4 text-sm text-green-700 dark:text-green-400">
              Everything looks good! Tap <strong>Start Match</strong> to open
              the live scorer.
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div
        className="fixed bottom-16 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 pt-3 flex gap-3 z-[60] sm:bottom-0"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
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
                    : step === 4
                      ? () => setStep(5) // Officials → Review (no API call yet)
                      : handleStartMatch
          }
          className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 flex items-center justify-center gap-2 ${loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"}`}
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
          {step === 4 && "Next: Review →"}
          {step === 5 && "🏏 Start Match"}
        </button>
      </div>
    </div>
  );
}
