import api from "../../api/axios";
import type { BallRequest, BallResponse, Delivery, DeliveryRecord, EditDeliveryRequest } from "../../types/scoring";

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

export const awardPenalty = (matchId: string, awardedTo: "FIELDING" | "BATTING") =>
  api
    .post<BallResponse>(`${BASE(matchId)}/penalty`, { awardedTo })
    .then((r) => r.data);

export const swapBatters = (matchId: string) =>
  api.post<BallResponse>(`${BASE(matchId)}/swap-batters`).then((r) => r.data);

export const correctBowler = (matchId: string, bowlerPublicId: string) =>
  api
    .post<BallResponse>(`${BASE(matchId)}/correct-bowler`, { bowlerPublicId })
    .then((r) => r.data);

export const editDelivery = (
  matchId: string,
  deliveryPublicId: string,
  req: EditDeliveryRequest,
) =>
  api
    .patch<BallResponse>(`${BASE(matchId)}/deliveries/${deliveryPublicId}`, req)
    .then((r) => r.data);

export const getDeliveries = (matchId: string) =>
  api
    .get<DeliveryRecord[]>(`${BASE(matchId)}/deliveries`)
    .then((r) => r.data);

export const selectBatter = (
  matchId: string,
  batterPublicId: string,
  position: "striker" | "nonstriker",
) =>
  api
    .post<BallResponse>(`${BASE(matchId)}/select-batter`, { batterPublicId, position })
    .then((r) => r.data);

export const substitutePlayer = (
  matchId: string,
  originalMtpPublicId: string,
  substitutePlayerPublicId: string,
  reason: string,
) =>
  api
    .post(`${BASE(matchId)}/substitute-player`, {
      originalMtpPublicId,
      substitutePlayerPublicId,
      reason,
    })
    .then((r) => r.data);

export const setRunner = (
  matchId: string,
  runnerMtpPublicId: string,
  injuredBatterMtpPublicId: string,
) =>
  api
    .post<BallResponse>(`${BASE(matchId)}/runner`, { runnerMtpPublicId, injuredBatterMtpPublicId })
    .then((r) => r.data);

export const clearRunner = (matchId: string) =>
  api.delete<BallResponse>(`${BASE(matchId)}/runner`).then((r) => r.data);

export const bowlerInjuryReplace = (matchId: string, replacementBowlerPublicId: string) =>
  api
    .post<BallResponse>(`${BASE(matchId)}/bowler-injury-replace`, { replacementBowlerPublicId })
    .then((r) => r.data);

export const addFieldingSubstitute = (
  matchId: string,
  teamPublicId: string,
  req: { playerPublicId?: string; externalName?: string; reason?: string },
) =>
  api
    .post(`/admin/cricket/matches/${matchId}/teams/${teamPublicId}/fielding-substitute`, req)
    .then((r) => r.data);

export const changeWicketkeeper = (
  matchId: string,
  newKeeperPublicId: string,
  reason?: string,
) =>
  api
    .post<BallResponse>(`${BASE(matchId)}/change-wicketkeeper`, { newKeeperPublicId, reason })
    .then((r) => r.data);

export const createAnnotation = (matchId: string, noteText: string, category?: string) =>
  api
    .post(`${BASE(matchId)}/annotations`, { noteText, category: category || undefined })
    .then((r) => r.data);

export const getAnnotations = (matchId: string) =>
  api.get(`${BASE(matchId)}/annotations`).then((r) => r.data);

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
