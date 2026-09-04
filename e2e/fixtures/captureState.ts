import { config } from "./env";
import { execFileSync } from "node:child_process";

const q = (sql: string) => {
  const { db } = config();
  return execFileSync("psql", ["-h", db.host, "-p", db.port, "-U", db.user,
    "-d", db.name, "-tAc", sql], { encoding: "utf8" }).trim();
};

/**
 * A complete, comparable snapshot of everything a replay is supposed to
 * reconstruct: the innings row, both per-player stat tables including the crease
 * timestamps, and the delivery stream itself.
 *
 * Deliberately taken from the database rather than the API, and deliberately
 * column by column: it is the persisted state that has to survive an undo, and
 * naming the columns keeps volatile ones (row ids, updated_at) out of the
 * comparison so a diff means something.
 */
export function captureState(matchPublicId: string) {
  const innings = q(`
    SELECT i.innings_number, i.total_runs, i.total_wickets, i.total_balls,
           i.extras_wide, i.extras_no_ball, i.extras_bye, i.extras_leg_bye, i.extras_penalty,
           i.is_all_out, i.is_free_hit, i.partnership_runs, i.partnership_balls,
           coalesce(cs.public_id,'-'), coalesce(cns.public_id,'-'),
           coalesce(cb.public_id,'-'), coalesce(lb.public_id,'-'),
           coalesce(i.target::text,'-'), i.status
    FROM innings i
    JOIN cricket_matches m ON i.match_id = m.id
    LEFT JOIN match_team_players cs  ON i.current_striker_id = cs.id
    LEFT JOIN match_team_players cns ON i.current_non_striker_id = cns.id
    LEFT JOIN match_team_players cb  ON i.current_bowler_id = cb.id
    LEFT JOIN match_team_players lb  ON i.last_bowler_id = lb.id
    WHERE m.public_id = '${matchPublicId}'
    ORDER BY i.innings_number`);

  const batting = q(`
    SELECT i.innings_number, mtp.public_id, s.runs, s.balls, s.fours, s.sixes,
           s.is_out, coalesce(s.dismissal_type,'-'),
           coalesce(to_char(s.crease_entered_at,'YYYYMMDDHH24MISSMS'),'-'),
           coalesce(to_char(s.crease_exited_at,'YYYYMMDDHH24MISSMS'),'-'),
           coalesce(to_char(s.current_stint_started_at,'YYYYMMDDHH24MISSMS'),'-')
    FROM innings_batting_stats s
    JOIN innings i ON s.innings_id = i.id
    JOIN cricket_matches m ON i.match_id = m.id
    JOIN match_team_players mtp ON s.mtp_id = mtp.id
    WHERE m.public_id = '${matchPublicId}'
    ORDER BY i.innings_number, mtp.public_id`);

  const bowling = q(`
    SELECT i.innings_number, mtp.public_id, s.legal_balls, s.runs_conceded,
           s.wickets, s.maidens, s.dots, s.wides, s.no_balls
    FROM innings_bowling_stats s
    JOIN innings i ON s.innings_id = i.id
    JOIN cricket_matches m ON i.match_id = m.id
    JOIN match_team_players mtp ON s.mtp_id = mtp.id
    WHERE m.public_id = '${matchPublicId}'
    ORDER BY i.innings_number, mtp.public_id`);

  const deliveries = q(`
    SELECT i.innings_number, d.over_number, d.ball_number, d.runs_batsman, d.runs_extras,
           coalesce(d.extra_type,'-'), d.is_legal_ball, d.is_wicket,
           coalesce(d.dismissal_type,'-'), d.is_free_hit, coalesce(d.no_ball_runs_type,'-'),
           coalesce(bat.public_id,'-'), coalesce(bowl.public_id,'-')
    FROM deliveries d
    JOIN innings i ON d.innings_id = i.id
    JOIN cricket_matches m ON i.match_id = m.id
    LEFT JOIN match_team_players bat ON d.batsman_id = bat.id
    LEFT JOIN match_team_players bowl ON d.bowler_id = bowl.id
    WHERE m.public_id = '${matchPublicId}'
    ORDER BY i.innings_number, d.sequence_number`);

  return { innings, batting, bowling, deliveries };
}

/** The same snapshot minus the delivery stream — for comparing two different
 *  matches, where sequence numbers and ids differ but the derived state must not. */
export function derivedOnly(s: ReturnType<typeof captureState>) {
  return { innings: s.innings, batting: s.batting, bowling: s.bowling };
}

export const rawSql = q;
