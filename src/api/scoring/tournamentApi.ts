import api from "../axios";

export const listTournaments = () =>
  api.get("/admin/cricket/tournaments").then((r) => r.data);

export const getTournament = (publicId: string) =>
  api.get(`/admin/cricket/tournaments/${publicId}`).then((r) => r.data);

export const createTournament = (data: any) =>
  api.post("/admin/cricket/tournaments", data).then((r) => r.data);

export const updateTournament = (publicId: string, data: any) =>
  api.put(`/admin/cricket/tournaments/${publicId}`, data).then((r) => r.data);

export const updateTournamentStatus = (publicId: string, status: string) =>
  api
    .patch(`/admin/cricket/tournaments/${publicId}/status`, { status })
    .then((r) => r.data);

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

// The champion is DERIVED from the fixtures. There is no winnerTeamPublicId:
// declareWinner used to take one from a picker and the backend discarded it.
export const getChampion = (publicId: string) =>
  api
    .get<{
      championName: string | null;
      championPublicId: string | null;
      runnerUpName: string | null;
      format: string;
    }>(`/admin/cricket/tournaments/${publicId}/champion`)
    .then((r) => r.data);

export const completeTournament = (publicId: string) =>
  api
    .post<{
      status: string;
      championName: string;
      runnerUpName: string | null;
    }>(`/admin/cricket/tournaments/${publicId}/complete`, {})
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

// Postpone: the fixture WILL be replayed. No points, no result. Distinct from
// abandon, which is terminal and awards noResultPoints to both sides.
export const postponeFixture = (
  tournamentPublicId: string,
  fixturePublicId: string,
  reason: string,
  note?: string,
) =>
  api
    .post(
      `/admin/cricket/tournaments/${tournamentPublicId}/fixtures/${fixturePublicId}/postpone`,
      { reason, note },
    )
    .then((r) => r.data);

// Reschedule: new date/time/venue, back to SCHEDULED. The original schedule is
// preserved on the fixture on the first move only.
export const rescheduleFixture = (
  tournamentPublicId: string,
  fixturePublicId: string,
  body: {
    scheduledAt: string;
    venueId?: string;
    reason: string;
    note?: string;
  },
) =>
  api
    .post(
      `/admin/cricket/tournaments/${tournamentPublicId}/fixtures/${fixturePublicId}/reschedule`,
      body,
    )
    .then((r) => r.data);

// Abandon a fixture that never produced a match — a washed-out day.
export const abandonFixture = (
  tournamentPublicId: string,
  fixturePublicId: string,
  reason: string,
  note?: string,
) =>
  api
    .post(
      `/admin/cricket/tournaments/${tournamentPublicId}/fixtures/${fixturePublicId}/abandon`,
      { reason, note },
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
