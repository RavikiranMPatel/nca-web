import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getMatch, getTeams } from "../../api/scoring/matchApi";
import type {
  CricketMatch,
  CricketTeam,
  MatchTeamPlayer,
} from "../../types/match";

// ── Types ─────────────────────────────────────────────────────────────────────
interface BattingRow {
  playerPublicId: string;
  playerName: string;
  battingOrder: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  howOut: string;
  bowlerPublicId: string;
  fielderPublicId: string;
}

interface BowlingRow {
  playerPublicId: string;
  playerName: string;
  oversBowled: string;
  maidens: number;
  runsConceded: number;
  wickets: number;
  wides: number;
  noBalls: number;
}

interface InningsEntry {
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  totalWickets: number;
  totalBalls: number;
  extrasWide: number;
  extrasNoBall: number;
  extrasBye: number;
  extrasLegBye: number;
  batting: BattingRow[];
  bowling: BowlingRow[];
}

const HOW_OUT_OPTIONS = [
  "not out",
  "b",
  "c b",
  "lbw b",
  "run out",
  "st b",
  "hit wicket b",
  "retired hurt",
  "did not bat",
];

const emptyBatting = (
  order: number,
  publicId: string,
  name: string,
): BattingRow => ({
  playerPublicId: publicId,
  playerName: name,
  battingOrder: order,
  runs: 0,
  ballsFaced: 0,
  fours: 0,
  sixes: 0,
  howOut: "not out",
  bowlerPublicId: "",
  fielderPublicId: "",
});

const emptyBowling = (publicId: string, name: string): BowlingRow => ({
  playerPublicId: publicId,
  playerName: name,
  oversBowled: "0.0",
  maidens: 0,
  runsConceded: 0,
  wickets: 0,
  wides: 0,
  noBalls: 0,
});

// ── Small numeric input ───────────────────────────────────────────────────────
const NumInput = ({
  value,
  onChange,
  min = 0,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  className?: string;
}) => (
  <input
    type="number"
    inputMode="numeric"
    min={min}
    value={value}
    onChange={(e) => onChange(Math.max(min, Number(e.target.value)))}
    className={`w-full text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
  />
);

export default function ManualEntryPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<CricketMatch | null>(null);
  const [teams, setTeams] = useState<CricketTeam[]>([]);
  const [playersA, setPlayersA] = useState<MatchTeamPlayer[]>([]);
  const [playersB, setPlayersB] = useState<MatchTeamPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Which innings is active in the tab UI
  const [activeInnings, setActiveInnings] = useState(0);

  // Two innings entries
  const [inn, setInn] = useState<InningsEntry[]>([]);

  // Result
  const [resultType, setResultType] = useState("");
  const [resultMargin, setResultMargin] = useState("");
  const [resultDesc, setResultDesc] = useState("");

  // ── Load match data ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!matchId) return;
    (async () => {
      try {
        const [m, ts] = await Promise.all([
          getMatch(matchId),
          getTeams(matchId),
        ]);
        setMatch(m);
        setTeams(ts);

        const [xiA, xiB]: [MatchTeamPlayer[], MatchTeamPlayer[]] =
          await Promise.all([
            api
              .get(
                `/admin/cricket/matches/${matchId}/teams/${ts[0].publicId}/players`,
              )
              .then((r) => r.data),
            api
              .get(
                `/admin/cricket/matches/${matchId}/teams/${ts[1].publicId}/players`,
              )
              .then((r) => r.data),
          ]);
        setPlayersA(xiA);
        setPlayersB(xiB);

        // Initialise two innings — 1st: Team A bats, 2nd: Team B bats
        setInn([
          {
            battingTeamId: ts[0].publicId,
            bowlingTeamId: ts[1].publicId,
            totalRuns: 0,
            totalWickets: 0,
            totalBalls: 0,
            extrasWide: 0,
            extrasNoBall: 0,
            extrasBye: 0,
            extrasLegBye: 0,
            batting: xiA.map((p, i) =>
              emptyBatting(i + 1, p.player.publicId, p.player.displayName),
            ),
            bowling: xiB.map((p) =>
              emptyBowling(p.player.publicId, p.player.displayName),
            ),
          },
          {
            battingTeamId: ts[1].publicId,
            bowlingTeamId: ts[0].publicId,
            totalRuns: 0,
            totalWickets: 0,
            totalBalls: 0,
            extrasWide: 0,
            extrasNoBall: 0,
            extrasBye: 0,
            extrasLegBye: 0,
            batting: xiB.map((p, i) =>
              emptyBatting(i + 1, p.player.publicId, p.player.displayName),
            ),
            bowling: xiA.map((p) =>
              emptyBowling(p.player.publicId, p.player.displayName),
            ),
          },
        ]);
      } catch {
        setError("Failed to load match data");
      } finally {
        setLoading(false);
      }
    })();
  }, [matchId]);

  // ── Update helpers ────────────────────────────────────────────────────────
  const updateInnings = (
    innIdx: number,
    field: keyof InningsEntry,
    value: any,
  ) => {
    setInn((prev) =>
      prev.map((inn, i) => (i === innIdx ? { ...inn, [field]: value } : inn)),
    );
  };

  const updateBatting = (
    innIdx: number,
    rowIdx: number,
    field: keyof BattingRow,
    value: any,
  ) => {
    setInn((prev) =>
      prev.map((inn, i) => {
        if (i !== innIdx) return inn;
        const batting = inn.batting.map((row, j) =>
          j === rowIdx ? { ...row, [field]: value } : row,
        );
        return { ...inn, batting };
      }),
    );
  };

  const updateBowling = (
    innIdx: number,
    rowIdx: number,
    field: keyof BowlingRow,
    value: any,
  ) => {
    setInn((prev) =>
      prev.map((inn, i) => {
        if (i !== innIdx) return inn;
        const bowling = inn.bowling.map((row, j) =>
          j === rowIdx ? { ...row, [field]: value } : row,
        );
        return { ...inn, bowling };
      }),
    );
  };

  // ── Auto-compute innings total from batting rows ───────────────────────────
  const autoTotal = (innIdx: number) => {
    const rows = inn[innIdx]?.batting ?? [];
    const runs = rows.reduce((s, r) => s + r.runs, 0);
    const wkts = rows.filter(
      (r) => !["not out", "did not bat", "retired hurt"].includes(r.howOut),
    ).length;
    updateInnings(innIdx, "totalRuns", runs);
    updateInnings(innIdx, "totalWickets", wkts);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!matchId || !resultType) {
      setError("Select a match result type");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // 1. Start match (status SETUP → IN_PROGRESS) if not already
      await api.post(`/admin/cricket/matches/${matchId}/start`).catch(() => {});

      // 2. For each innings — create innings + post manual rows
      for (let i = 0; i < inn.length; i++) {
        const entry = inn[i];

        // Close current innings to open next (or complete match)
        // Backend creates innings on startMatch (1st) and closeInnings (2nd)
        if (i === 0) {
          // Patch innings aggregates via manual scorecard endpoint
          await api.post(`/admin/cricket/matches/${matchId}/manual-innings`, {
            inningsNumber: 1,
            battingTeamPublicId: entry.battingTeamId,
            bowlingTeamPublicId: entry.bowlingTeamId,
            totalRuns: entry.totalRuns,
            totalWickets: entry.totalWickets,
            totalBalls: entry.totalBalls,
            extrasWide: entry.extrasWide,
            extrasNoBall: entry.extrasNoBall,
            extrasBye: entry.extrasBye,
            extrasLegBye: entry.extrasLegBye,
            battingRows: entry.batting.filter(
              (r) => r.howOut !== "did not bat",
            ),
            bowlingRows: entry.bowling.filter((r) => Number(r.oversBowled) > 0),
          });
        } else {
          await api.post(`/admin/cricket/matches/${matchId}/manual-innings`, {
            inningsNumber: 2,
            battingTeamPublicId: entry.battingTeamId,
            bowlingTeamPublicId: entry.bowlingTeamId,
            totalRuns: entry.totalRuns,
            totalWickets: entry.totalWickets,
            totalBalls: entry.totalBalls,
            extrasWide: entry.extrasWide,
            extrasNoBall: entry.extrasNoBall,
            extrasBye: entry.extrasBye,
            extrasLegBye: entry.extrasLegBye,
            battingRows: entry.batting.filter(
              (r) => r.howOut !== "did not bat",
            ),
            bowlingRows: entry.bowling.filter((r) => Number(r.oversBowled) > 0),
          });
        }
      }

      // 3. Record result
      await api.post(`/admin/cricket/matches/${matchId}/result`, {
        resultType,
        resultMargin: resultMargin ? Number(resultMargin) : undefined,
        resultDescription: resultDesc,
      });

      setSaved(true);
      setTimeout(() => navigate("/admin/cricket/matches"), 1500);
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to save scorecard");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading match...</p>
      </div>
    );

  if (saved)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            Scorecard saved!
          </p>
          <p className="text-sm text-gray-400 mt-1">Redirecting...</p>
        </div>
      </div>
    );

  const currentInn = inn[activeInnings];
  const battingTeamName = teams[activeInnings]?.name ?? "Team";
  const bowlingTeamName = teams[1 - activeInnings]?.name ?? "Team";
  const totalBowlingPlayers = activeInnings === 0 ? playersB : playersA;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 dark:text-gray-400 p-1"
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
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
              Manual Entry
            </h1>
            <p className="text-xs text-gray-400">{match?.title}</p>
          </div>
        </div>

        {/* Innings tabs */}
        <div className="flex gap-2 mt-3">
          {teams.map((team, i) => (
            <button
              key={team.publicId}
              onClick={() => setActiveInnings(i)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeInnings === i
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              }`}
            >
              {team.name}
              {inn[i] && (
                <span className="ml-1 opacity-75">
                  {inn[i].totalRuns}/{inn[i].totalWickets}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="px-4 pt-4 space-y-5 max-w-2xl mx-auto">
        {/* ── Innings totals ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              {battingTeamName} — Innings Total
            </span>
            <button
              onClick={() => autoTotal(activeInnings)}
              className="text-xs text-blue-600 dark:text-blue-400 font-medium"
            >
              Auto-calculate ↓
            </button>
          </div>
          <div className="p-4 grid grid-cols-3 gap-3">
            {[
              { label: "Runs", field: "totalRuns" },
              { label: "Wickets", field: "totalWickets", max: 10 },
              { label: "Balls", field: "totalBalls" },
            ].map(({ label, field, max }) => (
              <div key={field}>
                <label className="block text-xs text-gray-400 mb-1 text-center">
                  {label}
                </label>
                <NumInput
                  value={(currentInn as any)?.[field] ?? 0}
                  onChange={(v) =>
                    updateInnings(
                      activeInnings,
                      field as keyof InningsEntry,
                      max ? Math.min(v, max) : v,
                    )
                  }
                />
              </div>
            ))}
          </div>

          {/* Extras breakdown */}
          <div className="px-4 pb-4">
            <div className="text-xs text-gray-400 mb-2">Extras breakdown</div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Wd", field: "extrasWide" },
                { label: "Nb", field: "extrasNoBall" },
                { label: "Bye", field: "extrasBye" },
                { label: "Lb", field: "extrasLegBye" },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs text-gray-400 mb-1 text-center">
                    {label}
                  </label>
                  <NumInput
                    value={(currentInn as any)?.[field] ?? 0}
                    onChange={(v) =>
                      updateInnings(
                        activeInnings,
                        field as keyof InningsEntry,
                        v,
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Batting card ───────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Batting — {battingTeamName}
            </span>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_40px_40px_32px_32px] gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
            {["Batter", "R", "B", "4s", "6s"].map((h) => (
              <div
                key={h}
                className="text-xs text-gray-400 text-center first:text-left"
              >
                {h}
              </div>
            ))}
          </div>

          {currentInn?.batting.map((row, ri) => (
            <div
              key={row.playerPublicId}
              className="border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              {/* Stat row */}
              <div className="grid grid-cols-[1fr_40px_40px_32px_32px] gap-1 px-4 py-2.5 items-center">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {row.playerName}
                </div>
                {["runs", "ballsFaced", "fours", "sixes"].map((f) => (
                  <NumInput
                    key={f}
                    value={(row as any)[f]}
                    onChange={(v) =>
                      updateBatting(activeInnings, ri, f as keyof BattingRow, v)
                    }
                    className="text-xs px-1 py-1.5"
                  />
                ))}
              </div>

              {/* How out row */}
              <div className="px-4 pb-2.5 flex gap-2 items-center">
                <select
                  value={row.howOut}
                  onChange={(e) =>
                    updateBatting(activeInnings, ri, "howOut", e.target.value)
                  }
                  className="flex-1 text-xs py-1.5 px-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none"
                >
                  {HOW_OUT_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>

                {/* Bowler select (shown when dismissed) */}
                {![
                  "not out",
                  "did not bat",
                  "retired hurt",
                  "run out",
                ].includes(row.howOut) && (
                  <select
                    value={row.bowlerPublicId}
                    onChange={(e) =>
                      updateBatting(
                        activeInnings,
                        ri,
                        "bowlerPublicId",
                        e.target.value,
                      )
                    }
                    className="flex-1 text-xs py-1.5 px-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none"
                  >
                    <option value="">Bowler</option>
                    {totalBowlingPlayers.map((p) => (
                      <option key={p.player.publicId} value={p.player.publicId}>
                        {p.player.displayName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Bowling card ───────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Bowling — {bowlingTeamName}
            </span>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_36px_36px_36px_36px_36px_36px] gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
            {["Bowler", "O", "M", "R", "W", "Wd", "Nb"].map((h) => (
              <div
                key={h}
                className="text-xs text-gray-400 text-center first:text-left"
              >
                {h}
              </div>
            ))}
          </div>

          {currentInn?.bowling.map((row, ri) => (
            <div
              key={row.playerPublicId}
              className="grid grid-cols-[1fr_36px_36px_36px_36px_36px_36px] gap-1 px-4 py-2.5 items-center border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                {row.playerName}
              </div>
              {/* Overs — text input for "3.4" format */}
              <input
                type="text"
                inputMode="decimal"
                value={row.oversBowled}
                onChange={(e) =>
                  updateBowling(
                    activeInnings,
                    ri,
                    "oversBowled",
                    e.target.value,
                  )
                }
                className="text-center text-xs py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {["maidens", "runsConceded", "wickets", "wides", "noBalls"].map(
                (f) => (
                  <NumInput
                    key={f}
                    value={(row as any)[f]}
                    onChange={(v) =>
                      updateBowling(activeInnings, ri, f as keyof BowlingRow, v)
                    }
                    className="text-xs px-1 py-1.5"
                  />
                ),
              )}
            </div>
          ))}
        </div>

        {/* ── Result ────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Match Result
            </span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                "WON_BY_RUNS",
                "WON_BY_WICKETS",
                "TIE",
                "DRAW",
                "NO_RESULT",
                "ABANDONED",
              ].map((rt) => (
                <button
                  key={rt}
                  onClick={() => setResultType(rt)}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                    resultType === rt
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600"
                  }`}
                >
                  {rt.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            {(resultType === "WON_BY_RUNS" ||
              resultType === "WON_BY_WICKETS") && (
              <input
                type="number"
                inputMode="numeric"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={
                  resultType === "WON_BY_RUNS"
                    ? "Winning margin (runs)"
                    : "Winning margin (wickets)"
                }
                value={resultMargin}
                onChange={(e) => setResultMargin(e.target.value)}
              />
            )}

            <input
              type="text"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              placeholder='e.g. "Team A won by 25 runs"'
              value={resultDesc}
              onChange={(e) => setResultDesc(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Fixed bottom save bar ──────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-3">
        <button
          disabled={saving || !resultType}
          onClick={handleSave}
          className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {saving && (
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
          {saving ? "Saving scorecard..." : "Save Scorecard & Result"}
        </button>
      </div>
    </div>
  );
}
