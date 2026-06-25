import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Trophy,
  PlusCircle,
  MapPin,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
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
  rejectionReason?: string;
  player?: { publicId: string };
};

const FORMAT_COLORS: Record<string, string> = {
  T20: "bg-purple-600",
  ODI: "bg-orange-500",
  TEST: "bg-red-700",
};

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", label: "⏳ Pending Review" },
  APPROVED: { bg: "bg-green-100", text: "text-green-800", label: "✓ Approved" },
  REJECTED: { bg: "bg-red-100", text: "text-red-800", label: "✕ Rejected" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatCard({
  stat,
  sourceLabel,
  showStatusBadge = false,
}: {
  stat: Submission;
  sourceLabel?: string;
  showStatusBadge?: boolean;
}) {
  const badge = STATUS_BADGE[stat.status] ?? STATUS_BADGE.PENDING;
  const hasBatting = stat.runs != null;
  const hasBowling = stat.oversBowled != null;
  const fmtColor = stat.format
    ? (FORMAT_COLORS[stat.format.toUpperCase()] ?? "bg-gray-600")
    : null;

  return (
    <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
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
              <span className="text-blue-300 text-xs">{fmtDate(stat.matchDate)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            {fmtColor && stat.format && (
              <span className={`px-2 py-0.5 text-white text-xs font-bold rounded ${fmtColor}`}>
                {stat.format}
              </span>
            )}
            {showStatusBadge && (
              <span className={`px-2 py-0.5 text-xs font-semibold rounded ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats body */}
      <div className="divide-y divide-gray-100">
        {hasBatting && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1 h-3.5 bg-green-500 rounded-full" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Batting</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-x-4 gap-y-2">
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
                    {String(value)}
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
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Bowling</span>
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
                    {String(value)}
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

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-400">{fmtDate(stat.createdAt)}</p>
          {sourceLabel && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {sourceLabel}
            </span>
          )}
        </div>
        {stat.status === "REJECTED" && stat.rejectionReason && (
          <p className="text-xs text-red-500 mt-1 truncate" title={stat.rejectionReason}>
            Reason: {stat.rejectionReason}
          </p>
        )}
      </div>
    </div>
  );
}

export default function MySubmissionsPage() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingOpen, setPendingOpen] = useState(false);

  useEffect(() => {
    api
      .get("/player/cricket-stats/mine")
      .then((res) => setSubmissions(res.data))
      .catch(() => toast.error("Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  // Derive player publicId from the first stat that has one — no extra API call
  const playerPublicId = useMemo(
    () => submissions.find((s) => s.player?.publicId)?.player?.publicId ?? null,
    [submissions],
  );

  const careerSummary = useMemo(() => {
    const approved = submissions.filter((s) => s.status === "APPROVED");
    const matches = approved.length;
    const runs = approved.reduce((sum, s) => sum + (s.runs ?? 0), 0);
    const wickets = approved.reduce((sum, s) => sum + (s.wicketsTaken ?? 0), 0);
    const avg = matches > 0 ? (runs / matches).toFixed(1) : "-";
    return { matches, runs, wickets, avg };
  }, [submissions]);

  const coachEntered = useMemo(
    () => submissions.filter((s) => s.source === "ADMIN" && s.status === "APPROVED"),
    [submissions],
  );

  const selfApproved = useMemo(
    () => submissions.filter((s) => s.source === "PLAYER" && s.status === "APPROVED"),
    [submissions],
  );

  const selfAll = useMemo(
    () => submissions.filter((s) => s.source === "PLAYER"),
    [submissions],
  );

  const pendingRejected = useMemo(
    () =>
      submissions.filter(
        (s) => s.source === "PLAYER" && (s.status === "PENDING" || s.status === "REJECTED"),
      ),
    [submissions],
  );

  const collapsibleLabel = useMemo(() => {
    const pendingCount = pendingRejected.filter((s) => s.status === "PENDING").length;
    const rejectedCount = pendingRejected.filter((s) => s.status === "REJECTED").length;
    return [
      pendingCount > 0 ? `Pending Review (${pendingCount})` : null,
      rejectedCount > 0 ? `Rejected (${rejectedCount})` : null,
    ]
      .filter(Boolean)
      .join(" / ");
  }, [pendingRejected]);

  return (
    <div className="max-w-3xl mx-auto pb-8 px-4 md:px-0 space-y-6">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3 pt-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/home")}
            className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Trophy size={22} className="text-blue-600 flex-shrink-0" />
              My Stats
            </h1>
            <p className="text-sm text-gray-500 leading-snug">
              Your full match history — coach-entered and self-reported
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {playerPublicId && (
            <Link
              to={`/players/${playerPublicId}/profile`}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">My Profile</span>
            </Link>
          )}
          <button
            onClick={() => navigate("/my-stats/submit")}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
          >
            <PlusCircle size={16} />
            <span className="hidden sm:inline">Submit a Stat</span>
            <span className="sm:hidden">Submit</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <>
          {/* CAREER SUMMARY STRIP */}
          {submissions.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Matches", value: String(careerSummary.matches) },
                { label: "Runs", value: String(careerSummary.runs) },
                { label: "Wickets", value: String(careerSummary.wickets) },
                { label: "Bat Avg", value: String(careerSummary.avg) },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-white rounded-xl border shadow-sm p-3 text-center"
                >
                  <p className="text-lg font-bold text-gray-800">{value}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* SECTION A: COACH ENTERED STATS */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Coach Entered Stats
            </h2>
            {coachEntered.length === 0 ? (
              <p className="text-sm text-gray-400 py-1">No stats entered by coach yet.</p>
            ) : (
              <div className="space-y-3">
                {coachEntered.map((stat) => (
                  <StatCard key={stat.publicId} stat={stat} sourceLabel="Coach Entered" />
                ))}
              </div>
            )}
          </div>

          {/* SECTION B: MY SUBMISSIONS */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              My Submissions
            </h2>

            {selfAll.length === 0 ? (
              <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
                <div className="text-4xl mb-3">🏏</div>
                <p className="font-semibold text-gray-700">No submissions yet</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">
                  Submit your match stats and they'll appear here.
                </p>
                <button
                  onClick={() => navigate("/my-stats/submit")}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                >
                  <PlusCircle size={16} /> Submit Your First Stat
                </button>
              </div>
            ) : (
              <>
                {/* Approved self-reported */}
                {selfApproved.length > 0 && (
                  <div className="space-y-3">
                    {selfApproved.map((stat) => (
                      <StatCard key={stat.publicId} stat={stat} sourceLabel="Self Reported" />
                    ))}
                  </div>
                )}

                {/* Collapsible pending/rejected */}
                {pendingRejected.length > 0 && (
                  <div>
                    <button
                      onClick={() => setPendingOpen((o) => !o)}
                      className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition py-1"
                    >
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${pendingOpen ? "rotate-180" : ""}`}
                      />
                      {collapsibleLabel}
                    </button>
                    {pendingOpen && (
                      <div className="space-y-3 mt-2">
                        {pendingRejected.map((stat) => (
                          <StatCard key={stat.publicId} stat={stat} showStatusBadge />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
