import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, PlusCircle, MapPin } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";

type Submission = {
  publicId: string;
  matchDate: string;
  opponentName: string;
  groundName?: string;
  place?: string;
  tournamentName?: string;
  format?: string;
  runs?: number;
  ballsFaced?: number;
  fours?: number;
  sixes?: number;
  battingStrikeRate?: number;
  oversBowled?: number;
  runsConceded?: number;
  wicketsTaken?: number;
  bowlingEconomy?: number;
  catchesTaken?: number;
  source: string;
  status: string;
  createdAt: string;
};

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", label: "⏳ Pending Review" },
  APPROVED: { bg: "bg-green-100", text: "text-green-800", label: "✓ Approved" },
  REJECTED: { bg: "bg-red-100", text: "text-red-800", label: "✕ Rejected" },
};

const FORMAT_COLORS: Record<string, string> = {
  T20: "bg-purple-600",
  ODI: "bg-orange-500",
  TEST: "bg-red-700",
};

export default function MySubmissionsPage() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

  useEffect(() => {
    api
      .get("/player/cricket-stats/mine")
      .then((res) => setSubmissions(res.data))
      .catch(() => toast.error("Failed to load submissions"))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "ALL" ? submissions : submissions.filter((s) => s.status === filter);

  const counts = {
    ALL: submissions.length,
    PENDING: submissions.filter((s) => s.status === "PENDING").length,
    APPROVED: submissions.filter((s) => s.status === "APPROVED").length,
    REJECTED: submissions.filter((s) => s.status === "REJECTED").length,
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="max-w-3xl mx-auto pb-8 px-4 md:px-0 space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Trophy size={22} className="text-blue-600" />
              My Submissions
            </h1>
            <p className="text-sm text-gray-500">Your self-reported match stats</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/my-stats/submit")}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex-shrink-0"
        >
          <PlusCircle size={16} />
          <span className="hidden sm:inline">Submit Stats</span>
          <span className="sm:hidden">Submit</span>
        </button>
      </div>

      {/* STATUS FILTER TABS */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}{" "}
            <span className={`text-xs ${filter === tab ? "text-blue-100" : "text-gray-400"}`}>
              ({counts[tab]})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">🏏</div>
          <p className="font-semibold text-gray-700">
            {submissions.length === 0 ? "No submissions yet" : `No ${filter.toLowerCase()} submissions`}
          </p>
          {submissions.length === 0 && (
            <p className="text-sm text-gray-400 mt-1 mb-4">
              Submit your match stats and they'll appear here.
            </p>
          )}
          {submissions.length === 0 && (
            <button
              onClick={() => navigate("/my-stats/submit")}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
            >
              <PlusCircle size={16} /> Submit Your First Stats
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((stat) => {
            const badge = STATUS_BADGE[stat.status] ?? STATUS_BADGE.PENDING;
            const hasBatting = stat.runs != null;
            const hasBowling = stat.oversBowled != null;
            const fmtColor = stat.format
              ? FORMAT_COLORS[stat.format.toUpperCase()] ?? "bg-gray-600"
              : null;

            return (
              <div
                key={stat.publicId}
                className="bg-white rounded-xl border overflow-hidden shadow-sm"
              >
                {/* Card header */}
                <div className="bg-gradient-to-r from-[#1a3a5c] to-[#1e4d7b] text-white px-4 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">vs {stat.opponentName}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        {(stat.groundName || stat.place) && (
                          <span className="text-blue-200 text-xs flex items-center gap-1">
                            <MapPin size={10} />
                            {[stat.groundName, stat.place].filter(Boolean).join(", ")}
                          </span>
                        )}
                        <span className="text-blue-300 text-xs">
                          {formatDate(stat.matchDate)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                      {fmtColor && stat.format && (
                        <span className={`px-2 py-0.5 text-white text-xs font-bold rounded ${fmtColor}`}>
                          {stat.format}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats body */}
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
                          { label: "4s", value: stat.fours ?? "-" },
                          { label: "6s", value: stat.sixes ?? "-" },
                          { label: "SR", value: stat.battingStrikeRate?.toFixed(1) ?? "-" },
                        ].map(({ label, value, highlight }) => (
                          <div key={label}>
                            <p className="text-[10px] text-gray-400 uppercase">{label}</p>
                            <p className={`text-sm font-bold ${highlight ? "text-blue-700" : "text-gray-700"}`}>
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
                      <div className="grid grid-cols-4 gap-x-4 gap-y-2">
                        {[
                          { label: "Overs", value: stat.oversBowled ?? "-" },
                          { label: "Runs", value: stat.runsConceded ?? "-" },
                          { label: "Wkts", value: stat.wicketsTaken ?? "-", highlight: true },
                          { label: "Econ", value: stat.bowlingEconomy?.toFixed(2) ?? "-" },
                        ].map(({ label, value, highlight }) => (
                          <div key={label}>
                            <p className="text-[10px] text-gray-400 uppercase">{label}</p>
                            <p className={`text-sm font-bold ${highlight ? "text-red-600" : "text-gray-700"}`}>
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {stat.catchesTaken != null && stat.catchesTaken > 0 && (
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="w-1 h-3.5 bg-orange-500 rounded-full" />
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Fielding</span>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">Catches</p>
                        <p className="text-sm font-bold text-orange-600">{stat.catchesTaken}</p>
                      </div>
                    </div>
                  )}

                  {!hasBatting && !hasBowling && (stat.catchesTaken == null || stat.catchesTaken === 0) && (
                    <div className="px-4 py-4 text-center text-xs text-gray-400">
                      No performance stats recorded
                    </div>
                  )}
                </div>

                {/* Submitted date footer */}
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Submitted {new Date(stat.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
