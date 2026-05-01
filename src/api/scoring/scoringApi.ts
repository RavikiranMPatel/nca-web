import api from "../../api/axios";
import type { BallRequest, BallResponse, Delivery } from "../../types/scoring";

const BASE = (matchId: string) => `/admin/cricket/matches/${matchId}/scoring`;

export const postBall = (matchId: string, req: BallRequest) =>
  api.post<BallResponse>(`${BASE(matchId)}/ball`, req).then((r) => r.data);

export const undoLastBall = (matchId: string) =>
  api.delete<BallResponse>(`${BASE(matchId)}/ball/last`).then((r) => r.data);

export const getScoringState = (matchId: string) =>
  api.get<BallResponse>(`${BASE(matchId)}/state`).then((r) => r.data);

export const getThisOver = (matchId: string) =>
  api.get<Delivery[]>(`${BASE(matchId)}/this-over`).then((r) => r.data);

export const closeInnings = (matchId: string, reason = "OVERS_COMPLETE") =>
  api
    .post(`/admin/cricket/matches/${matchId}/innings/close`, { reason })
    .then((r) => r.data);

export const recordResult = (
  matchId: string,
  req: {
    resultType: string;
    resultMargin?: number;
    resultDescription?: string;
    playerOfMatchPublicId?: string;
  },
) =>
  api.post(`/admin/cricket/matches/${matchId}/result`, req).then((r) => r.data);
