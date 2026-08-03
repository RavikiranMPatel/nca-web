import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listMatches, patchMatchNotes, deleteMatch } from "../../api/scoring/matchApi";
import { useAuth } from "../../auth/useAuth";
import type { CricketMatch } from "../../types/match";
import { ClipboardCheck } from "lucide-react";

// ── Notes template — injected only when notes field is null/empty ─────────────
export const MATCH_NOTES_TEMPLATE =
  "Overall Match Summary:\n\nTurning Point:\n\nKey Moments:\n\nWinning Factors:\n\nObservations:\n\nOpposition Strengths:\n\nOpposition Weaknesses:\n\nNext Match Strategy:";

// ── Top-level tab definition ──────────────────────────────────────────────────
type TopTab = "matches" | "notes" | "analysis";

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    SETUP: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    IN_PROGRESS:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    INNINGS_BREAK:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    SUPER_OVER:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    COMPLETED:
      "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    ABANDONED: "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400",
  };
  return map[status] ?? "bg-gray-100 text-gray-500";
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    SETUP: "Setup",
    IN_PROGRESS: "🔴 Live",
    INNINGS_BREAK: "Innings Break",
    SUPER_OVER: "Super Over",
    COMPLETED: "Completed",
    ABANDONED: "Abandoned",
  };
  return map[status] ?? status;
};

const matchTypeLabel = (t: string) => {
  const map: Record<string, string> = {
    INTERNAL: "Practice",
    INTER_ACADEMY: "Inter-Academy",
    KSCA_TOURNAMENT: "KSCA",
  };
  return map[t] ?? t;
};

// ── Share helper ──────────────────────────────────────────────────────────────
const getPublicUrl = (publicId: string) =>
  `${window.location.origin}/match/${publicId}/scorecard`;

const ShareButton = ({ match }: { match: CricketMatch }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getPublicUrl(match.publicId);
    if (navigator.share) {
      navigator
        .share({ title: match.title, text: `🏏 ${match.title} — Live scorecard`, url })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getPublicUrl(match.publicId);
    const text = encodeURIComponent(`🏏 ${match.title}\n📊 Live scorecard: ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleWhatsApp}
        className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 active:scale-90 transition-all"
        title="Share on WhatsApp"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.565 4.135 1.548 5.868L0 24l6.3-1.52A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.702-.508-5.25-1.395l-.375-.224-3.9.94.986-3.808-.244-.393A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
        </svg>
      </button>
      <button
        onClick={handleShare}
        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-90 transition-all"
        title="Copy link"
      >
        {copied ? (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
};

// ── MATCHES TAB — scoring-focused card (unchanged from before) ────────────────
const MatchCard = ({
  match,
  onClick,
  onDelete,
  onNotes,
  onReport,
  canEditNotes,
}: {
  match: CricketMatch;
  onClick: () => void;
  onDelete: (publicId: string) => void;
  onNotes: (match: CricketMatch) => void;
  onReport: (publicId: string) => void;
  canEditNotes: boolean;
}) => (
  <div
    onClick={onClick}
    className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 active:scale-[0.98] transition-all cursor-pointer"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(match.status)}`}>
            {statusLabel(match.status)}
          </span>
          <span className="text-xs text-gray-400">
            {matchTypeLabel(match.matchType)} · {match.totalOvers} ov
          </span>
        </div>
        {match.tournament?.name && (
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1 truncate">
            🏆 {match.tournament.name}
          </div>
        )}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
          {match.title}
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {match.matchDate}
          {match.resultDescription && (
            <span className="ml-2 text-blue-500 dark:text-blue-400">
              {match.resultDescription}
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {match.status !== "SETUP" && <ShareButton match={match} />}
        {canEditNotes && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onReport(match.publicId); }}
              className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 active:scale-90 transition-all"
              title="Match report"
            >
              <ClipboardCheck className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onNotes(match); }}
              className={`p-2 rounded-lg active:scale-90 transition-all ${
                match.notes
                  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
              }`}
              title={match.notes ? "Edit notes" : "Add notes"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(match.publicId); }}
          className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 active:scale-90 transition-all"
          title="Delete match"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
      {match.status === "SETUP" && <ActionChip label="Set Teams →" color="blue" />}
      {match.status === "IN_PROGRESS" && <ActionChip label="🔴 Continue Scoring" color="green" />}
      {match.status === "INNINGS_BREAK" && <ActionChip label="Start 2nd Innings" color="yellow" />}
      {match.status === "COMPLETED" && <ActionChip label="View Scorecard" color="gray" />}
      {match.dataSource === "MANUAL" && match.status === "SETUP" && (
        <ActionChip label="Enter Scorecard" color="purple" />
      )}
    </div>
  </div>
);

const ActionChip = ({ label, color }: { label: string; color: string }) => {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    yellow: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-500",
    gray: "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${colors[color]}`}>
      {label}
    </span>
  );
};

// ── MATCH NOTES TAB — notes-focused card ─────────────────────────────────────
const NotesCard = ({
  match,
  onNotes,
}: {
  match: CricketMatch;
  onNotes: (match: CricketMatch) => void;
}) => (
  <div
    onClick={() => onNotes(match)}
    className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 active:scale-[0.98] transition-all cursor-pointer"
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(match.status)}`}>
            {statusLabel(match.status)}
          </span>
          <span className="text-xs text-gray-400">
            {matchTypeLabel(match.matchType)} · {match.totalOvers} ov
          </span>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
          {match.title}
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">{match.matchDate}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {match.notes ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
            Notes saved
          </span>
        ) : (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
            No notes
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onNotes(match); }}
          className={`p-2 rounded-lg active:scale-90 transition-all ${
            match.notes
              ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
              : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
          }`}
          title={match.notes ? "Edit notes" : "Add notes"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
);

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function MatchListPage() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const canEditNotes =
    userRole === "ROLE_ADMIN" ||
    userRole === "ROLE_SUPER_ADMIN" ||
    userRole === "ROLE_COACH";

  // ── Shared data ───────────────────────────────────────────────────────────
  const [matches, setMatches] = useState<CricketMatch[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Top-level tab ─────────────────────────────────────────────────────────
  const [topTab, setTopTab] = useState<TopTab>("matches");

  // ── Matches tab state ─────────────────────────────────────────────────────
  const [filter, setFilter] = useState<"all" | "live" | "completed" | "tournament">("all");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ── Notes modal state (shared between Matches and Match Notes tabs) ───────
  const [notesModal, setNotesModal] = useState<{
    match: CricketMatch;
    text: string;
  } | null>(null);
  const [notesSaving, setNotesSaving] = useState(false);

  // ── Notes tab search ──────────────────────────────────────────────────────
  const [notesSearch, setNotesSearch] = useState("");

  useEffect(() => {
    listMatches()
      .then(setMatches)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filteredMatches = matches.filter((m) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "live"
          ? ["IN_PROGRESS", "INNINGS_BREAK", "SUPER_OVER"].includes(m.status)
          : filter === "completed"
            ? m.status === "COMPLETED"
            : filter === "tournament"
              ? !!m.tournament?.name
              : true;
    return matchesFilter && m.title.toLowerCase().includes(search.toLowerCase());
  });

  const filteredNotes = matches.filter((m) =>
    m.title.toLowerCase().includes(notesSearch.toLowerCase()),
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDelete = (publicId: string) => setConfirmDelete(publicId);

  const handleReport = (publicId: string) =>
    navigate(`/admin/cricket/matches/${publicId}/report`);

  const confirmDeleteMatch = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMatch(confirmDelete);
      setMatches((prev) => prev.filter((m) => m.publicId !== confirmDelete));
    } catch {
      /* silent */
    } finally {
      setConfirmDelete(null);
    }
  };

  const openNotesModal = (match: CricketMatch) =>
    setNotesModal({
      match,
      text: match.notes?.trim() ? match.notes : MATCH_NOTES_TEMPLATE,
    });

  const handleSaveNotes = async () => {
    if (!notesModal) return;
    setNotesSaving(true);
    try {
      await patchMatchNotes(notesModal.match.publicId, notesModal.text);
      setMatches((prev) =>
        prev.map((m) =>
          m.publicId === notesModal.match.publicId
            ? { ...m, notes: notesModal.text }
            : m,
        ),
      );
      setNotesModal(null);
    } catch {
      /* silent */
    } finally {
      setNotesSaving(false);
    }
  };

  const handleMatchClick = (match: CricketMatch) => {
    if (match.dataSource === "EXTERNAL") {
      navigate(`/admin/cricket/matches/${match.publicId}/report`);
      return;
    }
    if (match.status === "SETUP") {
      navigate(`/admin/cricket/matches/new?resume=${match.publicId}`);
    } else if (["IN_PROGRESS", "INNINGS_BREAK", "SUPER_OVER"].includes(match.status)) {
      navigate(`/admin/cricket/matches/${match.publicId}/score`);
    } else if (match.status === "COMPLETED") {
      window.open(`/match/${match.publicId}/scorecard`, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">

        {/* Title row — New Match button only relevant on Matches tab */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            Matches
          </h1>
          {topTab === "matches" && (
            <button
              onClick={() => navigate("/admin/cricket/matches/new")}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl active:scale-95 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Match
            </button>
          )}
        </div>

        {/* ── Top-level tabs: Matches | Match Notes | Analysis ───────────── */}
        <div className="flex gap-1 mb-3 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(
            [
              { id: "matches" as TopTab, label: "Matches" },
              { id: "notes" as TopTab, label: "Match Notes" },
              { id: "analysis" as TopTab, label: "Analysis" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTopTab(id)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                topTab === id
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Matches tab: search + filter bar ──────────────────────────── */}
        {topTab === "matches" && (
          <>
            <input
              type="text"
              placeholder="Search matches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none mb-3"
            />
            <div className="flex gap-2">
              {(["all", "live", "completed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === f
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {f === "all" ? "All" : f === "live" ? "🔴 Live" : "Completed"}
                </button>
              ))}
              {/* TODO: re-enable when Tournament feature ships
              <button
                key="tournament"
                onClick={() => setFilter("tournament")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === "tournament"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                }`}
              >
                🏆 Tournament
              </button>
              */}
            </div>
          </>
        )}

        {/* ── Match Notes tab: search only ──────────────────────────────── */}
        {topTab === "notes" && (
          <input
            type="text"
            placeholder="Search matches..."
            value={notesSearch}
            onChange={(e) => setNotesSearch(e.target.value)}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
          />
        )}
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}

      {/* MATCHES TAB ─────────────────────────────────────────────────────── */}
      {topTab === "matches" && (
        <div className="px-4 pt-4 space-y-3 max-w-2xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🏏</div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                No matches found
              </p>
              <p className="text-xs text-gray-400">
                {filter === "live"
                  ? "No live matches right now"
                  : "Create your first match to get started"}
              </p>
              {filter !== "live" && (
                <button
                  onClick={() => navigate("/admin/cricket/matches/new")}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl active:scale-95"
                >
                  New Match
                </button>
              )}
            </div>
          ) : (
            filteredMatches.map((match) => (
              <MatchCard
                key={match.publicId}
                match={match}
                onClick={() => handleMatchClick(match)}
                onDelete={handleDelete}
                onNotes={openNotesModal}
                onReport={handleReport}
                canEditNotes={canEditNotes}
              />
            ))
          )}
        </div>
      )}

      {/* MATCH NOTES TAB ─────────────────────────────────────────────────── */}
      {topTab === "notes" && (
        <div className="px-4 pt-4 space-y-3 max-w-2xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                No matches found
              </p>
              <p className="text-xs text-gray-400">
                Create a match first, then add notes here.
              </p>
            </div>
          ) : (
            filteredNotes.map((match) => (
              <NotesCard
                key={match.publicId}
                match={match}
                onNotes={openNotesModal}
              />
            ))
          )}
        </div>
      )}

      {/* ANALYSIS TAB ───────────────────────────────────────────────────── */}
      {topTab === "analysis" && (
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-base font-semibold text-gray-900 dark:text-white mb-2">
            Match analytics coming soon
          </p>
          <p className="text-sm text-gray-400 text-center max-w-xs">
            Performance trends, batting/bowling breakdowns, and team analytics
            will appear here.
          </p>
        </div>
      )}

      {/* ── Notes modal (shared across Matches + Match Notes tabs) ────────── */}
      {notesModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl max-h-[90vh] flex flex-col">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Match Notes
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 truncate">
              {notesModal.match.title}
            </p>

            {/* Key Moments compact summary */}
            <div className="mb-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Key Moments
                </span>
                <button
                  onClick={() => {
                    setNotesModal(null);
                    if (notesModal.match.dataSource === "EXTERNAL") {
                      navigate(`/admin/cricket/matches/${notesModal.match.publicId}/report`);
                    } else {
                      navigate(`/match/${notesModal.match.publicId}/scorecard#key-moments`);
                    }
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  Manage →
                </button>
              </div>
              {notesModal.match.keyMoments && notesModal.match.keyMoments.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {notesModal.match.keyMoments.length} moment{notesModal.match.keyMoments.length !== 1 ? "s" : ""} logged
                  </p>
                  {notesModal.match.keyMoments.slice(0, 2).map((km, i) => (
                    <p key={i} className="text-xs text-gray-700 dark:text-gray-300 truncate">
                      {km.overNumber != null ? `${km.overNumber}${km.ballNumber != null ? `.${km.ballNumber}` : ""} — ` : ""}
                      {km.description}
                      {km.playerName ? ` (${km.playerName})` : ""}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">None logged yet</p>
              )}
            </div>

            <textarea
              autoFocus
              rows={8}
              value={notesModal.text}
              onChange={(e) =>
                setNotesModal((prev) =>
                  prev ? { ...prev, text: e.target.value } : prev,
                )
              }
              placeholder="Fill in notes above each heading…"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono flex-1 min-h-0"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setNotesModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={notesSaving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold active:scale-95 disabled:opacity-60"
              >
                {notesSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ────────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              Delete Match?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              This will permanently delete the match and all its deliveries,
              innings, and scorecard data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMatch}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
