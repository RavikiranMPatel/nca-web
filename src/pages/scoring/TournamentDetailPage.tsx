import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
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
  getQualificationRules,
  updateQualificationRules,
  type QualificationRules,
  advanceToPlayoffs,
  getSquad,
  addToSquad,
  removeFromSquad,
  getAllTournamentPlayers,
  prepareMatchFromFixture,
  getTournamentResult,
  getTournamentDashboard,
  type TournamentDashboard,
  markFixtureFinal,
  rescheduleFixture,
  type TournamentResult,
} from "../../api/scoring/tournamentApi";
import { getBranchPlayers } from "../../api/scoring/matchApi";
import api from "../../api/axios";

import {
  TABS,
  statusBadge,
} from "../../components/tournament/constants";
import type {
  SettingsForm,
  GenForm,
  EditFixtureForm,
  TeamForm,
  VenueForm,
  OfficialForm,
  ManualFixtureForm,
  RescheduleForm,
} from "../../components/tournament/types";
import OverviewTab from "../../components/tournament/OverviewTab";
import TeamsTab from "../../components/tournament/TeamsTab";
import PlayersTab from "../../components/tournament/PlayersTab";
import VenuesTab from "../../components/tournament/VenuesTab";
import OfficialsTab from "../../components/tournament/OfficialsTab";
import FixturesTab from "../../components/tournament/FixturesTab";
import StandingsTab from "../../components/tournament/StandingsTab";
import SettingsTab from "../../components/tournament/SettingsTab";
import StatisticsTab from "../../components/tournament/StatisticsTab";
import AwardsTab from "../../components/tournament/AwardsTab";
import ReportsTab from "../../components/tournament/ReportsTab";

// Slice 5: the ten modals TournamentDetailPage used to hold inline, one file each.
import AddOfficialModal from "../../components/tournament/modals/AddOfficialModal";
import AddPlayerModal from "../../components/tournament/modals/AddPlayerModal";
import AddTeamModal from "../../components/tournament/modals/AddTeamModal";
import AddVenueModal from "../../components/tournament/modals/AddVenueModal";
import AdvancePlayoffsModal from "../../components/tournament/modals/AdvancePlayoffsModal";
import DeclareWinnerModal from "../../components/tournament/modals/DeclareWinnerModal";
import EditFixtureModal from "../../components/tournament/modals/EditFixtureModal";
import GenerateFixturesModal from "../../components/tournament/modals/GenerateFixturesModal";
import ManualFixtureModal from "../../components/tournament/modals/ManualFixtureModal";
import RescheduleModal from "../../components/tournament/modals/RescheduleModal";

export default function TournamentDetailPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();

  // Awards are ADMIN or SUPER_ADMIN. The service refuses the write regardless —
  // this only decides whether the buttons are offered, because a button that
  // always fails is worse than no button.
  const canAward = userRole === "ROLE_ADMIN" || userRole === "ROLE_SUPER_ADMIN";

  // The selected tab, by KEY. It was an index until Slice 5 added three tabs in
  // the middle of the list, which would have renumbered every panel after them.
  const [tab, setTab] = useState("overview");
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
  const [venueForm, setVenueForm] = useState<VenueForm>({ name: "", maxMatchesPerDay: 2 });
  const [editingVenue, setEditingVenue] = useState<any>(null);

  // Officials pool
  const [officialsPool, setOfficialsPool] = useState<any[]>([]);
  const [showAddOfficial, setShowAddOfficial] = useState(false);
  const [officialForm, setOfficialForm] = useState<OfficialForm>({
    name: "",
    role: "UMPIRE",
  });

  // Qualification rules (Slice 4b) — their own DTO and their own endpoint, kept
  // separate from settingsForm because they are a different concern with a
  // different audit trail, not another scheduling parameter.
  const [qualForm, setQualForm] = useState<QualificationRules>({
    teamsAdvancingPerGroup: 2,
    knockoutSeedingRule: "CROSS_GROUP",
    tieBreakOrder: ["POINTS", "NRR", "WINS", "HEAD_TO_HEAD"],
  });
  const [savingQual, setSavingQual] = useState(false);

  const [settingsForm, setSettingsForm] = useState<SettingsForm>({
    oversPerInnings: 20,
    minsPerOver: 4.5,
    inningsBreakMins: 20,
    groundGapMins: 40,
    dayStartTime: "09:30",
    dayEndTime: "18:30",
    maxMatchesPerDay: 2,
  });
  const [setSettingsSaved] = useState(false);

  const [showAddTeam, setShowAddTeam] = useState(false);
  const [teamForm, setTeamForm] = useState<TeamForm>({
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

  const [fixtureGroundFilter] = useState<string>("ALL");
  const [fixtureView, setFixtureView] = useState<string>("calendar");

  // Reschedule / postpone (Slice 4). overrideReason is only sent when the server
  // has already refused the move for a clash and the actor is a SUPER_ADMIN.
  const [reschedulingFixture, setReschedulingFixture] = useState<any>(null);
  const [rescheduleForm, setRescheduleForm] = useState<RescheduleForm>({
    date: "", time: "", reason: "", postpone: false,
  });
  const [rescheduleConflict, setRescheduleConflict] = useState("");
  const [rescheduleOverride, setRescheduleOverride] = useState("");

  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm, setGenForm] = useState<GenForm>({
    teamsPerGroup: 4,
    scheduleStartDate: "",
    scheduleStartTime: "09:00",
    autoAssignVenues: true,
    selectedVenueIds: [] as string[],
    playDays: [] as number[],
    maxMatchesPerDay: 2,
  });

  const [showManualFixture, setShowManualFixture] = useState(false);
  const [fixtureForm, setFixtureForm] = useState<ManualFixtureForm>({
    stagePublicId: "",
    homeTeamPublicId: "",
    awayTeamPublicId: "",
    venue: "",
    venueId: "",
    scheduledDate: "",
    scheduledTime: "",
  });

  const [showDeclareWinner, setShowDeclareWinner] = useState(false);
  const [showAdvancePlayoffs, setShowAdvancePlayoffs] = useState(false);
  const [playoffTopN, setPlayoffTopN] = useState(4);
  const [playoffBracketType, setPlayoffBracketType] = useState("IPL");
  // Champion / runner-up, and whether the final tied — the tie is not derivable
  // from the tournament row, since "no champion" also describes a final not yet
  // played.
  const [result, setResult] = useState<TournamentResult | null>(null);
  const [runnerUpTeam, setRunnerUpTeam] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [winnerTeam, setWinnerTeam] = useState("");

  const [showEditFixture, setShowEditFixture] = useState(false);
  const [editingFixture, setEditingFixture] = useState<any>(null);
  const [editFixtureForm, setEditFixtureForm] = useState<EditFixtureForm>({
    roundNumber: 1,
    homeTeamPublicId: "",
    awayTeamPublicId: "",
    venue: "",
    venueId: "",
    status: "SCHEDULED",
    scheduledDate: "",
    scheduledTime: "",
    matchNumber: "",
    city: "",
    umpire1Name: "",
    umpire2Name: "",
    umpire3Name: "",
    refereeName: "",
    scorerName: "",
    notes: "",
  });

  // ── DASHBOARD (Phase 4) ───────────────────────────────────────────────────
  // One request, twelve cards. The leaderboards moved into StatisticsTab, which
  // fetches its own pages — the page no longer holds three arrays of stat rows.
  const [dashboard, setDashboard] = useState<TournamentDashboard | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

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
      const [t, tm, st, fx, sd, tp, res, qual] = await Promise.all([
        getTournament(publicId),
        listTeams(publicId),
        listStages(publicId),
        listFixtures(publicId),
        getStandings(publicId),
        getAllTournamentPlayers(publicId),
        // Tolerated separately: a result that fails to load should not blank the
        // whole page, it should just hide the champion banner.
        getTournamentResult(publicId).catch(() => null),
        // Same tolerance — the Settings tab falls back to the defaults rather
        // than the whole page failing to load.
        getQualificationRules(publicId).catch(() => null),
      ]);
      setTournament(t);
      setResult(res);
      setTeams(tm);
      setStages(st);
      setFixtures(fx);
      setStandings(sd);
      setAllTournamentPlayers(tp);
      if (qual) setQualForm(qual);
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

  const handleSaveQualificationRules = async () => {
    setSavingQual(true);
    try {
      const saved = await updateQualificationRules(publicId!, qualForm);
      setQualForm(saved);
      showToast("✓ Qualification rules saved");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to save qualification rules");
    } finally {
      setSavingQual(false);
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

  // ── LOAD DASHBOARD ────────────────────────────────────────────────────────
  const loadDashboard = async () => {
    if (!publicId) return;
    setDashboardLoading(true);
    try {
      setDashboard(await getTournamentDashboard(publicId));
    } catch {
      setError("Failed to load the tournament summary");
    } finally {
      setDashboardLoading(false);
    }
  };

  // The dashboard is reloaded whenever Overview is opened rather than cached:
  // completing a fixture on the Fixtures tab changes almost every card, and a
  // stale summary is worse than a second request.
  useEffect(() => {
    if (tab === "overview") loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, publicId]);

  useEffect(() => {
    if (tab === "venues") loadVenues();
  }, [tab]);
  useEffect(() => {
    if (tab === "officials") loadOfficialsPool();
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

  const handleDeclareWinner = async () => {
    // The server requires both, and rejects the call without them. Checked here
    // too so the button explains itself rather than round-tripping to a 400.
    if (!winnerTeam || !overrideReason.trim()) return;
    setPosting(true);
    try {
      await declareWinner(
        publicId!,
        winnerTeam,
        overrideReason.trim(),
        runnerUpTeam || undefined,
      );
      setShowDeclareWinner(false);
      setOverrideReason("");
      setRunnerUpTeam("");
      await loadAll();
      showToast("🏆 Result overridden");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to override the result");
    } finally {
      setPosting(false);
    }
  };

  const openReschedule = (f: any) => {
    setReschedulingFixture(f);
    setRescheduleConflict("");
    setRescheduleOverride("");
    let date = "", time = "";
    if (f.scheduledAt) {
      const d = new Date(f.scheduledAt);
      date = d.toISOString().split("T")[0];
      time = d.toTimeString().substring(0, 5);
    }
    setRescheduleForm({ date, time, reason: "", postpone: false });
  };

  const submitReschedule = async (override: boolean) => {
    if (!reschedulingFixture || !rescheduleForm.reason.trim()) return;
    setPosting(true);
    try {
      const body: any = {
        reason: rescheduleForm.reason.trim(),
        postpone: rescheduleForm.postpone,
      };
      if (!rescheduleForm.postpone) {
        body.scheduledAt = new Date(
          `${rescheduleForm.date}T${rescheduleForm.time}:00`,
        ).toISOString();
      }
      if (override) {
        body.overrideConflicts = true;
        body.overrideReason = rescheduleOverride.trim();
      }
      await rescheduleFixture(publicId!, reschedulingFixture.publicId, body);
      setReschedulingFixture(null);
      await loadAll();
      showToast(rescheduleForm.postpone ? "Fixture postponed" : "✓ Fixture moved");
    } catch (e: any) {
      // A 409 is the server refusing a clash, which is a different thing from an
      // error: it is an answer, and it names what clashes. Keep the dialog open
      // and offer the override to whoever is allowed to use it.
      if (e.response?.status === 409) {
        setRescheduleConflict(e.response?.data?.message ?? "That slot clashes.");
      } else {
        setError(e.response?.data?.message ?? "Failed to reschedule");
      }
    } finally {
      setPosting(false);
    }
  };

  const handleMarkFinal = async (fixturePublicId: string, isFinal: boolean) => {
    setPosting(true);
    try {
      await markFixtureFinal(publicId!, fixturePublicId, isFinal);
      await loadAll();
      showToast(isFinal ? "Marked as the final" : "No longer the final");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to update the fixture");
    } finally {
      setPosting(false);
    }
  };

  const handleAdvanceKnockout = async () => {
    setPosting(true);
    try {
      await advanceToKnockout(publicId!);
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
      // Scheduling fields (V100/V102). The API has accepted these since Slice 4
      // and nothing could edit them until now. "" rather than null: the PATCH
      // treats blank as "clear it", which is what an official who has changed
      // needs, and only an absent field means "leave alone".
      matchNumber: f.matchNumber ?? "",
      city: f.city ?? "",
      umpire1Name: f.umpire1Name ?? "",
      umpire2Name: f.umpire2Name ?? "",
      umpire3Name: f.umpire3Name ?? "",
      refereeName: f.refereeName ?? "",
      scorerName: f.scorerName ?? "",
      notes: f.notes ?? "",
    });
    setShowEditFixture(true);
  };

  const handleEditFixture = async () => {
    if (!editingFixture) return;
    setPosting(true);
    try {
      const payload: any = { ...editFixtureForm };
      // The binder wants an Integer or nothing; "" would be a 400.
      payload.matchNumber =
        editFixtureForm.matchNumber === "" || editFixtureForm.matchNumber === null
          ? null
          : Number(editFixtureForm.matchNumber);
      if (payload.matchNumber === null) delete payload.matchNumber;
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
              data-testid="tournament-publish"
              onClick={() => handleStatusChange("UPCOMING")}
              className="flex-shrink-0 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg active:scale-95"
            >
              ▶ Publish
            </button>
          )}
          {(tournament.status === "UPCOMING" || tournament.status === "LIVE") && (
            <button
              data-testid="tournament-suspend"
              onClick={() => handleStatusChange("SUSPENDED")}
              className="flex-shrink-0 px-3 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded-lg active:scale-95"
            >
              ⏸ Suspend
            </button>
          )}
          {tournament.status === "SUSPENDED" && (
            <button
              data-testid="tournament-resume"
              onClick={() => handleStatusChange("LIVE")}
              className="flex-shrink-0 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg active:scale-95"
            >
              ▶ Resume
            </button>
          )}
          {/* The override, not the ordinary path. A tournament completes itself
              when the fixture marked as the final is decided; this is for when
              that result is wrong or unreachable, and it is SUPER_ADMIN only. */}
          {tournament.status !== "DRAFT" && tournament.status !== "CANCELLED" && (
            <button
              data-testid="tournament-declare-winner"
              onClick={() => setShowDeclareWinner(true)}
              className="flex-shrink-0 px-3 py-1.5 bg-yellow-600 text-white text-xs font-semibold rounded-lg active:scale-95"
            >
              🏆 Override Result
            </button>
          )}
        </div>

        {/* A final that ended tied leaves no champion on purpose. Without this
            the tournament just sits at LIVE with an empty result and looks
            stuck rather than undecided. */}
        {result?.finalTied && (
          <div
            data-testid="tournament-final-tied"
            className="mt-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-400"
          >
            The final was tied, so no champion has been set. Play it again, or use
            <strong> Override Result</strong> to decide it.
          </div>
        )}

        {result?.championTeamName && (
          <div
            data-testid="tournament-champion"
            className="mt-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-xs text-yellow-800 dark:text-yellow-400"
          >
            🏆 <strong>{result.championTeamName}</strong>
            {result.runnerUpTeamName && (
              <span className="text-yellow-700/80 dark:text-yellow-400/80">
                {" "}· runner-up {result.runnerUpTeamName}
              </span>
            )}
          </div>
        )}

        <div className="flex gap-0 mt-3 border-b border-gray-100 dark:border-gray-800 -mx-4 px-4 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              data-testid={`tournament-tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex-shrink-0 ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}
            >
              {t.label}
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
        {tab === "overview" && (
          <OverviewTab
            allTournamentPlayers={allTournamentPlayers}
            dashboard={dashboard}
            dashboardLoading={dashboardLoading}
            fixtures={fixtures}
            teams={teams}
            tournament={tournament}
          />
        )}

        {/* ── TEAMS ── */}
        {tab === "teams" && (
          <TeamsTab
            expandedTeam={expandedTeam}
            handleExpandTeam={handleExpandTeam}
            handleRemoveFromSquad={handleRemoveFromSquad}
            handleRemoveTeam={handleRemoveTeam}
            openAddPlayer={openAddPlayer}
            setShowAddTeam={setShowAddTeam}
            squadMap={squadMap}
            teams={teams}
          />
        )}

        {/* ── PLAYERS ── */}
        {tab === "players" && (
          <PlayersTab
            allTournamentPlayers={allTournamentPlayers}
            playersByTeam={playersByTeam}
            teams={teams}
          />
        )}

        {/* ── VENUES ── */}
        {tab === "venues" && (
          <VenuesTab
            editingVenue={editingVenue}
            handleDeleteVenue={handleDeleteVenue}
            handleEditVenue={handleEditVenue}
            posting={posting}
            setEditingVenue={setEditingVenue}
            setShowAddVenue={setShowAddVenue}
            venues={venues}
          />
        )}

        {/* ── MATCH OFFICIALS ── */}
        {tab === "officials" && (
          <OfficialsTab
            handleDeleteOfficial={handleDeleteOfficial}
            officialsPool={officialsPool}
            setShowAddOfficial={setShowAddOfficial}
          />
        )}

        {/* ── FIXTURES ── */}
        {tab === "fixtures" && (
          <FixturesTab
            handleMarkFinal={handleMarkFinal}
            fixtureGroundFilter={fixtureGroundFilter}
            fixtureView={fixtureView}
            setFixtureView={setFixtureView}
            openReschedule={openReschedule}
            fixtures={fixtures}
            handleAdvanceKnockout={handleAdvanceKnockout}
            handleStartMatch={handleStartMatch}
            loadAll={loadAll}
            navigate={navigate}
            openEditFixture={openEditFixture}
            posting={posting}
            publicId={publicId}
            setError={setError}
            setGenForm={setGenForm}
            setPosting={setPosting}
            setShowAdvancePlayoffs={setShowAdvancePlayoffs}
            setShowGenerate={setShowGenerate}
            setShowManualFixture={setShowManualFixture}
            showToast={showToast}
            tournament={tournament}
          />
        )}

        {/* ── POINTS TABLE ── */}
        {tab === "points-table" && (
          <StandingsTab
            standings={standings}
          />
        )}

        {/* ── STATISTICS (Phase 17) ── */}
        {tab === "statistics" && <StatisticsTab publicId={publicId!} />}

        {/* ── AWARDS (Phases 15, 16) ── */}
        {tab === "awards" && (
          <AwardsTab
            publicId={publicId!}
            fixtures={fixtures}
            canAward={canAward}
            showToast={showToast}
            setError={setError}
          />
        )}

        {/* ── REPORTS (a stub; Slice 6 builds it) ── */}
        {tab === "reports" && <ReportsTab />}

        {/* ── SETTINGS ── */}
        {tab === "settings" && (
          <SettingsTab
            computeMatchDuration={computeMatchDuration}
            computeMaxMatchesPerGround={computeMaxMatchesPerGround}
            computeSchedulePreview={computeSchedulePreview}
            handleSaveSettings={handleSaveSettings}
            qualForm={qualForm}
            setQualForm={setQualForm}
            handleSaveQualificationRules={handleSaveQualificationRules}
            savingQual={savingQual}
            posting={posting}
            setSettingsForm={setSettingsForm}
            settingsForm={settingsForm}
          />
        )}
      </div>

      {/* ── ADD TEAM MODAL ── */}
      {showAddTeam && (
        <AddTeamModal
          handleAddTeam={handleAddTeam}
          posting={posting}
          setShowAddTeam={setShowAddTeam}
          setTeamForm={setTeamForm}
          teamForm={teamForm}
        />
      )}

      {/* ── ADD PLAYER MODAL ── */}
      {showAddPlayer && (
        <AddPlayerModal
          closeAddPlayer={closeAddPlayer}
          externalGender={externalGender}
          externalName={externalName}
          externalRole={externalRole}
          filteredPlayers={filteredPlayers}
          handleAddExternalPlayer={handleAddExternalPlayer}
          handleAddToSquad={handleAddToSquad}
          playerModalTab={playerModalTab}
          playerSearch={playerSearch}
          posting={posting}
          selectedPlayers={selectedPlayers}
          selectedRole={selectedRole}
          setExternalGender={setExternalGender}
          setExternalName={setExternalName}
          setExternalRole={setExternalRole}
          setPlayerModalTab={setPlayerModalTab}
          setPlayerSearch={setPlayerSearch}
          setSelectedPlayers={setSelectedPlayers}
          setSelectedRole={setSelectedRole}
        />
      )}

      {/* ── GENERATE FIXTURES MODAL ── */}
      {showGenerate && (
        <GenerateFixturesModal
          genForm={genForm}
          handleGenerate={handleGenerate}
          posting={posting}
          setGenForm={setGenForm}
          setShowGenerate={setShowGenerate}
          teams={teams}
          togglePlayDay={togglePlayDay}
          tournament={tournament}
          venues={venues}
        />
      )}

      {/* ── MANUAL FIXTURE MODAL ── */}
      {showManualFixture && (
        <ManualFixtureModal
          fixtureForm={fixtureForm}
          handleManualFixture={handleManualFixture}
          posting={posting}
          setFixtureForm={setFixtureForm}
          setShowManualFixture={setShowManualFixture}
          stages={stages}
          teams={teams}
        />
      )}

      {/* ── RESCHEDULE / POSTPONE MODAL ── */}
      {reschedulingFixture && (
        <RescheduleModal
          posting={posting}
          rescheduleConflict={rescheduleConflict}
          rescheduleForm={rescheduleForm}
          rescheduleOverride={rescheduleOverride}
          reschedulingFixture={reschedulingFixture}
          setRescheduleForm={setRescheduleForm}
          setRescheduleOverride={setRescheduleOverride}
          setReschedulingFixture={setReschedulingFixture}
          submitReschedule={submitReschedule}
        />
      )}

      {/* ── DECLARE WINNER MODAL ── */}
      {showDeclareWinner && (
        <DeclareWinnerModal
          handleDeclareWinner={handleDeclareWinner}
          overrideReason={overrideReason}
          posting={posting}
          runnerUpTeam={runnerUpTeam}
          setOverrideReason={setOverrideReason}
          setRunnerUpTeam={setRunnerUpTeam}
          setShowDeclareWinner={setShowDeclareWinner}
          setWinnerTeam={setWinnerTeam}
          teams={teams}
          winnerTeam={winnerTeam}
        />
      )}

      {/* ── EDIT FIXTURE MODAL ── */}
      {showEditFixture && editingFixture && (
        <EditFixtureModal
          editFixtureForm={editFixtureForm}
          editingFixture={editingFixture}
          handleDeleteFixture={handleDeleteFixture}
          handleEditFixture={handleEditFixture}
          posting={posting}
          setEditFixtureForm={setEditFixtureForm}
          setEditingFixture={setEditingFixture}
          setShowEditFixture={setShowEditFixture}
          teams={teams}
          venues={venues}
        />
      )}

      {/* ── ADVANCE TO PLAYOFFS MODAL ── */}
      {showAdvancePlayoffs && (
        <AdvancePlayoffsModal
          handleAdvancePlayoffs={handleAdvancePlayoffs}
          playoffBracketType={playoffBracketType}
          playoffTopN={playoffTopN}
          posting={posting}
          setPlayoffBracketType={setPlayoffBracketType}
          setPlayoffTopN={setPlayoffTopN}
          setShowAdvancePlayoffs={setShowAdvancePlayoffs}
        />
      )}

      {showAddVenue && (
        <AddVenueModal
          handleAddVenue={handleAddVenue}
          posting={posting}
          setShowAddVenue={setShowAddVenue}
          setVenueForm={setVenueForm}
          venueForm={venueForm}
        />
      )}

      {showAddOfficial && (
        <AddOfficialModal
          handleAddOfficial={handleAddOfficial}
          officialForm={officialForm}
          posting={posting}
          setOfficialForm={setOfficialForm}
          setShowAddOfficial={setShowAddOfficial}
        />
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 border border-green-600 text-green-400 text-sm font-semibold px-6 py-2.5 rounded-full shadow-xl pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
