import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  TrendingUp,
  Settings,
  ArrowLeft,
} from "lucide-react";
import AttendanceRow from "../../components/attendance-component/AttendanceRow";
import Button from "../../components/Button";
import api from "../../api/axios";
import { submitBulkAttendance, overrideAttendance } from "../../api/attendance";
import {
  fetchActiveBatches,
  formatBatchTimeRange,
} from "../../api/batchService";
import { toast } from "react-hot-toast";
import AttendanceOverrideModal from "../../components/attendance-component/AttendanceOverrideModal";
import type { Batch } from "../../types/batch.types";
import {
  playerService,
  type Player,
} from "../../api/playerService/playerService";

type AttendanceStatus = "PRESENT" | "ABSENT";

type SessionStatus = {
  locked: boolean;
  editable: boolean;
  sessionExists: boolean;
  attendanceMarked: boolean;
};

type AttendanceRecord = {
  attendanceRecordId: string;
  status: AttendanceStatus;
  overridden: boolean;
};

function AttendancePage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  // State
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState<SessionStatus>({
    locked: false,
    editable: true,
    sessionExists: false,
    attendanceMarked: false,
  });
  const [overrideTarget, setOverrideTarget] = useState<{
    playerId: string;
    playerName: string;
  } | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // User role
  const userRole = localStorage.getItem("userRole");
  const isSuperAdmin = userRole === "ROLE_SUPER_ADMIN";

  // Editable logic
  const canEdit = session.attendanceMarked ? isSuperAdmin : session.editable;

  // Format date
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  // ✅ Birthday check (uses players directly, not filteredPlayers)
  const birthdayPlayers = useMemo(() => {
    if (!selectedBatchId) return [];

    try {
      const today = new Date();
      const todayMMDD = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      return players
        .filter((player) => {
          if (!player.dob) return false;
          if (!player.batches || !Array.isArray(player.batches)) return false;

          const isInBatch = player.batches.some(
            (b) => b.id === selectedBatchId,
          );
          if (!isInBatch) return false;

          const playerMMDD = player.dob.substring(5);
          return playerMMDD === todayMMDD;
        })
        .map((player) => {
          const year = parseInt(player.dob!.substring(0, 4));
          const age = today.getFullYear() - year;

          return {
            playerName: player.displayName,
            playerId: player.id,
            age,
          };
        });
    } catch (error) {
      console.error("Error calculating birthdays:", error);
      return [];
    }
  }, [players, selectedBatchId]);

  /* ==================== LOAD DATA ==================== */

  // Load batches
  useEffect(() => {
    fetchActiveBatches("REGULAR").then((data) => {
      setBatches(data);
      if (data.length > 0 && !selectedBatchId) {
        setSelectedBatchId(data[0].id);
      }
    });
  }, []);

  // Load players
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setIsLoadingPlayers(true);
        const players = await playerService.getAllPlayers(true);
        setPlayers(players);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load players");
      } finally {
        setIsLoadingPlayers(false);
      }
    };

    loadPlayers();
  }, []);

  const loadSessionStatus = useCallback(() => {
    if (!selectedBatchId) return;

    api
      .get("/admin/attendance/status", {
        params: { date: today, batchId: selectedBatchId },
      })
      .then((res) => {
        setSession(res.data);
        if (!res.data.attendanceMarked) {
          setRecords({});
        }
      })
      .catch(() =>
        setSession({
          locked: false,
          editable: true,
          sessionExists: false,
          attendanceMarked: false,
        }),
      );
  }, [today, selectedBatchId]);

  useEffect(() => {
    loadSessionStatus();
  }, [loadSessionStatus]);

  useEffect(() => {
    if (!session.attendanceMarked) {
      setAttendance({});
    }
  }, [selectedBatchId, session.attendanceMarked]);

  useEffect(() => {
    if (!session.attendanceMarked || !selectedBatchId) return;

    api
      .get("/admin/attendance/records", {
        params: { date: today, batchId: selectedBatchId },
      })
      .then((res) => {
        const map: Record<string, AttendanceRecord> = {};
        const idCaseMap: Record<string, string> = {}; // ✅ Track original case

        res.data.forEach((r: any) => {
          const lowerId = String(r.playerId).toLowerCase();
          const originalId = String(r.playerId); // ✅ Keep original case

          map[lowerId] = {
            attendanceRecordId: r.attendanceRecordId,
            status: r.status,
            overridden: r.overridden,
          };

          idCaseMap[lowerId] = originalId; // ✅ Map lowercase to original
        });

        setRecords(map);

        if (isSuperAdmin) {
          const editableAttendance: Record<string, AttendanceStatus> = {};
          Object.entries(map).forEach(([lowerPlayerId, record]) => {
            const originalPlayerId = idCaseMap[lowerPlayerId]; // ✅ Use original case
            editableAttendance[originalPlayerId] = record.status;
          });
          setAttendance(editableAttendance);
        }
      });
  }, [session.attendanceMarked, selectedBatchId, today, isSuperAdmin]);

  /* ==================== FILTER PLAYERS ==================== */

  const filteredPlayers = useMemo(() => {
    if (!selectedBatchId) return [];

    return players.filter((p) => {
      const matchesSearch = p.displayName
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesBatch =
        p.batches?.some((b) => b.id === selectedBatchId) ?? false;

      return matchesSearch && matchesBatch;
    });
  }, [players, search, selectedBatchId]);

  /* ==================== HANDLERS ==================== */

  const handleChange = (playerId: string, status: AttendanceStatus) => {
    if (!canEdit) return;
    setAttendance((p) => ({ ...p, [playerId]: status }));
  };

  const { presentCount, absentCount, unmarkedCount } = useMemo(() => {
    let present = 0;
    let absent = 0;
    let unmarked = 0;

    filteredPlayers.forEach((p) => {
      const value = session.attendanceMarked
        ? isSuperAdmin
          ? attendance[p.id]
          : records[p.id.toLowerCase()]?.status
        : attendance[p.id];

      if (value === "PRESENT") present++;
      else if (value === "ABSENT") absent++;
      else unmarked++;
    });

    return {
      presentCount: present,
      absentCount: absent,
      unmarkedCount: unmarked,
    };
  }, [
    filteredPlayers,
    attendance,
    records,
    session.attendanceMarked,
    isSuperAdmin,
  ]);

  const markAll = (status: AttendanceStatus) => {
    if (!canEdit) return;

    const confirmed = window.confirm(
      `Mark ALL ${filteredPlayers.length} filtered players as ${status}?`,
    );
    if (!confirmed) return;

    const updates: Record<string, AttendanceStatus> = {};
    filteredPlayers.forEach((p) => {
      updates[p.id] = status;
    });

    setAttendance((prev) => ({ ...prev, ...updates }));
    toast.success(`Marked ${filteredPlayers.length} players as ${status}`);
  };

  const handleSubmit = async () => {
    if (!canEdit || isSubmitting || !selectedBatchId) return;

    const payload = Object.entries(attendance).map(([playerId, status]) => ({
      playerId,
      status,
    }));

    if (!payload.length) {
      toast.error("No attendance marked");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitBulkAttendance({
        date: today,
        batchId: selectedBatchId,
        records: payload,
      });

      setShowSuccessDialog(true);

      if (!isSuperAdmin) {
        setAttendance({});
      }

      await loadSessionStatus();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to save attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmOverride = async (reason: string) => {
    if (!overrideTarget) return;

    const key = overrideTarget.playerId.toLowerCase();
    const record = records[key];

    if (!record) {
      toast.error("Attendance record not found");
      return;
    }

    try {
      await overrideAttendance({
        attendanceRecordId: record.attendanceRecordId,
        newStatus: record.status === "PRESENT" ? "ABSENT" : "PRESENT",
        reason,
      });

      toast.success("Attendance overridden");
      setOverrideTarget(null);
      await loadSessionStatus();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Failed to override attendance",
      );
    }
  };

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  /* ==================== RENDER ==================== */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-20">
      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm animate-fade-in">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/admin")}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-600" size={28} />
                  Attendance
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  {formatDate(today)}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate("/admin/batches")}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all"
                title="Manage Batches"
              >
                <Settings size={18} />
                <span className="hidden sm:inline">Batches</span>
              </button>

              <button
                onClick={() => navigate("/admin/attendance/stats")}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
              >
                <TrendingUp size={18} />
                <span className="hidden sm:inline">Analytics</span>
              </button>
            </div>
          </div>

          {/* BIRTHDAY BANNER */}
          {birthdayPlayers.length > 0 && (
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg px-4 py-3 mb-3">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🎂</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-pink-800 mb-1">
                    🎉 Birthday{birthdayPlayers.length > 1 ? "s" : ""} Today!
                  </p>
                  <div className="space-y-1">
                    {birthdayPlayers.map((player) => (
                      <p
                        key={player.playerId}
                        className="text-sm text-pink-700"
                      >
                        <strong>{player.playerName}</strong> is turning{" "}
                        {player.age} today! 🎈
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STATUS BANNER */}
          {!session.attendanceMarked && selectedBatch && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <Sparkles className="text-emerald-600" size={20} />
              <p className="text-sm text-emerald-800 font-medium">
                Attendance not yet taken for {selectedBatch.name}
              </p>
            </div>
          )}

          {session.attendanceMarked && !isSuperAdmin && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <Clock className="text-amber-600" size={20} />
              <p className="text-sm text-amber-800 font-medium">
                Attendance already taken (view only)
              </p>
            </div>
          )}

          {session.attendanceMarked && isSuperAdmin && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <Sparkles className="text-purple-600" size={20} />
              <p className="text-sm text-purple-800 font-medium">
                Super Admin: You can edit this attendance
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">
              Total Players
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {filteredPlayers.length}
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs text-emerald-700 uppercase tracking-wide mb-1 flex items-center gap-1">
              <CheckCircle2 size={14} />
              Present
            </p>
            <p className="text-3xl font-bold text-emerald-700">
              {presentCount}
            </p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs text-red-700 uppercase tracking-wide mb-1 flex items-center gap-1">
              <XCircle size={14} />
              Absent
            </p>
            <p className="text-3xl font-bold text-red-700">{absentCount}</p>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">
              Unmarked
            </p>
            <p className="text-3xl font-bold text-slate-700">{unmarkedCount}</p>
          </div>
        </div>

        {/* SEARCH & BATCH FILTERS */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base"
            />
          </div>

          {/* Batch Filters */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Select Batch
            </label>
            <div className="flex flex-wrap gap-2">
              {batches.map((batch) => (
                <button
                  key={batch.id}
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={`px-4 py-2.5 rounded-full font-medium transition-all ${
                    selectedBatchId === batch.id
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                  style={
                    selectedBatchId === batch.id
                      ? {
                          background: `linear-gradient(135deg, ${batch.color}dd, ${batch.color})`,
                        }
                      : {}
                  }
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${selectedBatchId === batch.id ? "bg-white" : ""}`}
                      style={
                        selectedBatchId !== batch.id
                          ? { backgroundColor: batch.color }
                          : {}
                      }
                    />
                    <span>{batch.name}</span>
                    <span className="text-xs opacity-75">
                      ({formatBatchTimeRange(batch)})
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          {canEdit && (
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => markAll("PRESENT")}>
                <CheckCircle2 size={18} className="inline mr-2" />
                Present All
              </Button>
              <Button variant="secondary" onClick={() => markAll("ABSENT")}>
                <XCircle size={18} className="inline mr-2" />
                Absent All
              </Button>
            </div>
          )}
        </div>

        {/* PLAYER LIST */}
        <div className="space-y-2">
          {isLoadingPlayers ? (
            <div className="text-center py-12">
              <p className="text-slate-500">Loading players...</p>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">
                {selectedBatchId
                  ? "No players found in this batch"
                  : "Please select a batch"}
              </p>
            </div>
          ) : (
            filteredPlayers.map((player) => (
              <AttendanceRow
                key={player.id}
                player={player}
                value={
                  session.attendanceMarked && isSuperAdmin
                    ? attendance[player.id]
                    : session.attendanceMarked
                      ? records[player.id.toLowerCase()]?.status
                      : attendance[player.id]
                }
                disabled={!canEdit}
                onChange={handleChange}
                canOverride={isSuperAdmin && !canEdit}
                onOverride={
                  isSuperAdmin && !canEdit
                    ? () =>
                        setOverrideTarget({
                          playerId: player.id,
                          playerName: player.displayName,
                        })
                    : undefined
                }
              />
            ))
          )}
        </div>

        {/* SAVE BUTTON */}
        {canEdit && selectedBatchId && (
          <div className="sticky bottom-4 z-20">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || Object.keys(attendance).length === 0}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-4 rounded-xl shadow-lg shadow-emerald-200 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        )}
      </div>

      {/* MODALS */}
      <AttendanceOverrideModal
        open={!!overrideTarget}
        playerName={overrideTarget?.playerName || ""}
        onClose={() => setOverrideTarget(null)}
        onConfirm={confirmOverride}
      />

      {showSuccessDialog && selectedBatch && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-scale-in">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="text-emerald-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Attendance Saved!
              </h2>
              <p className="text-slate-600">
                Attendance for <strong>{selectedBatch.name}</strong> has been
                saved successfully.
              </p>
              <Button
                variant="primary"
                onClick={() => setShowSuccessDialog(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendancePage;
