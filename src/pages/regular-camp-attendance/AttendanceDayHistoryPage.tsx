import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchDayHistory } from "../../api/attendanceHistory";

function AttendanceDayHistoryPage() {
  const { date } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [activeBatch, setActiveBatch] = useState<string>("");

  useEffect(() => {
    if (!date) return;

    fetchDayHistory(date).then((res) => {
      setData(res);
      setActiveBatch(Object.keys(res.batches)[0]);
    });
  }, [date]);

  if (!data) return <div>Loading...</div>;

  const batchData = data.batches[activeBatch] || {};

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-sm text-blue-600">
          ← Back
        </button>
        <h1 className="text-xl font-semibold">
          {new Date(data.date).toLocaleDateString("en-GB")}
        </h1>
      </div>

      {/* BATCH TABS */}
      <div className="flex gap-2">
        {Object.keys(data.batches).map((batch) => (
          <button
            key={batch}
            onClick={() => setActiveBatch(batch)}
            className={`px-4 py-1 rounded-full border text-sm ${
              activeBatch === batch ? "bg-blue-600 text-white" : "bg-white"
            }`}
          >
            {batch}
          </button>
        ))}
      </div>

      {/* PRESENT */}
      <div>
        <h3 className="font-medium text-green-700 mb-1">✓ Present</h3>
        {batchData.PRESENT?.length ? (
          <ul className="list-disc ml-5 text-sm">
            {batchData.PRESENT.map((p: string) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500">None</div>
        )}
      </div>

      {/* ABSENT */}
      <div>
        <h3 className="font-medium text-red-700 mb-1">✗ Absent</h3>
        {batchData.ABSENT?.length ? (
          <ul className="list-disc ml-5 text-sm">
            {batchData.ABSENT.map((p: string) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500">None</div>
        )}
      </div>
    </div>
  );
}

export default AttendanceDayHistoryPage;
