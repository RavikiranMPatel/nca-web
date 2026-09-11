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

export const advanceToKnockout = (
  publicId: string,
  advancingPerGroup: number,
) =>
  api
    .post(`/admin/cricket/tournaments/${publicId}/advance-knockout`, {
      advancingPerGroup,
    })
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
