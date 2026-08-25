import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, MapPin, User, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import { getImageUrl } from "../../utils/imageUrl";

type PendingStat = {
  publicId: string;
  matchDate: string;
  opponentName: string;
  groundName?: string;
  place?: string;
  tournamentName?: string;
  format?: string;
  runs?: number;
  ballsFaced?: number;
  minutesFaced?: number;
  fours?: number;
  sixes?: number;
  battingStrikeRate?: number;
  oversBowled?: number;
  maidens?: number;
  runsConceded?: number;
  wicketsTaken?: number;
  bowlingEconomy?: number;
  dotBallsBowled?: number;
  foursConceded?: number;
  sixesConceded?: number;
  widesConceded?: number;
  noBallsConceded?: number;
  catchesTaken?: number;
  createdAt: string;
  player: {
    publicId: string;
    displayName: string;
    photoUrl?: string;
  };
};

function formatSubmittedDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMatchDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PendingCricketStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PendingStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/cricket-stats/pending");
      setStats(res.data || []);
    } catch {
      toast.error("Failed to load pending stat submissions");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (publicId: string) => {
    setActioningId(publicId);
    try {
      await api.patch(`/admin/cricket-stats/${publicId}/approve`);
      setStats((prev) => prev.filter((s) => s.publicId !== publicId));
      toast.success("Stat approved");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to approve");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (publicId: string) => {
    if (!window.confirm("Reject this stat submission?")) return;
    setActioningId(publicId);
    try {
      await api.patch(`/admin/cricket-stats/${publicId}/reject`);
      setStats((prev) => prev.filter((s) => s.publicId !== publicId));
      toast.success("Stat rejected");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reject");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8 px-4 md:px-0">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">
            Pending Stat Reviews
          </h1>
          <p className="text-sm text-gray-500">
            Player-submitted match stats awaiting approval
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading…</p>
          </div>
        </div>
      ) : stats.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center">
          <Trophy size={40} className="text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-700 mb-1">
            No Pending Submissions
          </h3>
          <p className="text-sm text-gray-500">
            Player-submitted stats will show up here for review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {stats.map((stat) => (
            <PendingStatCard
              key={stat.publicId}
              stat={stat}
              busy={actioningId === stat.publicId}
              onApprove={() => handleApprove(stat.publicId)}
              onReject={() => handleReject(stat.publicId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PendingStatCard({
  stat,
  busy,
  onApprove,
  onReject,
}: {
  stat: PendingStat;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const hasBatting = stat.runs !== null && stat.runs !== undefined;
  const hasBowling = stat.oversBowled !== null && stat.oversBowled !== undefined;
  const hasFielding =
    stat.catchesTaken !== null && stat.catchesTaken !== undefined && stat.catchesTaken > 0;
  const photoSrc = stat.player?.photoUrl ? getImageUrl(stat.player.photoUrl) : null;

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
      {/* Player + submission meta */}
      <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={stat.player.displayName}
            className="w-10 h-10 rounded-full object-cover border-2 border-amber-300 flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <User size={18} className="text-amber-500" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-gray-900 truncate">
            {stat.player?.displayName ?? "Unknown player"}
          </p>
          <p className="text-[11px] text-gray-500">
            Submitted {formatSubmittedDate(stat.createdAt)}
          </p>
        </div>
        <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 uppercase tracking-wide">
          Pending
        </span>
      </div>

      {/* Match details */}
      <div className="px-4 py-2.5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-sm text-gray-800 truncate">
              vs {stat.opponentName}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
              {(stat.groundName || stat.place) && (
                <span className="text-gray-500 text-xs flex items-center gap-1">
                  <MapPin size={10} />
                  {[stat.groundName, stat.place].filter(Boolean).join(", ")}
                </span>
              )}
              <span className="text-gray-400 text-xs">
                {formatMatchDate(stat.matchDate)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            {stat.format && (
              <span className="px-2 py-0.5 bg-gray-700 text-white text-xs font-bold rounded">
                {stat.format}
              </span>
            )}
            {stat.tournamentName && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded max-w-[120px] truncate">
                {stat.tournamentName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Figures */}
      <div className="divide-y divide-gray-100">
        {hasBatting && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1 h-3.5 bg-green-500 rounded-full" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Batting
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-2">
              {[
                { label: "Runs", value: stat.runs ?? "-", highlight: true },
                { label: "Balls", value: stat.ballsFaced ?? "-" },
                { label: "Mins", value: stat.minutesFaced ?? "-" },
                { label: "4s", value: stat.fours ?? "-" },
                { label: "6s", value: stat.sixes ?? "-" },
                { label: "SR", value: stat.battingStrikeRate?.toFixed(1) ?? "-" },
              ].map(({ label, value, highlight }) => (
                <div key={label}>
                  <p className="text-[10px] text-gray-400 uppercase">{label}</p>
                  <p
                    className={`text-sm font-bold ${highlight ? "text-blue-700" : "text-gray-700"}`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasBowling && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1 h-3.5 bg-red-500 rounded-full" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Bowling
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-x-4 gap-y-2">
              {[
                { label: "Overs", value: stat.oversBowled ?? "-" },
                { label: "Mdns", value: stat.maidens ?? "-" },
                { label: "Runs", value: stat.runsConceded ?? "-" },
                { label: "Wkts", value: stat.wicketsTaken ?? "-", highlight: true },
                { label: "Econ", value: stat.bowlingEconomy?.toFixed(2) ?? "-" },
                { label: "Dots", value: stat.dotBallsBowled ?? "-" },
                { label: "Wd", value: stat.widesConceded ?? "-" },
                { label: "Nb", value: stat.noBallsConceded ?? "-" },
              ].map(({ label, value, highlight }) => (
                <div key={label}>
                  <p className="text-[10px] text-gray-400 uppercase">{label}</p>
                  <p
                    className={`text-sm font-bold ${highlight ? "text-red-600" : "text-gray-700"}`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasFielding && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1 h-3.5 bg-orange-500 rounded-full" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Fielding
              </span>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Catches</p>
              <p className="text-sm font-bold text-orange-600">{stat.catchesTaken}</p>
            </div>
          </div>
        )}

        {!hasBatting && !hasBowling && !hasFielding && (
          <div className="px-4 py-4 text-center text-xs text-gray-400">
            No performance stats recorded
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
        <button
          onClick={onReject}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <XCircle size={15} />
          Reject
        </button>
        <button
          onClick={onApprove}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <CheckCircle2 size={15} />
          Approve
        </button>
      </div>
    </div>
  );
}

export default PendingCricketStats;
