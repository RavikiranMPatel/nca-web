import api from "../../api/axios";
import type {
  CricketMatch,
  CricketTeam,
  MatchTeamPlayer,
  CreateMatchRequest,
  SetTeamsRequest,
  TossRequest,
  UpdateExternalMatchRequest,
  KeyMoment,
} from "../../types/match";

const BASE = "/admin/cricket/matches";

// ── Match lifecycle ───────────────────────────────────────────────────────────
export const createMatch = (req: CreateMatchRequest) =>
  api.post<CricketMatch>(BASE, req).then((r) => r.data);

export const listMatches = () =>
  api.get<CricketMatch[]>(BASE).then((r) => r.data);

export const getMatch = (publicId: string) =>
  api.get<CricketMatch>(`${BASE}/${publicId}`).then((r) => r.data);

export const setTeams = (publicId: string, req: SetTeamsRequest) =>
  api.post(`${BASE}/${publicId}/teams`, req).then((r) => r.data);

export const getTeams = (publicId: string) =>
  api.get<CricketTeam[]>(`${BASE}/${publicId}/teams`).then((r) => r.data);

export const getPlayingXI = (matchId: string, teamId: string) =>
  api
    .get<MatchTeamPlayer[]>(`${BASE}/${matchId}/teams/${teamId}/players`)
    .then((r) => r.data);

export const recordToss = (publicId: string, req: TossRequest) =>
  api.post<CricketMatch>(`${BASE}/${publicId}/toss`, req).then((r) => r.data);

export const startMatch = (publicId: string) =>
  api.post(`${BASE}/${publicId}/start`).then((r) => r.data);

export const closeInnings = (publicId: string, reason = "OVERS_COMPLETE") =>
  api.post(`${BASE}/${publicId}/innings/close`, { reason }).then((r) => r.data);

export const recordResult = (
  publicId: string,
  req: {
    resultType: string;
    resultMargin?: number;
    resultDescription?: string;
    playerOfMatchPublicId?: string;
    playerOfMatchNote?: string;
  },
) =>
  api.post<CricketMatch>(`${BASE}/${publicId}/result`, req).then((r) => r.data);

// ── Players list for team selection ──────────────────────────────────────────
export const getBranchPlayers = () =>
  api.get("/admin/players").then((r) => r.data);

export const deleteMatch = (publicId: string) =>
  api.delete(`/admin/cricket/matches/${publicId}`);

export const patchMatchNotes = (publicId: string, notes: string) =>
  api.patch(`${BASE}/${publicId}/notes`, { notes }).then((r) => r.data);

export const patchKeyMoments = (publicId: string, keyMoments: KeyMoment[]) =>
  api.patch<KeyMoment[]>(`${BASE}/${publicId}/key-moments`, { keyMoments }).then((r) => r.data);

export const patchExternalMatchDetails = (
  publicId: string,
  req: UpdateExternalMatchRequest,
) =>
  api
    .patch<CricketMatch>(`${BASE}/${publicId}/external-details`, req)
    .then((r) => r.data);

export const getMatchPerformances = (publicId: string) =>
  api
    .get<import("../../api/playerService/coachingService").MatchPerformanceResponse[]>(
      `${BASE}/${publicId}/performances`,
    )
    .then((r) => r.data);
