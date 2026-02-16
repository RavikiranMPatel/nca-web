import api from "./axios";

export type AttendanceStatus = "PRESENT" | "ABSENT";

export type BulkAttendanceItem = {
  playerId: string;
  status: AttendanceStatus;
};

export type BulkAttendanceRequest = {
  date: string; // yyyy-mm-dd
  batchId: string; // ← Changed from "batch" to "batchId" (UUID)
  records: BulkAttendanceItem[];
};

export function submitBulkAttendance(payload: {
  date: string;
  batchId: string; // ← Changed from "batch" to "batchId"
  records: { playerId: string; status: "PRESENT" | "ABSENT" }[];
}) {
  const { date, batchId, records } = payload; // ← Changed from "batch" to "batchId"

  return api.post(
    "/admin/attendance/bulk",
    { records }, // ✅ BODY
    {
      params: {
        date, // ✅ QUERY PARAM
        batchId, // ✅ QUERY PARAM (was "batch")
      },
    },
  );
}

export function overrideAttendance(params: {
  attendanceRecordId: string; // ← Fixed: was "recordId", should be "attendanceRecordId"
  newStatus: "PRESENT" | "ABSENT";
  reason: string;
}) {
  return api.post("/admin/attendance/override", params);
}

export type PlayerAttendanceSummary = {
  displayName: string;
  totalDays: number;
  present: number;
  absent: number;
  attendancePercentage: number;
};

export const fetchPlayerAttendanceSummary = async (playerId: string) => {
  const res = await api.get(`/admin/players/${playerId}/attendance/summary`);
  return res.data;
};

export type GroupedDay<T> = {
  date: string;
  sessions: T[];
};

export function groupByDate<T extends { date: string }>(
  records: T[],
): GroupedDay<T>[] {
  const map: Record<string, T[]> = {};

  records.forEach((r) => {
    if (!map[r.date]) map[r.date] = [];
    map[r.date].push(r);
  });

  return Object.entries(map).map(([date, sessions]) => ({
    date,
    sessions,
  }));
}
