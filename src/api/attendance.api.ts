import type { PlayerAttendancePercentage, StatsRange } from "./attendanceStats";
import api from "./axios";

export type AttendanceStatus = "PRESENT" | "ABSENT";

export type BulkAttendanceItem = {
  playerId: string;
  status: AttendanceStatus;
};

export type BulkAttendanceRequest = {
  attendanceDate: string; // YYYY-MM-DD
  batch: string;
  records: BulkAttendanceItem[];
};

export const markAttendanceBulk = (payload: BulkAttendanceRequest) => {
  return api.post("/admin/attendance/bulk", payload);
};

export const fetchTodayRecords = async (date: string, batchId: string) => {
  const res = await api.get("/admin/attendance/records", {
    params: { date, batchId },
  });
  return res.data;
};

export const fetchAttendanceStats = async (
  range: StatsRange,
  batchId: string,
): Promise<PlayerAttendancePercentage[]> => {
  const res = await api.get("/admin/attendance/stats", {
    params: { range, batchId },
  });
  return res.data;
};
