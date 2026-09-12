import api, { SCORING_WRITE_TIMEOUT_MS } from "../../api/axios";
import type { BallRequest, BallResponse, Delivery } from "../../types/scoring";

const BASE = (matchId: string) => `/admin/cricket/matches/${matchId}/scoring`;

// 12s, not the 30s default: a scorer mid-over needs an answer, and LiveScorerPage
// reconciles against GET /state on failure, so timing out early yields a correct
// answer rather than the old "did that land?" ambiguity.
export const postBall = (matchId: string, req: BallRequest) =>
  api
    .post<BallResponse>(`${BASE(matchId)}/ball`, req, {
      timeout: SCORING_WRITE_TIMEOUT_MS,
    })
    .then((r) => r.data);

export const undoLastBall = (matchId: string) =>
  api
    .delete<BallResponse>(`${BASE(matchId)}/ball/last`, {
      timeout: SCORING_WRITE_TIMEOUT_MS,
    })
    .then((r) => r.data);

// The reconcile read. Same short budget — it runs when the scorer is already waiting.
export const getScoringState = (matchId: string) =>
  api
    .get<BallResponse>(`${BASE(matchId)}/state`, {
      timeout: SCORING_WRITE_TIMEOUT_MS,
    })
    .then((r) => r.data);

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

export const selectBatter = (
  matchId: string,
  batterPublicId: string,
  position: "striker" | "nonstriker",
) =>
  api
    .post<BallResponse>(`${BASE(matchId)}/select-batter`, {
      batterPublicId,
      position,
    })
    .then((r) => r.data);

export const awardPenalty = async (
  matchId: string,
  awardedTo: "BATTING" | "FIELDING",
): Promise<BallResponse> => {
  const res = await api.post(
    `/admin/cricket/matches/${matchId}/scoring/penalty`,
    { awardedTo },
  );
  return res.data;
};
