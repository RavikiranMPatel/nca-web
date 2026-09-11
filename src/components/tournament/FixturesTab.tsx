/**
 * FixturesTab — the fixture list, grouped by date and ground, with the actions that operate on a fixture.
 *
 * Moved out of TournamentDetailPage by the Slice 2 split, JSX unchanged. Every
 * piece of state and every handler still lives in the page and arrives here as a
 * prop: the split was about the size of one 3,559-line file, not about moving
 * where the state sits, and keeping the data flow identical is what lets
 * tournament-tabs.spec.ts prove the refactor by passing unchanged.
 */
import type { Dispatch, SetStateAction } from "react";
import type { ApiRecord, GenForm, Handler } from "./types";
import { fixtureStatusColor } from "./constants";
import api from "../../api/axios";

interface Props {
  fixtureGroundFilter: ApiRecord;
  fixtures: ApiRecord[];
  handleAdvanceKnockout: ApiRecord;
  handleMarkFinal: Handler;
  handleStartMatch: Handler;
  loadAll: Handler;
  navigate: Handler;
  openEditFixture: Handler;
  posting: ApiRecord;
  publicId: ApiRecord;
  setError: Dispatch<SetStateAction<ApiRecord>>;
  setGenForm: Dispatch<SetStateAction<GenForm>>;
  setPosting: Dispatch<SetStateAction<ApiRecord>>;
  setShowAdvancePlayoffs: Dispatch<SetStateAction<ApiRecord>>;
  setShowGenerate: Dispatch<SetStateAction<ApiRecord>>;
  setShowManualFixture: Dispatch<SetStateAction<ApiRecord>>;
  showToast: Handler;
  tournament: ApiRecord;
}

export default function FixturesTab({
  fixtureGroundFilter,
  fixtures,
  handleAdvanceKnockout,
  handleMarkFinal,
  handleStartMatch,
  loadAll,
  navigate,
  openEditFixture,
  posting,
  publicId,
  setError,
  setGenForm,
  setPosting,
  setShowAdvancePlayoffs,
  setShowGenerate,
  setShowManualFixture,
  showToast,
  tournament,
}: Props) {
  return (
      <div data-testid="tournament-panel-fixtures" className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setGenForm((p) => ({
                ...p,
                scheduleStartDate: tournament.startDate ?? "",
                scheduleStartTime: tournament.dayStartTime ?? "09:30",
                maxMatchesPerDay: tournament.maxMatchesPerDay ?? 2,
              }));
              setShowGenerate(true);
            }}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl active:scale-95"
          >
            ⚡ Auto Generate
          </button>
          {fixtures.length > 0 && (
            <button
              onClick={async () => {
                if (
                  !confirm(
                    `Delete all ${fixtures.length} fixtures? This cannot be undone.`,
                  )
                )
                  return;
                setPosting(true);
                try {
                  await api.delete(
                    `/admin/cricket/tournaments/${publicId}/fixtures`,
                  );
                  await loadAll();
                  showToast("✓ All fixtures deleted");
                } catch (e: any) {
                  setError(
                    e.response?.data?.message ??
                      "Failed to delete fixtures",
                  );
                } finally {
                  setPosting(false);
                }
              }}
              disabled={posting}
              className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-semibold rounded-xl active:scale-95 disabled:opacity-40"
            >
              🗑 Delete All
            </button>
          )}
          <button
            onClick={() => setShowManualFixture(true)}
            className="px-3 py-1.5 bg-gray-700 text-white text-xs font-semibold rounded-xl active:scale-95"
          >
            + Add Manually
          </button>
          {tournament.format === "GROUP_KNOCKOUT" && (
            <button
              onClick={handleAdvanceKnockout}
              disabled={posting}
              className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-xl active:scale-95 disabled:opacity-40"
            >
              🏆 Advance to Knockout
            </button>
          )}
          {tournament.format === "LEAGUE_PLAYOFFS" &&
            (() => {
              const leagueFixtures = fixtures.filter(
                (f: any) =>
                  f.stage?.stageType === "LEAGUE" ||
                  f.stage?.stageName === "League Stage",
              );
              const hasLeagueFixtures = leagueFixtures.length > 0;
              const allLeagueCompleted =
                hasLeagueFixtures &&
                leagueFixtures.every((f: any) => f.status === "COMPLETED");

              const btnLabel = !hasLeagueFixtures
                ? "Generate league fixtures first"
                : !allLeagueCompleted
                  ? `${leagueFixtures.filter((f: any) => f.status === "COMPLETED").length}/${leagueFixtures.length} matches done`
                  : null;

              return (
                <div className="flex flex-col items-start gap-1">
                  <button
                    onClick={() => {
                      if (!allLeagueCompleted) return;
                      setShowAdvancePlayoffs(true);
                    }}
                    disabled={posting || !allLeagueCompleted}
                    className={`px-3 py-1.5 text-white text-xs font-semibold rounded-xl transition-all ${
                      allLeagueCompleted
                        ? "bg-purple-600 active:scale-95"
                        : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                    }`}
                  >
                    🏆 Advance to Playoffs
                  </button>
                  {btnLabel && (
                    <span className="text-xs text-gray-400 px-1">
                      {btnLabel}
                    </span>
                  )}
                </div>
              );
            })()}
        </div>

        {/* ── DATE+GROUND VIEW ── */}
        {(() => {
          // Group fixtures by date
          const byDate: Record<string, any[]> = {};
          fixtures.forEach((f: any) => {
            const dateKey = f.scheduledAt
              ? new Date(f.scheduledAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  weekday: "short",
                })
              : "Unscheduled";
            if (!byDate[dateKey]) byDate[dateKey] = [];
            byDate[dateKey].push(f);
          });

          // Apply ground filter
          const filteredByDate: Record<string, any[]> = {};
          Object.entries(byDate).forEach(([date, dayFixtures]) => {
            const filtered = dayFixtures.filter((f: any) => {
              if (
                fixtureGroundFilter !== "ALL" &&
                f.tournamentVenue?.id !== fixtureGroundFilter
              )
                return false;
              return true;
            });
            if (filtered.length > 0) filteredByDate[date] = filtered;
          });

          if (Object.keys(filteredByDate).length === 0)
            return (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">📅</div>
                <p className="text-sm text-gray-400">No fixtures yet.</p>
              </div>
            );

          return Object.entries(filteredByDate).map(
            ([dateStr, dayFixtures]) => {
              // Group by ground within the day
              const byGround: Record<string, any[]> = {};
              dayFixtures.forEach((f: any) => {
                const groundKey = f.venue ?? "No Venue";
                if (!byGround[groundKey]) byGround[groundKey] = [];
                byGround[groundKey].push(f);
              });

              return (
                <div key={dateStr} className="space-y-2">
                  {/* Date header */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2">
                      📅 {dateStr} · {dayFixtures.length} match
                      {dayFixtures.length !== 1 ? "es" : ""}
                    </span>
                    <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                  </div>

                  {/* Per-ground columns */}
                  {Object.entries(byGround).map(
                    ([groundName, groundFixtures]) => (
                      <div
                        key={groundName}
                        className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden"
                      >
                        {/* Ground header */}
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                          <span className="text-xs">📍</span>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {groundName}
                          </span>
                          <span className="ml-auto text-xs text-gray-400">
                            {groundFixtures.length} match
                            {groundFixtures.length !== 1 ? "es" : ""}
                          </span>
                        </div>

                        {/* Fixtures on this ground */}
                        <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                          {groundFixtures
                            .sort(
                              (a: any, b: any) =>
                                new Date(a.scheduledAt).getTime() -
                                new Date(b.scheduledAt).getTime(),
                            )
                            .map((f: any) => (
                              <div key={f.publicId} className="p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span
                                    className={`text-xs font-medium ${fixtureStatusColor[f.status] ?? "text-gray-400"}`}
                                  >
                                    {f.status}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">
                                      {f.label
                                        ? f.label
                                        : `Round ${f.roundNumber}`}
                                    </span>
                                    {/* Marking the final is what lets the
                                        tournament complete itself and set its
                                        own champion, so it lives on the fixture
                                        rather than in settings. */}
                                    <button
                                      data-testid={`fixture-final-${f.publicId}`}
                                      title={
                                        f.isFinal
                                          ? "This fixture decides the tournament"
                                          : "Mark as the final"
                                      }
                                      onClick={() => handleMarkFinal(f.publicId, !f.isFinal)}
                                      className={`px-1.5 py-0.5 rounded-lg text-xs active:scale-90 ${
                                        f.isFinal
                                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-semibold"
                                          : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                                      }`}
                                    >
                                      {f.isFinal ? "🏆 Final" : "🏆"}
                                    </button>
                                    <button
                                      onClick={() => openEditFixture(f)}
                                      className="p-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 active:scale-90"
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
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {f.homeTeam?.name ?? "TBD"}
                                  </div>
                                  <div className="text-xs text-gray-400 px-2">
                                    vs
                                  </div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
                                    {f.awayTeam?.name ?? "TBD"}
                                  </div>
                                </div>

                                {f.scheduledAt && (
                                  <div className="text-xs text-gray-400 mb-1">
                                    🕐{" "}
                                    {new Date(
                                      f.scheduledAt,
                                    ).toLocaleTimeString("en-IN", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}
                                  </div>
                                )}

                                <div className="flex gap-2 mt-1">
                                  {f.status === "SCHEDULED" &&
                                    f.homeTeam &&
                                    f.awayTeam && (
                                      <button
                                        onClick={() => handleStartMatch(f)}
                                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg active:scale-95"
                                      >
                                        🏏 Start Match
                                      </button>
                                    )}
                                  {f.status === "IN_PROGRESS" &&
                                    f.match && (
                                      <button
                                        onClick={() =>
                                          navigate(
                                            `/admin/cricket/matches/${f.match.publicId}/score`,
                                          )
                                        }
                                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg active:scale-95"
                                      >
                                        🔴 Live Scorer
                                      </button>
                                    )}
                                  {f.status === "COMPLETED" && f.match && (
                                    <button
                                      onClick={() =>
                                        navigate(
                                          `/match/${f.match.publicId}/scorecard`,
                                        )
                                      }
                                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg active:scale-95"
                                    >
                                      📊 Scorecard
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              );
            },
          );
        })()}
        {fixtures.length === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-sm text-gray-400">No fixtures yet.</p>
          </div>
        )}
      </div>
  );
}
