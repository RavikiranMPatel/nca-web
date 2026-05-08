import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  listTournaments,
  updateTournamentStatus,
} from "../../api/scoring/tournamentApi";
import api from "../../api/axios";

const statusBadge: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  ACTIVE:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED: "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  CANCELLED: "bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400",
};

const formatLabel: Record<string, string> = {
  ROUND_ROBIN: "Round Robin",
  KNOCKOUT: "Knockout",
  GROUP_KNOCKOUT: "Group + Knockout",
  DOUBLE_ELIMINATION: "Double Elimination",
  CUSTOM: "Custom",
};

export default function TournamentListPage() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "ACTIVE" | "COMPLETED">("all");
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [posting, setPosting] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const reload = () =>
    listTournaments()
      .then(setTournaments)
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);

  const handleStatusChange = async (t: any, status: string) => {
    setMenuOpen(null);
    try {
      await updateTournamentStatus(t.publicId, status);
      showToast(
        `✓ Tournament ${status === "CANCELLED" ? "disabled" : "updated"}`,
      );
      reload();
    } catch {
      showToast("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setPosting(true);
    try {
      await api.delete(`/admin/cricket/tournaments/${confirmDelete.publicId}`);
      setConfirmDelete(null);
      showToast("✓ Tournament deleted");
      reload();
    } catch (e: any) {
      showToast(e.response?.data?.message ?? "Failed to delete tournament");
    } finally {
      setPosting(false);
    }
  };

  const filtered = tournaments.filter((t) =>
    filter === "all" ? true : t.status === filter,
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            Tournaments
          </h1>
          <button
            onClick={() => navigate("/admin/cricket/tournaments/new")}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl active:scale-95 transition-all"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Tournament
          </button>
        </div>
        <div className="flex gap-2">
          {(["all", "ACTIVE", "COMPLETED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              }`}
            >
              {f === "all" ? "All" : f === "ACTIVE" ? "🏏 Active" : "Completed"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              No tournaments found
            </p>
            <p className="text-xs text-gray-400">
              Create your first tournament to get started
            </p>
            <button
              onClick={() => navigate("/admin/cricket/tournaments/new")}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl active:scale-95"
            >
              New Tournament
            </button>
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.publicId}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex-1 min-w-0 cursor-pointer active:scale-[0.98] transition-all"
                  onClick={() =>
                    navigate(`/admin/cricket/tournaments/${t.publicId}`)
                  }
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[t.status] ?? statusBadge.DRAFT}`}
                    >
                      {t.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatLabel[t.format] ?? t.format}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {t.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.startDate} {t.endDate ? `→ ${t.endDate}` : ""} ·{" "}
                    {t.defaultOvers} overs
                  </p>
                  {t.venue && (
                    <p className="text-xs text-gray-400">📍 {t.venue}</p>
                  )}
                </div>

                {/* ── 3-dot menu ── */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === t.publicId ? null : t.publicId);
                    }}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-90 transition-all"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="5" cy="12" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="19" cy="12" r="2" />
                    </svg>
                  </button>

                  {menuOpen === t.publicId && (
                    <div className="absolute right-0 top-10 z-20 w-44 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/cricket/tournaments/${t.publicId}`);
                          setMenuOpen(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        View Details
                      </button>

                      {t.status !== "CANCELLED" && t.status !== "COMPLETED" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(t, "CANCELLED");
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-left border-t border-gray-100 dark:border-gray-700"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                            />
                          </svg>
                          Disable Tournament
                        </button>
                      )}

                      {t.status === "CANCELLED" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(t, "ACTIVE");
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 text-left border-t border-gray-100 dark:border-gray-700"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Re-enable
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(null);
                          setConfirmDelete(t);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left border-t border-gray-100 dark:border-gray-700"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Delete Tournament
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── CONFIRM DELETE MODAL ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl">
            <div className="text-2xl mb-3 text-center">⚠️</div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 text-center">
              Delete Tournament?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 text-center">
              <b>{confirmDelete.name}</b>
            </p>
            <p className="text-xs text-gray-400 mb-5 text-center">
              This will permanently delete the tournament, all fixtures, teams
              and squad data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={posting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-95"
              >
                {posting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close menu on outside click */}
      {menuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 border border-green-600 text-green-400 text-sm font-semibold px-6 py-2.5 rounded-full shadow-xl pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
