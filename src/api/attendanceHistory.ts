import api from "./axios";

export type AttendanceHistorySummary = {
  date: string;
  batch: "MORNING" | "EVENING" | "BOTH";
  present: number;
  absent: number;
};

export const fetchLast7DaysAttendance = async (
  batch?: "MORNING" | "EVENING",
): Promise<AttendanceHistorySummary[]> => {
  const res = await api.get("/admin/attendance/history/last-7-days", {
    params: { batch },
  });

  return res.data;
};

export type AttendanceDayHistory = {
  date: string;
  batches: {
    [batch: string]: {
      PRESENT?: string[];
      ABSENT?: string[];
    };
  };
};

export const fetchDayHistory = async (date: string) => {
  const res = await api.get(`/admin/attendance/history/date/${date}`);
  return res.data as AttendanceDayHistory;
};
