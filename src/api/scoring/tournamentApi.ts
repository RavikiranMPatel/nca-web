import api from "../axios";

export const listTournaments = () =>
  api.get("/admin/cricket/tournaments").then((r) => r.data);

export const getTournament = (publicId: string) =>
  api.get(`/admin/cricket/tournaments/${publicId}`).then((r) => r.data);

export const createTournament = (data: any) =>
  api.post("/admin/cricket/tournaments", data).then((r) => r.data);

export const updateTournament = (publicId: string, data: any) =>
  api.put(`/admin/cricket/tournaments/${publicId}`, data).then((r) => r.data);

export interface TournamentResult {
  publicId: string;
  name: string;
  status: string;
  championTeamPublicId?: string | null;
  championTeamName?: string | null;
  runnerUpTeamPublicId?: string | null;
  runnerUpTeamName?: string | null;
  /** The final was played and tied, so there is deliberately no champion. */
  finalTied: boolean;
}

// LIVE and COMPLETED are reached automatically from fixture results and are
// refused here; the server returns 400 if one is requested by hand.
export const updateTournamentStatus = (
  publicId: string,
  status: string,
  reason?: string,
) =>
  api
    .patch<TournamentResult>(`/admin/cricket/tournaments/${publicId}/status`, {
      status,
      reason,
    })
    .then((r) => r.data);

export const getTournamentResult = (publicId: string) =>
  api
    .get<TournamentResult>(`/admin/cricket/tournaments/${publicId}/result`)
    .then((r) => r.data);

/**
 * Move or postpone a fixture.
 *
 * Returns 409 when the slot clashes; that is an answer rather than a failure,
 * and the message names what clashes and when. Only a SUPER_ADMIN may retry with
 * overrideConflicts, and only with an overrideReason (ruling 4).
 */
export const rescheduleFixture = (
  publicId: string,
  fixturePublicId: string,
  body: {
    scheduledAt?: string;
    venueId?: string;
    postpone?: boolean;
    reason: string;
    overrideConflicts?: boolean;
    overrideReason?: string;
  },
) =>
  api
    .post(
      `/admin/cricket/tournaments/${publicId}/fixtures/${fixturePublicId}/reschedule`,
      body,
    )
    .then((r) => r.data);

export const listFixtureConflicts = (publicId: string) =>
  api
    .get(`/admin/cricket/tournaments/${publicId}/conflicts`)
    .then((r) => r.data);

/** Mark (or clear) the fixture whose result decides the tournament. */
export const markFixtureFinal = (
  publicId: string,
  fixturePublicId: string,
  isFinal: boolean,
) =>
  api.patch(
    `/admin/cricket/tournaments/${publicId}/fixtures/${fixturePublicId}/final`,
    { isFinal },
  );

export const listTeams = (publicId: string) =>
  api.get(`/admin/cricket/tournaments/${publicId}/teams`).then((r) => r.data);

export const addTeam = (publicId: string, data: any) =>
  api
    .post(`/admin/cricket/tournaments/${publicId}/teams`, data)
    .then((r) => r.data);

export const removeTeam = (publicId: string, teamPublicId: string) =>
  api.delete(`/admin/cricket/tournaments/${publicId}/teams/${teamPublicId}`);

export const listStages = (publicId: string) =>
  api.get(`/admin/cricket/tournaments/${publicId}/stages`).then((r) => r.data);

export const listFixtures = (publicId: string) =>
  api
    .get(`/admin/cricket/tournaments/${publicId}/fixtures`)
    .then((r) => r.data);

export const generateFixtures = (publicId: string, data: any) =>
  api
    .post(`/admin/cricket/tournaments/${publicId}/fixtures/generate`, data)
    .then((r) => r.data);

export const addManualFixture = (publicId: string, data: any) =>
  api
    .post(`/admin/cricket/tournaments/${publicId}/fixtures/manual`, data)
    .then((r) => r.data);

/**
 * No body: how many teams advance and how the bracket is drawn are the
 * tournament's stored qualification rules now (Slice 4b), set on the Settings
 * tab, rather than a number passed with each invocation.
 */
export const advanceToKnockout = (publicId: string) =>
  api
    .post(`/admin/cricket/tournaments/${publicId}/advance-knockout`)
    .then((r) => r.data);

// ── Qualification rules ─────────────────────────────────────────────────────

export interface QualificationRules {
  teamsAdvancingPerGroup: number;
  knockoutSeedingRule: "CROSS_GROUP" | "GLOBAL_SEED";
  tieBreakOrder: string[];
}

export const getQualificationRules = (publicId: string): Promise<QualificationRules> =>
  api
    .get(`/admin/cricket/tournaments/${publicId}/qualification-rules`)
    .then((r) => r.data);

export const updateQualificationRules = (
  publicId: string,
  rules: QualificationRules,
): Promise<QualificationRules> =>
  api
    .put(`/admin/cricket/tournaments/${publicId}/qualification-rules`, rules)
    .then((r) => r.data);

export const getStandings = (publicId: string) =>
  api
    .get(`/admin/cricket/tournaments/${publicId}/standings`)
    .then((r) => r.data);

// SUPER_ADMIN only, and the reason is mandatory: this overrides a result the
// backend derived from the final.
export const declareWinner = (
  publicId: string,
  winnerTeamPublicId: string,
  reason: string,
  runnerUpTeamPublicId?: string,
) =>
  api
    .post<TournamentResult>(`/admin/cricket/tournaments/${publicId}/declare-winner`, {
      winnerTeamPublicId,
      runnerUpTeamPublicId,
      reason,
    })
    .then((r) => r.data);

export const getSquad = (tournamentPublicId: string, teamPublicId: string) =>
  api
    .get(
      `/admin/cricket/tournaments/${tournamentPublicId}/teams/${teamPublicId}/squad`,
    )
    .then((r) => r.data);

export const addToSquad = (
  tournamentPublicId: string,
  teamPublicId: string,
  data: any,
) =>
  api
    .post(
      `/admin/cricket/tournaments/${tournamentPublicId}/teams/${teamPublicId}/squad`,
      data,
    )
    .then((r) => r.data);

export const removeFromSquad = (
  tournamentPublicId: string,
  teamPublicId: string,
  playerPublicId: string,
) =>
  api.delete(
    `/admin/cricket/tournaments/${tournamentPublicId}/teams/${teamPublicId}/squad/${playerPublicId}`,
  );

export const getAllTournamentPlayers = (tournamentPublicId: string) =>
  api
    .get(`/admin/cricket/tournaments/${tournamentPublicId}/players`)
    .then((r) => r.data);

export const createExternalPlayer = (data: {
  displayName: string;
  gender?: string;
}) => api.post("/admin/players/external", data).then((r) => r.data);

export const prepareMatchFromFixture = (
  tournamentPublicId: string,
  fixturePublicId: string,
) =>
  api
    .get(
      `/admin/cricket/tournaments/${tournamentPublicId}/fixtures/${fixturePublicId}/prepare-match`,
    )
    .then((r) => r.data);

export const linkMatchToFixture = (
  tournamentPublicId: string,
  fixturePublicId: string,
  matchPublicId: string,
) =>
  api.post(
    `/admin/cricket/tournaments/${tournamentPublicId}/fixtures/${fixturePublicId}/link-match`,
    { matchPublicId },
  );

export const advanceToPlayoffs = (
  publicId: string,
  topN: number,
  bracketType: string,
) =>
  api
    .post(`/admin/cricket/tournaments/${publicId}/advance-playoffs`, {
      topN,
      bracketType,
    })
    .then((r) => r.data);

// ── Slice 5: Phase 4's dashboard, Phase 17's leaderboards, Phases 15/16 awards ──

/** One headline card on the dashboard. Null when nothing has been played yet. */
export interface Highlight {
  publicId: string | null;
  name: string;
  subtitle: string | null;
  value: string;
  numericValue: number;
}

export interface TournamentDashboard {
  tournamentPublicId: string;
  tournamentName: string;
  status: string;
  format: string;
  teams: number;
  matches: number;
  completed: number;
  upcoming: number;
  live: number;
  totalRuns: number;
  totalWickets: number;
  highestTeamScore: Highlight | null;
  highestIndividualScore: Highlight | null;
  topRunScorer: Highlight | null;
  topWicketTaker: Highlight | null;
  currentLeader: Highlight | null;
}

/** A server-side page. Deliberately not Spring's Page — see PageDto. */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface BattingStat {
  playerPublicId: string; playerName: string;
  teamName: string; teamPublicId: string | null;
  innings: number; notOuts: number; runs: number; balls: number;
  highScore: number; highScoreNotOut: boolean;
  average: number; strikeRate: number;
  fours: number; sixes: number; fifties: number; hundreds: number;
}

export interface BowlingStat {
  playerPublicId: string; playerName: string;
  teamName: string; teamPublicId: string | null;
  innings: number; overs: string; maidens: number;
  runsConceded: number; wickets: number; dotBalls: number;
  economy: number; average: number; bestFigures: string;
  threeWickets: number; fiveWickets: number;
}

export interface FieldingStat {
  playerPublicId: string; playerName: string;
  teamName: string; teamPublicId: string | null;
  catches: number; runOuts: number; stumpings: number; dismissals: number;
}

export interface TeamStat {
  teamPublicId: string; teamName: string;
  shortName: string | null; colorHex: string | null;
  played: number; won: number; lost: number; tied: number; noResult: number;
  highestScore: number | null; lowestScore: number | null;
  totalRuns: number; totalWickets: number;
  sixes: number; fours: number; nrr: number;
}

export interface TournamentAward {
  publicId: string;
  awardType: string;
  awardLabel: string;
  playerPublicId: string;
  playerName: string;
  teamPublicId: string;
  teamName: string;
  matchPublicId: string | null;
  reason: string | null;
  awardedByName: string | null;
  awardedAt: string;
}

/** An award the tournament can give, and whoever holds it. */
export interface AwardSlot {
  awardType: string;
  label: string;
  /** BATTING | BOWLING | FIELDING | ALL_ROUND — which figures to lead with. */
  candidateSource: string;
  award: TournamentAward | null;
}

export interface AwardCandidate {
  playerPublicId: string; playerName: string;
  teamPublicId: string | null; teamName: string;
  runs: number; balls: number; fours: number; sixes: number;
  strikeRate: number; notOut: boolean;
  overs: string; runsConceded: number; wickets: number; economy: number;
  catches: number; runOuts: number; stumpings: number;
  impactPoints: number;
}

export const getTournamentDashboard = (publicId: string): Promise<TournamentDashboard> =>
  api.get(`/admin/cricket/tournaments/${publicId}/dashboard`).then((r) => r.data);

const leaderboard = <T,>(publicId: string, kind: string, page: number, size: number) =>
  api
    .get(`/admin/cricket/tournaments/${publicId}/stats/${kind}`, { params: { page, size } })
    .then((r) => r.data as Page<T>);

export const getBattingLeaderboard = (publicId: string, page = 0, size = 20) =>
  leaderboard<BattingStat>(publicId, "batting", page, size);
export const getBowlingLeaderboard = (publicId: string, page = 0, size = 20) =>
  leaderboard<BowlingStat>(publicId, "bowling", page, size);
export const getFieldingLeaderboard = (publicId: string, page = 0, size = 20) =>
  leaderboard<FieldingStat>(publicId, "fielding", page, size);
export const getTeamLeaderboard = (publicId: string, page = 0, size = 20) =>
  leaderboard<TeamStat>(publicId, "teams", page, size);

export const listAwards = (publicId: string): Promise<TournamentAward[]> =>
  api.get(`/admin/cricket/tournaments/${publicId}/awards`).then((r) => r.data);

export const listAwardSlots = (publicId: string): Promise<AwardSlot[]> =>
  api.get(`/admin/cricket/tournaments/${publicId}/awards/slots`).then((r) => r.data);

export const getTournamentAwardCandidates = (publicId: string): Promise<AwardCandidate[]> =>
  api.get(`/admin/cricket/tournaments/${publicId}/awards/candidates`).then((r) => r.data);

export const getMatchAwardCandidates = (
  publicId: string,
  matchPublicId: string,
): Promise<AwardCandidate[]> =>
  api
    .get(`/admin/cricket/tournaments/${publicId}/matches/${matchPublicId}/award-candidates`)
    .then((r) => r.data);

export const giveAward = (
  publicId: string,
  data: {
    awardType: string;
    playerPublicId: string;
    teamPublicId: string;
    matchPublicId?: string;
    reason?: string;
  },
): Promise<TournamentAward> =>
  api.post(`/admin/cricket/tournaments/${publicId}/awards`, data).then((r) => r.data);

export const revokeAward = (publicId: string, awardPublicId: string) =>
  api.delete(`/admin/cricket/tournaments/${publicId}/awards/${awardPublicId}`);

// ── Reports (Slice 6, Phases 20–23) ──────────────────────────────────────────

/** The ten report slugs the backend's TournamentReportType accepts. */
export type ReportType =
  | "summary"
  | "fixtures"
  | "points-table"
  | "results"
  | "team-performance"
  | "batting"
  | "bowling"
  | "fielding"
  | "awards"
  | "complete";

/**
 * The filters a fixtures or results report respects (Phase 22).
 *
 * The same filters the Fixtures tab offers, sent to the server so the PDF is
 * generated from the filtered set rather than filtered after the fact. A blank
 * or absent value is no constraint.
 */
export interface ReportFilters {
  status?: string;
  stagePublicId?: string;
  groupName?: string;
  teamPublicId?: string;
  venuePublicId?: string;
}

/**
 * Fetches one report as a PDF blob.
 *
 * Returns the blob rather than downloading it, so the caller decides — the tab
 * downloads, and a test can read the bytes.
 */
export const getTournamentReport = (
  publicId: string,
  type: ReportType,
  filters: ReportFilters = {},
): Promise<Blob> => {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && String(v).trim() !== "") params[k] = String(v);
  }
  return api
    .get(`/admin/cricket/tournaments/${publicId}/reports/${type}`, {
      params,
      responseType: "blob",
    })
    .then((r) => r.data as Blob);
};
