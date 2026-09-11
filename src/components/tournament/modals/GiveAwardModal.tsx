import { useEffect, useState } from "react";
import {
  getMatchAwardCandidates,
  getTournamentAwardCandidates,
  type AwardCandidate,
  type AwardSlot,
} from "../../../api/scoring/tournamentApi";

/**
 * Picking who gets an award, from the candidates the server offers.
 *
 * Phase 15: "select from actual match players" and "show batting, bowling and
 * fielding candidate statistics". So this never renders a player search — the
 * list it shows IS the candidate list, and each row carries the figures that
 * justify the choice. For a Man of the Match those are the two XIs of that match
 * with that match's figures; for a tournament award, everyone who has played,
 * with tournament-wide figures.
 *
 * Which figures lead is driven by the slot's `candidateSource`, so a Best Bowler
 * opens on wickets and economy rather than on runs. The server decides that, not
 * this component — the enum and the CHECK constraint behind it are the one place
 * the award list is defined.
 *
 * Editing is the same sheet: an already-given award opens with its holder
 * selected and its reason filled in, because giving and changing are the same
 * write on the server and the audit records both.
 */
interface Props {
  publicId: string;
  slot: AwardSlot;
  /** Set for a Man of the Match; absent for a tournament-level award. */
  matchPublicId?: string;
  posting: boolean;
  onCancel: () => void;
  onGive: (playerPublicId: string, teamPublicId: string, reason: string) => void;
}

export default function GiveAwardModal({
  publicId, slot, matchPublicId, posting, onCancel, onGive,
}: Props) {
  const [candidates, setCandidates] = useState<AwardCandidate[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(
    slot.award?.playerPublicId ?? null,
  );
  const [reason, setReason] = useState(slot.award?.reason ?? "");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = matchPublicId
          ? await getMatchAwardCandidates(publicId, matchPublicId)
          : await getTournamentAwardCandidates(publicId);
        if (!cancelled) setCandidates(list);
      } catch {
        if (!cancelled) setError("Failed to load candidates");
      }
    })();
    return () => { cancelled = true; };
  }, [publicId, matchPublicId]);

  const shown = (candidates ?? []).filter((c) =>
    c.playerName.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const chosen = (candidates ?? []).find((c) => c.playerPublicId === selected);

  /** The figures that matter for this award, led by its own discipline. */
  const figures = (c: AwardCandidate) => {
    const batting = `${c.runs}${c.notOut ? "*" : ""} (${c.balls}b, ${c.fours}x4, ${c.sixes}x6)`;
    const bowling = `${c.wickets}/${c.runsConceded} in ${c.overs} ov, econ ${c.economy}`;
    const fielding = `${c.catches} ct · ${c.runOuts} ro · ${c.stumpings} st`;
    switch (slot.candidateSource) {
      case "BOWLING": return [bowling, batting, fielding];
      case "FIELDING": return [fielding, batting, bowling];
      case "BATTING": return [batting, bowling, fielding];
      default: return [batting, bowling, fielding];
    }
  };

  return (
    <div
      data-testid="give-award-modal"
      className="fixed inset-0 z-[60] bg-black/70 flex items-end"
    >
      <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {slot.award ? "Change" : "Award"} {slot.label}
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {matchPublicId
              ? "Both playing XIs, with this match's figures."
              : "Everyone who has played, with tournament figures."}
          </p>
          <input
            data-testid="award-candidate-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates…"
            className="w-full mt-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {error && (
            <div className="px-3 py-2 my-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {!candidates && !error && (
            <div className="py-6 text-center text-xs text-gray-400">
              Loading candidates…
            </div>
          )}
          {candidates && shown.length === 0 && (
            <div data-testid="award-no-candidates"
                 className="py-6 text-center text-xs text-gray-400">
              {candidates.length === 0
                ? "No completed matches yet, so there are no candidates."
                : "No candidate matches that search."}
            </div>
          )}
          <div className="space-y-1.5 py-1">
            {shown.map((c) => {
              const isSelected = c.playerPublicId === selected;
              const [lead, ...rest] = figures(c);
              return (
                <button
                  key={c.playerPublicId}
                  data-testid={`award-candidate-${c.playerPublicId}`}
                  onClick={() => setSelected(c.playerPublicId)}
                  className={`w-full text-left px-3 py-2 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500"
                      : "bg-gray-50 dark:bg-gray-800 border-transparent"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {c.playerName}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {c.teamName}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-600 dark:text-gray-300 tabular-nums mt-0.5">
                    {lead}
                  </div>
                  <div className="text-[10px] text-gray-400 tabular-nums">
                    {rest.join("  ·  ")}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <textarea
            data-testid="award-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Reason (optional, but it is what the audit shows)"
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              data-testid="award-cancel"
              onClick={onCancel}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              data-testid="award-confirm"
              disabled={!chosen || posting}
              onClick={() =>
                chosen && onGive(chosen.playerPublicId, chosen.teamPublicId ?? "", reason)
              }
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
            >
              {posting ? "Saving…" : slot.award ? "Change award" : "Give award"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
