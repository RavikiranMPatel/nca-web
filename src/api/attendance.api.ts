import type { PlayerAttendancePercentage, StatsRange } from "./attendanceStats";
import api from "./axios";

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
