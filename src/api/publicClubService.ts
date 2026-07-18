import publicApi from "./publicApi";
import type { PublicClub, PublicClubDetail, Season, ClubSeasonSummary } from "../types/club";

export const publicClubService = {
  listClubs: (): Promise<PublicClub[]> =>
    publicApi.get("/public/clubs").then((r) => r.data),

  getClub: (publicId: string): Promise<PublicClubDetail> =>
    publicApi.get(`/public/clubs/${publicId}`).then((r) => r.data),

  listSeasons: (clubId: string): Promise<Season[]> =>
    publicApi.get(`/public/clubs/${clubId}/seasons`).then((r) => r.data),

  getSeasonSummary: (clubId: string, seasonId: string): Promise<ClubSeasonSummary> =>
    publicApi
      .get(`/public/clubs/${clubId}/seasons/${seasonId}/summary`)
      .then((r) => r.data),
};
