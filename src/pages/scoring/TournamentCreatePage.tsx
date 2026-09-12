import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createTournament,
  getTournament,
  updateTournament,
  type TournamentInput,
} from "../../api/scoring/tournamentApi";
import TournamentDetailsForm from "../../components/tournament/TournamentDetailsForm";

/**
 * Create a tournament, or edit one — the same page, distinguished by whether the
 * route carries a publicId.
 *
 * One page rather than two because the form is the same form: Phase 2's field
 * list does not change between creating and correcting. Before this slice there
 * was no edit route at all, and `updateTournament` sat in the API module with no
 * caller anywhere in `src/`, so every one of these fields was write-once.
 */

/** Season label without a round trip, so the hint updates as dates are typed. */
function seasonOf(start?: string | null, end?: string | null): string | null {
  if (!start) return null;
  const startYear = Number(start.slice(0, 4));
  if (!Number.isFinite(startYear)) return null;
  const endYear = end ? Number(end.slice(0, 4)) : startYear;
  if (!Number.isFinite(endYear) || endYear === startYear) return String(startYear);
  return `${startYear}-${String(endYear % 100).padStart(2, "0")}`;
}

const EMPTY: TournamentInput = {
  name: "",
  shortName: "",
  format: "ROUND_ROBIN",
  tournamentType: "INTERNAL",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  organizer: "",
  venue: "",
  description: "",
  logoUrl: "",
  defaultOvers: 20,
  winPoints: 2,
  tiePoints: 1,
  noResultPoints: 1,
  lossPoints: 0,
};

export default function TournamentCreatePage() {
  const navigate = useNavigate();
  const { publicId } = useParams<{ publicId: string }>();
  const editing = Boolean(publicId);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(editing);
  const [error, setError] = useState("");
  const [form, setForm] = useState<TournamentInput>(EMPTY);

  const set = (
    key: keyof TournamentInput,
    value: string | number | undefined,
  ) => setForm((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    if (!publicId) return;
    let live = true;
    getTournament(publicId)
      .then((t) => {
        if (!live) return;
        // Only the fields this form owns. Spreading the whole payload would
        // carry the scheduling and qualification config into a PUT that does
        // not accept them, and a full-replace PUT would then clear them.
        setForm({
          name: t.name ?? "",
          shortName: t.shortName ?? "",
          format: t.format ?? "ROUND_ROBIN",
          tournamentType: t.tournamentType ?? "INTERNAL",
          startDate: t.startDate ?? "",
          endDate: t.endDate ?? "",
          organizer: t.organizer ?? "",
          venue: t.venue ?? "",
          description: t.description ?? "",
          logoUrl: t.logoUrl ?? "",
          defaultOvers: t.defaultOvers ?? 20,
          winPoints: t.winPoints ?? 2,
          tiePoints: t.tiePoints ?? 1,
          noResultPoints: t.noResultPoints ?? 1,
          lossPoints: t.lossPoints ?? 0,
        });
      })
      .catch((e) =>
        setError(e.response?.data?.message ?? "Failed to load tournament"),
      )
      .finally(() => live && setFetching(false));
    return () => {
      live = false;
    };
  }, [publicId]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Tournament name is required");
      return;
    }
    // The server refuses this too; catching it here saves a round trip and puts
    // the message next to the field that caused it.
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError("End date cannot be before the start date");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Empty strings are sent as undefined so the server stores null rather
      // than "", which would otherwise make "no short name" and "a short name
      // of nothing" different values in the database.
      const body: TournamentInput = {
        ...form,
        shortName: form.shortName?.trim() || undefined,
        organizer: form.organizer?.trim() || undefined,
        venue: form.venue?.trim() || undefined,
        description: form.description?.trim() || undefined,
        logoUrl: form.logoUrl?.trim() || undefined,
        endDate: form.endDate || undefined,
        startDate: form.startDate || undefined,
      };
      const saved = publicId
        ? await updateTournament(publicId, body)
        : await createTournament(body);
      navigate(`/admin/cricket/tournaments/${saved.publicId}`);
    } catch (e: any) {
      setError(
        e.response?.data?.message ??
          `Failed to ${editing ? "save" : "create"} tournament`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="p-1 text-gray-500 dark:text-gray-400"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1
            className="text-base font-semibold text-gray-900 dark:text-white"
            data-testid="tournament-form-heading"
          >
            {editing ? "Edit Tournament" : "New Tournament"}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-5 max-w-2xl mx-auto space-y-5">
        {error && (
          <div
            data-testid="tournament-form-error"
            className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </div>
        )}

        {fetching ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <TournamentDetailsForm
            form={form}
            set={set}
            seasonLabel={seasonOf(form.startDate, form.endDate)}
          />
        )}
      </div>

      {/* Mobile-sticky action bar. bottom-16 on mobile clears BottomNav (z-50). */}
      <div className="fixed bottom-16 sm:bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-3 z-[60]">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || fetching}
            onClick={handleSave}
            data-testid="tournament-form-save"
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {loading && (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {editing ? "Save Changes" : "🏆 Create Tournament"}
          </button>
        </div>
      </div>
    </div>
  );
}
