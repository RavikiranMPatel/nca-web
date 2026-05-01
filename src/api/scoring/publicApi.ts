import axios from 'axios';

// ── Public API — no auth header needed ───────────────────────────────────────
// Uses a plain axios instance (not the auth-wrapped one)
const publicApi = axios.create({ baseURL: '/api/public' });

export const getPublicScorecard = (matchId: string) =>
  publicApi.get(`/matches/${matchId}/scorecard`).then(r => r.data);

export const getPublicStandings = (tournamentId: string) =>
  publicApi.get(`/tournaments/${tournamentId}/standings`).then(r => r.data);

export const getPublicFixtures = (tournamentId: string) =>
  publicApi.get(`/tournaments/${tournamentId}/fixtures`).then(r => r.data);

export const getPublicPlayerProfile = (playerPublicId: string) =>
  publicApi.get(`/players/${playerPublicId}/profile`).then(r => r.data);
