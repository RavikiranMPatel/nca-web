import api from "./axios";

export type PlayerAttendancePercentage = {
  playerId: string; // internal UUID
  playerPublicId: string; // ✅ ADD THIS
  playerName: string;
  totalSessions: number;
  presentSessions: number;
  percentage: number;
};

export type StatsRange = "LAST_7" | "LAST_30" | "YEAR";

export const fetchAttendanceStats = async (
  range: StatsRange,
  batchId: string,
): Promise<PlayerAttendancePercentage[]> => {
  const res = await api.get("/admin/attendance/stats", {
    params: { range, batchId },
  });
  return res.data;
};
