import { useEffect, useState } from "react";
import {
  getBattingLeaderboard,
  getBowlingLeaderboard,
  getFieldingLeaderboard,
  getTeamLeaderboard,
  type Page,
  type BattingStat,
  type BowlingStat,
  type FieldingStat,
  type TeamStat,
} from "../../api/scoring/tournamentApi";

/**
 * Phase 17's four leaderboards.
 *
 * Replaces StatsTab, which showed batting, bowling and an MVP list built from
 * `Map<String,Object>` rows with every row sent at once. This one reads the DTO
 * endpoints, pages on the SERVER, and adds the two boards Phase 17 asked for and
 * nothing computed: fielding, and team.
 *
 * Each board loads when its sub-tab is first opened and is then kept, so
 * switching back and forth does not re-fetch. A page change does re-fetch, which
 * is the point of paging on the server.
 *
 * Mobile: the tables are wide, so each scrolls inside its own
 * `overflow-x-auto` — the page body itself never scrolls sideways.
 */

type Board = "batting" | "bowling" | "fielding" | "teams";

const BOARDS: { key: Board; label: string }[] = [
  { key: "batting", label: "Batting" },
  { key: "bowling", label: "Bowling" },
  { key: "fielding", label: "Fielding" },
  { key: "teams", label: "Team" },
];

const PAGE_SIZE = 20;

interface Props {
  publicId: string;
}

export default function StatisticsTab({ publicId }: Props) {
  const [board, setBoard] = useState<Board>("batting");
  const [pageIndex, setPageIndex] = useState<Record<Board, number>>({
    batting: 0, bowling: 0, fielding: 0, teams: 0,
  });
  const [data, setData] = useState<Record<Board, Page<never> | null>>({
    batting: null, bowling: null, fielding: null, teams: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const current = data[board];
  const page = pageIndex[board];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const fetcher = {
          batting: getBattingLeaderboard,
          bowling: getBowlingLeaderboard,
          fielding: getFieldingLeaderboard,
          teams: getTeamLeaderboard,
        }[board];
        const result = await fetcher(publicId, page, PAGE_SIZE);
        // Only the newest request may write. The same out-of-order-response race
        // as BUG-23 and BUG-28: switching sub-tab twice quickly can land the
        // first response after the second and show the wrong board's rows.
        if (!cancelled) setData((prev) => ({ ...prev, [board]: result }));
      } catch {
        if (!cancelled) setError("Failed to load statistics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [publicId, board, page]);

  const setPage = (next: number) =>
    setPageIndex((prev) => ({ ...prev, [board]: next }));

  return (
    <div data-testid="tournament-panel-statistics" className="space-y-4">
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
        {BOARDS.map((b) => (
          <button
            key={b.key}
            data-testid={`statistics-board-${b.key}`}
            onClick={() => setBoard(b.key)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              board === b.key
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && !current && (
        <div data-testid="statistics-loading"
             className="px-4 py-6 text-center text-xs text-gray-400">
          Loading…
        </div>
      )}

      {current && current.content.length === 0 && (
        <div data-testid="statistics-empty"
             className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-8 text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No {BOARDS.find((b) => b.key === board)!.label.toLowerCase()} data yet
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Leaderboards are built from completed matches.
          </div>
        </div>
      )}

      {current && current.content.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {/* The tables are wider than a phone; each scrolls inside itself so the
              page body never scrolls sideways. */}
          <div className="overflow-x-auto">
            {board === "batting" && <BattingTable rows={current.content as BattingStat[]} />}
            {board === "bowling" && <BowlingTable rows={current.content as BowlingStat[]} />}
            {board === "fielding" && <FieldingTable rows={current.content as FieldingStat[]} />}
            {board === "teams" && <TeamTable rows={current.content as TeamStat[]} />}
          </div>
        </div>
      )}

      {current && current.totalPages > 1 && (
        <div data-testid="statistics-pager" className="flex items-center justify-between gap-2">
          <button
            data-testid="statistics-prev"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0 || loading}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-500 tabular-nums">
            {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, current.totalElements)} of{" "}
            {current.totalElements}
          </span>
          <button
            data-testid="statistics-next"
            onClick={() => setPage(Math.min(current.totalPages - 1, page + 1))}
            disabled={page >= current.totalPages - 1 || loading}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ── the four tables ─────────────────────────────────────────────────────────

const TH = "px-2 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap";
const TD = "px-2 py-2 text-xs text-gray-900 dark:text-gray-100 tabular-nums whitespace-nowrap";
const NAME = "px-2 py-2 text-xs font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-900";

function PlayerCell({ name, team }: { name: string; team: string }) {
  return (
    <td className={NAME}>
      <div>{name}</div>
      <div className="text-[10px] text-gray-400 font-normal">{team}</div>
    </td>
  );
}

function BattingTable({ rows }: { rows: BattingStat[] }) {
  return (
    <table data-testid="statistics-table-batting" className="w-full">
      <thead className="bg-gray-50 dark:bg-gray-800/50">
        <tr>
          <th className={`${TH} text-left`}>Player</th>
          {["Inns", "Runs", "Balls", "HS", "Avg", "SR", "4s", "6s", "50s", "100s"].map((h) => (
            <th key={h} className={`${TH} text-right`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map((r) => (
          <tr key={r.playerPublicId}>
            <PlayerCell name={r.playerName} team={r.teamName} />
            <td className={`${TD} text-right`}>{r.innings}</td>
            <td className={`${TD} text-right font-semibold`}>{r.runs}</td>
            <td className={`${TD} text-right`}>{r.balls}</td>
            <td className={`${TD} text-right`}>
              {r.highScore}{r.highScoreNotOut ? "*" : ""}
            </td>
            <td className={`${TD} text-right`}>{r.average}</td>
            <td className={`${TD} text-right`}>{r.strikeRate}</td>
            <td className={`${TD} text-right`}>{r.fours}</td>
            <td className={`${TD} text-right`}>{r.sixes}</td>
            <td className={`${TD} text-right`}>{r.fifties}</td>
            <td className={`${TD} text-right`}>{r.hundreds}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BowlingTable({ rows }: { rows: BowlingStat[] }) {
  return (
    <table data-testid="statistics-table-bowling" className="w-full">
      <thead className="bg-gray-50 dark:bg-gray-800/50">
        <tr>
          <th className={`${TH} text-left`}>Player</th>
          {["Inns", "Overs", "Mdns", "Runs", "Wkts", "Econ", "Avg", "Best", "Dots", "3w", "5w"]
            .map((h) => <th key={h} className={`${TH} text-right`}>{h}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map((r) => (
          <tr key={r.playerPublicId}>
            <PlayerCell name={r.playerName} team={r.teamName} />
            <td className={`${TD} text-right`}>{r.innings}</td>
            <td className={`${TD} text-right`}>{r.overs}</td>
            <td className={`${TD} text-right`}>{r.maidens}</td>
            <td className={`${TD} text-right`}>{r.runsConceded}</td>
            <td className={`${TD} text-right font-semibold`}>{r.wickets}</td>
            <td className={`${TD} text-right`}>{r.economy}</td>
            <td className={`${TD} text-right`}>{r.average}</td>
            <td className={`${TD} text-right`}>{r.bestFigures}</td>
            <td className={`${TD} text-right`}>{r.dotBalls}</td>
            <td className={`${TD} text-right`}>{r.threeWickets}</td>
            <td className={`${TD} text-right`}>{r.fiveWickets}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FieldingTable({ rows }: { rows: FieldingStat[] }) {
  return (
    <table data-testid="statistics-table-fielding" className="w-full">
      <thead className="bg-gray-50 dark:bg-gray-800/50">
        <tr>
          <th className={`${TH} text-left`}>Player</th>
          {["Ct", "RO", "St", "Total"].map((h) => (
            <th key={h} className={`${TH} text-right`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map((r) => (
          <tr key={r.playerPublicId}>
            <PlayerCell name={r.playerName} team={r.teamName} />
            <td className={`${TD} text-right`}>{r.catches}</td>
            <td className={`${TD} text-right`}>{r.runOuts}</td>
            <td className={`${TD} text-right`}>{r.stumpings}</td>
            <td className={`${TD} text-right font-semibold`}>{r.dismissals}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TeamTable({ rows }: { rows: TeamStat[] }) {
  return (
    <table data-testid="statistics-table-teams" className="w-full">
      <thead className="bg-gray-50 dark:bg-gray-800/50">
        <tr>
          <th className={`${TH} text-left`}>Team</th>
          {["P", "W", "L", "T", "NR", "High", "Low", "Runs", "Wkts", "4s", "6s", "NRR"]
            .map((h) => <th key={h} className={`${TH} text-right`}>{h}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map((r) => (
          <tr key={r.teamPublicId}>
            <td className={NAME}>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: r.colorHex ?? "#94a3b8" }}
                />
                {r.teamName}
              </div>
            </td>
            <td className={`${TD} text-right`}>{r.played}</td>
            <td className={`${TD} text-right font-semibold`}>{r.won}</td>
            <td className={`${TD} text-right`}>{r.lost}</td>
            <td className={`${TD} text-right`}>{r.tied}</td>
            <td className={`${TD} text-right`}>{r.noResult}</td>
            <td className={`${TD} text-right`}>{r.highestScore ?? "—"}</td>
            <td className={`${TD} text-right`}>{r.lowestScore ?? "—"}</td>
            <td className={`${TD} text-right`}>{r.totalRuns}</td>
            <td className={`${TD} text-right`}>{r.totalWickets}</td>
            <td className={`${TD} text-right`}>{r.fours}</td>
            <td className={`${TD} text-right`}>{r.sixes}</td>
            <td className={`${TD} text-right`}>{r.nrr}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
