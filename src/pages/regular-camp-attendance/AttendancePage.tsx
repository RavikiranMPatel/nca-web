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
  ChevronLeft,
  ChevronRight,
  Calendar,
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
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);

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

  const userRole = localStorage.getItem("userRole");
  const isSuperAdmin = userRole === "ROLE_SUPER_ADMIN";

  const canEdit = isSuperAdmin || session.editable;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const birthdayPlayers = useMemo(() => {
    if (!selectedBatchId) return [];
    try {
      const now = new Date();
      const todayMMDD = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      return players
        .filter((player) => {
          if (!player.dob) return false;
          if (!player.batches || !Array.isArray(player.batches)) return false;
          const isInBatch = player.batches.some(
            (b) => b.id === selectedBatchId,
          );
          if (!isInBatch) return false;
          return player.dob.substring(5) === todayMMDD;
        })
        .map((player) => ({
          playerName: player.displayName,
          playerId: player.id,
          age: now.getFullYear() - parseInt(player.dob!.substring(0, 4)),
        }));
    } catch {
      return [];
    }
  }, [players, selectedBatchId]);

  useEffect(() => {
    fetchActiveBatches("REGULAR").then((data) => {
      setBatches(data);
      if (data.length > 0 && !selectedBatchId) setSelectedBatchId(data[0].id);
    });
  }, []);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setIsLoadingPlayers(true);
        const p = await playerService.getAllPlayers(true);
        setPlayers(p);
      } catch {
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
        params: { date: selectedDate, batchId: selectedBatchId },
      })
      .then((res) => {
        setSession(res.data);
        if (!res.data.attendanceMarked) setRecords({});
      })
      .catch(() =>
        setSession({
          locked: false,
          editable: true,
          sessionExists: false,
          attendanceMarked: false,
        }),
      );
  }, [selectedDate, selectedBatchId]);

  useEffect(() => {
    setAttendance({});
    setRecords({});
  }, [selectedDate]);

  useEffect(() => {
    loadSessionStatus();
  }, [loadSessionStatus]);

  useEffect(() => {
    if (!session.attendanceMarked) setAttendance({});
  }, [selectedBatchId, session.attendanceMarked]);

  useEffect(() => {
    if (!session.attendanceMarked || !selectedBatchId) return;
    api
      .get("/admin/attendance/records", {
        params: { date: selectedDate, batchId: selectedBatchId },
      })
      .then((res) => {
        const map: Record<string, AttendanceRecord> = {};
        const idCaseMap: Record<string, string> = {};
        res.data.forEach((r: any) => {
          const lowerId = String(r.playerId).toLowerCase();
          map[lowerId] = {
            attendanceRecordId: r.attendanceRecordId,
            status: r.status,
            overridden: r.overridden,
          };
          idCaseMap[lowerId] = String(r.playerId);
        });
        setRecords(map);
        if (isSuperAdmin) {
          const editable: Record<string, AttendanceStatus> = {};
          Object.entries(map).forEach(([lId, rec]) => {
            editable[idCaseMap[lId]] = rec.status;
          });
          setAttendance(editable);
        }
      });
  }, [session.attendanceMarked, selectedBatchId, selectedDate, isSuperAdmin]);

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

  const handleChange = (playerId: string, status: AttendanceStatus) => {
    if (!canEdit) return;
    setAttendance((p) => ({ ...p, [playerId]: status }));
  };

  const { presentCount, absentCount, unmarkedCount } = useMemo(() => {
    let present = 0,
      absent = 0,
      unmarked = 0;
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
        date: selectedDate,
        batchId: selectedBatchId,
        records: payload,
      });
      setShowSuccessDialog(true);
      if (!isSuperAdmin) setAttendance({});
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

  /* ─────────────────── RENDER ─────────────────── */

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* ── STICKY HEADER ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {/* Row 1: back + title + action buttons */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => navigate("/admin")}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition flex-shrink-0"
            >
              <ArrowLeft size={17} />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <CheckCircle2
                  size={18}
                  className="text-emerald-600 flex-shrink-0"
                />
                <h1 className="text-base font-bold text-gray-900 truncate">
                  Attendance
                </h1>
              </div>
            </div>

            {/* Action buttons — icon-only on mobile, labeled on desktop */}
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => navigate("/admin/batches")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-xs font-medium"
              >
                <Settings size={15} />
                <span className="hidden sm:inline">Batches</span>
              </button>
              <button
                onClick={() => navigate("/admin/attendance/stats")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-medium"
              >
                <TrendingUp size={15} />
                <span className="hidden sm:inline">Analytics</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1 ml-6">
            <button
              onClick={() => {
                const input = document.getElementById(
                  "attendance-date-picker",
                ) as HTMLInputElement;
                if (input.showPicker) {
                  input.showPicker();
                } else {
                  input.click(); // fallback for older mobile browsers
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition cursor-pointer"
            >
              <Calendar size={13} className="text-gray-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-700">
                {formatDate(selectedDate)}
              </span>
            </button>
            <input
              id="attendance-date-picker"
              type="date"
              value={selectedDate}
              max={todayStr}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-0 h-0 opacity-0 absolute pointer-events-none"
            />
          </div>

          {/* Birthday banner */}
          {birthdayPlayers.length > 0 && (
            <div className="bg-pink-50 border border-pink-200 rounded-lg px-3 py-2 mb-2 flex items-start gap-2">
              <span className="text-lg leading-none">🎂</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-pink-800 mb-0.5">
                  🎉 Birthday{birthdayPlayers.length > 1 ? "s" : ""} today!
                </p>
                {birthdayPlayers.map((p) => (
                  <p key={p.playerId} className="text-xs text-pink-700">
                    <strong>{p.playerName}</strong> turns {p.age} today 🎈
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Session status banners */}
          {!session.attendanceMarked && selectedBatch && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <Sparkles size={14} className="text-emerald-600 flex-shrink-0" />
              <p className="text-xs text-emerald-800 font-medium">
                Not yet taken for <strong>{selectedBatch.name}</strong>
              </p>
            </div>
          )}
          {session.attendanceMarked && !isSuperAdmin && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <Clock size={14} className="text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-800 font-medium">
                Attendance taken — view only
              </p>
            </div>
          )}
          {session.attendanceMarked && isSuperAdmin && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <Sparkles size={14} className="text-purple-600 flex-shrink-0" />
              <p className="text-xs text-purple-800 font-medium">
                Super Admin — editing allowed
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Stats strip — compact 4-col on mobile */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-none mb-1">
              Total
            </p>
            <p className="text-xl font-bold text-gray-900">
              {filteredPlayers.length}
            </p>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 text-center shadow-sm">
            <p className="text-[10px] text-emerald-700 uppercase tracking-wide leading-none mb-1 flex items-center justify-center gap-0.5">
              <CheckCircle2 size={10} /> Present
            </p>
            <p className="text-xl font-bold text-emerald-700">{presentCount}</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-3 text-center shadow-sm">
            <p className="text-[10px] text-red-700 uppercase tracking-wide leading-none mb-1 flex items-center justify-center gap-0.5">
              <XCircle size={10} /> Absent
            </p>
            <p className="text-xl font-bold text-red-700">{absentCount}</p>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 text-center shadow-sm">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-none mb-1">
              Unmarked
            </p>
            <p className="text-xl font-bold text-gray-600">{unmarkedCount}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search players…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition text-sm bg-white"
          />
        </div>

        {/* Batch selector */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">
            Select Batch
          </p>
          <div className="flex flex-wrap gap-2">
            {batches.map((batch) => (
              <button
                key={batch.id}
                onClick={() => setSelectedBatchId(batch.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
                  selectedBatchId === batch.id
                    ? "text-white shadow-md"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-blue-300"
                }`}
                style={
                  selectedBatchId === batch.id
                    ? {
                        background: `linear-gradient(135deg, ${batch.color}dd, ${batch.color})`,
                      }
                    : {}
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${selectedBatchId === batch.id ? "bg-white" : ""}`}
                  style={
                    selectedBatchId !== batch.id
                      ? { backgroundColor: batch.color }
                      : {}
                  }
                />
                {batch.name}
                <span className="opacity-70">
                  ({formatBatchTimeRange(batch)})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick mark all — compact on mobile */}
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => markAll("PRESENT")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition"
            >
              <CheckCircle2 size={14} className="text-emerald-600" />
              Present All
            </button>
            <button
              onClick={() => markAll("ABSENT")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition"
            >
              <XCircle size={14} className="text-red-500" />
              Absent All
            </button>
          </div>
        )}

        {/* Player list */}
        <div className="space-y-2">
          {isLoadingPlayers ? (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading players…</p>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500">
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
      </div>

      {/* ── STICKY SAVE BUTTON ── */}
      {canEdit && selectedBatchId && (
        <div className="fixed bottom-16 sm:bottom-4 left-0 right-0 z-20 px-4 pb-safe">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || Object.keys(attendance).length === 0}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3.5 rounded-xl shadow-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? "Saving…" : "Save Attendance"}
            </button>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      <AttendanceOverrideModal
        open={!!overrideTarget}
        playerName={overrideTarget?.playerName || ""}
        onClose={() => setOverrideTarget(null)}
        onConfirm={confirmOverride}
      />

      {showSuccessDialog && selectedBatch && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-7 w-full max-w-xs shadow-2xl">
            <div className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="text-emerald-600" size={28} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                Attendance Saved!
              </h2>
              <p className="text-sm text-gray-600">
                <strong>{selectedBatch.name}</strong> saved successfully.
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
