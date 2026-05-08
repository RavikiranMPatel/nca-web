import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getTournament,
  listTeams,
  addTeam,
  removeTeam,
  listStages,
  listFixtures,
  generateFixtures,
  addManualFixture,
  getStandings,
  updateTournamentStatus,
  declareWinner,
  advanceToKnockout,
  getSquad,
  addToSquad,
  removeFromSquad,
  getAllTournamentPlayers,
  prepareMatchFromFixture,
} from "../../api/scoring/tournamentApi";
import { getBranchPlayers } from "../../api/scoring/matchApi";
import api from "../../api/axios";

const TABS = ["Overview", "Teams", "Players", "Fixtures", "Standings", "Stats"];
const ROLES = ["BATSMAN", "BOWLER", "ALL_ROUNDER", "WK_BATSMAN"];
const ROLE_LABELS: Record<string, string> = {
  BATSMAN: "Bat",
  BOWLER: "Bowl",
  ALL_ROUNDER: "AR",
  WK_BATSMAN: "WK",
};

const statusBadge: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-600",
  CANCELLED: "bg-red-100 text-red-500",
};

const fixtureStatusColor: Record<string, string> = {
  SCHEDULED: "text-gray-400",
  IN_PROGRESS: "text-green-500",
  COMPLETED: "text-blue-500",
  CANCELLED: "text-red-400",
};

export default function TournamentDetailPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();

  const [tab, setTab] = useState(0);
  const [tournament, setTournament] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [allTournamentPlayers, setAllTournamentPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [showAddTeam, setShowAddTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: "",
    shortName: "",
    colorHex: "#3b82f6",
    groupName: "",
  });

  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [squadMap, setSquadMap] = useState<Record<string, any[]>>({});
  const [showAddPlayer, setShowAddPlayer] = useState<string | null>(null);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [playerSearch, setPlayerSearch] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState("ALL_ROUNDER");
  const [playerModalTab, setPlayerModalTab] = useState<"academy" | "external">(
    "academy",
  );
  const [externalName, setExternalName] = useState("");
  const [externalGender, setExternalGender] = useState("MALE");
  const [externalRole, setExternalRole] = useState("ALL_ROUNDER");

  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm, setGenForm] = useState({
    teamsPerGroup: 4,
    teamsAdvancingPerGroup: 2,
  });

  const [showManualFixture, setShowManualFixture] = useState(false);
  const [fixtureForm, setFixtureForm] = useState({
    stagePublicId: "",
    homeTeamPublicId: "",
    awayTeamPublicId: "",
    venue: "",
  });

  const [showDeclareWinner, setShowDeclareWinner] = useState(false);
  const [winnerTeam, setWinnerTeam] = useState("");

  const [showEditFixture, setShowEditFixture] = useState(false);
  const [editingFixture, setEditingFixture] = useState<any>(null);
  const [editFixtureForm, setEditFixtureForm] = useState({
    roundNumber: 1,
    homeTeamPublicId: "",
    awayTeamPublicId: "",
    venue: "",
    status: "SCHEDULED",
  });

  // ── STATS STATE (NEW) ─────────────────────────────────────────────────────
  const [statsSubTab, setStatsSubTab] = useState<"batting" | "bowling" | "mvp">(
    "batting",
  );
  const [battingStats, setBattingStats] = useState<any[]>([]);
  const [bowlingStats, setBowlingStats] = useState<any[]>([]);
  const [mvpStats, setMvpStats] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const loadAll = async () => {
    if (!publicId) return;
    setLoading(true);
    try {
      const [t, tm, st, fx, sd, tp] = await Promise.all([
        getTournament(publicId),
        listTeams(publicId),
        listStages(publicId),
        listFixtures(publicId),
        getStandings(publicId),
        getAllTournamentPlayers(publicId),
      ]);
      setTournament(t);
      setTeams(tm);
      setStages(st);
      setFixtures(fx);
      setStandings(sd);
      setAllTournamentPlayers(tp);
      const squadEntries = await Promise.all(
        tm.map((team: any) =>
          getSquad(publicId, team.publicId)
            .then((squad) => [team.publicId, squad] as [string, any[]])
            .catch(() => [team.publicId, []] as [string, any[]]),
        ),
      );
      setSquadMap(Object.fromEntries(squadEntries));
    } catch {
      setError("Failed to load tournament");
    } finally {
      setLoading(false);
    }
  };

  // ── LOAD STATS (NEW) ──────────────────────────────────────────────────────
  const loadStats = async () => {
    if (!publicId || statsLoaded) return;
    setStatsLoading(true);
    try {
      const [bat, bowl, mvp] = await Promise.all([
        api
          .get(`/admin/cricket/tournaments/${publicId}/stats/batting`)
          .then((r) => r.data),
        api
          .get(`/admin/cricket/tournaments/${publicId}/stats/bowling`)
          .then((r) => r.data),
        api
          .get(`/admin/cricket/tournaments/${publicId}/stats/mvp`)
          .then((r) => r.data),
      ]);
      setBattingStats(bat);
      setBowlingStats(bowl);
      setMvpStats(mvp);
      setStatsLoaded(true);
    } catch {
      setError("Failed to load stats");
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 5) loadStats();
  }, [tab]);

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
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadAll();
  }, [publicId]);

  const loadSquad = async (teamPublicId: string) => {
    try {
      const squad = await getSquad(publicId!, teamPublicId);
      setSquadMap((prev) => ({ ...prev, [teamPublicId]: squad }));
    } catch {
      /* silent */
    }
  };

  const handleExpandTeam = async (teamPublicId: string) => {
    if (expandedTeam === teamPublicId) {
      setExpandedTeam(null);
    } else {
      setExpandedTeam(teamPublicId);
      if (!squadMap[teamPublicId]) await loadSquad(teamPublicId);
    }
  };

  const openAddPlayer = (teamPublicId: string) => {
    setShowAddPlayer(teamPublicId);
    setPlayerSearch("");
    setSelectedPlayers([]);
    setPlayerModalTab("academy");
    setExternalName("");
    setExternalGender("MALE");
    setExternalRole("ALL_ROUNDER");
  };

  const closeAddPlayer = () => {
    setShowAddPlayer(null);
    setSelectedPlayers([]);
    setPlayerSearch("");
    setExternalName("");
  };

  const handleAddTeam = async () => {
    if (!teamForm.name.trim()) return;
    setPosting(true);
    try {
      await addTeam(publicId!, teamForm);
      setShowAddTeam(false);
      setTeamForm({
        name: "",
        shortName: "",
        colorHex: "#3b82f6",
        groupName: "",
      });
      await loadAll();
      showToast("✓ Team added");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to add team");
    } finally {
      setPosting(false);
    }
  };

  const handleRemoveTeam = async (teamPublicId: string) => {
    if (!confirm("Remove this team from the tournament?")) return;
    try {
      await removeTeam(publicId!, teamPublicId);
      await loadAll();
      showToast("✓ Team removed");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to remove team");
    }
  };

  const handleAddToSquad = async () => {
    if (!selectedPlayers.length || !showAddPlayer) return;
    setPosting(true);
    try {
      for (const p of selectedPlayers) {
        await addToSquad(publicId!, showAddPlayer, {
          playerPublicId: p.publicId,
          playerRole: selectedRole,
          squadNumber: null,
        });
      }
      await loadSquad(showAddPlayer);
      await loadAll();
      closeAddPlayer();
      showToast(`✓ ${selectedPlayers.length} player(s) added to squad`);
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to add player");
    } finally {
      setPosting(false);
    }
  };

  const handleAddExternalPlayer = async () => {
    if (!externalName.trim() || !showAddPlayer) return;
    setPosting(true);
    try {
      const created = await api
        .post("/admin/players/external/tournament-guest", {
          displayName: externalName.trim(),
          gender: externalGender,
        })
        .then((r) => r.data);
      await addToSquad(publicId!, showAddPlayer, {
        playerPublicId: created.publicId,
        playerRole: externalRole,
        squadNumber: null,
      });
      await loadSquad(showAddPlayer);
      await loadAll();
      setExternalName("");
      showToast(`✓ ${created.displayName} added to squad`);
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to add external player");
    } finally {
      setPosting(false);
    }
  };

  const handleRemoveFromSquad = async (
    teamPublicId: string,
    playerPublicId: string,
  ) => {
    try {
      await removeFromSquad(publicId!, teamPublicId, playerPublicId);
      await loadSquad(teamPublicId);
      await loadAll();
      showToast("✓ Player removed");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to remove player");
    }
  };

  const handleStartMatch = async (fixture: any) => {
    try {
      const data = await prepareMatchFromFixture(publicId!, fixture.publicId);
      sessionStorage.setItem("fixture_prefill", JSON.stringify(data));
      navigate(
        `/admin/cricket/matches/new?fixtureId=${fixture.publicId}&tournamentId=${publicId}`,
      );
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to prepare match");
    }
  };

  const handleGenerate = async () => {
    setPosting(true);
    try {
      await generateFixtures(publicId!, genForm);
      setShowGenerate(false);
      await loadAll();
      showToast("✓ Fixtures generated");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to generate fixtures");
    } finally {
      setPosting(false);
    }
  };

  const handleManualFixture = async () => {
    if (
      !fixtureForm.stagePublicId ||
      !fixtureForm.homeTeamPublicId ||
      !fixtureForm.awayTeamPublicId
    ) {
      setError("Select stage, home team and away team");
      return;
    }
    setPosting(true);
    try {
      await addManualFixture(publicId!, fixtureForm);
      setShowManualFixture(false);
      await loadAll();
      showToast("✓ Fixture added");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to add fixture");
    } finally {
      setPosting(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await updateTournamentStatus(publicId!, status);
      await loadAll();
      showToast(`✓ Status updated to ${status}`);
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to update status");
    }
  };

  const handleDeclareWinner = async () => {
    if (!winnerTeam) return;
    setPosting(true);
    try {
      await declareWinner(publicId!, winnerTeam);
      setShowDeclareWinner(false);
      await loadAll();
      showToast("🏆 Winner declared!");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to declare winner");
    } finally {
      setPosting(false);
    }
  };

  const handleAdvanceKnockout = async () => {
    setPosting(true);
    try {
      await advanceToKnockout(publicId!, genForm.teamsAdvancingPerGroup);
      await loadAll();
      showToast("✓ Knockout fixtures generated");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to advance to knockout");
    } finally {
      setPosting(false);
    }
  };

  const openEditFixture = (f: any) => {
    setEditingFixture(f);
    setEditFixtureForm({
      roundNumber: f.roundNumber,
      homeTeamPublicId: f.homeTeam?.publicId ?? "",
      awayTeamPublicId: f.awayTeam?.publicId ?? "",
      venue: f.venue ?? "",
      status: f.status,
    });
    setShowEditFixture(true);
  };

  const handleEditFixture = async () => {
    if (!editingFixture) return;
    setPosting(true);
    try {
      await api.patch(
        `/admin/cricket/tournaments/${publicId}/fixtures/${editingFixture.publicId}`,
        editFixtureForm,
      );
      setShowEditFixture(false);
      setEditingFixture(null);
      await loadAll();
      showToast("✓ Fixture updated");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to update fixture");
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteFixture = async () => {
    if (!editingFixture) return;
    if (!confirm("Delete this fixture? This cannot be undone.")) return;
    setPosting(true);
    try {
      await api.delete(
        `/admin/cricket/tournaments/${publicId}/fixtures/${editingFixture.publicId}`,
      );
      setShowEditFixture(false);
      setEditingFixture(null);
      await loadAll();
      showToast("✓ Fixture deleted");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to delete fixture");
    } finally {
      setPosting(false);
    }
  };

  const alreadyInTournament = new Set(
    allTournamentPlayers.map((p: any) => p.playerPublicId),
  );
  const filteredPlayers = allPlayers
    .filter((p) => !alreadyInTournament.has(p.publicId))
    .filter((p) =>
      p.displayName.toLowerCase().includes(playerSearch.toLowerCase()),
    );

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!tournament)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Tournament not found</p>
      </div>
    );

  const groupedFixtures = fixtures.reduce((acc: any, f: any) => {
    const key = f.stage?.stageName ?? "Fixtures";
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  const playersByTeam = allTournamentPlayers.reduce((acc: any, p: any) => {
    const key = p.teamPublicId;
    if (!acc[key])
      acc[key] = {
        teamName: p.teamName,
        colorHex: p.teamColorHex,
        players: [],
      };
    acc[key].players.push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate("/admin/cricket/tournaments")}
            className="p-1 text-gray-500"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[tournament.status] ?? ""}`}
              >
                {tournament.status}
              </span>
              <span className="text-xs text-gray-400">
                {tournament.format?.replace(/_/g, " ")}
              </span>
            </div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white truncate">
              {tournament.name}
            </h1>
          </div>
        </div>

        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {tournament.status === "DRAFT" && (
            <button
              onClick={() => handleStatusChange("ACTIVE")}
              className="flex-shrink-0 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg active:scale-95"
            >
              ▶ Activate
            </button>
          )}
          {tournament.status === "ACTIVE" && (
            <>
              <button
                onClick={() => setShowDeclareWinner(true)}
                className="flex-shrink-0 px-3 py-1.5 bg-yellow-600 text-white text-xs font-semibold rounded-lg active:scale-95"
              >
                🏆 Declare Winner
              </button>
              <button
                onClick={() => handleStatusChange("COMPLETED")}
                className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg active:scale-95"
              >
                ✓ Complete
              </button>
            </>
          )}
        </div>

        <div className="flex gap-0 mt-3 border-b border-gray-100 dark:border-gray-800 -mx-4 px-4 overflow-x-auto">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex-shrink-0 ${tab === i ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
          {error}
          <button onClick={() => setError("")} className="ml-2 font-bold">
            ✕
          </button>
        </div>
      )}

      <div className="px-4 pt-4 max-w-2xl mx-auto">
        {/* ── OVERVIEW ── */}
        {tab === 0 && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
              {[
                {
                  label: "Format",
                  value: tournament.format?.replace(/_/g, " "),
                },
                {
                  label: "Dates",
                  value: `${tournament.startDate ?? "—"} ${tournament.endDate ? "→ " + tournament.endDate : ""}`,
                },
                { label: "Venue", value: tournament.venue ?? "—" },
                {
                  label: "Default Overs",
                  value: `${tournament.defaultOvers} overs`,
                },
                {
                  label: "Points (W/T/L)",
                  value: `${tournament.winPoints} / ${tournament.tiePoints} / ${tournament.lossPoints}`,
                },
                { label: "Teams", value: teams.length },
                { label: "Total Players", value: allTournamentPlayers.length },
                { label: "Fixtures", value: fixtures.length },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between px-4 py-3">
                  <span className="text-xs font-medium text-gray-400">
                    {label}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TEAMS ── */}
        {tab === 1 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {teams.length} teams
              </span>
              <button
                onClick={() => setShowAddTeam(true)}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl active:scale-95"
              >
                + Add Team
              </button>
            </div>
            {teams.map((team) => {
              const squad = squadMap[team.publicId] ?? [];
              const isExpanded = expandedTeam === team.publicId;
              return (
                <div
                  key={team.publicId}
                  className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden"
                >
                  <div className="p-3 flex items-center justify-between">
                    <button
                      onClick={() => handleExpandTeam(team.publicId)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: team.colorHex ?? "#3b82f6" }}
                      >
                        {(team.shortName ?? team.name).charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {team.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {team.shortName && (
                            <span className="mr-2">{team.shortName}</span>
                          )}
                          {team.groupName && (
                            <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 mr-2">
                              Group {team.groupName}
                            </span>
                          )}
                          <span>
                            {squadMap[team.publicId]?.length ?? 0} players
                          </span>
                        </div>
                      </div>
                      <svg
                        className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRemoveTeam(team.publicId)}
                      className="p-2 text-red-400 active:scale-90 ml-2"
                    >
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Squad ({squad.length}/20)
                        </span>
                        <button
                          onClick={() => openAddPlayer(team.publicId)}
                          className="px-2.5 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg active:scale-95"
                        >
                          + Add Player
                        </button>
                      </div>
                      {squad.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-xs text-gray-400">
                            No players yet. Add players to this squad.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                          {squad.map((entry: any) => (
                            <div
                              key={entry.id ?? entry.player?.publicId}
                              className="flex items-center justify-between px-3 py-2.5"
                            >
                              <div className="flex items-center gap-2.5">
                                {entry.squadNumber && (
                                  <span className="text-xs font-bold text-gray-400 w-5 text-right">
                                    {entry.squadNumber}
                                  </span>
                                )}
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {entry.player?.displayName ?? "Unknown"}
                                    </div>
                                    {entry.player?.external && (
                                      <span className="text-xs px-1 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded font-medium">
                                        Guest
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {entry.playerRole && (
                                      <span className="text-xs px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded font-medium">
                                        {ROLE_LABELS[entry.playerRole] ??
                                          entry.playerRole}
                                      </span>
                                    )}
                                    {entry.player?.battingStyle && (
                                      <span className="text-xs text-gray-400">
                                        {entry.player.battingStyle}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  handleRemoveFromSquad(
                                    team.publicId,
                                    entry.player?.publicId,
                                  )
                                }
                                className="p-1.5 text-red-400 active:scale-90"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── PLAYERS ── */}
        {tab === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {allTournamentPlayers.length} players across {teams.length}{" "}
                teams
              </span>
            </div>
            {Object.entries(playersByTeam).map(
              ([teamPublicId, teamData]: [string, any]) => (
                <div
                  key={teamPublicId}
                  className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: teamData.colorHex ?? "#3b82f6",
                      }}
                    />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {teamData.teamName}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {teamData.players.length} players
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                    {teamData.players.map((p: any, i: number) => (
                      <div
                        key={p.playerPublicId}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-4">
                            {i + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {p.playerName}
                              </div>
                              {p.isExternal && (
                                <span className="text-xs px-1 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded font-medium">
                                  Guest
                                </span>
                              )}
                            </div>
                            {p.playerRole && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded font-medium">
                                {ROLE_LABELS[p.playerRole] ?? p.playerRole}
                              </span>
                            )}
                          </div>
                        </div>
                        {p.squadNumber && (
                          <span className="text-xs font-bold text-gray-300 dark:text-gray-600">
                            #{p.squadNumber}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ),
            )}
            {allTournamentPlayers.length === 0 && (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">👤</div>
                <p className="text-sm text-gray-400">
                  No players registered yet. Go to Teams tab to add players.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── FIXTURES ── */}
        {tab === 3 && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowGenerate(true)}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl active:scale-95"
              >
                ⚡ Auto Generate
              </button>
              <button
                onClick={() => setShowManualFixture(true)}
                className="px-3 py-1.5 bg-gray-700 text-white text-xs font-semibold rounded-xl active:scale-95"
              >
                + Add Manually
              </button>
              {tournament.format === "GROUP_KNOCKOUT" && (
                <button
                  onClick={handleAdvanceKnockout}
                  disabled={posting}
                  className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-xl active:scale-95 disabled:opacity-40"
                >
                  🏆 Advance to Knockout
                </button>
              )}
            </div>
            {Object.entries(groupedFixtures).map(
              ([stageName, stageFixtures]: [string, any]) => (
                <div key={stageName}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {stageName}
                  </h3>
                  <div className="space-y-2">
                    {(stageFixtures as any[]).map((f: any) => (
                      <div
                        key={f.publicId}
                        className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-medium ${fixtureStatusColor[f.status] ?? "text-gray-400"}`}
                          >
                            {f.status}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              Round {f.roundNumber}
                            </span>
                            <button
                              onClick={() => openEditFixture(f)}
                              className="p-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-90 transition-all"
                              title="Edit fixture"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {f.homeTeam?.name ?? "TBD"}
                          </div>
                          <div className="text-xs text-gray-400 px-2">vs</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
                            {f.awayTeam?.name ?? "TBD"}
                          </div>
                        </div>
                        {f.venue && (
                          <div className="text-xs text-gray-400 mb-2">
                            📍 {f.venue}
                          </div>
                        )}
                        <div className="flex gap-2 mt-1">
                          {f.status === "SCHEDULED" &&
                            f.homeTeam &&
                            f.awayTeam && (
                              <button
                                onClick={() => handleStartMatch(f)}
                                className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg active:scale-95"
                              >
                                🏏 Start Match
                              </button>
                            )}
                          {f.status === "IN_PROGRESS" && f.match && (
                            <button
                              onClick={() =>
                                navigate(
                                  `/admin/cricket/matches/${f.match.publicId}/score`,
                                )
                              }
                              className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg active:scale-95"
                            >
                              🔴 Live Scorer
                            </button>
                          )}
                          {f.status === "COMPLETED" && f.match && (
                            <button
                              onClick={() =>
                                navigate(`/match/${f.match.publicId}/scorecard`)
                              }
                              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg active:scale-95"
                            >
                              📊 Scorecard
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            )}
            {fixtures.length === 0 && (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">📅</div>
                <p className="text-sm text-gray-400">No fixtures yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ── STANDINGS ── */}
        {tab === 4 && (
          <div>
            {standings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">📊</div>
                <p className="text-sm text-gray-400">No standings yet.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="py-2.5 px-3 text-xs font-medium text-gray-400 text-left">
                        #
                      </th>
                      <th className="py-2.5 px-3 text-xs font-medium text-gray-400 text-left">
                        Team
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        P
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        W
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        L
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                        T
                      </th>
                      <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center font-bold">
                        Pts
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s: any, i: number) => (
                      <tr
                        key={s.teamPublicId}
                        className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                      >
                        <td className="py-2.5 px-3 text-gray-400 text-xs">
                          {i + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: s.colorHex ?? "#3b82f6",
                              }}
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {s.teamName}
                              </div>
                              {s.groupName && (
                                <div className="text-xs text-gray-400">
                                  Group {s.groupName}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center text-gray-500">
                          {s.played}
                        </td>
                        <td className="py-2.5 px-2 text-center text-green-600">
                          {s.won}
                        </td>
                        <td className="py-2.5 px-2 text-center text-red-500">
                          {s.lost}
                        </td>
                        <td className="py-2.5 px-2 text-center text-gray-400">
                          {s.tied}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-gray-900 dark:text-white">
                          {s.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── STATS (NEW) ── */}
        {tab === 5 && (
          <div className="space-y-4">
            {/* Sub-tab selector */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
              {(["batting", "bowling", "mvp"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatsSubTab(s)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${statsSubTab === s ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"}`}
                >
                  {s === "batting"
                    ? "🏏 Batting"
                    : s === "bowling"
                      ? "⚾ Bowling"
                      : "⭐ MVP"}
                </button>
              ))}
            </div>

            {/* Refresh button */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setStatsLoaded(false);
                  loadStats();
                }}
                className="text-xs text-blue-600 dark:text-blue-400 font-medium px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg active:scale-95 transition-all"
              >
                ↻ Refresh
              </button>
            </div>

            {statsLoading && (
              <div className="flex justify-center py-12">
                <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Batting */}
            {!statsLoading &&
              statsSubTab === "batting" &&
              (battingStats.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-3xl mb-2">🏏</div>
                  <p className="text-sm text-gray-400">
                    No batting data yet. Complete some matches first.
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                          <th className="py-2.5 px-3 text-xs font-medium text-gray-400 text-left">
                            #
                          </th>
                          <th className="py-2.5 px-3 text-xs font-medium text-gray-400 text-left">
                            Player
                          </th>
                          <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                            Inn
                          </th>
                          <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                            Runs
                          </th>
                          <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                            HS
                          </th>
                          <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                            Avg
                          </th>
                          <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                            SR
                          </th>
                          <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                            50
                          </th>
                          <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                            100
                          </th>
                          <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                            6s
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {battingStats.map((p: any, i: number) => (
                          <tr
                            key={p.playerPublicId}
                            className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                          >
                            <td className="py-2.5 px-3 text-xs text-gray-400">
                              {i + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {p.playerName}
                              </div>
                              <div className="text-xs text-gray-400">
                                {p.teamName}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center text-xs text-gray-500">
                              {p.innings}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-gray-900 dark:text-white">
                              {p.runs}
                            </td>
                            <td className="py-2.5 px-2 text-center text-xs text-gray-600 dark:text-gray-300">
                              {p.highScore}
                            </td>
                            <td className="py-2.5 px-2 text-center text-xs text-gray-500">
                              {p.average}
                            </td>
                            <td className="py-2.5 px-2 text-center text-xs text-blue-600 dark:text-blue-400">
                              {p.strikeRate}
                            </td>
                            <td className="py-2.5 px-2 text-center text-xs text-gray-500">
                              {p.fifties}
                            </td>
                            <td className="py-2.5 px-2 text-center text-xs text-yellow-600">
                              {p.hundreds}
                            </td>
                            <td className="py-2.5 px-2 text-center text-xs text-purple-600 dark:text-purple-400">
                              {p.sixes}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

            {/* Bowling */}
            {!statsLoading &&
              statsSubTab === "bowling" &&
              (bowlingStats.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-3xl mb-2">⚾</div>
                  <p className="text-sm text-gray-400">
                    No bowling data yet. Complete some matches first.
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                          <th className="py-2.5 px-3 text-xs font-medium text-gray-400 text-left">
                            #
                          </th>
                          <th className="py-2.5 px-3 text-xs font-medium text-gray-400 text-left">
                            Player
                          </th>
                          <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                            Ov
                          </th>
                          <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                            Wkts
                          </th>
                          <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                            Runs
                          </th>
                          <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                            Econ
                          </th>
                          <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                            Best
                          </th>
                          <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                            3W
                          </th>
                          <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-center">
                            5W
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bowlingStats.map((p: any, i: number) => (
                          <tr
                            key={p.playerPublicId}
                            className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                          >
                            <td className="py-2.5 px-3 text-xs text-gray-400">
                              {i + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {p.playerName}
                              </div>
                              <div className="text-xs text-gray-400">
                                {p.teamName}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center text-xs text-gray-500">
                              {p.overs}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-gray-900 dark:text-white">
                              {p.wickets}
                            </td>
                            <td className="py-2.5 px-2 text-center text-xs text-gray-600 dark:text-gray-300">
                              {p.runsConceded}
                            </td>
                            <td className="py-2.5 px-2 text-center text-xs text-blue-600 dark:text-blue-400">
                              {p.economy}
                            </td>
                            <td className="py-2.5 px-2 text-center text-xs font-medium text-green-600 dark:text-green-400">
                              {p.bestFigures}
                            </td>
                            <td className="py-2.5 px-2 text-center text-xs text-gray-500">
                              {p.threeWickets}
                            </td>
                            <td className="py-2.5 px-2 text-center text-xs text-purple-600 dark:text-purple-400">
                              {p.fiveWickets}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

            {/* MVP */}
            {!statsLoading &&
              statsSubTab === "mvp" &&
              (mvpStats.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-3xl mb-2">⭐</div>
                  <p className="text-sm text-gray-400">
                    No MVP data yet. Complete some matches first.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mvpStats.slice(0, 10).map((p: any, i: number) => (
                    <div
                      key={p.playerPublicId}
                      className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          i === 0
                            ? "bg-yellow-100 text-yellow-700"
                            : i === 1
                              ? "bg-gray-100 text-gray-600"
                              : i === 2
                                ? "bg-orange-100 text-orange-600"
                                : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                        }`}
                      >
                        {i === 0
                          ? "🥇"
                          : i === 1
                            ? "🥈"
                            : i === 2
                              ? "🥉"
                              : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {p.playerName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {p.teamName}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                          {p.mvpPoints}
                        </div>
                        <div className="text-xs text-gray-400">pts</div>
                      </div>
                    </div>
                  ))}
                  <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-2xl">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                      MVP Points System
                    </p>
                    <p className="text-xs text-blue-500 dark:text-blue-400">
                      Run: {tournament.mvpWeights?.runPoint ?? 1}pt · Wicket:{" "}
                      {tournament.mvpWeights?.wicketPoint ?? 20}pts · Catch:{" "}
                      {tournament.mvpWeights?.catchPoint ?? 10}pts · 50: +
                      {tournament.mvpWeights?.milestone50 ?? 25}pts · 100: +
                      {tournament.mvpWeights?.milestone100 ?? 50}pts
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── ADD TEAM MODAL ── */}
      {showAddTeam && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Add Team
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Team Name *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  placeholder="e.g. Team Alpha"
                  value={teamForm.name}
                  onChange={(e) =>
                    setTeamForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Short Name
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                    placeholder="ALP"
                    value={teamForm.shortName}
                    onChange={(e) =>
                      setTeamForm((p) => ({ ...p, shortName: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Group (A/B/C)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                    placeholder="A"
                    value={teamForm.groupName}
                    onChange={(e) =>
                      setTeamForm((p) => ({
                        ...p,
                        groupName: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Team Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                    value={teamForm.colorHex}
                    onChange={(e) =>
                      setTeamForm((p) => ({ ...p, colorHex: e.target.value }))
                    }
                  />
                  <span className="text-sm text-gray-500">
                    {teamForm.colorHex}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddTeam(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTeam}
                  disabled={posting || !teamForm.name.trim()}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                >
                  Add Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD PLAYER MODAL ── */}
      {showAddPlayer && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white text-center">
                Add Player to Squad
              </h3>
              <div className="flex mt-3 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                <button
                  onClick={() => setPlayerModalTab("academy")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${playerModalTab === "academy" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"}`}
                >
                  🏫 Academy Players
                </button>
                <button
                  onClick={() => setPlayerModalTab("external")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${playerModalTab === "external" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"}`}
                >
                  👤 Guest / External
                </button>
              </div>
            </div>
            {playerModalTab === "academy" && (
              <>
                <div className="px-4 pt-3 pb-2">
                  <p className="text-xs text-gray-400 text-center mb-2">
                    {filteredPlayers.length} available · already in tournament
                    are excluded
                  </p>
                  <input
                    autoFocus
                    type="text"
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                    placeholder="Search players..."
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                  />
                </div>
                <div className="overflow-y-auto flex-1 px-3 pb-2 space-y-1.5">
                  {filteredPlayers.slice(0, 50).map((p) => {
                    const isSelected = selectedPlayers.some(
                      (s) => s.publicId === p.publicId,
                    );
                    return (
                      <button
                        key={p.publicId}
                        onClick={() =>
                          setSelectedPlayers((prev) =>
                            isSelected
                              ? prev.filter((s) => s.publicId !== p.publicId)
                              : [...prev, p],
                          )
                        }
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isSelected ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700" : "bg-gray-50 dark:bg-gray-800 border border-transparent"}`}
                      >
                        <div
                          className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {p.displayName}
                          </div>
                          {p.battingStyle && (
                            <div className="text-xs text-gray-400">
                              {p.battingStyle}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {filteredPlayers.length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-400">
                      No available academy players
                    </div>
                  )}
                </div>
                {selectedPlayers.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase">
                      Role for {selectedPlayers.length} selected player
                      {selectedPlayers.length > 1 ? "s" : ""}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {ROLES.map((role) => (
                        <button
                          key={role}
                          onClick={() => setSelectedRole(role)}
                          className={`py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${selectedRole === role ? "bg-blue-600 border-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"}`}
                        >
                          {ROLE_LABELS[role]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                  <button
                    onClick={closeAddPlayer}
                    className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddToSquad}
                    disabled={!selectedPlayers.length || posting}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                  >
                    {posting
                      ? "Adding..."
                      : `Add ${selectedPlayers.length || ""} to Squad`.trim()}
                  </button>
                </div>
              </>
            )}
            {playerModalTab === "external" && (
              <>
                <div className="flex-1 px-4 py-4 space-y-4">
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-orange-700 dark:text-orange-400">
                      Guest players will <b>not appear</b> in the academy
                      players list.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Player Name *
                    </label>
                    <input
                      type="text"
                      autoFocus
                      className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                      placeholder="e.g. Rahul Kumar"
                      value={externalName}
                      onChange={(e) => setExternalName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">
                      Gender
                    </label>
                    <div className="flex gap-2">
                      {["MALE", "FEMALE", "OTHER"].map((g) => (
                        <button
                          key={g}
                          onClick={() => setExternalGender(g)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${externalGender === g ? "bg-blue-600 border-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"}`}
                        >
                          {g === "MALE"
                            ? "Male"
                            : g === "FEMALE"
                              ? "Female"
                              : "Other"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">
                      Role
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {ROLES.map((role) => (
                        <button
                          key={role}
                          onClick={() => setExternalRole(role)}
                          className={`py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${externalRole === role ? "bg-blue-600 border-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"}`}
                        >
                          {ROLE_LABELS[role]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                  <button
                    onClick={closeAddPlayer}
                    className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddExternalPlayer}
                    disabled={!externalName.trim() || posting}
                    className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                  >
                    {posting ? "Adding..." : "Add Guest Player"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── GENERATE FIXTURES MODAL ── */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              ⚡ Auto Generate Fixtures
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Format: <b>{tournament.format?.replace(/_/g, " ")}</b> ·{" "}
              {teams.length} teams
            </p>
            {tournament.format === "GROUP_KNOCKOUT" && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Teams per Group
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={8}
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                    value={genForm.teamsPerGroup}
                    onChange={(e) =>
                      setGenForm((p) => ({
                        ...p,
                        teamsPerGroup: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Teams advancing per Group
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                    value={genForm.teamsAdvancingPerGroup}
                    onChange={(e) =>
                      setGenForm((p) => ({
                        ...p,
                        teamsAdvancingPerGroup: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-red-400 mb-4">
              ⚠ This will delete and regenerate all existing fixtures.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowGenerate(false)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={posting}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MANUAL FIXTURE MODAL ── */}
      {showManualFixture && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Add Fixture
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Stage
                </label>
                <select
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  value={fixtureForm.stagePublicId}
                  onChange={(e) =>
                    setFixtureForm((p) => ({
                      ...p,
                      stagePublicId: e.target.value,
                    }))
                  }
                >
                  <option value="">Select stage</option>
                  {stages.map((s: any) => (
                    <option key={s.publicId} value={s.publicId}>
                      {s.stageName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Home Team
                </label>
                <select
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  value={fixtureForm.homeTeamPublicId}
                  onChange={(e) =>
                    setFixtureForm((p) => ({
                      ...p,
                      homeTeamPublicId: e.target.value,
                    }))
                  }
                >
                  <option value="">Select team</option>
                  {teams.map((t: any) => (
                    <option key={t.publicId} value={t.publicId}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Away Team
                </label>
                <select
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  value={fixtureForm.awayTeamPublicId}
                  onChange={(e) =>
                    setFixtureForm((p) => ({
                      ...p,
                      awayTeamPublicId: e.target.value,
                    }))
                  }
                >
                  <option value="">Select team</option>
                  {teams
                    .filter(
                      (t: any) => t.publicId !== fixtureForm.homeTeamPublicId,
                    )
                    .map((t: any) => (
                      <option key={t.publicId} value={t.publicId}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Venue (optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  placeholder="e.g. NCA Ground B"
                  value={fixtureForm.venue}
                  onChange={(e) =>
                    setFixtureForm((p) => ({ ...p, venue: e.target.value }))
                  }
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowManualFixture(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualFixture}
                  disabled={posting}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                >
                  Add Fixture
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DECLARE WINNER MODAL ── */}
      {showDeclareWinner && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              🏆 Declare Winner
            </h3>
            <div className="space-y-2 mb-4">
              {teams.map((t: any) => (
                <button
                  key={t.publicId}
                  onClick={() => setWinnerTeam(t.publicId)}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${winnerTeam === t.publicId ? "bg-yellow-50 border-yellow-400 dark:bg-yellow-900/20" : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: t.colorHex ?? "#3b82f6" }}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t.name}
                    </span>
                    {winnerTeam === t.publicId && (
                      <span className="ml-auto text-yellow-500">🏆</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeclareWinner(false)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclareWinner}
                disabled={!winnerTeam || posting}
                className="flex-1 py-2.5 bg-yellow-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT FIXTURE MODAL ── */}
      {showEditFixture && editingFixture && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                ✏️ Edit Fixture
              </h3>
              <span className="text-xs text-gray-400">
                Round {editingFixture.roundNumber} · {editingFixture.status}
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Round Number
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  value={editFixtureForm.roundNumber}
                  onChange={(e) =>
                    setEditFixtureForm((p) => ({
                      ...p,
                      roundNumber: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Home Team
                </label>
                <select
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  value={editFixtureForm.homeTeamPublicId}
                  onChange={(e) =>
                    setEditFixtureForm((p) => ({
                      ...p,
                      homeTeamPublicId: e.target.value,
                    }))
                  }
                >
                  <option value="">Select team</option>
                  {teams.map((t: any) => (
                    <option key={t.publicId} value={t.publicId}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Away Team
                </label>
                <select
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  value={editFixtureForm.awayTeamPublicId}
                  onChange={(e) =>
                    setEditFixtureForm((p) => ({
                      ...p,
                      awayTeamPublicId: e.target.value,
                    }))
                  }
                >
                  <option value="">Select team</option>
                  {teams
                    .filter(
                      (t: any) =>
                        t.publicId !== editFixtureForm.homeTeamPublicId,
                    )
                    .map((t: any) => (
                      <option key={t.publicId} value={t.publicId}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Venue (optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  placeholder="e.g. NCA Ground A"
                  value={editFixtureForm.venue}
                  onChange={(e) =>
                    setEditFixtureForm((p) => ({ ...p, venue: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Status Override
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map(
                    (s) => (
                      <button
                        key={s}
                        onClick={() =>
                          setEditFixtureForm((p) => ({ ...p, status: s }))
                        }
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${editFixtureForm.status === s ? "bg-blue-600 border-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"}`}
                      >
                        {s}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowEditFixture(false);
                    setEditingFixture(null);
                  }}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditFixture}
                  disabled={posting}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                >
                  {posting ? "Saving..." : "Save Changes"}
                </button>
              </div>
              {editingFixture.status === "SCHEDULED" && (
                <button
                  onClick={handleDeleteFixture}
                  disabled={posting}
                  className="w-full py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
                >
                  🗑 Delete Fixture
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 border border-green-600 text-green-400 text-sm font-semibold px-6 py-2.5 rounded-full shadow-xl pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
