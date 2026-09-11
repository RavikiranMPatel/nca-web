import api from "../../api/axios";
import type {
  CricketMatch,
  CricketTeam,
  MatchTeamPlayer,
  CreateMatchRequest,
  SetTeamsRequest,
  TossRequest,
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

// Abandon a match that has already started. Terminal: records NO_RESULT,
// awards noResultPoints, and closes the fixture as ABANDONED. A fixture that
// never produced a match is abandoned from the Fixtures tab instead.
export const abandonMatch = (publicId: string, reason: string, note?: string) =>
  api
    .post<CricketMatch>(`${BASE}/${publicId}/abandon`, { reason, note })
    .then((r) => r.data);

// The result this match has produced, derived server-side from the innings and
// the real playing-XI size. Replaces computeAutoResult, which built the winning
// sentence in the browser off a hardcoded `10 - totalWickets`.
export const getResultPreview = (publicId: string) =>
  api
    .get<{
      resultType: string | null;
      resultMargin?: number | null;
      resultDescription?: string | null;
      winnerTeamName?: string | null;
    }>(`${BASE}/${publicId}/result-preview`)
    .then((r) => r.data);

export const deleteMatch = (publicId: string) =>
  api.delete(`/admin/cricket/matches/${publicId}`);

export const pauseMatch = (publicId: string, reason?: string) =>
  api
    .post<import("../../types/match").CricketMatch>(
      `${BASE}/${publicId}/pause`,
      { reason: reason ?? "" },
    )
    .then((r) => r.data);

export const resumeMatch = (publicId: string) =>
  api
    .post<import("../../types/match").CricketMatch>(
      `${BASE}/${publicId}/resume`,
    )
    .then((r) => r.data);
