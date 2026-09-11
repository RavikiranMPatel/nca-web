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
  advanceToPlayoffs,
  getSquad,
  addToSquad,
  removeFromSquad,
  getAllTournamentPlayers,
  prepareMatchFromFixture,
  getTournamentResult,
  markFixtureFinal,
  rescheduleFixture,
  type TournamentResult,
} from "../../api/scoring/tournamentApi";
import { getBranchPlayers } from "../../api/scoring/matchApi";
import api from "../../api/axios";

import {
  TABS,
  ROLES,
  ROLE_LABELS,
  OFFICIAL_ROLES,
  OFFICIAL_ROLE_LABELS,
  DAY_LABELS,
  statusBadge,
} from "../../components/tournament/constants";
import type {
  SettingsForm,
  GenForm,
} from "../../components/tournament/types";
import OverviewTab from "../../components/tournament/OverviewTab";
import TeamsTab from "../../components/tournament/TeamsTab";
import PlayersTab from "../../components/tournament/PlayersTab";
import VenuesTab from "../../components/tournament/VenuesTab";
import OfficialsTab from "../../components/tournament/OfficialsTab";
import FixturesTab from "../../components/tournament/FixturesTab";
import StandingsTab from "../../components/tournament/StandingsTab";
import StatsTab from "../../components/tournament/StatsTab";
import SettingsTab from "../../components/tournament/SettingsTab";

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

  const [fixtureGroundFilter] = useState<string>("ALL");
  const [fixtureView, setFixtureView] = useState<string>("calendar");

  // Reschedule / postpone (Slice 4). overrideReason is only sent when the server
  // has already refused the move for a clash and the actor is a SUPER_ADMIN.
  const [reschedulingFixture, setReschedulingFixture] = useState<any>(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    date: "", time: "", reason: "", postpone: false,
  });
  const [rescheduleConflict, setRescheduleConflict] = useState("");
  const [rescheduleOverride, setRescheduleOverride] = useState("");

  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm, setGenForm] = useState<GenForm>({
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
      const [t, tm, st, fx, sd, tp, res] = await Promise.all([
        getTournament(publicId),
        listTeams(publicId),
        listStages(publicId),
        listFixtures(publicId),
        getStandings(publicId),
        getAllTournamentPlayers(publicId),
        // Tolerated separately: a result that fails to load should not blank the
        // whole page, it should just hide the champion banner.
        getTournamentResult(publicId).catch(() => null),
      ]);
      setTournament(t);
      setResult(res);
      setTeams(tm);
      setStages(st);
      setFixtures(fx);
      setStandings(sd);
      setAllTournamentPlayers(tp);
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
          {TABS.map((t, i) => (
            <button
              key={t}
              data-testid={`tournament-tab-${t.toLowerCase()}`}
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
          <OverviewTab
            allTournamentPlayers={allTournamentPlayers}
            fixtures={fixtures}
            teams={teams}
            tournament={tournament}
          />
        )}

        {/* ── TEAMS ── */}
        {tab === 1 && (
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
        {tab === 2 && (
          <PlayersTab
            allTournamentPlayers={allTournamentPlayers}
            playersByTeam={playersByTeam}
            teams={teams}
          />
        )}

        {/* ── VENUES ── */}
        {tab === 3 && (
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
        {tab === 4 && (
          <OfficialsTab
            handleDeleteOfficial={handleDeleteOfficial}
            officialsPool={officialsPool}
            setShowAddOfficial={setShowAddOfficial}
          />
        )}

        {/* ── FIXTURES ── */}
        {tab === 5 && (
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

        {/* ── STANDINGS ── */}
        {tab === 6 && (
          <StandingsTab
            standings={standings}
          />
        )}

        {/* ── STATS (NEW) ── */}
        {tab === 7 && (
          <StatsTab
            battingStats={battingStats}
            bowlingStats={bowlingStats}
            loadStats={loadStats}
            mvpStats={mvpStats}
            setStatsLoaded={setStatsLoaded}
            setStatsSubTab={setStatsSubTab}
            statsLoading={statsLoading}
            statsSubTab={statsSubTab}
            tournament={tournament}
          />
        )}

        {/* ── SETTINGS ── */}
        {tab === 8 && (
          <SettingsTab
            computeMatchDuration={computeMatchDuration}
            computeMaxMatchesPerGround={computeMaxMatchesPerGround}
            computeSchedulePreview={computeSchedulePreview}
            handleSaveSettings={handleSaveSettings}
            posting={posting}
            setSettingsForm={setSettingsForm}
            settingsForm={settingsForm}
          />
        )}
      </div>

      {/* ── ADD TEAM MODAL ── */}
      {showAddTeam && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end">
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
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end">
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
                    className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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
                    className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl max-h-[90vh] overflow-y-auto">
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
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
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
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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

      {/* ── RESCHEDULE / POSTPONE MODAL ── */}
      {reschedulingFixture && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6">
          <div
            data-testid="reschedule-modal"
            className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              🕑 Reschedule
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {reschedulingFixture.homeTeam?.name ?? "TBD"} v{" "}
              {reschedulingFixture.awayTeam?.name ?? "TBD"}
            </p>

            <label className="flex items-center gap-2 mb-4 text-xs text-gray-700 dark:text-gray-300">
              <input
                data-testid="reschedule-postpone"
                type="checkbox"
                checked={rescheduleForm.postpone}
                onChange={(e) =>
                  setRescheduleForm({ ...rescheduleForm, postpone: e.target.checked })
                }
              />
              Postpone instead — give up the slot without setting a new one
            </label>

            {!rescheduleForm.postpone && (
              <div className="flex gap-2 mb-4">
                <input
                  data-testid="reschedule-date"
                  type="date"
                  value={rescheduleForm.date}
                  onChange={(e) =>
                    setRescheduleForm({ ...rescheduleForm, date: e.target.value })
                  }
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100"
                />
                <input
                  data-testid="reschedule-time"
                  type="time"
                  value={rescheduleForm.time}
                  onChange={(e) =>
                    setRescheduleForm({ ...rescheduleForm, time: e.target.value })
                  }
                  className="w-28 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100"
                />
              </div>
            )}

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Reason <span className="text-red-500">*</span>
            </p>
            <textarea
              data-testid="reschedule-reason"
              value={rescheduleForm.reason}
              onChange={(e) =>
                setRescheduleForm({ ...rescheduleForm, reason: e.target.value })
              }
              rows={2}
              placeholder="Why is it moving?"
              className="w-full mb-4 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100"
            />

            {/* The server refused the slot. This is an answer, not an error — it
                names what clashes, and only a SUPER_ADMIN can go ahead anyway. */}
            {rescheduleConflict && (
              <div
                data-testid="reschedule-conflict"
                className="mb-4 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400"
              >
                {rescheduleConflict}
                <textarea
                  data-testid="reschedule-override-reason"
                  value={rescheduleOverride}
                  onChange={(e) => setRescheduleOverride(e.target.value)}
                  rows={2}
                  placeholder="SUPER_ADMIN only — why schedule over it anyway?"
                  className="w-full mt-2 px-3 py-2 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-xl text-xs text-gray-900 dark:text-gray-100"
                />
                <button
                  data-testid="reschedule-override-confirm"
                  onClick={() => submitReschedule(true)}
                  disabled={!rescheduleOverride.trim() || posting}
                  className="w-full mt-2 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold disabled:opacity-40"
                >
                  Schedule over the clash
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setReschedulingFixture(null)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                data-testid="reschedule-confirm"
                onClick={() => submitReschedule(false)}
                disabled={
                  !rescheduleForm.reason.trim() ||
                  posting ||
                  (!rescheduleForm.postpone &&
                    (!rescheduleForm.date || !rescheduleForm.time))
                }
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                {rescheduleForm.postpone ? "Postpone" : "Move"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DECLARE WINNER MODAL ── */}
      {showDeclareWinner && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              🏆 Override Result
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              A tournament sets its own champion when the fixture marked as the
              final is decided. Use this only to correct that, or when there is no
              final to decide it. SUPER_ADMIN only, and recorded in the audit log.
            </p>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Champion
            </p>
            <div className="space-y-2 mb-4">
              {teams.map((t: any) => (
                <button
                  key={t.publicId}
                  data-testid={`override-champion-${t.publicId}`}
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
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Runner-up <span className="font-normal normal-case">(optional)</span>
            </p>
            <select
              data-testid="override-runner-up"
              value={runnerUpTeam}
              onChange={(e) => setRunnerUpTeam(e.target.value)}
              className="w-full mb-4 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">— none —</option>
              {teams
                .filter((t: any) => t.publicId !== winnerTeam)
                .map((t: any) => (
                  <option key={t.publicId} value={t.publicId}>
                    {t.name}
                  </option>
                ))}
            </select>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Reason <span className="text-red-500">*</span>
            </p>
            <textarea
              data-testid="override-reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={3}
              placeholder="Why is the computed result being overridden?"
              className="w-full mb-4 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeclareWinner(false)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                data-testid="override-confirm"
                onClick={handleDeclareWinner}
                disabled={!winnerTeam || !overrideReason.trim() || posting}
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
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end">
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
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
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
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
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
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end">
          <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
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
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 border border-green-600 text-green-400 text-sm font-semibold px-6 py-2.5 rounded-full shadow-xl pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
