import axios from "axios";

// ── Public API — no auth header needed ───────────────────────────────────────
// Uses a plain axios instance (not the auth-wrapped one)
const publicApi = axios.create({ baseURL: "/api/public" });

export const getPublicScorecard = (matchId: string) => {
  const academyPublicId = localStorage.getItem("academyPublicId");
  if (!academyPublicId) return Promise.reject(new Error("No academy context"));
  return publicApi
    .get(`/scorecard/${matchId}`, { params: { academyPublicId } })
    .then((r) => r.data);
};

export const getPublicStandings = (tournamentId: string) => {
  const academyPublicId = localStorage.getItem("academyPublicId");
  if (!academyPublicId) return Promise.reject(new Error("No academy context"));
  return publicApi
    .get(`/tournaments/${tournamentId}/standings`, { params: { academyPublicId } })
    .then((r) => r.data);
};

export const getPublicFixtures = (tournamentId: string) => {
  const academyPublicId = localStorage.getItem("academyPublicId");
  if (!academyPublicId) return Promise.reject(new Error("No academy context"));
  return publicApi
    .get(`/tournaments/${tournamentId}/fixtures`, { params: { academyPublicId } })
    .then((r) => r.data);
};

export const getPublicPlayerProfile = (playerPublicId: string) => {
  const academyPublicId = localStorage.getItem("academyPublicId");
  if (!academyPublicId) return Promise.reject(new Error("No academy context"));
  return publicApi
    .get(`/scoring/player-profile`, { params: { playerPublicId, academyPublicId } })
    .then((r) => r.data);
};
