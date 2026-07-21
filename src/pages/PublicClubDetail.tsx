import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { publicClubService } from "../api/publicClubService";
import publicApi from "../api/publicApi";
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

// Semantic badge — colors convey geopolitical meaning (India vs Karnataka), not academy brand
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

function RoleBadge({
  role,
  primaryColor,
}: {
  role: "C" | "VC" | "WK";
  primaryColor: string;
}) {
  if (role === "C")
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
        C
      </span>
    );
  if (role === "WK")
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700">
        WK
      </span>
    );
  // VC — use academy primary tint
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
    >
      VC
    </span>
  );
}

function MemberCard({
  member,
  primaryColor,
  cardRadius,
}: {
  member: PublicClubMember;
  primaryColor: string;
  cardRadius: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    member.battingStyle ||
    member.bowlingStyle ||
    member.playerRole ||
    member.gender ||
    (member.honors && member.honors.length > 0);

  return (
    <div
      className="bg-white border border-gray-100 p-4 shadow-sm"
      style={{ borderRadius: `${cardRadius}px` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${primaryColor}12` }}
          >
            <span className="font-bold text-sm" style={{ color: primaryColor }}>
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
                <span>
                  Batting:{" "}
                  <strong className="text-gray-700">{member.battingStyle}</strong>
                </span>
              )}
              {member.bowlingStyle && (
                <span>
                  Bowling:{" "}
                  <strong className="text-gray-700">{member.bowlingStyle}</strong>
                </span>
              )}
              {member.gender && (
                <span>
                  Gender:{" "}
                  <strong className="text-gray-700">{member.gender}</strong>
                </span>
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
                      <span className="font-medium">{h.title}</span>{" "}
                      <span className="text-gray-400">({h.year})</span>
                      {h.isCurrent && (
                        <span className="ml-1 text-emerald-600 font-medium">
                          · Current
                        </span>
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

function SeasonStandingCard({
  standing,
  primaryColor,
}: {
  standing: ClubSeasonStandingData;
  primaryColor: string;
}) {
  const { position, division, movement } = standing;

  const isChampions = position === 1;
  const isRunnersUp = position === 2;

  const emoji = isChampions ? "🏆" : isRunnersUp ? "🥈" : null;
  const posLabel = isChampions
    ? "Champions"
    : isRunnersUp
    ? "Runners-up"
    : position
    ? `${ordinal(position)} Place`
    : null;

  // Champions and runners-up use semantic trophy colors; other positions use academy primary
  const bannerStyle: React.CSSProperties = isChampions
    ? { background: "linear-gradient(to right, #f59e0b, #fcd34d)" }
    : isRunnersUp
    ? { background: "linear-gradient(to right, #64748b, #94a3b8)" }
    : { background: `linear-gradient(to right, ${primaryColor}, ${primaryColor}cc)` };

  const movArrow =
    movement === "PROMOTED" ? "↑"
    : movement === "RELEGATED" ? "↓"
    : movement === "RETAINED" ? "→"
    : null;
  const movStyle =
    movement === "PROMOTED"
      ? "bg-emerald-100 text-emerald-700"
      : movement === "RELEGATED"
      ? "bg-red-100 text-red-700"
      : "bg-white/20 text-white/90";
  const movLabel =
    movement === "PROMOTED" ? "Promoted"
    : movement === "RELEGATED" ? "Relegated"
    : movement === "RETAINED" ? "Retained"
    : null;

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={bannerStyle}>
      <div className="px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {emoji && (
            <span className="text-3xl leading-none flex-shrink-0">{emoji}</span>
          )}
          <div className="min-w-0">
            {posLabel && (
              <p className="text-white font-black text-xl leading-tight">{posLabel}</p>
            )}
            <p className="text-white/80 text-sm font-semibold mt-0.5">
              Division {division}
            </p>
          </div>
        </div>
        {movArrow && movLabel && (
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${movStyle}`}
          >
            {movArrow} {movLabel}
          </div>
        )}
      </div>
    </div>
  );
}

function KscaStatsCard({
  stats,
  primaryColor,
}: {
  stats: ClubSeasonStatsData;
  primaryColor: string;
}) {
  const hasScorer = !!stats.topScorerDisplayName;
  const hasTaker = !!stats.topWicketTakerDisplayName;
  if (!hasScorer && !hasTaker) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header band — uses academy primary color; KSCA identity comes from label text */}
      <div
        className="px-5 py-3 flex items-center gap-2.5"
        style={{ backgroundColor: primaryColor }}
      >
        <span className="text-white text-lg leading-none">🏏</span>
        <div>
          <p className="text-white font-bold text-sm tracking-wide">KSCA MATCHES</p>
          <p className="text-white/70 text-xs">Official KSCA Competition</p>
        </div>
      </div>
      <div className="p-5 grid grid-cols-2 gap-5">
        {hasScorer && (
          <div className="text-center">
            <div
              className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-2.5"
              style={{ backgroundColor: `${primaryColor}12` }}
            >
              <span className="font-black text-2xl" style={{ color: primaryColor }}>
                {(stats.topScorerDisplayName ?? "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-4xl font-black leading-none" style={{ color: primaryColor }}>
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
            <div
              className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-2.5"
              style={{ backgroundColor: `${primaryColor}12` }}
            >
              <span className="font-black text-2xl" style={{ color: primaryColor }}>
                {(stats.topWicketTakerDisplayName ?? "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-4xl font-black leading-none" style={{ color: primaryColor }}>
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

// Practice stats: intentionally muted/neutral — slate is appropriate for informal matches
// and provides clear visual hierarchy contrast against the themed KSCA card above it
function PracticeStatsCard({ stats }: { stats: ClubSeasonStatsData }) {
  const hasScorer = !!stats.topScorerDisplayName;
  const hasTaker = !!stats.topWicketTakerDisplayName;
  if (!hasScorer && !hasTaker) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
              <p className="text-2xl font-black text-slate-700 leading-none">
                {stats.topScorerRuns}
              </p>
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
              <p className="text-2xl font-black text-slate-700 leading-none">
                {stats.topWicketTakerWickets}
              </p>
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

function SquadPlayerCard({
  player,
  primaryColor,
  cardRadius,
}: {
  player: ClubSeasonSquadEntry;
  primaryColor: string;
  cardRadius: string;
}) {
  const initial = (player.displayName ?? "?").charAt(0).toUpperCase();
  return (
    <div
      className="bg-white border border-gray-100 shadow-sm p-3 text-center"
      style={{ borderRadius: `${cardRadius}px` }}
    >
      <div
        className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-2 overflow-hidden"
        style={{ backgroundColor: `${primaryColor}12` }}
      >
        {player.photoUrl ? (
          <img src={player.photoUrl} className="w-14 h-14 object-cover" alt="" />
        ) : (
          <span className="font-bold text-xl" style={{ color: primaryColor }}>
            {initial}
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-gray-800 truncate">
        {player.displayName ?? "—"}
      </p>
      <div className="flex items-center justify-center gap-1 mt-1.5 flex-wrap">
        {player.isCaptain && <RoleBadge role="C" primaryColor={primaryColor} />}
        {player.isViceCaptain && <RoleBadge role="VC" primaryColor={primaryColor} />}
        {player.isWicketKeeper && <RoleBadge role="WK" primaryColor={primaryColor} />}
      </div>
      {player.playerRole && (
        <p className="text-[11px] text-gray-400 mt-1">
          {player.playerRole.replace(/_/g, " ")}
        </p>
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

  // Academy theme
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [secondaryColor, setSecondaryColor] = useState("#10b981");
  const [cornerStyle, setCornerStyle] = useState("rounded");
  const [rawCardRadius, setRawCardRadius] = useState("12");

  const cardRadius =
    cornerStyle === "sharp" ? "0" : cornerStyle === "rounded" ? "16" : rawCardRadius;

  useEffect(() => {
    publicApi
      .get("/settings/public")
      .then((r) => {
        setPrimaryColor(r.data.PRIMARY_COLOR || "#2563eb");
        setSecondaryColor(r.data.SECONDARY_COLOR || "#10b981");
        setCornerStyle(r.data.CORNER_STYLE || "rounded");
        setRawCardRadius(r.data.CARD_RADIUS || "12");
      })
      .catch(() => {});
  }, []);

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
        <div
          className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent"
          style={{ borderColor: `${primaryColor}40`, borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (notFound || !club) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-500 text-sm">Club not found.</p>
        <Link
          to="/home"
          className="text-sm font-medium hover:underline"
          style={{ color: primaryColor }}
        >
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
    !!kscaStats &&
    (!!kscaStats.topScorerDisplayName || !!kscaStats.topWicketTakerDisplayName);
  const hasPracticeStats =
    !!practiceStats &&
    (!!practiceStats.topScorerDisplayName ||
      !!practiceStats.topWicketTakerDisplayName);

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
        <div
          className="shadow-sm overflow-hidden border border-gray-100"
          style={{ borderRadius: `${cardRadius}px` }}
        >
          {/* Gradient banner using academy primary color */}
          <div
            className="px-6 pt-6 pb-8 text-white"
            style={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 60%, ${secondaryColor}88 100%)`,
            }}
          >
            <h1 className="text-2xl md:text-3xl font-bold mb-1">{club.name}</h1>
            {club.ownerName && (
              <p className="text-white/75 text-sm font-medium">
                Owned by {club.ownerName}
              </p>
            )}
          </div>
          {/* Stat callouts — overlap the banner slightly */}
          <div className="bg-white px-6 pb-5">
            <div className="flex gap-4 -mt-4 mb-4">
              <div
                className="flex-1 bg-white shadow-md border border-gray-100 px-4 py-3 text-center"
                style={{ borderRadius: `${cardRadius}px` }}
              >
                <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                  {club.totalMembers}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Members</p>
              </div>
              {club.alumniCount > 0 && (
                <div
                  className="flex-1 bg-white shadow-md border border-gray-100 px-4 py-3 text-center"
                  style={{ borderRadius: `${cardRadius}px` }}
                >
                  <p className="text-2xl font-bold" style={{ color: secondaryColor }}>
                    {club.alumniCount}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Alumni</p>
                </div>
              )}
              <div
                className="flex-1 bg-white shadow-md border border-gray-100 px-4 py-3 text-center"
                style={{ borderRadius: `${cardRadius}px` }}
              >
                <p className="text-2xl font-bold text-gray-700">
                  {club.totalMembers + club.alumniCount}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">All-time</p>
              </div>
            </div>
            {club.history && (
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {club.history}
              </p>
            )}
          </div>
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
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold transition border"
                  style={
                    selectedSeasonId === s.publicId
                      ? {
                          backgroundColor: primaryColor,
                          color: "#ffffff",
                          borderColor: primaryColor,
                          borderRadius: "9999px",
                        }
                      : {
                          backgroundColor: "#ffffff",
                          color: "#4b5563",
                          borderColor: "#e5e7eb",
                          borderRadius: "9999px",
                        }
                  }
                >
                  {s.isCurrent && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          selectedSeasonId === s.publicId ? "#ffffff" : "#10b981",
                      }}
                    />
                  )}
                  {s.name}
                </button>
              ))}
            </div>

            {loadingSeason && (
              <div className="flex justify-center py-8">
                <div
                  className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                  style={{
                    borderColor: `${primaryColor}40`,
                    borderTopColor: "transparent",
                  }}
                />
              </div>
            )}

            {!loadingSeason && seasonSummary && (
              <>
                {seasonSummary.standing && (
                  <SeasonStandingCard
                    standing={seasonSummary.standing}
                    primaryColor={primaryColor}
                  />
                )}

                {(hasSeasonStats || hasPracticeStats) && (
                  <div className="space-y-3">
                    {hasSeasonStats && kscaStats && (
                      <KscaStatsCard stats={kscaStats} primaryColor={primaryColor} />
                    )}
                    {hasPracticeStats && practiceStats && (
                      <PracticeStatsCard stats={practiceStats} />
                    )}
                  </div>
                )}

                {seasonSummary.squad.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                      {seasonSummary.seasonName} Squad
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {seasonSummary.squad.map((player) => (
                        <SquadPlayerCard
                          key={player.publicId}
                          player={player}
                          primaryColor={primaryColor}
                          cardRadius={cardRadius}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {seasonSummary.squad.length === 0 &&
                  !hasSeasonStats &&
                  !hasPracticeStats &&
                  !seasonSummary.standing && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No squad or stats recorded for this season yet.
                    </div>
                  )}
              </>
            )}

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
                  className="px-4 py-2.5 text-sm font-medium border-b-2 transition"
                  style={
                    membersTab === "current"
                      ? { borderColor: primaryColor, color: primaryColor }
                      : { borderColor: "transparent", color: "#6b7280" }
                  }
                >
                  Current ({currentMembers.length})
                </button>
                <button
                  onClick={() => setMembersTab("alumni")}
                  className="px-4 py-2.5 text-sm font-medium border-b-2 transition"
                  style={
                    membersTab === "alumni"
                      ? { borderColor: primaryColor, color: primaryColor }
                      : { borderColor: "transparent", color: "#6b7280" }
                  }
                >
                  Alumni ({alumniMembers.length})
                </button>
              </div>
            )}

            {!(currentMembers.length > 0 && alumniMembers.length > 0) &&
              seasons.length === 0 && (
                <h2 className="text-base font-semibold text-gray-700 mb-4">
                  {currentMembers.length > 0
                    ? `Members (${currentMembers.length})`
                    : `Alumni (${alumniMembers.length})`}
                </h2>
              )}

            <div className="space-y-3">
              {displayedMembers.map((member) => (
                <MemberCard
                  key={member.publicId}
                  member={member}
                  primaryColor={primaryColor}
                  cardRadius={cardRadius}
                />
              ))}
            </div>
          </div>
        )}

        {club.members.length === 0 && seasons.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No members listed yet.
          </div>
        )}
      </div>
    </div>
  );
}
