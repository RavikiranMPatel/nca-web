import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { publicClubService } from "../api/publicClubService";
import type {
  PublicClubDetail,
  PublicClubMember,
  Season,
  ClubSeasonSummary,
  ClubSeasonStatsData,
  ClubSeasonSquadEntry,
  ClubSeasonStandingData,
} from "../types/club";

const HONOR_LEVEL_LABELS: Record<string, string> = {
  INDIA: "India",
  INDIA_AGE_GROUP: "India (Age Group)",
  KARNATAKA: "Karnataka",
  KARNATAKA_AGE_GROUP: "Karnataka (Age Group)",
};

function HonorBadge({ level }: { level: string }) {
  const isNational = level === "INDIA" || level === "INDIA_AGE_GROUP";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
        isNational
          ? "bg-blue-100 text-blue-700"
          : "bg-green-100 text-green-700"
      }`}
    >
      <Trophy size={10} />
      {HONOR_LEVEL_LABELS[level] ?? level}
    </span>
  );
}

function RoleBadge({ role }: { role: "C" | "VC" | "WK" }) {
  const styles = {
    C: "bg-amber-100 text-amber-800",
    VC: "bg-blue-100 text-blue-700",
    WK: "bg-teal-100 text-teal-700",
  } as const;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${styles[role]}`}>
      {role}
    </span>
  );
}

function MemberCard({ member }: { member: PublicClubMember }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    member.battingStyle ||
    member.bowlingStyle ||
    member.playerRole ||
    member.gender ||
    (member.honors && member.honors.length > 0);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <span className="text-blue-600 font-bold text-sm">
              {(member.displayName ?? "?").charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-sm truncate">
              {member.displayName ?? "—"}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {member.playerRole && (
                <span className="text-xs text-gray-500">{member.playerRole}</span>
              )}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  member.status === "CURRENT"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {member.status === "CURRENT" ? "Current" : "Alumni"}
              </span>
            </div>
          </div>
        </div>
        {hasDetails && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {expanded && hasDetails && (
        <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
          {(member.battingStyle || member.bowlingStyle || member.gender) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {member.battingStyle && (
                <span>Batting: <strong className="text-gray-700">{member.battingStyle}</strong></span>
              )}
              {member.bowlingStyle && (
                <span>Bowling: <strong className="text-gray-700">{member.bowlingStyle}</strong></span>
              )}
              {member.gender && (
                <span>Gender: <strong className="text-gray-700">{member.gender}</strong></span>
              )}
            </div>
          )}
          {member.honors && member.honors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Honors</p>
              <div className="space-y-1.5">
                {member.honors.map((h) => (
                  <div key={h.publicId} className="flex items-start gap-2">
                    <HonorBadge level={h.level} />
                    <div className="text-xs text-gray-600 min-w-0">
                      <span className="font-medium">{h.title}</span>
                      {" "}
                      <span className="text-gray-400">({h.year})</span>
                      {h.isCurrent && (
                        <span className="ml-1 text-emerald-600 font-medium">· Current</span>
                      )}
                      {h.description && (
                        <p className="text-gray-400 mt-0.5">{h.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function SeasonStandingCard({ standing }: { standing: ClubSeasonStandingData }) {
  const { position, division, movement } = standing;

  const isChampions = position === 1;
  const isRunnersUp = position === 2;

  // Derive label + emoji from position alone — movement is a separate fact
  const emoji = isChampions ? "🏆" : isRunnersUp ? "🥈" : null;
  const posLabel = isChampions
    ? "Champions"
    : isRunnersUp
    ? "Runners-up"
    : position
    ? `${ordinal(position)} Place`
    : null;

  const bannerBg = isChampions
    ? "bg-gradient-to-r from-amber-500 to-yellow-400"
    : isRunnersUp
    ? "bg-gradient-to-r from-slate-500 to-slate-400"
    : "bg-gradient-to-r from-blue-600 to-blue-500";

  const movArrow =
    movement === "PROMOTED" ? "↑"
    : movement === "RELEGATED" ? "↓"
    : movement === "RETAINED" ? "→"
    : null;
  const movStyle =
    movement === "PROMOTED" ? "bg-emerald-100 text-emerald-700"
    : movement === "RELEGATED" ? "bg-red-100 text-red-700"
    : "bg-white/20 text-white/90";
  const movLabel =
    movement === "PROMOTED" ? "Promoted"
    : movement === "RELEGATED" ? "Relegated"
    : movement === "RETAINED" ? "Retained"
    : null;

  return (
    <div className={`rounded-2xl overflow-hidden shadow-sm ${bannerBg}`}>
      <div className="px-5 py-4 flex items-center justify-between gap-3">
        {/* Left: position + division */}
        <div className="flex items-center gap-3 min-w-0">
          {emoji && (
            <span className="text-3xl leading-none flex-shrink-0">{emoji}</span>
          )}
          <div className="min-w-0">
            {posLabel && (
              <p className="text-white font-black text-xl leading-tight">
                {posLabel}
              </p>
            )}
            <p className="text-white/80 text-sm font-semibold mt-0.5">
              Division {division}
            </p>
          </div>
        </div>

        {/* Right: movement badge (independent fact) */}
        {movArrow && movLabel && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${movStyle}`}>
            {movArrow} {movLabel}
          </div>
        )}
      </div>
    </div>
  );
}

function KscaStatsCard({ stats }: { stats: ClubSeasonStatsData }) {
  const hasScorer = !!stats.topScorerDisplayName;
  const hasTaker = !!stats.topWicketTakerDisplayName;
  if (!hasScorer && !hasTaker) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Blue header band */}
      <div className="px-5 py-3 bg-blue-600 flex items-center gap-2.5">
        <span className="text-white text-lg leading-none">🏏</span>
        <div>
          <p className="text-white font-bold text-sm tracking-wide">KSCA MATCHES</p>
          <p className="text-blue-200 text-xs">Official KSCA Competition</p>
        </div>
      </div>
      <div className="p-5 grid grid-cols-2 gap-5">
        {hasScorer && (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-2.5">
              <span className="text-blue-600 font-black text-2xl">
                {(stats.topScorerDisplayName ?? "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-4xl font-black text-blue-600 leading-none">
              {stats.topScorerRuns}
            </p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-1">
              Runs
            </p>
            <p className="text-sm font-semibold text-gray-800 mt-1.5 truncate px-1">
              {stats.topScorerDisplayName}
            </p>
            <p className="text-xs text-gray-400">Top Scorer</p>
          </div>
        )}
        {hasTaker && (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-2.5">
              <span className="text-blue-600 font-black text-2xl">
                {(stats.topWicketTakerDisplayName ?? "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-4xl font-black text-blue-600 leading-none">
              {stats.topWicketTakerWickets}
            </p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-1">
              Wickets
            </p>
            <p className="text-sm font-semibold text-gray-800 mt-1.5 truncate px-1">
              {stats.topWicketTakerDisplayName}
            </p>
            <p className="text-xs text-gray-400">Top Wicket-Taker</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PracticeStatsCard({ stats }: { stats: ClubSeasonStatsData }) {
  const hasScorer = !!stats.topScorerDisplayName;
  const hasTaker = !!stats.topWicketTakerDisplayName;
  if (!hasScorer && !hasTaker) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Slate header band */}
      <div className="px-5 py-2.5 bg-slate-100 flex items-center gap-2">
        <span className="text-slate-600 text-base leading-none">⚡</span>
        <p className="text-slate-600 font-semibold text-xs uppercase tracking-widest">
          Practice Matches
        </p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4">
        {hasScorer && (
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="text-slate-600 font-bold text-base">
                {(stats.topScorerDisplayName ?? "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-slate-700 leading-none">{stats.topScorerRuns}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Runs</p>
              <p className="text-xs font-medium text-gray-700 truncate mt-0.5">
                {stats.topScorerDisplayName}
              </p>
            </div>
          </div>
        )}
        {hasTaker && (
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="text-slate-600 font-bold text-base">
                {(stats.topWicketTakerDisplayName ?? "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-slate-700 leading-none">{stats.topWicketTakerWickets}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Wickets</p>
              <p className="text-xs font-medium text-gray-700 truncate mt-0.5">
                {stats.topWicketTakerDisplayName}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SquadPlayerCard({ player }: { player: ClubSeasonSquadEntry }) {
  const initial = (player.displayName ?? "?").charAt(0).toUpperCase();
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-2 overflow-hidden">
        {player.photoUrl ? (
          <img src={player.photoUrl} className="w-14 h-14 object-cover" alt="" />
        ) : (
          <span className="text-blue-600 font-bold text-xl">{initial}</span>
        )}
      </div>
      <p className="text-sm font-semibold text-gray-800 truncate">{player.displayName ?? "—"}</p>
      <div className="flex items-center justify-center gap-1 mt-1.5 flex-wrap">
        {player.isCaptain && <RoleBadge role="C" />}
        {player.isViceCaptain && <RoleBadge role="VC" />}
        {player.isWicketKeeper && <RoleBadge role="WK" />}
      </div>
      {player.playerRole && (
        <p className="text-[11px] text-gray-400 mt-1">{player.playerRole.replace(/_/g, " ")}</p>
      )}
    </div>
  );
}

export default function PublicClubDetail() {
  const { publicId } = useParams<{ publicId: string }>();
  const [club, setClub] = useState<PublicClubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [membersTab, setMembersTab] = useState<"current" | "alumni">("current");

  // Season state
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [seasonSummary, setSeasonSummary] = useState<ClubSeasonSummary | null>(null);
  const [loadingSeason, setLoadingSeason] = useState(false);

  // Load club + seasons in parallel
  useEffect(() => {
    if (!publicId) return;
    publicClubService
      .getClub(publicId)
      .then(setClub)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    publicClubService
      .listSeasons(publicId)
      .then((data) => {
        setSeasons(data);
        const current = data.find((s) => s.isCurrent);
        const toSelect = current ?? data[0];
        if (toSelect) setSelectedSeasonId(toSelect.publicId);
      })
      .catch(() => {});
  }, [publicId]);

  // Load season summary when season selection changes
  useEffect(() => {
    if (!publicId || !selectedSeasonId) return;
    setLoadingSeason(true);
    setSeasonSummary(null);
    publicClubService
      .getSeasonSummary(publicId, selectedSeasonId)
      .then(setSeasonSummary)
      .catch(() => {})
      .finally(() => setLoadingSeason(false));
  }, [publicId, selectedSeasonId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !club) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-500 text-sm">Club not found.</p>
        <Link to="/home" className="text-blue-600 text-sm font-medium hover:underline">
          ← Back to Home
        </Link>
      </div>
    );
  }

  const currentMembers = club.members.filter((m) => m.status === "CURRENT");
  const alumniMembers = club.members.filter((m) => m.status === "ALUMNI");
  const displayedMembers = membersTab === "current" ? currentMembers : alumniMembers;

  const kscaStats = seasonSummary?.stats.find((s) => s.matchType === "KSCA");
  const practiceStats = seasonSummary?.stats.find((s) => s.matchType === "PRACTICE");
  const hasSeasonStats =
    !!kscaStats && (!!kscaStats.topScorerDisplayName || !!kscaStats.topWicketTakerDisplayName);
  const hasPracticeStats =
    !!practiceStats &&
    (!!practiceStats.topScorerDisplayName || !!practiceStats.topWicketTakerDisplayName);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/home"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Club header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{club.name}</h1>
          {club.ownerName && (
            <p className="text-sm text-blue-600 font-medium mb-4">Owned by {club.ownerName}</p>
          )}
          <div className="flex items-center gap-6 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{club.totalMembers}</p>
              <p className="text-xs text-gray-500 mt-0.5">Current Members</p>
            </div>
            {club.alumniCount > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{club.alumniCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">Alumni</p>
              </div>
            )}
          </div>
          {club.history && (
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
              {club.history}
            </p>
          )}
        </div>

        {/* ── SEASON SECTION ── */}
        {seasons.length > 0 && (
          <div className="space-y-4">
            {/* Season selector */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
              {seasons.map((s) => (
                <button
                  key={s.publicId}
                  onClick={() => setSelectedSeasonId(s.publicId)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                    selectedSeasonId === s.publicId
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {s.isCurrent && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        selectedSeasonId === s.publicId ? "bg-white" : "bg-emerald-500"
                      }`}
                    />
                  )}
                  {s.name}
                </button>
              ))}
            </div>

            {loadingSeason && (
              <div className="flex justify-center py-8">
                <div className="w-7 h-7 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            )}

            {!loadingSeason && seasonSummary && (
              <>
                {/* Season standing — position-based, rendered before stats */}
                {seasonSummary.standing && (
                  <SeasonStandingCard standing={seasonSummary.standing} />
                )}

                {/* Stats cards — KSCA above Practice */}
                {(hasSeasonStats || hasPracticeStats) && (
                  <div className="space-y-3">
                    {hasSeasonStats && kscaStats && <KscaStatsCard stats={kscaStats} />}
                    {hasPracticeStats && practiceStats && <PracticeStatsCard stats={practiceStats} />}
                  </div>
                )}

                {/* Squad grid */}
                {seasonSummary.squad.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                      {seasonSummary.seasonName} Squad
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {seasonSummary.squad.map((player) => (
                        <SquadPlayerCard key={player.publicId} player={player} />
                      ))}
                    </div>
                  </div>
                )}

                {seasonSummary.squad.length === 0 && !hasSeasonStats && !hasPracticeStats && !seasonSummary.standing && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No squad or stats recorded for this season yet.
                  </div>
                )}
              </>
            )}

            {/* Divider before member directory */}
            {club.members.length > 0 && (
              <div className="border-t border-gray-200 pt-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                  All Members
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── MEMBER DIRECTORY ── */}
        {club.members.length > 0 && (
          <div>
            {currentMembers.length > 0 && alumniMembers.length > 0 && (
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  onClick={() => setMembersTab("current")}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                    membersTab === "current"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Current ({currentMembers.length})
                </button>
                <button
                  onClick={() => setMembersTab("alumni")}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                    membersTab === "alumni"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Alumni ({alumniMembers.length})
                </button>
              </div>
            )}

            {!(currentMembers.length > 0 && alumniMembers.length > 0) && seasons.length === 0 && (
              <h2 className="text-base font-semibold text-gray-700 mb-4">
                {currentMembers.length > 0
                  ? `Members (${currentMembers.length})`
                  : `Alumni (${alumniMembers.length})`}
              </h2>
            )}

            <div className="space-y-3">
              {displayedMembers.map((member) => (
                <MemberCard key={member.publicId} member={member} />
              ))}
            </div>
          </div>
        )}

        {club.members.length === 0 && seasons.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No members listed yet.</div>
        )}
      </div>
    </div>
  );
}
