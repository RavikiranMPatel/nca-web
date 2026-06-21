import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, Trophy, Clock } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";

type PendingStat = {
  publicId: string;
  player: {
    displayName: string;
    publicId: string;
  };
  matchDate: string;
  opponentName: string;
  format?: string;
  runs?: number;
  wicketsTaken?: number;
  catchesTaken?: number;
  createdAt: string;
};

export default function PendingStatReviewPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PendingStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/cricket-stats/pending");
      setStats(res.data);
    } catch {
      toast.error("Failed to load pending reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (publicId: string, action: "approve" | "reject") => {
    setActing(publicId);
    try {
      await api.patch(`/admin/cricket-stats/${publicId}/${action}`);
      setStats((prev) => prev.filter((s) => s.publicId !== publicId));
      toast.success(action === "approve" ? "Stat approved" : "Stat rejected");
    } catch {
      toast.error(`Failed to ${action} stat`);
    } finally {
      setActing(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatSubmittedAt = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) +
      " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const statSummary = (stat: PendingStat) => {
    const parts: string[] = [];
    if (stat.runs != null) parts.push(`${stat.runs}R`);
    if (stat.wicketsTaken != null) parts.push(`${stat.wicketsTaken}W`);
    if (stat.catchesTaken != null) parts.push(`${stat.catchesTaken}C`);
    return parts.length ? parts.join("  ·  ") : "—";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8 px-4 md:px-0">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Trophy size={22} className="text-orange-500" />
            Pending Stat Reviews
          </h1>
          <p className="text-sm text-gray-500">
            Player-submitted match stats awaiting approval
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : stats.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <CheckCircle size={48} className="mx-auto text-green-400 mb-3" />
          <p className="font-semibold text-gray-700">All caught up!</p>
          <p className="text-sm text-gray-400 mt-1">
            No pending stat submissions to review.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-600">Player</th>
                  <th className="text-left p-4 font-semibold text-gray-600">Match</th>
                  <th className="text-left p-4 font-semibold text-gray-600">Stats</th>
                  <th className="text-left p-4 font-semibold text-gray-600">Submitted</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.map((stat) => (
                  <tr key={stat.publicId} className="hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-semibold text-gray-900">{stat.player.displayName}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-gray-800">vs {stat.opponentName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(stat.matchDate)}
                        {stat.format && <span className="ml-2 text-blue-600">· {stat.format}</span>}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-700 font-mono text-sm">{statSummary(stat)}</span>
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      <Clock size={12} className="inline mr-1" />
                      {formatSubmittedAt(stat.createdAt)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleAction(stat.publicId, "approve")}
                          disabled={acting === stat.publicId}
                          className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition disabled:opacity-50"
                        >
                          <CheckCircle size={13} />
                          {acting === stat.publicId ? "…" : "Approve"}
                        </button>
                        <button
                          onClick={() => handleAction(stat.publicId, "reject")}
                          disabled={acting === stat.publicId}
                          className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50"
                        >
                          <XCircle size={13} />
                          {acting === stat.publicId ? "…" : "Reject"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {stats.map((stat) => (
              <div key={stat.publicId} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{stat.player.displayName}</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      vs {stat.opponentName}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium whitespace-nowrap">
                    ⏳ Pending
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>📅 {formatDate(stat.matchDate)}</span>
                  {stat.format && <span className="text-blue-600 font-medium">{stat.format}</span>}
                </div>
                <div className="text-sm font-mono text-gray-700">{statSummary(stat)}</div>
                <p className="text-xs text-gray-400">
                  <Clock size={11} className="inline mr-1" />
                  Submitted {formatSubmittedAt(stat.createdAt)}
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleAction(stat.publicId, "approve")}
                    disabled={acting === stat.publicId}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
                  >
                    <CheckCircle size={15} />
                    {acting === stat.publicId ? "…" : "Approve"}
                  </button>
                  <button
                    onClick={() => handleAction(stat.publicId, "reject")}
                    disabled={acting === stat.publicId}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
                  >
                    <XCircle size={15} />
                    {acting === stat.publicId ? "…" : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
