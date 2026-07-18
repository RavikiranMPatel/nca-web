import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Shield,
  Users,
  CalendarCheck,
  Award,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle,
  Star,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { clubService } from "../../../api/clubService";
import { playerService } from "../../../api/playerService/playerService";
import type {
  Club,
  ClubRequest,
  ClubMember,
  ClubMemberRequest,
  ClubHonor,
  ClubHonorRequest,
  ClubMemberAttendance,
} from "../../../types/club";
import type { Player } from "../../../api/playerService/playerService";
import { clubSeasonService } from "../../../api/clubSeasonService";
import type {
  Season,
  ClubSeasonSquadEntry,
  ClubSeasonSummary,
  ClubSeasonStandingData,
} from "../../../types/club";

type Tab = "info" | "members" | "attendance" | "seasons";

type SeasonStatsForm = {
  topScorerMemberPublicId: string;
  topScorerRuns: string;
  topWicketTakerMemberPublicId: string;
  topWicketTakerWickets: string;
};

type SeasonSquadForm = {
  memberPublicId: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isWicketKeeper: boolean;
};

const EMPTY_STATS_FORM: SeasonStatsForm = {
  topScorerMemberPublicId: "",
  topScorerRuns: "",
  topWicketTakerMemberPublicId: "",
  topWicketTakerWickets: "",
};

const EMPTY_SQUAD_FORM: SeasonSquadForm = {
  memberPublicId: "",
  isCaptain: false,
  isViceCaptain: false,
  isWicketKeeper: false,
};

const HONOR_LEVELS = [
  { value: "INDIA", label: "India" },
  { value: "INDIA_AGE_GROUP", label: "India Age Group" },
  { value: "KARNATAKA", label: "Karnataka" },
  { value: "KARNATAKA_AGE_GROUP", label: "Karnataka Age Group" },
];

const BATTING_STYLES = ["RIGHT_HAND", "LEFT_HAND"];
const BOWLING_STYLES = [
  "RIGHT_ARM_FAST",
  "LEFT_ARM_FAST",
  "RIGHT_ARM_SPIN",
  "LEFT_ARM_SPIN",
  "NONE",
];
const PLAYER_ROLES = ["BATSMAN", "BOWLER", "ALL_ROUNDER", "WK_BATSMAN"];
const GENDER_OPTIONS = ["MALE", "FEMALE", "OTHER"];

const EMPTY_MEMBER_FORM: ClubMemberRequest = {
  memberType: "INTERNAL",
  playerPublicId: undefined,
  displayName: "",
  photoUrl: "",
  dob: "",
  battingStyle: "",
  bowlingStyle: "",
  playerRole: "",
  gender: "",
  status: "CURRENT",
};

const EMPTY_HONOR_FORM: ClubHonorRequest = {
  level: "INDIA",
  title: "",
  description: "",
  year: new Date().getFullYear(),
  isCurrent: false,
};

// ── Standing helpers (shared label logic) ────────────────────────────────────
function standingOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function AdminHeaderStandingBadge({ standing }: { standing: ClubSeasonStandingData }) {
  const { division, position, movement } = standing;
  const label = position === 1
    ? `🏆 Champions · Div ${division}`
    : position === 2
    ? `🥈 Runners-up · Div ${division}`
    : position
    ? `Div ${division} · ${standingOrdinal(position)}`
    : `Div ${division}`;

  const movColor = movement === "PROMOTED"
    ? "bg-emerald-500"
    : movement === "RELEGATED"
    ? "bg-red-500"
    : "bg-slate-400";
  const movArrow = movement === "PROMOTED" ? "↑" : movement === "RELEGATED" ? "↓" : movement === "RETAINED" ? "→" : null;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-bold text-white/90 bg-white/20 border border-white/30 px-2.5 py-1 rounded-full backdrop-blur-sm">
        {label}
      </span>
      {movArrow && (
        <span className={`text-[11px] font-bold text-white px-1.5 py-0.5 rounded-full ${movColor}`}>
          {movArrow}
        </span>
      )}
    </div>
  );
}

function ClubDetailPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [club, setClub] = useState<Club | null>(null);
  const [loadingClub, setLoadingClub] = useState(true);

  // ── Edit club ──
  const [showEditClub, setShowEditClub] = useState(false);
  const [clubForm, setClubForm] = useState<ClubRequest>({
    name: "",
    ownerName: "",
    ownerContact: "",
    history: "",
  });
  const [savingClub, setSavingClub] = useState(false);

  // ── Members ──
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [membersPage, setMembersPage] = useState(0);
  const [membersTotalPages, setMembersTotalPages] = useState(0);
  const [membersTotalElements, setMembersTotalElements] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loadingMembers, setLoadingMembers] = useState(false);

  // selected member detail
  const [selectedMember, setSelectedMember] = useState<ClubMember | null>(null);
  const [loadingMemberDetail, setLoadingMemberDetail] = useState(false);

  // add member modal
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState<ClubMemberRequest>(EMPTY_MEMBER_FORM);
  const [savingMember, setSavingMember] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerSearch, setPlayerSearch] = useState("");
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // edit member modal
  const [editingMember, setEditingMember] = useState<ClubMember | null>(null);
  const [editMemberForm, setEditMemberForm] = useState<ClubMemberRequest>(EMPTY_MEMBER_FORM);
  const [updatingMember, setUpdatingMember] = useState(false);

  // deleting member
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  // ── Honors ──
  const [showAddHonor, setShowAddHonor] = useState(false);
  const [honorForm, setHonorForm] = useState<ClubHonorRequest>(EMPTY_HONOR_FORM);
  const [savingHonor, setSavingHonor] = useState(false);
  const [editingHonor, setEditingHonor] = useState<ClubHonor | null>(null);
  const [editHonorForm, setEditHonorForm] = useState<ClubHonorRequest>(EMPTY_HONOR_FORM);
  const [updatingHonor, setUpdatingHonor] = useState(false);
  const [deletingHonorId, setDeletingHonorId] = useState<string | null>(null);

  // ── Attendance ──
  const [attendance, setAttendance] = useState<ClubMemberAttendance[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // ── Seasons ──
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [seasonSummary, setSeasonSummary] = useState<ClubSeasonSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [allMembers, setAllMembers] = useState<ClubMember[]>([]);

  // new season modal
  const [showNewSeason, setShowNewSeason] = useState(false);
  const [newSeasonForm, setNewSeasonForm] = useState({ name: "", startDate: "", endDate: "" });
  const [savingSeason, setSavingSeason] = useState(false);

  // add to squad modal
  const [showAddToSquad, setShowAddToSquad] = useState(false);
  const [squadAddForm, setSquadAddForm] = useState<SeasonSquadForm>(EMPTY_SQUAD_FORM);
  const [savingSquad, setSavingSquad] = useState(false);

  // edit squad entry modal
  const [editingSquadEntry, setEditingSquadEntry] = useState<ClubSeasonSquadEntry | null>(null);
  const [editSquadForm, setEditSquadForm] = useState<SeasonSquadForm>(EMPTY_SQUAD_FORM);
  const [updatingSquad, setUpdatingSquad] = useState(false);

  // stats forms
  const [kscaForm, setKscaForm] = useState<SeasonStatsForm>(EMPTY_STATS_FORM);
  const [practiceForm, setPracticeForm] = useState<SeasonStatsForm>(EMPTY_STATS_FORM);
  const [savingKsca, setSavingKsca] = useState(false);
  const [savingPractice, setSavingPractice] = useState(false);

  // activate season
  const [activatingSeason, setActivatingSeason] = useState(false);

  // standing form
  const [standingForm, setStandingForm] = useState({ division: "", position: "", movement: "" });
  const [savingStanding, setSavingStanding] = useState(false);

  const formatDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString("en-IN") : "";

  // ── Load club ─────────────────────────────────────────────────────────────
  const loadClub = useCallback(async () => {
    if (!publicId) return;
    try {
      setLoadingClub(true);
      const data = await clubService.getClub(publicId);
      setClub(data);
      setClubForm({
        name: data.name,
        ownerName: data.ownerName ?? "",
        ownerContact: data.ownerContact ?? "",
        history: data.history ?? "",
      });
    } catch {
      toast.error("Failed to load club");
    } finally {
      setLoadingClub(false);
    }
  }, [publicId]);

  useEffect(() => {
    loadClub();
  }, [loadClub]);

  // ── Load members ──────────────────────────────────────────────────────────
  const loadMembers = useCallback(
    async (p: number, filter: string) => {
      if (!publicId) return;
      try {
        setLoadingMembers(true);
        const data = await clubService.listMembers(publicId, p, 20, filter || undefined);
        setMembers(data.content);
        setMembersTotalPages(data.totalPages);
        setMembersTotalElements(data.totalElements);
      } catch {
        toast.error("Failed to load members");
      } finally {
        setLoadingMembers(false);
      }
    },
    [publicId],
  );

  useEffect(() => {
    if (activeTab === "members") {
      loadMembers(membersPage, statusFilter);
    }
  }, [activeTab, membersPage, statusFilter, loadMembers]);

  // ── Load attendance ───────────────────────────────────────────────────────
  const loadAttendance = useCallback(async () => {
    if (!publicId) return;
    try {
      setLoadingAttendance(true);
      const data = await clubService.getAttendanceToday(publicId);
      setAttendance(data);
    } catch {
      toast.error("Failed to load attendance");
    } finally {
      setLoadingAttendance(false);
    }
  }, [publicId]);

  useEffect(() => {
    if (activeTab === "attendance") {
      loadAttendance();
    }
  }, [activeTab, loadAttendance]);

  // ── Load seasons ──────────────────────────────────────────────────────────
  const loadSeasons = useCallback(async () => {
    if (!publicId) return;
    setLoadingSeasons(true);
    try {
      const data = await clubSeasonService.listSeasons();
      setSeasons(data);
      setSelectedSeasonId((prev) => {
        if (prev) return prev;
        const current = data.find((s) => s.isCurrent);
        return (current ?? data[0])?.publicId ?? null;
      });
    } catch {
      toast.error("Failed to load seasons");
    } finally {
      setLoadingSeasons(false);
    }
  }, [publicId]);

  const loadSeasonSummary = useCallback(async () => {
    if (!publicId || !selectedSeasonId) return;
    setLoadingSummary(true);
    try {
      const data = await clubSeasonService.getSeasonSummary(publicId, selectedSeasonId);
      setSeasonSummary(data);
      const ksca = data.stats.find((s) => s.matchType === "KSCA");
      const practice = data.stats.find((s) => s.matchType === "PRACTICE");
      setKscaForm({
        topScorerMemberPublicId: ksca?.topScorerMemberPublicId ?? "",
        topScorerRuns: ksca?.topScorerRuns != null ? String(ksca.topScorerRuns) : "",
        topWicketTakerMemberPublicId: ksca?.topWicketTakerMemberPublicId ?? "",
        topWicketTakerWickets: ksca?.topWicketTakerWickets != null ? String(ksca.topWicketTakerWickets) : "",
      });
      setPracticeForm({
        topScorerMemberPublicId: practice?.topScorerMemberPublicId ?? "",
        topScorerRuns: practice?.topScorerRuns != null ? String(practice.topScorerRuns) : "",
        topWicketTakerMemberPublicId: practice?.topWicketTakerMemberPublicId ?? "",
        topWicketTakerWickets: practice?.topWicketTakerWickets != null ? String(practice.topWicketTakerWickets) : "",
      });
      setStandingForm({
        division: data.standing?.division != null ? String(data.standing.division) : "",
        position: data.standing?.position != null ? String(data.standing.position) : "",
        movement: data.standing?.movement ?? "",
      });
    } catch {
      toast.error("Failed to load season data");
    } finally {
      setLoadingSummary(false);
    }
  }, [publicId, selectedSeasonId]);

  const loadAllMembers = useCallback(async () => {
    if (!publicId || allMembers.length > 0) return;
    try {
      const data = await clubService.listMembers(publicId, 0, 200);
      setAllMembers(data.content);
    } catch {
      toast.error("Failed to load members list");
    }
  }, [publicId, allMembers.length]);

  useEffect(() => {
    if (activeTab === "seasons") {
      loadSeasons();
      loadAllMembers();
    }
  }, [activeTab, loadSeasons, loadAllMembers]);

  useEffect(() => {
    if (activeTab === "seasons" && selectedSeasonId) {
      loadSeasonSummary();
    }
  }, [activeTab, selectedSeasonId, loadSeasonSummary]);

  // ── Load players for INTERNAL search ─────────────────────────────────────
  const loadPlayers = async () => {
    if (players.length > 0) return;
    try {
      setLoadingPlayers(true);
      const data = await playerService.getAllPlayers(true);
      setPlayers(data);
    } catch {
      toast.error("Failed to load players");
    } finally {
      setLoadingPlayers(false);
    }
  };

  // ── Update club ───────────────────────────────────────────────────────────
  const handleUpdateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicId || !clubForm.name.trim()) {
      toast.error("Club name is required");
      return;
    }
    setSavingClub(true);
    try {
      const updated = await clubService.updateClub(publicId, {
        name: clubForm.name.trim(),
        ownerName: clubForm.ownerName?.trim() || undefined,
        ownerContact: clubForm.ownerContact?.trim() || undefined,
        history: clubForm.history?.trim() || undefined,
      });
      setClub(updated);
      setShowEditClub(false);
      toast.success("Club updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update club");
    } finally {
      setSavingClub(false);
    }
  };

  // ── Add member ────────────────────────────────────────────────────────────
  const openAddMember = () => {
    setMemberForm(EMPTY_MEMBER_FORM);
    setPlayerSearch("");
    loadPlayers();
    setShowAddMember(true);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicId) return;
    if (memberForm.memberType === "INTERNAL" && !memberForm.playerPublicId) {
      toast.error("Please select a player");
      return;
    }
    if (memberForm.memberType === "EXTERNAL" && !memberForm.displayName?.trim()) {
      toast.error("Display name is required for external members");
      return;
    }
    setSavingMember(true);
    try {
      await clubService.addMember(publicId, {
        ...memberForm,
        displayName: memberForm.displayName?.trim() || undefined,
        photoUrl: memberForm.photoUrl?.trim() || undefined,
        dob: memberForm.dob || undefined,
        battingStyle: memberForm.battingStyle || undefined,
        bowlingStyle: memberForm.bowlingStyle || undefined,
        playerRole: memberForm.playerRole || undefined,
        gender: memberForm.gender || undefined,
      });
      toast.success("Member added");
      setShowAddMember(false);
      loadMembers(0, statusFilter);
      setMembersPage(0);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add member");
    } finally {
      setSavingMember(false);
    }
  };

  // ── Member detail ─────────────────────────────────────────────────────────
  const openMemberDetail = async (member: ClubMember) => {
    if (!publicId) return;
    try {
      setLoadingMemberDetail(true);
      const detail = await clubService.getMember(publicId, member.publicId);
      setSelectedMember(detail);
    } catch {
      toast.error("Failed to load member details");
    } finally {
      setLoadingMemberDetail(false);
    }
  };

  // ── Edit member ───────────────────────────────────────────────────────────
  const openEditMember = (member: ClubMember) => {
    setEditingMember(member);
    setEditMemberForm({
      memberType: member.memberType as "INTERNAL" | "EXTERNAL",
      playerPublicId: undefined,
      displayName: member.displayName ?? "",
      photoUrl: member.photoUrl ?? "",
      dob: member.dob ?? "",
      battingStyle: member.battingStyle ?? "",
      bowlingStyle: member.bowlingStyle ?? "",
      playerRole: member.playerRole ?? "",
      gender: member.gender ?? "",
      status: member.status,
    });
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicId || !editingMember) return;
    setUpdatingMember(true);
    try {
      const updated = await clubService.updateMember(
        publicId,
        editingMember.publicId,
        {
          ...editMemberForm,
          displayName: editMemberForm.displayName?.trim() || undefined,
          photoUrl: editMemberForm.photoUrl?.trim() || undefined,
          dob: editMemberForm.dob || undefined,
          battingStyle: editMemberForm.battingStyle || undefined,
          bowlingStyle: editMemberForm.bowlingStyle || undefined,
          playerRole: editMemberForm.playerRole || undefined,
          gender: editMemberForm.gender || undefined,
        },
      );
      toast.success("Member updated");
      setEditingMember(null);
      if (selectedMember?.publicId === updated.publicId) {
        setSelectedMember({ ...updated, honors: selectedMember.honors });
      }
      loadMembers(membersPage, statusFilter);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update member");
    } finally {
      setUpdatingMember(false);
    }
  };

  // ── Delete member ─────────────────────────────────────────────────────────
  const handleDeleteMember = async (memberPublicId: string) => {
    if (!publicId) return;
    setDeletingMemberId(memberPublicId);
    try {
      await clubService.deleteMember(publicId, memberPublicId);
      toast.success("Member removed");
      if (selectedMember?.publicId === memberPublicId) {
        setSelectedMember(null);
      }
      loadMembers(membersPage, statusFilter);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to remove member");
    } finally {
      setDeletingMemberId(null);
    }
  };

  // ── Add honor ─────────────────────────────────────────────────────────────
  const handleAddHonor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    if (!honorForm.title.trim()) {
      toast.error("Honor title is required");
      return;
    }
    if (!honorForm.year || honorForm.year < 1900 || honorForm.year > 2100) {
      toast.error("Year must be between 1900 and 2100");
      return;
    }
    setSavingHonor(true);
    try {
      await clubService.addHonor(selectedMember.publicId, {
        ...honorForm,
        title: honorForm.title.trim(),
        description: honorForm.description?.trim() || undefined,
      });
      toast.success("Honor added");
      setShowAddHonor(false);
      setHonorForm(EMPTY_HONOR_FORM);
      // Refresh member detail to get updated honors
      if (publicId) {
        const detail = await clubService.getMember(publicId, selectedMember.publicId);
        setSelectedMember(detail);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add honor");
    } finally {
      setSavingHonor(false);
    }
  };

  // ── Edit honor ────────────────────────────────────────────────────────────
  const openEditHonor = (honor: ClubHonor) => {
    setEditingHonor(honor);
    setEditHonorForm({
      level: honor.level,
      title: honor.title,
      description: honor.description ?? "",
      year: honor.year,
      isCurrent: honor.isCurrent ?? false,
    });
  };

  const handleUpdateHonor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHonor || !selectedMember || !publicId) return;
    if (!editHonorForm.title.trim()) {
      toast.error("Honor title is required");
      return;
    }
    setUpdatingHonor(true);
    try {
      await clubService.updateHonor(editingHonor.publicId, {
        ...editHonorForm,
        title: editHonorForm.title.trim(),
        description: editHonorForm.description?.trim() || undefined,
      });
      toast.success("Honor updated");
      setEditingHonor(null);
      const detail = await clubService.getMember(publicId, selectedMember.publicId);
      setSelectedMember(detail);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update honor");
    } finally {
      setUpdatingHonor(false);
    }
  };

  // ── Delete honor ──────────────────────────────────────────────────────────
  const handleDeleteHonor = async (honorPublicId: string) => {
    if (!selectedMember || !publicId) return;
    setDeletingHonorId(honorPublicId);
    try {
      await clubService.deleteHonor(honorPublicId);
      toast.success("Honor removed");
      const detail = await clubService.getMember(publicId, selectedMember.publicId);
      setSelectedMember(detail);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to remove honor");
    } finally {
      setDeletingHonorId(null);
    }
  };

  // ── Season handlers ───────────────────────────────────────────────────────
  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonForm.name.trim()) { toast.error("Season name is required"); return; }
    setSavingSeason(true);
    try {
      const created = await clubSeasonService.createSeason({
        name: newSeasonForm.name.trim(),
        startDate: newSeasonForm.startDate || undefined,
        endDate: newSeasonForm.endDate || undefined,
      });
      toast.success("Season created");
      setShowNewSeason(false);
      setNewSeasonForm({ name: "", startDate: "", endDate: "" });
      setSeasons((prev) => [created, ...prev]);
      setSelectedSeasonId(created.publicId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create season");
    } finally {
      setSavingSeason(false);
    }
  };

  const handleActivateSeason = async () => {
    if (!selectedSeasonId) return;
    setActivatingSeason(true);
    try {
      const updated = await clubSeasonService.activateSeason(selectedSeasonId);
      toast.success(`${updated.name} is now the current season`);
      setSeasons((prev) => prev.map((s) => ({ ...s, isCurrent: s.publicId === selectedSeasonId })));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to activate season");
    } finally {
      setActivatingSeason(false);
    }
  };

  const handleAddToSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicId || !selectedSeasonId || !squadAddForm.memberPublicId) {
      toast.error("Please select a member");
      return;
    }
    setSavingSquad(true);
    try {
      await clubSeasonService.addToSquad(publicId, selectedSeasonId, squadAddForm);
      toast.success("Added to squad");
      setShowAddToSquad(false);
      setSquadAddForm(EMPTY_SQUAD_FORM);
      await loadSeasonSummary();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add to squad");
    } finally {
      setSavingSquad(false);
    }
  };

  const handleUpdateSquadEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSquadEntry || !publicId || !selectedSeasonId) return;
    setUpdatingSquad(true);
    try {
      await clubSeasonService.updateSquadEntry(publicId, selectedSeasonId, editingSquadEntry.publicId, editSquadForm);
      toast.success("Roles updated");
      setEditingSquadEntry(null);
      await loadSeasonSummary();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update roles");
    } finally {
      setUpdatingSquad(false);
    }
  };

  const handleRemoveFromSquad = async (entryPublicId: string) => {
    if (!publicId || !selectedSeasonId) return;
    try {
      await clubSeasonService.removeFromSquad(publicId, selectedSeasonId, entryPublicId);
      toast.success("Removed from squad");
      await loadSeasonSummary();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to remove from squad");
    }
  };

  const handleSaveStats = async (matchType: "KSCA" | "PRACTICE") => {
    if (!publicId || !selectedSeasonId) return;
    const form = matchType === "KSCA" ? kscaForm : practiceForm;
    const setSaving = matchType === "KSCA" ? setSavingKsca : setSavingPractice;
    setSaving(true);
    try {
      await clubSeasonService.upsertStats(publicId, selectedSeasonId, matchType, {
        topScorerMemberPublicId: form.topScorerMemberPublicId || undefined,
        topScorerRuns: form.topScorerRuns ? parseInt(form.topScorerRuns, 10) : undefined,
        topWicketTakerMemberPublicId: form.topWicketTakerMemberPublicId || undefined,
        topWicketTakerWickets: form.topWicketTakerWickets ? parseInt(form.topWicketTakerWickets, 10) : undefined,
      });
      toast.success(`${matchType === "KSCA" ? "KSCA" : "Practice"} stats saved`);
      await loadSeasonSummary();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save stats");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStanding = async () => {
    if (!publicId || !selectedSeasonId) return;
    if (!standingForm.division) { toast.error("Division is required"); return; }
    setSavingStanding(true);
    try {
      await clubSeasonService.upsertStanding(publicId, selectedSeasonId, {
        division: parseInt(standingForm.division, 10),
        position: standingForm.position ? parseInt(standingForm.position, 10) : undefined,
        movement: standingForm.movement || undefined,
      });
      toast.success("Standing saved");
      await loadSeasonSummary();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save standing");
    } finally {
      setSavingStanding(false);
    }
  };

  const filteredPlayers = players.filter((p) =>
    p.displayName.toLowerCase().includes(playerSearch.toLowerCase()),
  );

  if (loadingClub) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Club not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-24">
      {/* HEADER BANNER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 shadow-md"
      >
        {/* Gradient accent band */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-4 pt-3 pb-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/admin/clubs")}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition flex-shrink-0"
              >
                <ArrowLeft size={18} />
              </button>

              {/* Crest badge */}
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-black text-xl leading-none">
                  {club.name.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-white leading-snug truncate">
                  {club.name}
                </h1>
                {club.ownerName && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Shield size={11} className="text-blue-200 flex-shrink-0" />
                    <span className="text-blue-100 text-xs truncate">{club.ownerName}</span>
                  </div>
                )}
              </div>

              {/* Current-season standing in header */}
              {club.currentStanding && (
                <div className="flex-shrink-0 hidden sm:block">
                  <AdminHeaderStandingBadge standing={club.currentStanding} />
                </div>
              )}
            </div>

            {/* Standing on mobile (below name row) */}
            {club.currentStanding && (
              <div className="mt-2 sm:hidden">
                <AdminHeaderStandingBadge standing={club.currentStanding} />
              </div>
            )}
          </div>
        </div>

        {/* Pill tab bar */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex gap-1 py-2 overflow-x-auto -mx-1 px-1">
              {(
                [
                  { id: "info", label: "Info", icon: Shield },
                  { id: "members", label: "Members", icon: Users },
                  { id: "attendance", label: "Attendance Today", icon: CalendarCheck },
                  { id: "seasons", label: "Seasons", icon: Star },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id);
                    setSelectedMember(null);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0 ${
                    activeTab === id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* ── INFO TAB ── */}
        {activeTab === "info" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Club Details</h2>
                <button
                  onClick={() => setShowEditClub(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit2 size={14} /> Edit
                </button>
              </div>
              <dl className="space-y-3">
                <InfoRow label="Name" value={club.name} />
                <InfoRow label="Owner" value={club.ownerName} />
                <InfoRow label="Contact" value={club.ownerContact} />
                {club.history && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                      History
                    </dt>
                    <dd className="text-sm text-slate-800 whitespace-pre-line">
                      {club.history}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
                <p className="text-xs text-slate-400">
                  Created by {club.createdBy} · {formatDate(club.createdAt)}
                </p>
                <p className="text-xs text-slate-400">
                  Last updated by {club.updatedBy} · {formatDate(club.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── MEMBERS TAB ── */}
        {activeTab === "members" && (
          <>
            {selectedMember ? (
              <MemberDetailView
                member={selectedMember}
                loading={loadingMemberDetail}
                onBack={() => setSelectedMember(null)}
                onEdit={openEditMember}
                onDelete={handleDeleteMember}
                deletingId={deletingMemberId}
                onAddHonor={() => { setHonorForm(EMPTY_HONOR_FORM); setShowAddHonor(true); }}
                onEditHonor={openEditHonor}
                onDeleteHonor={handleDeleteHonor}
                deletingHonorId={deletingHonorId}
                formatDate={formatDate}
              />
            ) : (
              <div className="space-y-4">
                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div className="flex gap-2">
                    {(["", "CURRENT", "ALUMNI"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => {
                          setStatusFilter(f);
                          setMembersPage(0);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          statusFilter === f
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {f === "" ? "All" : f === "CURRENT" ? "Current" : "Alumni"}
                      </button>
                    ))}
                    <span className="text-sm text-slate-500 self-center">
                      ({membersTotalElements})
                    </span>
                  </div>
                  <button
                    onClick={openAddMember}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                  >
                    <Plus size={16} /> Add Member
                  </button>
                </div>

                {/* Members list */}
                {loadingMembers ? (
                  <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
                    <Users size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-600 font-medium">No members found</p>
                    <button
                      onClick={openAddMember}
                      className="mt-3 text-blue-600 text-sm font-medium hover:underline"
                    >
                      Add first member
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {members.map((m) => (
                        <div
                          key={m.publicId}
                          className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3"
                        >
                          {m.photoUrl ? (
                            <img
                              src={m.photoUrl}
                              alt={m.displayName ?? "Member"}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-600 font-bold text-sm">
                                {(m.displayName ?? "?")[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => openMemberDetail(m)}
                              className="font-semibold text-slate-900 hover:text-blue-600 transition text-left"
                            >
                              {m.displayName ?? "—"}
                            </button>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-slate-500">
                                {m.memberType}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  m.status === "CURRENT"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {m.status}
                              </span>
                              {m.playerRole && (
                                <span className="text-xs text-slate-400">
                                  {m.playerRole}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => openEditMember(m)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(m.publicId)}
                              disabled={deletingMemberId === m.publicId}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                            >
                              {deletingMemberId === m.publicId ? (
                                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {membersTotalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 pt-2">
                        <button
                          onClick={() => setMembersPage((p) => Math.max(0, p - 1))}
                          disabled={membersPage === 0}
                          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm text-slate-600">
                          Page {membersPage + 1} of {membersTotalPages}
                        </span>
                        <button
                          onClick={() =>
                            setMembersPage((p) =>
                              Math.min(membersTotalPages - 1, p + 1),
                            )
                          }
                          disabled={membersPage >= membersTotalPages - 1}
                          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ── ATTENDANCE TAB ── */}
        {activeTab === "attendance" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Attendance Today
              </h2>
              <button
                onClick={loadAttendance}
                className="text-sm text-blue-600 hover:underline"
              >
                Refresh
              </button>
            </div>

            {loadingAttendance ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : attendance.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
                <CalendarCheck size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">
                  No attendance recorded today
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  Only internal members linked to players appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {attendance.map((entry, i) => (
                  <div
                    key={entry.playerPublicId ?? i}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
                  >
                    <div className="font-semibold text-slate-900 mb-2">
                      {entry.displayName ?? "—"}
                    </div>
                    {entry.sessions.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        No sessions recorded
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {entry.sessions.map((s, j) => (
                          <div
                            key={j}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
                              s.status === "PRESENT"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : s.status === "ABSENT"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-slate-50 text-slate-600 border border-slate-200"
                            }`}
                          >
                            <span className="font-medium">{s.batchName}</span>
                            <span>·</span>
                            <span>{s.status}</span>
                            {s.overridden && (
                              <span className="text-xs opacity-70">(overridden)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SEASONS TAB ── */}
        {activeTab === "seasons" && (
          <div className="space-y-4">
            {/* Season selector row */}
            <div className="flex items-center gap-2 flex-wrap">
              {loadingSeasons ? (
                <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <>
                  {seasons.map((s) => (
                    <button
                      key={s.publicId}
                      onClick={() => setSelectedSeasonId(s.publicId)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
                        selectedSeasonId === s.publicId
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {s.isCurrent && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            selectedSeasonId === s.publicId ? "bg-white" : "bg-emerald-500"
                          }`}
                        />
                      )}
                      {s.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowNewSeason(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 transition"
                  >
                    <Plus size={13} /> New Season
                  </button>
                </>
              )}
            </div>

            {seasons.length === 0 && !loadingSeasons && (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <CalendarCheck size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No seasons yet</p>
                <button
                  onClick={() => setShowNewSeason(true)}
                  className="mt-2 text-blue-600 text-sm font-medium hover:underline"
                >
                  Create first season
                </button>
              </div>
            )}

            {selectedSeasonId && (
              <>
                {/* Current / activate banner */}
                {seasons.find((s) => s.publicId === selectedSeasonId)?.isCurrent ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium text-emerald-700">Current Season</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3">
                    <span className="text-sm text-slate-500">Not the current season</span>
                    <button
                      onClick={handleActivateSeason}
                      disabled={activatingSeason}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition"
                    >
                      {activatingSeason ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Star size={13} />
                      )}
                      Set as Current
                    </button>
                  </div>
                )}

                {/* Squad + Stats side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Squad */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Users size={16} className="text-blue-600" />
                        Season Squad
                        {seasonSummary && seasonSummary.squad.length > 0 && (
                          <span className="text-xs text-slate-400 font-normal">
                            ({seasonSummary.squad.length})
                          </span>
                        )}
                      </h3>
                      <button
                        onClick={() => {
                          setSquadAddForm(EMPTY_SQUAD_FORM);
                          setShowAddToSquad(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        <Plus size={13} /> Add
                      </button>
                    </div>
                    <div className="p-3">
                      {loadingSummary ? (
                        <div className="flex justify-center py-10">
                          <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                      ) : !seasonSummary || seasonSummary.squad.length === 0 ? (
                        <p className="text-center text-sm text-slate-400 py-8">No players in squad yet</p>
                      ) : (
                        <div className="space-y-1.5">
                          {seasonSummary.squad.map((entry) => (
                            <div
                              key={entry.publicId}
                              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50"
                            >
                              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-sm overflow-hidden">
                                {entry.photoUrl ? (
                                  <img src={entry.photoUrl} className="w-9 h-9 object-cover" alt="" />
                                ) : (
                                  (entry.displayName ?? "?").charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {entry.displayName ?? "—"}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  {entry.isCaptain && <AdminRoleBadge role="C" />}
                                  {entry.isViceCaptain && <AdminRoleBadge role="VC" />}
                                  {entry.isWicketKeeper && <AdminRoleBadge role="WK" />}
                                  {entry.playerRole && (
                                    <span className="text-xs text-slate-400">
                                      {entry.playerRole.replace(/_/g, " ")}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingSquadEntry(entry);
                                    setEditSquadForm({
                                      memberPublicId: entry.memberPublicId,
                                      isCaptain: entry.isCaptain,
                                      isViceCaptain: entry.isViceCaptain,
                                      isWicketKeeper: entry.isWicketKeeper,
                                    });
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleRemoveFromSquad(entry.publicId)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats + Standing */}
                  <div className="space-y-3">
                    <AdminStatsCard
                      label="KSCA Matches"
                      matchType="KSCA"
                      form={kscaForm}
                      setForm={setKscaForm}
                      allMembers={allMembers}
                      saving={savingKsca}
                      onSave={() => handleSaveStats("KSCA")}
                    />
                    <AdminStatsCard
                      label="Practice Matches"
                      matchType="PRACTICE"
                      form={practiceForm}
                      setForm={setPracticeForm}
                      allMembers={allMembers}
                      saving={savingPractice}
                      onSave={() => handleSaveStats("PRACTICE")}
                    />
                    <AdminStandingCard
                      form={standingForm}
                      setForm={setStandingForm}
                      saving={savingStanding}
                      onSave={handleSaveStanding}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── EDIT CLUB MODAL ── */}
      {showEditClub && (
        <Modal title="Edit Club" onClose={() => setShowEditClub(false)}>
          <form onSubmit={handleUpdateClub} className="space-y-4">
            <ClubFormFields form={clubForm} onChange={setClubForm} />
            <ModalActions
              onCancel={() => setShowEditClub(false)}
              saving={savingClub}
              saveLabel="Save Changes"
            />
          </form>
        </Modal>
      )}

      {/* ── ADD MEMBER MODAL ── */}
      {showAddMember && (
        <Modal title="Add Member" onClose={() => setShowAddMember(false)}>
          <form onSubmit={handleAddMember} className="space-y-4">
            {/* Type selector */}
            <div className="flex gap-2">
              {(["INTERNAL", "EXTERNAL"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setMemberForm((prev) => ({ ...EMPTY_MEMBER_FORM, memberType: t, status: prev.status }))
                  }
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${
                    memberForm.memberType === t
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {t === "INTERNAL" ? "Academy Player" : "External Member"}
                </button>
              ))}
            </div>

            {memberForm.memberType === "INTERNAL" ? (
              <PlayerPicker
                players={players}
                loading={loadingPlayers}
                search={playerSearch}
                onSearch={setPlayerSearch}
                selectedId={memberForm.playerPublicId}
                onSelect={(id) =>
                  setMemberForm((prev) => ({ ...prev, playerPublicId: id }))
                }
                filteredPlayers={filteredPlayers}
              />
            ) : (
              <ExternalMemberFields
                form={memberForm}
                onChange={setMemberForm}
              />
            )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <select
                value={memberForm.status ?? "CURRENT"}
                onChange={(e) =>
                  setMemberForm((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              >
                <option value="CURRENT">Current</option>
                <option value="ALUMNI">Alumni</option>
              </select>
            </div>

            <ModalActions
              onCancel={() => setShowAddMember(false)}
              saving={savingMember}
              saveLabel="Add Member"
            />
          </form>
        </Modal>
      )}

      {/* ── EDIT MEMBER MODAL ── */}
      {editingMember && (
        <Modal title="Edit Member" onClose={() => setEditingMember(null)}>
          <form onSubmit={handleUpdateMember} className="space-y-4">
            {editingMember.memberType === "EXTERNAL" && (
              <ExternalMemberFields
                form={editMemberForm}
                onChange={setEditMemberForm}
              />
            )}
            {editingMember.memberType === "INTERNAL" && (
              <p className="text-sm text-slate-500 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                Display fields are read from the linked player profile and cannot be edited here.
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <select
                value={editMemberForm.status ?? "CURRENT"}
                onChange={(e) =>
                  setEditMemberForm((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              >
                <option value="CURRENT">Current</option>
                <option value="ALUMNI">Alumni</option>
              </select>
            </div>
            <ModalActions
              onCancel={() => setEditingMember(null)}
              saving={updatingMember}
              saveLabel="Save Changes"
            />
          </form>
        </Modal>
      )}

      {/* ── ADD HONOR MODAL ── */}
      {showAddHonor && selectedMember && (
        <Modal
          title={`Add Honor — ${selectedMember.displayName ?? "Member"}`}
          onClose={() => setShowAddHonor(false)}
        >
          <form onSubmit={handleAddHonor} className="space-y-4">
            <HonorFormFields form={honorForm} onChange={setHonorForm} />
            <ModalActions
              onCancel={() => setShowAddHonor(false)}
              saving={savingHonor}
              saveLabel="Add Honor"
            />
          </form>
        </Modal>
      )}

      {/* ── EDIT HONOR MODAL ── */}
      {editingHonor && (
        <Modal title="Edit Honor" onClose={() => setEditingHonor(null)}>
          <form onSubmit={handleUpdateHonor} className="space-y-4">
            <HonorFormFields form={editHonorForm} onChange={setEditHonorForm} />
            <ModalActions
              onCancel={() => setEditingHonor(null)}
              saving={updatingHonor}
              saveLabel="Save Changes"
            />
          </form>
        </Modal>
      )}

      {/* ── NEW SEASON MODAL ── */}
      {showNewSeason && (
        <Modal
          title="New Season"
          onClose={() => {
            setShowNewSeason(false);
            setNewSeasonForm({ name: "", startDate: "", endDate: "" });
          }}
        >
          <form onSubmit={handleCreateSeason} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Season Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newSeasonForm.name}
                onChange={(e) => setNewSeasonForm((p) => ({ ...p, name: e.target.value }))}
                maxLength={20}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                placeholder="e.g., 2024-25"
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1">Max 20 characters</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={newSeasonForm.startDate}
                  onChange={(e) => setNewSeasonForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={newSeasonForm.endDate}
                  onChange={(e) => setNewSeasonForm((p) => ({ ...p, endDate: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-sm"
                />
              </div>
            </div>
            <ModalActions
              onCancel={() => {
                setShowNewSeason(false);
                setNewSeasonForm({ name: "", startDate: "", endDate: "" });
              }}
              saving={savingSeason}
              saveLabel="Create Season"
            />
          </form>
        </Modal>
      )}

      {/* ── ADD TO SQUAD MODAL ── */}
      {showAddToSquad && (
        <Modal title="Add to Squad" onClose={() => setShowAddToSquad(false)}>
          <form onSubmit={handleAddToSquad} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Member <span className="text-red-500">*</span>
              </label>
              <select
                value={squadAddForm.memberPublicId}
                onChange={(e) =>
                  setSquadAddForm((p) => ({ ...p, memberPublicId: e.target.value }))
                }
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              >
                <option value="">— Select member —</option>
                {allMembers.map((m) => (
                  <option key={m.publicId} value={m.publicId}>
                    {m.displayName ?? m.publicId}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2.5">
              <p className="text-sm font-medium text-slate-700">Roles</p>
              {(
                [
                  { field: "isCaptain", label: "Captain (C)" },
                  { field: "isViceCaptain", label: "Vice Captain (VC)" },
                  { field: "isWicketKeeper", label: "Wicket Keeper (WK)" },
                ] as const
              ).map(({ field, label }) => (
                <label key={field} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={squadAddForm[field]}
                    onChange={(e) =>
                      setSquadAddForm((p) => ({ ...p, [field]: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-slate-300 accent-blue-600"
                  />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
            <ModalActions
              onCancel={() => setShowAddToSquad(false)}
              saving={savingSquad}
              saveLabel="Add to Squad"
            />
          </form>
        </Modal>
      )}

      {/* ── EDIT SQUAD ROLES MODAL ── */}
      {editingSquadEntry && (
        <Modal
          title={`Edit Roles — ${editingSquadEntry.displayName ?? "Member"}`}
          onClose={() => setEditingSquadEntry(null)}
        >
          <form onSubmit={handleUpdateSquadEntry} className="space-y-4">
            <div className="space-y-2.5">
              {(
                [
                  { field: "isCaptain", label: "Captain (C)" },
                  { field: "isViceCaptain", label: "Vice Captain (VC)" },
                  { field: "isWicketKeeper", label: "Wicket Keeper (WK)" },
                ] as const
              ).map(({ field, label }) => (
                <label key={field} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editSquadForm[field]}
                    onChange={(e) =>
                      setEditSquadForm((p) => ({ ...p, [field]: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-slate-300 accent-blue-600"
                  />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
            <ModalActions
              onCancel={() => setEditingSquadEntry(null)}
              saving={updatingSquad}
              saveLabel="Save Roles"
            />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Season sub-components ─────────────────────────────────────────────────────

function AdminRoleBadge({ role }: { role: "C" | "VC" | "WK" }) {
  const styles = { C: "bg-amber-100 text-amber-800", VC: "bg-blue-100 text-blue-700", WK: "bg-teal-100 text-teal-700" } as const;
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${styles[role]}`}>{role}</span>;
}

function AdminStatsCard({
  label,
  matchType,
  form,
  setForm,
  allMembers,
  saving,
  onSave,
}: {
  label: string;
  matchType: "KSCA" | "PRACTICE";
  form: { topScorerMemberPublicId: string; topScorerRuns: string; topWicketTakerMemberPublicId: string; topWicketTakerWickets: string };
  setForm: React.Dispatch<React.SetStateAction<{ topScorerMemberPublicId: string; topScorerRuns: string; topWicketTakerMemberPublicId: string; topWicketTakerWickets: string }>>;
  allMembers: ClubMember[];
  saving: boolean;
  onSave: () => void;
}) {
  const isKsca = matchType === "KSCA";
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`px-4 py-2.5 border-b border-slate-100 ${isKsca ? "bg-blue-50" : "bg-slate-50"}`}>
        <h4 className={`text-xs font-semibold uppercase tracking-wide ${isKsca ? "text-blue-700" : "text-slate-600"}`}>
          {label}
        </h4>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1.5">🏏 Top Scorer</p>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.topScorerMemberPublicId}
              onChange={(e) => setForm((p) => ({ ...p, topScorerMemberPublicId: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            >
              <option value="">— Member —</option>
              {allMembers.map((m) => (
                <option key={m.publicId} value={m.publicId}>{m.displayName ?? m.publicId}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Runs"
              value={form.topScorerRuns}
              onChange={(e) => setForm((p) => ({ ...p, topScorerRuns: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1.5">⚾ Top Wicket-Taker</p>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.topWicketTakerMemberPublicId}
              onChange={(e) => setForm((p) => ({ ...p, topWicketTakerMemberPublicId: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            >
              <option value="">— Member —</option>
              {allMembers.map((m) => (
                <option key={m.publicId} value={m.publicId}>{m.displayName ?? m.publicId}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Wickets"
              value={form.topWicketTakerWickets}
              onChange={(e) => setForm((p) => ({ ...p, topWicketTakerWickets: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Save {isKsca ? "KSCA" : "Practice"} Stats
        </button>
      </div>
    </div>
  );
}

function AdminStandingCard({
  form,
  setForm,
  saving,
  onSave,
}: {
  form: { division: string; position: string; movement: string };
  setForm: React.Dispatch<React.SetStateAction<{ division: string; position: string; movement: string }>>;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 bg-indigo-50">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
          Season Standing
        </h4>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs font-medium text-slate-600 mb-1.5">Division</p>
            <select
              value={form.division}
              onChange={(e) => setForm((p) => ({ ...p, division: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            >
              <option value="">— Select —</option>
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>Division {d}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-600 mb-1.5">Position</p>
            <input
              type="number"
              placeholder="e.g. 1"
              min={1}
              value={form.position}
              onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1.5">Movement</p>
          <select
            value={form.movement}
            onChange={(e) => setForm((p) => ({ ...p, movement: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          >
            <option value="">— Not set —</option>
            <option value="PROMOTED">↑ Promoted</option>
            <option value="RETAINED">→ Retained</option>
            <option value="RELEGATED">↓ Relegated</option>
          </select>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {saving ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Save Standing
        </button>
      </div>
    </div>
  );
}

// ── Member detail view ────────────────────────────────────────────────────────
function MemberDetailView({
  member,
  loading,
  onBack,
  onEdit,
  onDelete,
  deletingId,
  onAddHonor,
  onEditHonor,
  onDeleteHonor,
  deletingHonorId,
  formatDate,
}: {
  member: ClubMember;
  loading: boolean;
  onBack: () => void;
  onEdit: (m: ClubMember) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  onAddHonor: () => void;
  onEditHonor: (h: ClubHonor) => void;
  onDeleteHonor: (id: string) => void;
  deletingHonorId: string | null;
  formatDate: (iso: string) => string;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition"
      >
        <ChevronLeft size={16} /> Back to members
      </button>

      {/* Member info card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start gap-4">
          {member.photoUrl ? (
            <img
              src={member.photoUrl}
              alt={member.displayName ?? "Member"}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold text-xl">
                {(member.displayName ?? "?")[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {member.displayName ?? "—"}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-slate-500">{member.memberType}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      member.status === "CURRENT"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {member.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onEdit(member)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => onDelete(member.publicId)}
                  disabled={deletingId === member.publicId}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                >
                  {deletingId === member.publicId ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={15} />
                  )}
                </button>
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
              {member.dob && <InfoRow label="DOB" value={formatDate(member.dob)} />}
              {member.gender && <InfoRow label="Gender" value={member.gender} />}
              {member.battingStyle && <InfoRow label="Batting" value={member.battingStyle} />}
              {member.bowlingStyle && <InfoRow label="Bowling" value={member.bowlingStyle} />}
              {member.playerRole && <InfoRow label="Role" value={member.playerRole} />}
            </dl>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
          <p className="text-xs text-slate-400">
            Created by {member.createdBy} · {formatDate(member.createdAt)}
          </p>
          <p className="text-xs text-slate-400">
            Last updated by {member.updatedBy} · {formatDate(member.updatedAt)}
          </p>
        </div>
      </div>

      {/* Honors */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Award size={18} className="text-amber-500" />
            Honors
          </h3>
          <button
            onClick={onAddHonor}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={14} /> Add
          </button>
        </div>
        {!member.honors || member.honors.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            No honors recorded yet
          </p>
        ) : (
          <div className="space-y-3">
            {member.honors.map((honor) => (
              <div
                key={honor.publicId}
                className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">
                      {honor.title}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 font-medium">
                      {honor.level.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-slate-500">{honor.year}</span>
                    {honor.isCurrent && (
                      <span className="flex items-center gap-0.5 text-xs text-emerald-700">
                        <CheckCircle size={12} /> Current
                      </span>
                    )}
                  </div>
                  {honor.description && (
                    <p className="text-xs text-slate-600 mt-1">{honor.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1.5">
                    Added by {honor.createdBy} · {formatDate(honor.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onEditHonor(honor)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => onDeleteHonor(honor.publicId)}
                    disabled={deletingHonorId === honor.publicId}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                  >
                    {deletingHonorId === honor.publicId ? (
                      <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small sub-components ──────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800 mt-0.5">{value}</dd>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
}

function ModalActions({
  onCancel,
  saving,
  saveLabel,
}: {
  onCancel: () => void;
  saving: boolean;
  saveLabel: string;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {saving ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <><Save size={16} /> {saveLabel}</>
        )}
      </button>
    </div>
  );
}

function ClubFormFields({
  form,
  onChange,
}: {
  form: ClubRequest;
  onChange: React.Dispatch<React.SetStateAction<ClubRequest>>;
}) {
  const set = (field: keyof ClubRequest, value: string) =>
    onChange((prev) => ({ ...prev, [field]: value }));
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Club Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          maxLength={255}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          placeholder="e.g., Royal Challengers CC"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Owner Name
        </label>
        <input
          type="text"
          value={form.ownerName ?? ""}
          onChange={(e) => set("ownerName", e.target.value)}
          maxLength={255}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Owner Contact
        </label>
        <input
          type="text"
          value={form.ownerContact ?? ""}
          onChange={(e) => set("ownerContact", e.target.value)}
          maxLength={255}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          History
        </label>
        <textarea
          value={form.history ?? ""}
          onChange={(e) => set("history", e.target.value)}
          rows={4}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none"
          placeholder="Brief club history..."
        />
      </div>
    </>
  );
}

function PlayerPicker({
  players,
  loading,
  search,
  onSearch,
  selectedId,
  onSelect,
  filteredPlayers,
}: {
  players: Player[];
  loading: boolean;
  search: string;
  onSearch: (s: string) => void;
  selectedId?: string;
  onSelect: (id: string) => void;
  filteredPlayers: Player[];
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-slate-500 text-sm">
        <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
        Loading players...
      </div>
    );
  }
  const selected = players.find((p) => p.publicId === selectedId);
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        Select Player <span className="text-red-500">*</span>
      </label>
      {selected && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle size={16} className="text-emerald-600" />
          <span className="text-sm font-medium text-emerald-800">
            {selected.displayName}
          </span>
          <button
            type="button"
            onClick={() => onSelect("")}
            className="ml-auto text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-sm"
          placeholder="Search by name..."
        />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
        {filteredPlayers.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No players found</p>
        ) : (
          filteredPlayers.slice(0, 50).map((p) => (
            <button
              key={p.publicId}
              type="button"
              onClick={() => onSelect(p.publicId)}
              className={`w-full text-left px-3 py-2.5 text-sm transition ${
                selectedId === p.publicId
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "hover:bg-slate-50 text-slate-800"
              }`}
            >
              {p.displayName}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function ExternalMemberFields({
  form,
  onChange,
}: {
  form: ClubMemberRequest;
  onChange: React.Dispatch<React.SetStateAction<ClubMemberRequest>>;
}) {
  const set = (field: keyof ClubMemberRequest, value: string | boolean) =>
    onChange((prev) => ({ ...prev, [field]: value }));

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Display Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.displayName ?? ""}
          onChange={(e) => set("displayName", e.target.value)}
          maxLength={255}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          placeholder="Full name"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Date of Birth
          </label>
          <input
            type="date"
            value={form.dob ?? ""}
            onChange={(e) => set("dob", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Gender
          </label>
          <select
            value={form.gender ?? ""}
            onChange={(e) => set("gender", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-sm"
          >
            <option value="">— Select —</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Batting Style
          </label>
          <select
            value={form.battingStyle ?? ""}
            onChange={(e) => set("battingStyle", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-sm"
          >
            <option value="">— Select —</option>
            {BATTING_STYLES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Bowling Style
          </label>
          <select
            value={form.bowlingStyle ?? ""}
            onChange={(e) => set("bowlingStyle", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-sm"
          >
            <option value="">— Select —</option>
            {BOWLING_STYLES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Player Role
        </label>
        <select
          value={form.playerRole ?? ""}
          onChange={(e) => set("playerRole", e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
        >
          <option value="">— Select —</option>
          {PLAYER_ROLES.map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Photo URL
        </label>
        <input
          type="url"
          value={form.photoUrl ?? ""}
          onChange={(e) => set("photoUrl", e.target.value)}
          maxLength={500}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          placeholder="https://..."
        />
      </div>
    </>
  );
}

function HonorFormFields({
  form,
  onChange,
}: {
  form: ClubHonorRequest;
  onChange: React.Dispatch<React.SetStateAction<ClubHonorRequest>>;
}) {
  const set = <K extends keyof ClubHonorRequest>(field: K, value: ClubHonorRequest[K]) =>
    onChange((prev) => ({ ...prev, [field]: value }));

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Level <span className="text-red-500">*</span>
        </label>
        <select
          value={form.level}
          onChange={(e) => set("level", e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
        >
          {HONOR_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={255}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          placeholder="e.g., Selected for U19 Karnataka squad"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Year <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.year}
            onChange={(e) => set("year", parseInt(e.target.value) || new Date().getFullYear())}
            min={1900}
            max={2100}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isCurrent ?? false}
              onChange={(e) => set("isCurrent", e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-blue-600"
            />
            <span className="text-sm text-slate-700">Currently active</span>
          </label>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Description <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={form.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none"
          placeholder="Additional context..."
        />
      </div>
    </>
  );
}

export default ClubDetailPage;
