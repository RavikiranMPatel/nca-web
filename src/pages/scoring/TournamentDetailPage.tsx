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
  getFixtureConflicts,
  checkFixtureCandidate,
  addManualFixture,
  getStandings,
  updateTournamentStatus,
  getChampion,
  getOverview,
  getAwards,
  getAwardCandidates,
  giveAward,
  completeTournament,
  advanceToKnockout,
  advanceToPlayoffs,
  getSquad,
  addToSquad,
  removeFromSquad,
  getAllTournamentPlayers,
  prepareMatchFromFixture,
  postponeFixture,
  rescheduleFixture,
  abandonFixture,
} from "../../api/scoring/tournamentApi";
import { INTERRUPTION_REASONS, FIXTURE_STATUSES } from "../../types/match";
import { getBranchPlayers } from "../../api/scoring/matchApi";
import api from "../../api/axios";

const TABS = [
  "Overview",
  "Teams",
  "Players",
  "Venues",
  "Officials",
  "Fixtures",
  "Standings",
  "Stats",
  "Awards",
  "Settings",
];
const ROLES = ["BATSMAN", "BOWLER", "ALL_ROUNDER", "WK_BATSMAN"];
const ROLE_LABELS: Record<string, string> = {
  BATSMAN: "Bat",
  BOWLER: "Bowl",
  ALL_ROUNDER: "AR",
  WK_BATSMAN: "WK",
};

const OFFICIAL_ROLES = [
  "UMPIRE",
  "THIRD_UMPIRE",
  "SCORER",
  "REFEREE",
  "MATCH_REFEREE",
];
const OFFICIAL_ROLE_LABELS: Record<string, string> = {
  UMPIRE: "Umpire",
  THIRD_UMPIRE: "3rd Umpire",
  SCORER: "Scorer",
  REFEREE: "Referee",
  MATCH_REFEREE: "Match Referee",
};
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  // Venues
  const [venues, setVenues] = useState<any[]>([]);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [venueForm, setVenueForm] = useState({ name: "", maxMatchesPerDay: 2 });
  const [editingVenue, setEditingVenue] = useState<any>(null);

  // Officials pool
  const [officialsPool, setOfficialsPool] = useState<any[]>([]);
  const [showAddOfficial, setShowAddOfficial] = useState(false);
  const [officialForm, setOfficialForm] = useState({
    name: "",
    role: "UMPIRE",
  });

  const [settingsForm, setSettingsForm] = useState({
    oversPerInnings: 20,
    minsPerOver: 4.5,
    inningsBreakMins: 20,
    groundGapMins: 40,
    dayStartTime: "09:30",
    dayEndTime: "18:30",
    maxMatchesPerDay: 2,
  });
  const [, setSettingsSaved] = useState(false);

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

  /**
   * Team sheet: one team's fixtures and their standings row together.
   *
   * A team's fixtures ARE their results, and those lived in two places that never met —
   * the fixture list (upcoming) and the standings row (played). Opened from a tap on
   * Teams or Standings rather than a sixth view mode, and built entirely from state the
   * page has already loaded, so it costs no request.
   */
  const [teamSheet, setTeamSheet] = useState<{
    publicId: string;
    name: string;
  } | null>(null);

  // Had no setter, so the filter block below it could never be anything but "ALL" —
  // a control that looked live in the code and did nothing on screen.
  const [fixtureGroundFilter, setFixtureGroundFilter] =
    useState<string>("ALL");

  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm, setGenForm] = useState({
    teamsPerGroup: 4,
    teamsAdvancingPerGroup: 2,
    scheduleStartDate: "",
    scheduleStartTime: "09:00",
    autoAssignVenues: true,
    selectedVenueIds: [] as string[],
    playDays: [] as number[],
    maxMatchesPerDay: 2,
  });

  const [showManualFixture, setShowManualFixture] = useState(false);
  const [fixtureForm, setFixtureForm] = useState({
    stagePublicId: "",
    homeTeamPublicId: "",
    awayTeamPublicId: "",
    venue: "",
    venueId: "",
    scheduledDate: "",
    scheduledTime: "",
  });

  /**
   * Scheduling clashes the system noticed. Warning only — nothing here blocks a save,
   * gates on a role or asks for a reason. Scoped to this tournament: venue ids are
   * per-tournament, so a cross-tournament check would mean matching free-text ground
   * names and would quietly miss whatever somebody typed differently.
   */
  const [conflicts, setConflicts] = useState<{
    conflicts: any[];
    byFixture: Record<string, any[]>;
    durationBasis: string;
    scope: string;
  } | null>(null);
  /** Clashes the date currently typed into a sheet would create. */
  const [candidateConflicts, setCandidateConflicts] = useState<any[]>([]);

  const [overview, setOverview] = useState<any | null>(null);
  const [awards, setAwards] = useState<any[]>([]);
  const [awardCands, setAwardCands] = useState<any | null>(null);
  const [awardPick, setAwardPick] = useState<any | null>(null); // {type,label}
  const [awardPosting, setAwardPosting] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [champion, setChampion] = useState<{
    championName: string | null;
    runnerUpName: string | null;
    format: string;
  } | null>(null);
  const [showAdvancePlayoffs, setShowAdvancePlayoffs] = useState(false);
  const [playoffTopN, setPlayoffTopN] = useState(4);
  const [playoffBracketType, setPlayoffBracketType] = useState("IPL");

  const [showEditFixture, setShowEditFixture] = useState(false);

  // ── Postpone / reschedule / abandon ───────────────────────────────────────
  const [rainFixture, setRainFixture] = useState<any | null>(null);
  const [rainMode, setRainMode] = useState<
    "menu" | "postpone" | "reschedule" | "abandon"
  >("menu");
  const [rainReason, setRainReason] = useState("RAIN");
  const [rainNote, setRainNote] = useState("");
  const [rainDate, setRainDate] = useState("");
  const [rainTime, setRainTime] = useState("");
  const [rainVenueId, setRainVenueId] = useState("");
  const [rainPosting, setRainPosting] = useState(false);
  const [editingFixture, setEditingFixture] = useState<any>(null);
  const [editFixtureForm, setEditFixtureForm] = useState({
    roundNumber: 1,
    homeTeamPublicId: "",
    awayTeamPublicId: "",
    venue: "",
    venueId: "",
    status: "SCHEDULED",
    scheduledDate: "",
    scheduledTime: "",
  });

  /**
   * Re-checks as the admin types a date. Debounced because a date input fires on every
   * keystroke. Never blocks the confirm button and never throws into the UI — a failed
   * check shows nothing rather than an error over a half-filled form.
   */
  useEffect(() => {
    const onEdit = showEditFixture && editingFixture;
    const onRain = rainFixture && rainMode === "reschedule";
    if (!onEdit && !onRain) {
      setCandidateConflicts([]);
      return;
    }
    const iso = onEdit
      ? editFixtureForm.scheduledDate && editFixtureForm.scheduledTime
        ? new Date(
            `${editFixtureForm.scheduledDate}T${editFixtureForm.scheduledTime}:00`,
          ).toISOString()
        : ""
      : rainDate && rainTime
        ? new Date(`${rainDate}T${rainTime}:00`).toISOString()
        : "";
    if (!iso) {
      setCandidateConflicts([]);
      return;
    }
    const params = onEdit
      ? {
          scheduledAt: iso,
          venueId: editFixtureForm.venueId || undefined,
          excludeFixturePublicId: editingFixture.publicId,
          homeTeamPublicId: editFixtureForm.homeTeamPublicId || undefined,
          awayTeamPublicId: editFixtureForm.awayTeamPublicId || undefined,
        }
      : {
          scheduledAt: iso,
          venueId: rainVenueId || undefined,
          excludeFixturePublicId: rainFixture.publicId,
          homeTeamPublicId: rainFixture.homeTeam?.publicId,
          awayTeamPublicId: rainFixture.awayTeam?.publicId,
        };
    const id = setTimeout(() => {
      checkFixtureCandidate(publicId!, params)
        .then((r: any) => setCandidateConflicts(r.conflicts ?? []))
        .catch(() => setCandidateConflicts([]));
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showEditFixture,
    editingFixture,
    editFixtureForm.scheduledDate,
    editFixtureForm.scheduledTime,
    editFixtureForm.venueId,
    editFixtureForm.homeTeamPublicId,
    editFixtureForm.awayTeamPublicId,
    rainFixture,
    rainMode,
    rainDate,
    rainTime,
    rainVenueId,
  ]);

  /**
   * Two lines maximum, by construction: the first clash then a count of the rest.
   * The reschedule sheet had little headroom when it was measured at 380px in the
   * Phase A pass, and a list of clashing fixtures in there pushes confirm below the fold.
   */
  const ConflictNote = () =>
    candidateConflicts.length === 0 ? null : (
      <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2">
        <div className="text-xs text-amber-900 dark:text-amber-300 leading-snug">
          ⚠ {candidateConflicts[0].message}
          {candidateConflicts.length > 1
            ? ` +${candidateConflicts.length - 1} more`
            : ""}
        </div>
      </div>
    );


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

  const computeMatchDuration = () => {
    return (
      Math.round(settingsForm.oversPerInnings * settingsForm.minsPerOver * 2) +
      settingsForm.inningsBreakMins
    );
  };

  const computeMaxMatchesPerGround = () => {
    const duration = computeMatchDuration();
    const slotMins = duration + settingsForm.groundGapMins;
    const [sh, sm] = settingsForm.dayStartTime.split(":").map(Number);
    const [eh, em] = settingsForm.dayEndTime.split(":").map(Number);
    const dayMins = eh * 60 + em - (sh * 60 + sm);
    return slotMins > 0 ? Math.floor(dayMins / slotMins) : 1;
  };

  const computeSchedulePreview = () => {
    const duration = computeMatchDuration();
    const total = duration + settingsForm.groundGapMins;
    const [h, m] = settingsForm.dayStartTime.split(":").map(Number);
    const startMins = h * 60 + m;
    const maxMatches = computeMaxMatchesPerGround();

    const slots = [];
    for (let i = 0; i < maxMatches; i++) {
      const s = startMins + i * total;
      const e = s + duration;
      slots.push({
        start: `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`,
        end: `${String(Math.floor(e / 60)).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`,
      });
    }
    return { duration, slots };
  };

  const loadAll = async () => {
    if (!publicId) return;
    setLoading(true);
    try {
      const [t, tm, st, fx, sd, tp, ov] = await Promise.all([
        getTournament(publicId),
        listTeams(publicId),
        listStages(publicId),
        listFixtures(publicId),
        getStandings(publicId),
        getAllTournamentPlayers(publicId),
        // Only the six figures that need the server; the other six cards are
        // counted below from teams, fixtures and standings, already in hand.
        getOverview(publicId).catch(() => null),
      ]);
      setTournament(t);
      setTeams(tm);
      setStages(st);
      setFixtures(fx);
      // Warning data — a failure here must never stop the page loading.
      getFixtureConflicts(publicId!)
        .then(setConflicts)
        .catch(() => setConflicts(null));
      setStandings(sd);
      setAllTournamentPlayers(tp);
      setOverview(ov);
      setSettingsForm({
        oversPerInnings: t.oversPerInnings ?? 20,
        minsPerOver: t.minsPerOver ?? 4.5,
        inningsBreakMins: t.inningsBreakMins ?? 20,
        groundGapMins: t.groundGapMins ?? 40,
        dayStartTime: t.dayStartTime ?? "09:30",
        dayEndTime: t.dayEndTime ?? "18:30",
        maxMatchesPerDay: t.maxMatchesPerDay ?? 2,
      });
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

  const loadVenues = async () => {
    try {
      const res = await api.get(
        `/admin/cricket/tournaments/${publicId}/venues`,
      );
      setVenues(res.data ?? []);
    } catch {
      /* silent */
    }
  };

  const loadOfficialsPool = async () => {
    try {
      const res = await api.get(
        `/admin/cricket/tournaments/${publicId}/officials-pool`,
      );
      setOfficialsPool(res.data ?? []);
    } catch {
      /* silent */
    }
  };

  const handleAddVenue = async () => {
    if (!venueForm.name.trim()) return;
    setPosting(true);
    try {
      await api.post(
        `/admin/cricket/tournaments/${publicId}/venues`,
        venueForm,
      );
      setShowAddVenue(false);
      setVenueForm({ name: "", maxMatchesPerDay: 2 });
      await loadVenues();
      showToast("✓ Venue added");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to add venue");
    } finally {
      setPosting(false);
    }
  };

  const handleEditVenue = async () => {
    if (!editingVenue) return;
    setPosting(true);
    try {
      await api.patch(
        `/admin/cricket/tournaments/${publicId}/venues/${editingVenue.id}`,
        {
          name: editingVenue.name,
          maxMatchesPerDay: editingVenue.maxMatchesPerDay,
        },
      );
      setEditingVenue(null);
      await loadVenues();
      showToast("✓ Venue updated");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to update venue");
    } finally {
      setPosting(false);
    }
  };

  const handleSaveSettings = async () => {
    setPosting(true);
    try {
      await api.patch(
        `/admin/cricket/tournaments/${publicId}/settings`,
        settingsForm,
      );
      await loadAll();
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
      showToast("✓ Settings saved");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to save settings");
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteVenue = async (venueId: string) => {
    if (!confirm("Delete this venue?")) return;
    try {
      await api.delete(
        `/admin/cricket/tournaments/${publicId}/venues/${venueId}`,
      );
      await loadVenues();
      showToast("✓ Venue deleted");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to delete venue");
    }
  };

  const handleAddOfficial = async () => {
    if (!officialForm.name.trim()) return;
    setPosting(true);
    try {
      await api.post(
        `/admin/cricket/tournaments/${publicId}/officials-pool`,
        officialForm,
      );
      setShowAddOfficial(false);
      setOfficialForm({ name: "", role: "UMPIRE" });
      await loadOfficialsPool();
      showToast("✓ Official added");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to add official");
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteOfficial = async (entryId: string) => {
    try {
      await api.delete(
        `/admin/cricket/tournaments/${publicId}/officials-pool/${entryId}`,
      );
      await loadOfficialsPool();
      showToast("✓ Official removed");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to remove official");
    }
  };

  const togglePlayDay = (day: number) => {
    setGenForm((p) => ({
      ...p,
      playDays: p.playDays.includes(day)
        ? p.playDays.filter((d) => d !== day)
        : [...p.playDays, day].sort(),
    }));
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
    if (tab === 7) loadStats();
    if (tab === 8) loadAwards();
  }, [tab]);

  useEffect(() => {
    if (tab === 3) loadVenues();
  }, [tab]);
  useEffect(() => {
    if (tab === 4) loadOfficialsPool();
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
    loadVenues();
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

  const openRain = (f: any) => {
    setRainFixture(f);
    setRainMode("menu");
    setRainReason("RAIN");
    setRainNote("");
    setRainVenueId(f.tournamentVenue?.id ?? "");
    // Rule 6: seed the date picker from local parts, never toISOString().
    const d = f.scheduledAt ? new Date(f.scheduledAt) : new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setRainDate(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    );
    setRainTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  const closeRain = () => {
    setRainFixture(null);
    setRainMode("menu");
    setRainNote("");
  };

  const runRain = async (fn: () => Promise<unknown>, ok: string) => {
    if (rainReason === "OTHER" && !rainNote.trim()) {
      setError("A note is required when the reason is Other");
      return;
    }
    setRainPosting(true);
    try {
      await fn();
      closeRain();
      await loadAll();
      showToast(ok);
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Action failed");
    } finally {
      setRainPosting(false);
    }
  };

  const loadAwards = async () => {
    if (!publicId) return;
    try {
      const [a, c] = await Promise.all([
        getAwards(publicId),
        getAwardCandidates(publicId),
      ]);
      setAwards(a);
      setAwardCands(c);
    } catch {
      /* leave the tab empty rather than breaking the page */
    }
  };

  const confirmAward = async (
    type: string,
    playerPublicId: string,
    reason: string,
  ) => {
    setAwardPosting(true);
    try {
      await giveAward(publicId!, type, playerPublicId, reason);
      setAwardPick(null);
      await loadAwards();
      showToast("🏆 Award recorded");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to record award");
    } finally {
      setAwardPosting(false);
    }
  };

  const handleGenerate = async () => {
    if (fixtures.length > 0) {
      const confirmed = window.confirm(
        `⚠️ This will permanently delete all ${fixtures.length} existing fixture${fixtures.length !== 1 ? "s" : ""} and regenerate from scratch.\n\nAre you sure?`,
      );
      if (!confirmed) return;
    }
    setPosting(true);
    try {
      const payload: any = {
        teamsPerGroup: genForm.teamsPerGroup,
        teamsAdvancingPerGroup: genForm.teamsAdvancingPerGroup,
        autoAssignVenues: genForm.autoAssignVenues,
        venueIds: genForm.selectedVenueIds,
        playDays: genForm.playDays,
        maxMatchesPerDay: genForm.maxMatchesPerDay,
      };
      if (genForm.scheduleStartDate) {
        payload.scheduleStartDate = genForm.scheduleStartDate;
        payload.scheduleStartTime = genForm.scheduleStartTime;
      }
      await generateFixtures(publicId!, payload);
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
      const payload: any = { ...fixtureForm };
      if (fixtureForm.scheduledDate && fixtureForm.scheduledTime) {
        payload.scheduledAt = new Date(
          `${fixtureForm.scheduledDate}T${fixtureForm.scheduledTime}:00`,
        ).toISOString();
      }
      await addManualFixture(publicId!, payload);
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

  // The champion is derived from the fixtures, so this opens a confirmation of
  // what the results already decided rather than a picker. The old flow let an
  // admin choose any team, showed "Winner declared!", and stored nothing.
  const openComplete = async () => {
    setShowComplete(true);
    setChampion(null);
    try {
      setChampion(await getChampion(publicId!));
    } catch {
      setChampion({ championName: null, runnerUpName: null, format: "" });
    }
  };

  const handleComplete = async () => {
    setPosting(true);
    try {
      const r = await completeTournament(publicId!);
      setShowComplete(false);
      await loadAll();
      showToast(`🏆 ${r.championName} — champions`);
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to complete tournament");
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

  const handleAdvancePlayoffs = async () => {
    setPosting(true);
    try {
      await advanceToPlayoffs(publicId!, playoffTopN, playoffBracketType);
      setShowAdvancePlayoffs(false);
      await loadAll();
      showToast("✓ Playoff fixtures generated");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to advance to playoffs");
    } finally {
      setPosting(false);
    }
  };

  const openEditFixture = (f: any) => {
    setEditingFixture(f);
    let schedDate = "",
      schedTime = "";
    if (f.scheduledAt) {
      const d = new Date(f.scheduledAt);
      schedDate = d.toISOString().split("T")[0];
      schedTime = d.toTimeString().substring(0, 5);
    }
    setEditFixtureForm({
      roundNumber: f.roundNumber,
      homeTeamPublicId: f.homeTeam?.publicId ?? "",
      awayTeamPublicId: f.awayTeam?.publicId ?? "",
      venue: f.venue ?? "",
      venueId: f.tournamentVenue?.id ?? "",
      status: f.status,
      scheduledDate: schedDate,
      scheduledTime: schedTime,
    });
    setShowEditFixture(true);
  };

  const handleEditFixture = async () => {
    if (!editingFixture) return;
    setPosting(true);
    try {
      const payload: any = { ...editFixtureForm };
      if (editFixtureForm.scheduledDate && editFixtureForm.scheduledTime) {
        payload.scheduledAt = new Date(
          `${editFixtureForm.scheduledDate}T${editFixtureForm.scheduledTime}:00`,
        ).toISOString();
      }
      await api.patch(
        `/admin/cricket/tournaments/${publicId}/fixtures/${editingFixture.publicId}`,
        payload,
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
              {/* One action. "Complete" used to PATCH the status directly,
                  which skipped the champion entirely, while "Declare Winner"
                  stored nothing. Completing a tournament and crowning it are
                  the same event. */}
              <button
                onClick={openComplete}
                className="flex-shrink-0 px-3 py-1.5 bg-yellow-600 text-white text-xs font-semibold rounded-lg active:scale-95"
              >
                🏆 Complete Tournament
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
            {/* ── DASHBOARD CARDS ──
                Eight numeric tiles in a 2-col grid, then four full-width rows
                for the cards that carry a NAME. Names do not fit a half-width
                tile at 380px — the standings table already proved that
                "Jayalakshmipuram Jaguars" needs room to wrap. */}
            <div className="grid grid-cols-2 gap-2">
              {(() => {
                const byStatus = (...ss: string[]) =>
                  fixtures.filter((f: any) => ss.includes(f.status)).length;
                const hts = overview?.highestTeamScore;
                return [
                  { label: "Teams", value: teams.length },
                  { label: "Matches", value: fixtures.length },
                  { label: "Completed", value: byStatus("COMPLETED") },
                  {
                    label: "Upcoming",
                    value: byStatus("SCHEDULED", "POSTPONED"),
                  },
                  { label: "Live", value: byStatus("IN_PROGRESS"), live: true },
                  { label: "Total Runs", value: overview?.totalRuns ?? "—" },
                  {
                    label: "Total Wickets",
                    value: overview?.totalWickets ?? "—",
                  },
                  {
                    label: "Highest Team Score",
                    value: hts ? `${hts.runs}/${hts.wickets}` : "—",
                    sub: hts?.teamName,
                  },
                ].map((c: any) => (
                  <div
                    key={c.label}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-3 py-2.5"
                  >
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 leading-tight break-words">
                      {c.label}
                    </div>
                    <div
                      className={`text-xl font-bold tabular-nums mt-0.5 ${
                        c.live && c.value > 0
                          ? "text-red-500"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {c.value}
                    </div>
                    {c.sub && (
                      <div className="text-[11px] text-gray-400 leading-tight break-words">
                        {c.sub}
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>

            {/* Name-carrying cards: full width so a long player or team name
                wraps instead of being clipped. */}
            <div className="space-y-2">
              {[
                {
                  label: "Current Leader",
                  icon: "🥇",
                  name: standings[0]?.teamName,
                  sub: standings[0]
                    ? `${standings[0].points} pts · NRR ${Number(standings[0].nrr).toFixed(3)}`
                    : null,
                },
                {
                  label: "Top Run Scorer",
                  icon: "🏏",
                  name: overview?.topRunScorer?.playerName,
                  sub: overview?.topRunScorer
                    ? `${overview.topRunScorer.value} runs · ${overview.topRunScorer.teamName}`
                    : null,
                },
                {
                  label: "Top Wicket Taker",
                  icon: "🎯",
                  name: overview?.topWicketTaker?.playerName,
                  sub: overview?.topWicketTaker
                    ? `${overview.topWicketTaker.value} wickets · ${overview.topWicketTaker.teamName}`
                    : null,
                },
                {
                  label: "Highest Individual Score",
                  icon: "⭐",
                  name: overview?.highestIndividualScore?.playerName,
                  sub: overview?.highestIndividualScore
                    ? `${overview.highestIndividualScore.value} runs · ${overview.highestIndividualScore.teamName}`
                    : null,
                },
              ].map((c) => (
                <div
                  key={c.label}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-3 py-2.5 flex items-start gap-2.5"
                >
                  <span className="text-lg leading-none mt-0.5 flex-shrink-0">
                    {c.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400">
                      {c.label}
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight break-words">
                      {c.name ?? "—"}
                    </div>
                    {c.sub && (
                      <div className="text-[11px] text-gray-400 leading-tight break-words">
                        {c.sub}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

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
                      onClick={() =>
                        setTeamSheet({
                          publicId: team.publicId,
                          name: team.name,
                        })
                      }
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 active:scale-95 ml-2 flex-shrink-0"
                      title="Fixtures and record"
                    >
                      Record
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

        {/* ── VENUES ── */}
        {tab === 3 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {venues.length} venue{venues.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setShowAddVenue(true)}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl active:scale-95"
              >
                + Add Venue
              </button>
            </div>

            {venues.length === 0 && (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">🏟</div>
                <p className="text-sm text-gray-400 mb-1">
                  No venues added yet.
                </p>
                <p className="text-xs text-gray-400">
                  Add grounds before generating fixtures to enable
                  auto-scheduling.
                </p>
              </div>
            )}

            {venues.map((v: any) => (
              <div
                key={v.id}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4"
              >
                {editingVenue?.id === v.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                      value={editingVenue.name}
                      onChange={(e) =>
                        setEditingVenue((p: any) => ({
                          ...p,
                          name: e.target.value,
                        }))
                      }
                    />
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-gray-400 flex-shrink-0">
                        Max matches/day
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        className="w-20 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none text-center"
                        value={editingVenue.maxMatchesPerDay}
                        onChange={(e) =>
                          setEditingVenue((p: any) => ({
                            ...p,
                            maxMatchesPerDay: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingVenue(null)}
                        className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEditVenue}
                        disabled={posting}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold disabled:opacity-40"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {v.name}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Max {v.maxMatchesPerDay} match
                        {v.maxMatchesPerDay !== 1 ? "es" : ""}/day
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingVenue({ ...v })}
                        className="p-2 text-blue-500 active:scale-90"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteVenue(v.id)}
                        className="p-2 text-red-400 active:scale-90"
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
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── MATCH OFFICIALS ── */}
        {tab === 4 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {officialsPool.length} official
                {officialsPool.length !== 1 ? "s" : ""} in pool
              </span>
              <button
                onClick={() => setShowAddOfficial(true)}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl active:scale-95"
              >
                + Add Official
              </button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-xl px-3 py-2.5 text-xs text-blue-600 dark:text-blue-400">
              Officials added here are available when assigning umpires and
              scorers to each match.
            </div>

            {OFFICIAL_ROLES.map((role) => {
              const group = officialsPool.filter((o: any) => o.role === role);
              if (group.length === 0) return null;
              return (
                <div
                  key={role}
                  className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {OFFICIAL_ROLE_LABELS[role] ?? role}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                    {group.map((o: any) => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {o.name}
                        </span>
                        <button
                          onClick={() => handleDeleteOfficial(o.id)}
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
                </div>
              );
            })}

            {officialsPool.length === 0 && (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">🦺</div>
                <p className="text-sm text-gray-400">No officials added yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ── FIXTURES ── */}
        {tab === 5 && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setGenForm((p) => ({
                    ...p,
                    scheduleStartDate: tournament.startDate ?? "",
                    scheduleStartTime: tournament.dayStartTime ?? "09:30",
                    maxMatchesPerDay: tournament.maxMatchesPerDay ?? 2,
                  }));
                  setShowGenerate(true);
                }}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl active:scale-95"
              >
                ⚡ Auto Generate
              </button>
              {fixtures.length > 0 && (
                <button
                  onClick={async () => {
                    if (
                      !confirm(
                        `Delete all ${fixtures.length} fixtures? This cannot be undone.`,
                      )
                    )
                      return;
                    setPosting(true);
                    try {
                      await api.delete(
                        `/admin/cricket/tournaments/${publicId}/fixtures`,
                      );
                      await loadAll();
                      showToast("✓ All fixtures deleted");
                    } catch (e: any) {
                      setError(
                        e.response?.data?.message ??
                          "Failed to delete fixtures",
                      );
                    } finally {
                      setPosting(false);
                    }
                  }}
                  disabled={posting}
                  className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-semibold rounded-xl active:scale-95 disabled:opacity-40"
                >
                  🗑 Delete All
                </button>
              )}
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
              {tournament.format === "LEAGUE_PLAYOFFS" &&
                (() => {
                  const leagueFixtures = fixtures.filter(
                    (f: any) =>
                      f.stage?.stageType === "LEAGUE" ||
                      f.stage?.stageName === "League Stage",
                  );
                  const hasLeagueFixtures = leagueFixtures.length > 0;
                  const allLeagueCompleted =
                    hasLeagueFixtures &&
                    leagueFixtures.every((f: any) => f.status === "COMPLETED");

                  const btnLabel = !hasLeagueFixtures
                    ? "Generate league fixtures first"
                    : !allLeagueCompleted
                      ? `${leagueFixtures.filter((f: any) => f.status === "COMPLETED").length}/${leagueFixtures.length} matches done`
                      : null;

                  return (
                    <div className="flex flex-col items-start gap-1">
                      <button
                        onClick={() => {
                          if (!allLeagueCompleted) return;
                          setShowAdvancePlayoffs(true);
                        }}
                        disabled={posting || !allLeagueCompleted}
                        className={`px-3 py-1.5 text-white text-xs font-semibold rounded-xl transition-all ${
                          allLeagueCompleted
                            ? "bg-purple-600 active:scale-95"
                            : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                        }`}
                      >
                        🏆 Advance to Playoffs
                      </button>
                      {btnLabel && (
                        <span className="text-xs text-gray-400 px-1">
                          {btnLabel}
                        </span>
                      )}
                    </div>
                  );
                })()}
            </div>

            {/* ── CONFLICT SUMMARY ──
                One panel, not a toast per fixture: generation makes 28 at once. Each row
                taps through to the edit sheet. States its own scope and where the duration
                came from, because both are easy to assume wrongly. */}
            {conflicts && conflicts.conflicts.length > 0 && (
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 space-y-2">
                <div className="text-sm font-bold text-amber-900 dark:text-amber-300">
                  ⚠ {Object.keys(conflicts.byFixture).length} fixture
                  {Object.keys(conflicts.byFixture).length !== 1 ? "s" : ""} to
                  look at
                </div>
                <div className="space-y-1.5">
                  {Object.entries(conflicts.byFixture).map(([fxId, list]) => {
                    const fx = fixtures.find((f: any) => f.publicId === fxId);
                    if (!fx) return null;
                    const items = list as any[];
                    return (
                      <button
                        key={fxId}
                        onClick={() => openEditFixture(fx)}
                        className="w-full text-left bg-white dark:bg-gray-900 rounded-xl px-3 py-2 active:scale-[0.99] transition-transform"
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                          {fx.homeTeam?.name} v {fx.awayTeam?.name}
                        </div>
                        <div className="text-xs text-amber-800 dark:text-amber-400 break-words">
                          {items[0].message}
                          {items.length > 1 ? ` +${items.length - 1} more` : ""}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-500/80 leading-snug">
                  {conflicts.scope} {conflicts.durationBasis}
                </p>
              </div>
            )}

            {/* ── GROUND FILTER ──
                Horizontal scroll strip, not a <select>: one thumb, no dropdown to aim at,
                and the same -mx-4 px-4 overflow-x-auto pattern the tab strip already uses
                so wide content scrolls inside its own container rather than the page. */}
            {venues.length > 1 && (
              <div className="flex gap-2 -mx-4 px-4 overflow-x-auto pb-1">
                {[
                  { id: "ALL", name: "All grounds" },
                  ...venues.map((v: any) => ({ id: v.id, name: v.name })),
                ].map((g: any) => {
                  const count =
                    g.id === "ALL"
                      ? fixtures.length
                      : fixtures.filter(
                          (f: any) =>
                            f.venueId === g.id || f.tournamentVenue?.id === g.id,
                        ).length;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setFixtureGroundFilter(g.id)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        fixtureGroundFilter === g.id
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {g.name}
                      <span className="ml-1.5 opacity-60">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── DATE+GROUND VIEW ── */}
            {(() => {
              // Ground filter first — it applies to every section below.
              const visible = fixtures.filter(
                (f: any) =>
                  fixtureGroundFilter === "ALL" ||
                  f.venueId === fixtureGroundFilter ||
                  f.tournamentVenue?.id === fixtureGroundFilter,
              );

              // POSTPONED fixtures get their own bucket at the top. postponeFixture does
              // NOT clear scheduled_at, so before this they sat under the day they were
              // originally meant to be played — a fixture postponed three weeks ago read
              // as part of that day's programme forever. original_scheduled_at (V66) lets
              // the card still say what the date was.
              const postponed = visible.filter(
                (f: any) => f.status === "POSTPONED",
              );
              const rest = visible.filter((f: any) => f.status !== "POSTPONED");

              // Bucket by date. The key is a sortable yyyy-mm-dd built from the parts of
              // the local date — never toISOString(), which would convert to UTC and put
              // anything before 05:30 IST on the previous day (Rule 6).
              const dayKeyOf = (iso: string) => {
                const d = new Date(iso);
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                return `${d.getFullYear()}-${mm}-${dd}`;
              };

              const byDate: Record<string, any[]> = {};
              rest.forEach((f: any) => {
                const key = f.scheduledAt ? dayKeyOf(f.scheduledAt) : "9999-99-99";
                if (!byDate[key]) byDate[key] = [];
                byDate[key].push(f);
              });

              // Sorted explicitly. The list used to rely on object insertion order, which
              // followed the server's ORDER BY roundNumber — chronological only while
              // nothing had moved, and Phase A made fixtures reschedulable.
              const dateSections = Object.keys(byDate)
                .sort()
                .map((key) => ({
                  key,
                  title:
                    key === "9999-99-99"
                      ? "📅 No date set"
                      : "📅 " +
                        new Date(byDate[key][0].scheduledAt).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            weekday: "short",
                          },
                        ),
                  fixtures: byDate[key],
                }));

              const sections = [
                ...(postponed.length
                  ? [
                      {
                        key: "POSTPONED",
                        title: "⏸ Awaiting a new date",
                        fixtures: postponed,
                      },
                    ]
                  : []),
                ...dateSections,
              ];

              if (sections.length === 0)
                return (
                  <div className="text-center py-12">
                    <div className="text-3xl mb-2">📅</div>
                    <p className="text-sm text-gray-400">
                      {fixtures.length === 0
                        ? "No fixtures yet."
                        : "No fixtures at this ground."}
                    </p>
                  </div>
                );

              return sections.map(
                ({ key: dateStr, title, fixtures: dayFixtures }) => {
                  // Group by ground within the day
                  const byGround: Record<string, any[]> = {};
                  dayFixtures.forEach((f: any) => {
                    const groundKey = f.venue ?? "No Venue";
                    if (!byGround[groundKey]) byGround[groundKey] = [];
                    byGround[groundKey].push(f);
                  });

                  return (
                    <div key={dateStr} className="space-y-2">
                      {/* Section header — a date, or the postponed bucket */}
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className={`h-px flex-1 ${dateStr === "POSTPONED" ? "bg-amber-200 dark:bg-amber-800" : "bg-gray-100 dark:bg-gray-800"}`}
                        />
                        <span
                          className={`text-xs font-semibold px-2 ${dateStr === "POSTPONED" ? "text-amber-700 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`}
                        >
                          {title} · {dayFixtures.length} match
                          {dayFixtures.length !== 1 ? "es" : ""}
                        </span>
                        <div
                          className={`h-px flex-1 ${dateStr === "POSTPONED" ? "bg-amber-200 dark:bg-amber-800" : "bg-gray-100 dark:bg-gray-800"}`}
                        />
                      </div>

                      {/* Per-ground columns */}
                      {Object.entries(byGround).map(
                        ([groundName, groundFixtures]) => (
                          <div
                            key={groundName}
                            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden"
                          >
                            {/* Ground header */}
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                              <span className="text-xs">📍</span>
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                {groundName}
                              </span>
                              <span className="ml-auto text-xs text-gray-400">
                                {groundFixtures.length} match
                                {groundFixtures.length !== 1 ? "es" : ""}
                              </span>
                            </div>

                            {/* Fixtures on this ground */}
                            <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                              {groundFixtures
                                .sort(
                                  (a: any, b: any) =>
                                    new Date(a.scheduledAt).getTime() -
                                    new Date(b.scheduledAt).getTime(),
                                )
                                .map((f: any) => (
                                  <div key={f.publicId} className="p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span
                                        className={`text-xs font-medium ${fixtureStatusColor[f.status] ?? "text-gray-400"}`}
                                      >
                                        {f.status}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">
                                          {f.label
                                            ? f.label
                                            : `Round ${f.roundNumber}`}
                                        </span>
                                        <button
                                          onClick={() => openEditFixture(f)}
                                          className="p-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 active:scale-90"
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

                                    <div className="flex items-center justify-between mb-1.5">
                                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {f.homeTeam?.name ?? "TBD"}
                                      </div>
                                      <div className="text-xs text-gray-400 px-2">
                                        vs
                                      </div>
                                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
                                        {f.awayTeam?.name ?? "TBD"}
                                      </div>
                                    </div>

                                    {f.status === "POSTPONED" ? (
                                      /* In the postponed bucket there is no date to show,
                                         so say what it WAS — V66 keeps original_scheduled_at
                                         on the first move, and scheduledAt still holds the
                                         old value because postponeFixture leaves it alone. */
                                      <div className="text-xs text-amber-700 dark:text-amber-400 mb-1">
                                        ⏸ Was{" "}
                                        {new Date(
                                          f.originalScheduledAt ?? f.scheduledAt,
                                        ).toLocaleDateString("en-IN", {
                                          day: "2-digit",
                                          month: "short",
                                        })}
                                        {f.postponementReason
                                          ? ` · ${f.postponementReason.replace(/_/g, " ").toLowerCase()}`
                                          : ""}
                                      </div>
                                    ) : (
                                      f.scheduledAt && (
                                        <div className="text-xs text-gray-400 mb-1">
                                          🕐{" "}
                                          {new Date(
                                            f.scheduledAt,
                                          ).toLocaleTimeString("en-IN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: true,
                                          })}
                                        </div>
                                      )
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
                                      {f.status === "IN_PROGRESS" &&
                                        f.match && (
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
                                      {["SCHEDULED", "POSTPONED"].includes(
                                        f.status,
                                      ) && (
                                        <button
                                          onClick={() => openRain(f)}
                                          className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-lg active:scale-95"
                                        >
                                          🌧 Rain
                                        </button>
                                      )}
                                      {f.status === "COMPLETED" && f.match && (
                                        <button
                                          onClick={() =>
                                            navigate(
                                              `/match/${f.match.publicId}/scorecard`,
                                            )
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
                    </div>
                  );
                },
              );
            })()}
            {fixtures.length === 0 && (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">📅</div>
                <p className="text-sm text-gray-400">No fixtures yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ── STANDINGS ── */}
        {tab === 6 && (
          <div>
            {standings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">📊</div>
                <p className="text-sm text-gray-400">No standings yet.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  {/* No min-w: at 380px the table compresses to fit and long
                      team names wrap onto a second line, which keeps Pts and
                      NRR — the two columns that decide the order — on screen
                      without scrolling. A min-width pushed exactly those two
                      off the right edge. The overflow-x-auto wrapper stays so
                      the table scrolls rather than clips if a future column
                      makes it genuinely too wide. */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="py-2.5 px-3 text-xs font-medium text-gray-400 text-left">
                          #
                        </th>
                        <th className="py-2.5 px-3 text-xs font-medium text-gray-400 text-left">
                          Team
                        </th>
                        <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                          P
                        </th>
                        <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                          W
                        </th>
                        <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                          L
                        </th>
                        <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                          T
                        </th>
                        <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                          NR
                        </th>
                        <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center font-bold">
                          Pts
                        </th>
                        <th className="py-2.5 px-2 text-xs font-medium text-gray-400 text-right whitespace-nowrap">
                          NRR
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s: any, i: number) => (
                        <tr
                          key={s.teamPublicId}
                          onClick={() =>
                            setTeamSheet({
                              publicId: s.teamPublicId,
                              name: s.teamName,
                            })
                          }
                          className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer active:bg-gray-100 dark:active:bg-gray-800/60"
                        >
                          <td className="py-2.5 px-2 text-gray-400 text-xs">
                            {i + 1}
                          </td>
                          {/* Capped so a long name wraps instead of pushing Pts
                              and NRR off a 380px screen. Nothing is hidden or
                              truncated — "Jayalakshmipuram Jaguars" simply takes
                              two lines. */}
                          <td className="py-2.5 px-2 max-w-[104px]">
                            <div className="flex items-start gap-1.5">
                              <div
                                className="w-3 h-3 mt-1 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: s.colorHex ?? "#3b82f6",
                                }}
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-medium leading-tight break-words text-gray-900 dark:text-gray-100">
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
                          <td className="py-2.5 px-1 text-center text-gray-500">
                            {s.played}
                          </td>
                          <td className="py-2.5 px-1 text-center text-green-600">
                            {s.won}
                          </td>
                          <td className="py-2.5 px-1 text-center text-red-500">
                            {s.lost}
                          </td>
                          <td className="py-2.5 px-1 text-center text-gray-400">
                            {s.tied}
                          </td>
                          <td className="py-2.5 px-1 text-center text-gray-400">
                            {s.noResult}
                          </td>
                          <td className="py-2.5 px-1 text-center font-bold text-gray-900 dark:text-white">
                            {s.points}
                          </td>
                          {/* The backend has always computed NRR and sorted the
                              table by it; it was never displayed, so the order of
                              two teams on equal points looked arbitrary. */}
                          <td
                            className={`py-2.5 px-1 text-right tabular-nums whitespace-nowrap ${
                              s.nrr > 0
                                ? "text-green-600 dark:text-green-400"
                                : s.nrr < 0
                                  ? "text-red-500 dark:text-red-400"
                                  : "text-gray-400"
                            }`}
                          >
                            {s.nrr > 0 ? "+" : ""}
                            {Number(s.nrr).toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STATS (NEW) ── */}
        {tab === 7 && (
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
                          <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                            Inn
                          </th>
                          <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                            Runs
                          </th>
                          <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                            HS
                          </th>
                          <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                            Avg
                          </th>
                          <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                            SR
                          </th>
                          <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                            50
                          </th>
                          <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                            100
                          </th>
                          <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
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
                            <td className="py-2.5 px-1 text-center font-bold text-gray-900 dark:text-white">
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
                          <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                            Ov
                          </th>
                          <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                            Wkts
                          </th>
                          <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                            Runs
                          </th>
                          <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                            Econ
                          </th>
                          <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                            Best
                          </th>
                          <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
                            3W
                          </th>
                          <th className="py-2.5 px-1 text-xs font-medium text-gray-400 text-center">
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
                            <td className="py-2.5 px-1 text-center font-bold text-gray-900 dark:text-white">
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

        {/* ── SETTINGS ── */}
        {/* ── AWARDS ── */}
        {tab === 8 && (
          <div className="space-y-3">
            {(() => {
              const AW = [
                {
                  type: "PLAYER_OF_SERIES",
                  label: "Player of the Series",
                  icon: "🏆",
                  derived: false,
                },
                {
                  type: "BEST_BATTER",
                  label: "Best Batter",
                  icon: "🏏",
                  derived: true,
                  key: "bestBatter",
                },
                {
                  type: "BEST_BOWLER",
                  label: "Best Bowler",
                  icon: "🎯",
                  derived: true,
                  key: "bestBowler",
                },
                {
                  type: "BEST_FIELDER",
                  label: "Best Fielder",
                  icon: "🧤",
                  derived: true,
                  key: "bestFielder",
                },
              ];
              const held = (t: string) => awards.find((a) => a.awardType === t);
              return AW.map((aw) => {
                const a = held(aw.type);
                const proposal = aw.derived ? awardCands?.[aw.key!] : null;
                return (
                  <div
                    key={aw.type}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg leading-none mt-0.5 flex-shrink-0">
                        {aw.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase tracking-wide text-gray-400">
                          {aw.label}
                        </div>
                        {a ? (
                          <>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight break-words">
                              {a.playerName}
                              {a.playerDeleted && (
                                <span className="ml-1 text-[10px] text-gray-400">
                                  (player removed)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 leading-tight break-words">
                              {a.figures}
                              {a.teamName ? ` · ${a.teamName}` : ""}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5 break-words">
                              by {a.awardedBy}
                            </div>
                          </>
                        ) : proposal ? (
                          <>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight break-words">
                              {proposal.playerName}
                            </div>
                            <div className="text-[11px] text-gray-400 leading-tight break-words">
                              {proposal.figures} · {proposal.teamName}
                            </div>
                            <div className="text-[10px] text-blue-500 mt-0.5">
                              Proposed from the data — not yet confirmed
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-400">
                            Not awarded
                          </div>
                        )}
                      </div>
                    </div>

                    {/* The caveat travels with the award, not a code comment:
                        a quarter of run outs across this database credit
                        nobody, so a derived fielding count can be short. */}
                    {aw.type === "BEST_FIELDER" && awardCands && (
                      <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <div className="text-[11px] text-amber-700 dark:text-amber-500 leading-tight break-words">
                          {awardCands.fieldingUnattributedRunOuts > 0
                            ? `${awardCands.fieldingUnattributedRunOuts} of ${awardCands.fieldingTotalRunOuts} run outs credit no fielder — this count is incomplete.`
                            : `All ${awardCands.fieldingTotalRunOuts} run outs credit a fielder. Catches and stumpings always do.`}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setAwardPick(aw)}
                      className={`mt-2 w-full h-11 rounded-xl text-xs font-semibold active:scale-95 ${
                        a
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {a ? "Change" : aw.derived ? "Confirm" : "Choose"}
                    </button>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {tab === 9 && (
          <div className="space-y-5">
            {/* Match Format */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                🏏 Match Format
              </h3>

              {/* Overs preset buttons */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">
                  Overs per Innings
                </label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {[6, 8, 10, 20, 50].map((o) => (
                    <button
                      key={o}
                      onClick={() =>
                        setSettingsForm((p) => ({
                          ...p,
                          oversPerInnings: o,
                          minsPerOver: o === 50 ? 4.0 : o <= 10 ? 4.0 : 4.5,
                          maxMatchesPerDay: o === 50 ? 1 : o <= 10 ? 4 : 2,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                        settingsForm.oversPerInnings === o
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {o === 50 ? "50-over" : o === 20 ? "T20" : `${o}-over`}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  value={settingsForm.oversPerInnings}
                  onChange={(e) =>
                    setSettingsForm((p) => ({
                      ...p,
                      oversPerInnings: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Mins per Over
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                    value={settingsForm.minsPerOver}
                    onChange={(e) =>
                      setSettingsForm((p) => ({
                        ...p,
                        minsPerOver: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Innings Break (mins)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                    value={settingsForm.inningsBreakMins}
                    onChange={(e) =>
                      setSettingsForm((p) => ({
                        ...p,
                        inningsBreakMins: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              {/* Computed duration */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    Full match duration
                  </span>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {computeMatchDuration()} mins
                  </span>
                </div>
                <p className="text-xs text-blue-400 mt-0.5">
                  ({settingsForm.oversPerInnings} ov ×{" "}
                  {settingsForm.minsPerOver} min × 2 innings) +{" "}
                  {settingsForm.inningsBreakMins} min break
                </p>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600 dark:text-green-400">
                  Max matches per ground per day
                </span>
                <span className="text-sm font-bold text-green-700 dark:text-green-300">
                  {computeMaxMatchesPerGround()} matches
                </span>
              </div>
              <p className="text-xs text-green-500 mt-0.5">
                Auto-calculated · all venues updated on Save
              </p>
            </div>

            {/* Daily Schedule */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                📅 Daily Schedule
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      First Match Time
                    </label>
                    <input
                      type="time"
                      className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                      value={settingsForm.dayStartTime}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          dayStartTime: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Last Match Ends By
                    </label>
                    <input
                      type="time"
                      className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                      value={settingsForm.dayEndTime}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          dayEndTime: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Gap Between Matches (mins)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                    value={settingsForm.groundGapMins}
                    onChange={(e) =>
                      setSettingsForm((p) => ({
                        ...p,
                        groundGapMins: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Max Matches per Ground per Day
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() =>
                        setSettingsForm((p) => ({ ...p, maxMatchesPerDay: n }))
                      }
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                        settingsForm.maxMatchesPerDay === n
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule Preview */}
              {(() => {
                const { duration, slots } = computeSchedulePreview();
                return (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Preview — per ground
                    </p>
                    {slots.map((slot, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-green-700 dark:text-green-400">
                            {i + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Match {i + 1}
                          </div>
                          <div className="text-xs text-gray-400">
                            {slot.start} → {slot.end}
                            <span className="ml-2 text-gray-300">
                              ({duration} mins)
                            </span>
                          </div>
                        </div>
                        {i < slots.length - 1 && (
                          <span className="text-xs text-orange-400 font-medium">
                            +{settingsForm.groundGapMins}m gap
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Save */}
            <button
              onClick={handleSaveSettings}
              disabled={posting}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
            >
              {posting ? "Saving..." : "💾 Save Settings"}
            </button>

            <p className="text-xs text-gray-400 text-center">
              These settings are used when auto-generating fixtures. Re-generate
              fixtures after changing.
            </p>
          </div>
        )}
      </div>

      {/* ── ADD TEAM MODAL ── */}
      {showAddTeam && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5 max-h-[85dvh] overflow-y-auto">
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
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl max-h-[85dvh] overflow-hidden flex flex-col">
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl max-h-[85dvh] overflow-y-auto">
            <div className="p-5">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
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
              {/* Scheduling */}
              <div className="space-y-4 mb-4">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  📅 Schedule
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-xl px-3 py-2 text-xs text-blue-600 dark:text-blue-400">
                  Leave dates blank to assign manually later.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Start Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                      value={genForm.scheduleStartDate}
                      onChange={(e) =>
                        setGenForm((p) => ({
                          ...p,
                          scheduleStartDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      First Match Time
                    </label>
                    <input
                      type="time"
                      className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                      value={genForm.scheduleStartTime}
                      onChange={(e) =>
                        setGenForm((p) => ({
                          ...p,
                          scheduleStartTime: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">
                    Play Days
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAY_LABELS.map((label, idx) => {
                      const day = idx + 1;
                      const active = genForm.playDays.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => togglePlayDay(day)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                            active
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-500"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {genForm.playDays.length === 0 && (
                    <p className="text-xs text-red-400 mt-1">
                      Select at least one play day.
                    </p>
                  )}
                </div>

                {venues.length > 0 && (
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">
                      Ground Assignment
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        onClick={() =>
                          setGenForm((p) => ({ ...p, autoAssignVenues: true }))
                        }
                        className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                          genForm.autoAssignVenues
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          🔄 Auto
                        </div>
                        <div className="text-xs text-gray-400">
                          Round-robin across grounds
                        </div>
                      </button>
                      <button
                        onClick={() =>
                          setGenForm((p) => ({ ...p, autoAssignVenues: false }))
                        }
                        className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                          !genForm.autoAssignVenues
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          ✋ Manual
                        </div>
                        <div className="text-xs text-gray-400">
                          Assign venues later
                        </div>
                      </button>
                    </div>
                    {genForm.autoAssignVenues && (
                      <div className="space-y-1.5">
                        {venues.map((v: any) => {
                          const selected =
                            genForm.selectedVenueIds.length === 0 ||
                            genForm.selectedVenueIds.includes(v.id);
                          return (
                            <button
                              key={v.id}
                              onClick={() =>
                                setGenForm((p) => ({
                                  ...p,
                                  selectedVenueIds: p.selectedVenueIds.includes(
                                    v.id,
                                  )
                                    ? p.selectedVenueIds.filter(
                                        (id) => id !== v.id,
                                      )
                                    : [...p.selectedVenueIds, v.id],
                                }))
                              }
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                                selected
                                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${selected ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}
                              >
                                {selected && (
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
                                  {v.name}
                                </div>
                                <div className="text-xs text-gray-400">
                                  Max {v.maxMatchesPerDay}/day
                                </div>
                              </div>
                            </button>
                          );
                        })}
                        {genForm.selectedVenueIds.length === 0 && (
                          <p className="text-xs text-blue-500 px-1">
                            All venues selected by default.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowGenerate(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={posting || genForm.playDays.length === 0}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                >
                  Generate
                </button>
              </div>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Date (optional)
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                    value={fixtureForm.scheduledDate}
                    onChange={(e) =>
                      setFixtureForm((p) => ({
                        ...p,
                        scheduledDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Time (optional)
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                    value={fixtureForm.scheduledTime}
                    onChange={(e) =>
                      setFixtureForm((p) => ({
                        ...p,
                        scheduledTime: e.target.value,
                      }))
                    }
                  />
                </div>
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
      {/* ── COMPLETE TOURNAMENT ── */}
      {/* ── AWARD PICKER ── */}
      {awardPick && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl max-h-[85dvh] overflow-y-auto p-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white text-center">
              {awardPick.label}
            </h3>
            <p className="text-xs text-gray-500 text-center mt-1 mb-4">
              {awardPick.derived
                ? "Derived from the tournament data. Confirm, or pick someone else."
                : "Ranked by MVP points. The choice is yours."}
            </p>

            {/* Full-width rows: three stat groups do not fit a half-width tile
                at 380px, and only the groups that apply are shown. */}
            <div className="space-y-2">
              {(awardPick.derived
                ? [awardCands?.[awardPick.key]]
                    .filter(Boolean)
                    .map((p: any) => ({
                      playerPublicId: p.playerPublicId,
                      playerName: p.playerName,
                      teamName: p.teamName,
                      summary: p.figures,
                      badge: "Proposed",
                    }))
                : (awardCands?.playerOfSeriesCandidates ?? []).map(
                    (c: any) => ({
                      playerPublicId: c.playerPublicId,
                      playerName: c.playerName,
                      teamName: c.teamName,
                      summary: c.summary,
                      badge: `${c.mvpPoints} pts`,
                    }),
                  )
              ).map((c: any) => (
                <button
                  key={c.playerPublicId}
                  disabled={awardPosting}
                  onClick={() =>
                    confirmAward(
                      awardPick.type,
                      c.playerPublicId,
                      awardPick.derived
                        ? "Confirmed from tournament data"
                        : "Selected",
                    )
                  }
                  className="w-full text-left px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl active:scale-95 disabled:opacity-40"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight break-words">
                        {c.playerName}
                      </div>
                      <div className="text-[11px] text-gray-400 leading-tight break-words">
                        {c.summary}
                        {c.teamName ? ` · ${c.teamName}` : ""}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-[10px] text-gray-400 mt-0.5">
                      {c.badge}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setAwardPick(null)}
              className="w-full py-3 mt-3 text-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showComplete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl max-h-[85dvh] overflow-y-auto p-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white text-center">
              Complete Tournament
            </h3>

            {champion === null && (
              <p className="text-xs text-gray-400 text-center mt-4 mb-4">
                Working out the champion…
              </p>
            )}

            {champion && champion.championName && (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1 mb-4">
                  {champion.format === "ROUND_ROBIN"
                    ? "Top of the table with every fixture concluded."
                    : "Winner of the Final."}
                </p>
                <div className="rounded-2xl border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 p-4 text-center">
                  <div className="text-3xl mb-1">🏆</div>
                  <div className="text-base font-bold text-gray-900 dark:text-white break-words">
                    {champion.championName}
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-500 mt-0.5">
                    Champions
                  </div>
                </div>
                {champion.runnerUpName && (
                  <div className="mt-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 text-center">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 break-words">
                      {champion.runnerUpName}
                    </div>
                    <div className="text-xs text-gray-400">Runners-up</div>
                  </div>
                )}
                <button
                  disabled={posting}
                  onClick={handleComplete}
                  className="mt-4 w-full h-14 bg-yellow-600 text-white rounded-xl font-bold text-sm disabled:opacity-40 active:scale-95"
                >
                  {posting ? "Completing..." : "Confirm and Complete"}
                </button>
              </>
            )}

            {champion && !champion.championName && (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3 mb-4">
                  {champion.format === "ROUND_ROBIN"
                    ? "Every fixture has to be concluded before a league champion exists."
                    : "There is no completed Final yet, so the bracket has not produced a champion."}
                </p>
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 text-center text-sm text-gray-500">
                  Nothing to confirm yet
                </div>
              </>
            )}

            <button
              onClick={() => setShowComplete(false)}
              className="w-full py-3 mt-2 text-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── EDIT FIXTURE MODAL ── */}
      {/* ── POSTPONE / RESCHEDULE / ABANDON ── */}
      {rainFixture && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl max-h-[85dvh] overflow-y-auto p-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white text-center">
              {rainFixture.homeTeam?.name} vs {rainFixture.awayTeam?.name}
            </h3>

            {rainMode === "menu" && (
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => setRainMode("reschedule")}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-left active:scale-95"
                >
                  <span className="text-lg w-8 text-center">📅</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Reschedule
                    </div>
                    <div className="text-xs text-gray-400">
                      New date, time or ground. Stays in the tournament.
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setRainMode("postpone")}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-left active:scale-95"
                >
                  <span className="text-lg w-8 text-center">⏸</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Postpone
                    </div>
                    <div className="text-xs text-gray-400">
                      Will be replayed. No points yet. Date decided later.
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setRainMode("abandon")}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-left active:scale-95"
                >
                  <span className="text-lg w-8 text-center">🌧</span>
                  <div>
                    <div className="text-sm font-medium text-red-700 dark:text-red-400">
                      Abandon
                    </div>
                    <div className="text-xs text-red-400">
                      No result — 1 point each. Cannot be undone.
                    </div>
                  </div>
                </button>
              </div>
            )}

            {rainMode !== "menu" && (
              <>
                {rainMode === "reschedule" && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        Date
                      </label>
                      <input
                        type="date"
                        value={rainDate}
                        onChange={(e) => setRainDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        Time
                      </label>
                      <input
                        type="time"
                        value={rainTime}
                        onChange={(e) => setRainTime(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none"
                      />
                    </div>
                  </div>
                )}
                {rainMode === "reschedule" && venues.length > 0 && (
                  <div className="mt-3">
                    <label className="text-xs text-gray-400 mb-1 block">
                      Ground
                    </label>
                    <select
                      value={rainVenueId}
                      onChange={(e) => setRainVenueId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none"
                    >
                      <option value="">
                        Keep {rainFixture.venue ?? "current"}
                      </option>
                      {venues.map((v: any) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <label className="text-xs text-gray-400 mb-1.5 block mt-4">
                  Reason
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {INTERRUPTION_REASONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRainReason(r.value)}
                      className={`h-11 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                        rainReason === r.value
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {rainReason === "OTHER" && (
                  <input
                    type="text"
                    className="mt-3 w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none"
                    placeholder="What happened?"
                    value={rainNote}
                    onChange={(e) => setRainNote(e.target.value)}
                  />
                )}

                {/* Between the inputs and the button, never on it. */}
                {rainMode === "reschedule" && <ConflictNote />}

                <button
                  disabled={rainPosting}
                  onClick={() => {
                    const fx = rainFixture.publicId;
                    if (rainMode === "reschedule") {
                      // Rule 6: a local datetime string with no Z parses in the
                      // browser's zone, and toISOString then converts correctly.
                      const at = new Date(
                        `${rainDate}T${rainTime}:00`,
                      ).toISOString();
                      runRain(
                        () =>
                          rescheduleFixture(publicId!, fx, {
                            scheduledAt: at,
                            venueId: rainVenueId || undefined,
                            reason: rainReason,
                            note: rainNote || undefined,
                          }),
                        "✓ Fixture rescheduled",
                      );
                    } else if (rainMode === "postpone") {
                      runRain(
                        () =>
                          postponeFixture(
                            publicId!,
                            fx,
                            rainReason,
                            rainNote || undefined,
                          ),
                        "✓ Fixture postponed",
                      );
                    } else {
                      runRain(
                        () =>
                          abandonFixture(
                            publicId!,
                            fx,
                            rainReason,
                            rainNote || undefined,
                          ),
                        "✓ Fixture abandoned",
                      );
                    }
                  }}
                  className={`mt-4 w-full h-14 text-white rounded-xl font-bold text-sm disabled:opacity-40 active:scale-95 ${
                    rainMode === "abandon" ? "bg-red-600" : "bg-blue-600"
                  }`}
                >
                  {rainPosting
                    ? "Saving..."
                    : rainMode === "reschedule"
                      ? "Reschedule"
                      : rainMode === "postpone"
                        ? "Postpone"
                        : "Abandon Fixture"}
                </button>
                <button
                  onClick={() => setRainMode("menu")}
                  className="w-full py-3 text-gray-400 text-sm"
                >
                  Back
                </button>
              </>
            )}

            {rainMode === "menu" && (
              <button
                onClick={closeRain}
                className="w-full py-3 mt-2 text-gray-400 text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {showEditFixture && editingFixture && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5 max-h-[85dvh] overflow-y-auto">
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
                {venues.length > 0 && (
                  <select
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none mb-2"
                    value={editFixtureForm.venueId}
                    onChange={(e) => {
                      const v = venues.find(
                        (vv: any) => vv.id === e.target.value,
                      );
                      setEditFixtureForm((p) => ({
                        ...p,
                        venueId: e.target.value,
                        venue: v?.name ?? p.venue,
                      }));
                    }}
                  >
                    <option value="">Select from tournament venues...</option>
                    {venues.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  placeholder="Or type venue name..."
                  value={editFixtureForm.venue}
                  onChange={(e) =>
                    setEditFixtureForm((p) => ({ ...p, venue: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                    value={editFixtureForm.scheduledDate}
                    onChange={(e) =>
                      setEditFixtureForm((p) => ({
                        ...p,
                        scheduledDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Time
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                    value={editFixtureForm.scheduledTime}
                    onChange={(e) =>
                      setEditFixtureForm((p) => ({
                        ...p,
                        scheduledTime: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Status Override
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FIXTURE_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        setEditFixtureForm((p) => ({ ...p, status: s }))
                      }
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${editFixtureForm.status === s ? "bg-blue-600 border-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {/* Between the inputs and the buttons, never on them. */}
              <ConflictNote />

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

      {/* ── ADVANCE TO PLAYOFFS MODAL ── */}
      {showAdvancePlayoffs && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              🏆 Advance to Playoffs
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Top teams from the league stage advance to playoffs.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Teams advancing to playoffs
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 3, 4, 6].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPlayoffTopN(n)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                        playoffTopN === n
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      Top {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Bracket Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      val: "IPL",
                      label: "🏏 IPL Fixed",
                      desc: "Q1, Eliminator, Q2, Final",
                    },
                    {
                      val: "CUSTOM",
                      label: "⚙️ Custom",
                      desc: "Admin sets each round",
                    },
                  ].map(({ val, label, desc }) => (
                    <button
                      key={val}
                      onClick={() => setPlayoffBracketType(val)}
                      className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                        playoffBracketType === val
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
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
              {playoffTopN === 4 && playoffBracketType === "IPL" && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-xl px-3 py-2.5 text-xs text-blue-600 dark:text-blue-400">
                  <strong>IPL bracket:</strong> Qualifier 1 (1v2) + Eliminator
                  (3v4) will be created. Q2 and Final are added after results.
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowAdvancePlayoffs(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdvancePlayoffs}
                  disabled={posting}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                >
                  {posting ? "Generating..." : "Generate Playoffs"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddVenue && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              🏟 Add Venue
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Ground Name *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  placeholder="e.g. NCA Ground A"
                  value={venueForm.name}
                  onChange={(e) =>
                    setVenueForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Max Matches per Day
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none text-center"
                  value={venueForm.maxMatchesPerDay}
                  onChange={(e) =>
                    setVenueForm((p) => ({
                      ...p,
                      maxMatchesPerDay: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddVenue(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddVenue}
                  disabled={posting || !venueForm.name.trim()}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                >
                  Add Venue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddOfficial && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              🦺 Add Match Official
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Name *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none"
                  placeholder="e.g. Ravi Kumar"
                  value={officialForm.name}
                  onChange={(e) =>
                    setOfficialForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {OFFICIAL_ROLES.map((role) => (
                    <button
                      key={role}
                      onClick={() => setOfficialForm((p) => ({ ...p, role }))}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                        officialForm.role === role
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {OFFICIAL_ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddOfficial(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddOfficial}
                  disabled={posting || !officialForm.name.trim()}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                >
                  Add Official
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TEAM SHEET: fixtures and record together ── */}
      {teamSheet &&
        (() => {
          const mine = fixtures.filter(
            (f: any) =>
              f.homeTeam?.publicId === teamSheet.publicId ||
              f.awayTeam?.publicId === teamSheet.publicId,
          );
          const played = mine.filter((f: any) => f.status === "COMPLETED");
          const upcoming = mine.filter(
            (f: any) => !["COMPLETED", "ABANDONED"].includes(f.status),
          );
          const row = standings.find(
            (r: any) => r.teamPublicId === teamSheet.publicId,
          );
          const opponentOf = (f: any) =>
            f.homeTeam?.publicId === teamSheet.publicId
              ? (f.awayTeam?.name ?? "TBD")
              : (f.homeTeam?.name ?? "TBD");

          return (
            <div
              className="fixed inset-0 z-50 bg-black/60 flex items-end"
              onClick={() => setTeamSheet(null)}
            >
              <div
                className="w-full bg-white dark:bg-gray-900 rounded-t-2xl max-h-[85dvh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-center break-words">
                    {teamSheet.name}
                  </h3>
                </div>

                <div className="p-4 space-y-4">
                  {/* The standings row, in words rather than a table — a table of one
                      row at 380px is all header and no information. */}
                  {row ? (
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { k: "Played", v: row.played },
                        { k: "Won", v: row.won },
                        { k: "Lost", v: row.lost },
                        { k: "Points", v: row.points },
                      ].map((c) => (
                        <div
                          key={c.k}
                          className="bg-gray-50 dark:bg-gray-800 rounded-xl px-2 py-2 text-center"
                        >
                          <div className="text-base font-bold text-gray-900 dark:text-gray-100">
                            {c.v}
                          </div>
                          <div className="text-[11px] text-gray-400">{c.k}</div>
                        </div>
                      ))}
                      <div className="col-span-4 text-xs text-gray-400 text-center">
                        NRR {Number(row.netRunRate ?? 0).toFixed(3)}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center">
                      No standings row yet.
                    </p>
                  )}

                  <div>
                    <div className="text-xs text-gray-400 uppercase mb-2">
                      Played · {played.length}
                    </div>
                    {played.length === 0 ? (
                      <p className="text-xs text-gray-400">
                        No matches played yet.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {played.map((f: any) => (
                          <div
                            key={f.publicId}
                            className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2"
                          >
                            <span className="text-sm flex-shrink-0">🏏</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-gray-900 dark:text-gray-100 break-words">
                                v {opponentOf(f)}
                              </div>
                              <div className="text-xs text-gray-400 break-words">
                                {f.label ?? `Round ${f.roundNumber}`}
                                {f.match?.resultDescription
                                  ? ` · ${f.match.resultDescription}`
                                  : ""}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 uppercase mb-2">
                      Upcoming · {upcoming.length}
                    </div>
                    {upcoming.length === 0 ? (
                      <p className="text-xs text-gray-400">
                        Nothing scheduled.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {upcoming.map((f: any) => (
                          <div
                            key={f.publicId}
                            className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2"
                          >
                            <span className="text-sm flex-shrink-0">
                              {f.status === "POSTPONED" ? "⏸" : "📅"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-gray-900 dark:text-gray-100 break-words">
                                v {opponentOf(f)}
                              </div>
                              <div className="text-xs text-gray-400 break-words">
                                {f.status === "POSTPONED"
                                  ? "Awaiting a new date"
                                  : f.scheduledAt
                                    ? new Date(
                                        f.scheduledAt,
                                      ).toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        weekday: "short",
                                      })
                                    : "No date set"}
                                {f.venue ? ` · ${f.venue}` : ""}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setTeamSheet(null)}
                    className="w-full py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 border border-green-600 text-green-400 text-sm font-semibold px-6 py-2.5 rounded-full shadow-xl pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
