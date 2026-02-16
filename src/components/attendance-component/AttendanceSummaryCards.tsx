type Props = {
  summary: {
    displayName: string;
    totalDays: number;
    present: number;
    absent: number;
    attendancePercentage: number;
  };
};

function AttendanceSummaryCards({ summary }: Props) {
  return (
    <div className="space-y-2">
      {/* PLAYER NAME */}
      <h2 className="text-lg font-semibold">{summary.displayName}</h2>

      {/* CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm text-gray-500">Total Days</p>
          <p className="text-xl font-semibold">{summary.totalDays}</p>
        </div>

        <div className="bg-green-50 p-4 rounded shadow">
          <p className="text-sm text-gray-500">Present</p>
          <p className="text-xl font-semibold text-green-600">
            {summary.present}
          </p>
        </div>

        <div className="bg-red-50 p-4 rounded shadow">
          <p className="text-sm text-gray-500">Absent</p>
          <p className="text-xl font-semibold text-red-600">{summary.absent}</p>
        </div>

        <div className="bg-blue-50 p-4 rounded shadow">
          <p className="text-sm text-gray-500">Attendance %</p>
          <p className="text-xl font-semibold text-blue-600">
            {summary.attendancePercentage}%
          </p>
        </div>
      </div>
    </div>
  );
}

export default AttendanceSummaryCards;
