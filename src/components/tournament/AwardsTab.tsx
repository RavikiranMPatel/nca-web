import { useEffect, useState } from "react";
import {
  giveAward,
  listAwardSlots,
  listAwards,
  revokeAward,
  type AwardSlot,
  type TournamentAward,
} from "../../api/scoring/tournamentApi";
import GiveAwardModal from "./modals/GiveAwardModal";
import type { ApiRecord } from "./types";

/**
 * Phases 15 and 16 — the tournament's awards.
 *
 * Two halves, because the two phases are two different things. The
 * tournament-level awards (Man of the Series and the configurable ones) are
 * SLOTS: a fixed list the server supplies, each either filled or empty, each
 * fillable once. The Man of the Match awards are PER COMPLETED FIXTURE, so they
 * are listed against the matches they belong to.
 *
 * The slot list comes from the server rather than being hard-coded here. A
 * hard-coded list would drift from AwardType and from V103's CHECK constraint,
 * and the first symptom would be a 400 that looks like a bug in the form.
 *
 * Giving and changing are the same action — the server replaces the holder and
 * audits both names — so there is one button whose label changes, not two flows.
 *
 * Read-only for anyone who is not ADMIN or SUPER_ADMIN: the service refuses the
 * write anyway, and offering a button that always fails is worse than not
 * offering it.
 */
interface Props {
  publicId: string;
  fixtures: ApiRecord[];
  canAward: boolean;
  showToast: (msg: string) => void;
  setError: (msg: string) => void;
}

export default function AwardsTab({
  publicId, fixtures, canAward, showToast, setError,
}: Props) {
  const [slots, setSlots] = useState<AwardSlot[] | null>(null);
  const [awards, setAwards] = useState<TournamentAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [giving, setGiving] = useState<{ slot: AwardSlot; matchPublicId?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([listAwardSlots(publicId), listAwards(publicId)]);
      setSlots(s);
      setAwards(a);
    } catch {
      setError("Failed to load awards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [publicId]);

  const completed = fixtures.filter(
    (f: ApiRecord) => f.status === "COMPLETED" && f.match?.publicId,
  );
  const motmByMatch = new Map<string, TournamentAward>();
  for (const a of awards) {
    if (a.awardType === "MAN_OF_THE_MATCH" && a.matchPublicId) {
      motmByMatch.set(a.matchPublicId, a);
    }
  }

  const onGive = async (playerPublicId: string, teamPublicId: string, reason: string) => {
    if (!giving) return;
    setPosting(true);
    try {
      await giveAward(publicId, {
        awardType: giving.slot.awardType,
        playerPublicId,
        teamPublicId,
        matchPublicId: giving.matchPublicId,
        reason: reason.trim() || undefined,
      });
      showToast(`✓ ${giving.slot.label} awarded`);
      setGiving(null);
      await load();
    } catch {
      setError(`Failed to award ${giving.slot.label}`);
    } finally {
      setPosting(false);
    }
  };

  const onRevoke = async (award: TournamentAward) => {
    setPosting(true);
    try {
      await revokeAward(publicId, award.publicId);
      showToast(`✓ ${award.awardLabel} removed`);
      await load();
    } catch {
      setError(`Failed to remove ${award.awardLabel}`);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div data-testid="tournament-panel-awards" className="space-y-4">
      {loading && !slots && (
        <div data-testid="awards-loading" className="px-4 py-6 text-center text-xs text-gray-400">
          Loading awards…
        </div>
      )}

      {slots && (
        <>
          {/* ── Tournament awards (Phase 16) ── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Tournament Awards
            </h3>
            <div className="space-y-2">
              {slots.map((slot) => (
                <div
                  key={slot.awardType}
                  data-testid={`award-slot-${slot.awardType}`}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {slot.label}
                      </div>
                      {slot.award ? (
                        <>
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">
                            {slot.award.playerName}
                            <span className="text-gray-400 font-normal">
                              {" "}· {slot.award.teamName}
                            </span>
                          </div>
                          {slot.award.reason && (
                            <div className="text-[11px] text-gray-400 truncate">
                              {slot.award.reason}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-gray-400">Not awarded</div>
                      )}
                    </div>
                    {canAward && (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          data-testid={`award-give-${slot.awardType}`}
                          onClick={() => setGiving({ slot })}
                          disabled={posting}
                          className="px-2.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg active:scale-95 disabled:opacity-40"
                        >
                          {slot.award ? "Change" : "Award"}
                        </button>
                        {slot.award && (
                          <button
                            data-testid={`award-revoke-${slot.awardType}`}
                            onClick={() => onRevoke(slot.award!)}
                            disabled={posting}
                            className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg active:scale-95 disabled:opacity-40"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Man of the Match, per completed fixture (Phase 15) ── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Man of the Match
            </h3>
            {completed.length === 0 ? (
              <div
                data-testid="awards-no-completed-matches"
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-8 text-center"
              >
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  No completed matches yet
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  A Man of the Match can be given once a fixture is complete.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {completed.map((f: ApiRecord) => {
                  const award = motmByMatch.get(f.match.publicId);
                  return (
                    <div
                      key={f.publicId}
                      data-testid={`motm-fixture-${f.publicId}`}
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {f.homeTeam?.name ?? "—"} v {f.awayTeam?.name ?? "—"}
                          </div>
                          {award ? (
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">
                              🏅 {award.playerName}
                              <span className="text-gray-400 font-normal">
                                {" "}· {award.teamName}
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">Not awarded</div>
                          )}
                        </div>
                        {canAward && (
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button
                              data-testid={`motm-give-${f.publicId}`}
                              onClick={() =>
                                setGiving({
                                  slot: {
                                    awardType: "MAN_OF_THE_MATCH",
                                    label: "Man of the Match",
                                    candidateSource: "ALL_ROUND",
                                    award: award ?? null,
                                  },
                                  matchPublicId: f.match.publicId,
                                })
                              }
                              disabled={posting}
                              className="px-2.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg active:scale-95 disabled:opacity-40"
                            >
                              {award ? "Change" : "Award"}
                            </button>
                            {award && (
                              <button
                                data-testid={`motm-revoke-${f.publicId}`}
                                onClick={() => onRevoke(award)}
                                disabled={posting}
                                className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg active:scale-95 disabled:opacity-40"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {giving && (
        <GiveAwardModal
          publicId={publicId}
          slot={giving.slot}
          matchPublicId={giving.matchPublicId}
          posting={posting}
          onCancel={() => setGiving(null)}
          onGive={onGive}
        />
      )}
    </div>
  );
}
