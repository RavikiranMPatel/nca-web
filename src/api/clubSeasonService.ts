import api from "./axios";
import type {
  Season,
  SeasonRequest,
  ClubSeasonSquadEntry,
  ClubSeasonSquadRequest,
  ClubSeasonStatsData,
  ClubSeasonStatsRequest,
  ClubSeasonStandingData,
  ClubSeasonStandingRequest,
  ClubSeasonSummary,
} from "../types/club";

export const clubSeasonService = {
  // Seasons
  listSeasons: (): Promise<Season[]> =>
    api.get("/admin/seasons").then((r) => r.data),

  createSeason: (data: SeasonRequest): Promise<Season> =>
    api.post("/admin/seasons", data).then((r) => r.data),

  updateSeason: (publicId: string, data: SeasonRequest): Promise<Season> =>
    api.put(`/admin/seasons/${publicId}`, data).then((r) => r.data),

  deleteSeason: (publicId: string): Promise<void> =>
    api.delete(`/admin/seasons/${publicId}`).then(() => {}),

  activateSeason: (publicId: string): Promise<Season> =>
    api.post(`/admin/seasons/${publicId}/activate`).then((r) => r.data),

  // Season summary (squad + stats combined)
  getSeasonSummary: (clubId: string, seasonId: string): Promise<ClubSeasonSummary> =>
    api.get(`/admin/clubs/${clubId}/seasons/${seasonId}/summary`).then((r) => r.data),

  // Squad
  addToSquad: (clubId: string, seasonId: string, data: ClubSeasonSquadRequest): Promise<ClubSeasonSquadEntry> =>
    api.post(`/admin/clubs/${clubId}/seasons/${seasonId}/squad`, data).then((r) => r.data),

  updateSquadEntry: (
    clubId: string,
    seasonId: string,
    entryId: string,
    data: ClubSeasonSquadRequest,
  ): Promise<ClubSeasonSquadEntry> =>
    api.put(`/admin/clubs/${clubId}/seasons/${seasonId}/squad/${entryId}`, data).then((r) => r.data),

  removeFromSquad: (clubId: string, seasonId: string, entryId: string): Promise<void> =>
    api.delete(`/admin/clubs/${clubId}/seasons/${seasonId}/squad/${entryId}`).then(() => {}),

  // Standing
  upsertStanding: (
    clubId: string,
    seasonId: string,
    data: ClubSeasonStandingRequest,
  ): Promise<ClubSeasonStandingData> =>
    api.put(`/admin/clubs/${clubId}/seasons/${seasonId}/standing`, data).then((r) => r.data),

  // Stats
  upsertStats: (
    clubId: string,
    seasonId: string,
    matchType: "KSCA" | "PRACTICE",
    data: ClubSeasonStatsRequest,
  ): Promise<ClubSeasonStatsData> =>
    api.put(`/admin/clubs/${clubId}/seasons/${seasonId}/stats/${matchType}`, data).then((r) => r.data),
};

export default clubSeasonService;
