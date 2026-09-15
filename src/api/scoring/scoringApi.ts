import axios from "axios";
import api from "../../api/axios";
import type { BallRequest, BallResponse, Delivery, DeliveryRecord, EditDeliveryRequest } from "../../types/scoring";

const BASE = (matchId: string) => `/admin/cricket/matches/${matchId}/scoring`;

/**
 * A response that never arrived, not a response that said no. axios sets
 * `request` but leaves `response` undefined when the request went out and
 * nothing came back — a dropped connection, a proxy timeout, a tab backgrounded
 * mid-flight. That is exactly the case BUG-18 is about: the write may well have
 * committed on the server; the client just has no way to know. A real HTTP
 * error (4xx/5xx) is a definite answer and must not be retried here.
 */
function isUnanswered(e: unknown): boolean {
  return axios.isAxiosError(e) && !e.response && !!e.request;
}

/**
 * BUG-18. One id per call — one per tap — reused only if THIS call needs an
 * automatic retry, never generated fresh for a retry of the same tap.
 *
 * The one retry here is deliberately narrow: it fires only on a response that
 * never arrived, exactly once, with the identical payload including the same
 * deliveryClientId. If the delivery already landed, postBall's idempotency
 * check (ScoringService, V106) returns it unchanged instead of scoring it
 * again; if it never landed, this creates it, same as any first attempt.
 *
 * A manual re-tap by the scorer after seeing an error is a NEW call to
 * postBall with its own fresh id, by design — that is a new decision by a
 * human, not a replay of one that already happened. See
 * docs/architecture/event-idempotency.md for what this does and does not
 * cover — in particular, it is not a defence against two click handlers for
 * the SAME tap both dispatching (a UI-dispatch race, not a network one); the
 * `posting` guard and each button's own `disabled` state are what prevent that.
 */
export const postBall = async (matchId: string, req: BallRequest) => {
  const payload: BallRequest = {
    ...req,
    deliveryClientId: req.deliveryClientId ?? crypto.randomUUID(),
  };
  try {
    return await postBallOnce(matchId, payload);
  } catch (e) {
    if (!isUnanswered(e)) throw e;
    return await postBallOnce(matchId, payload);
  }
};

function postBallOnce(matchId: string, payload: BallRequest) {
  return api.post<BallResponse>(`${BASE(matchId)}/ball`, payload).then((r) => r.data);
}

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
