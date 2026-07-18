import api from "./axios";
import type { HomepageSection } from "../types/club";

export const homepageSectionService = {
  listAll: async (): Promise<HomepageSection[]> => {
    const response = await api.get("/admin/homepage-sections");
    return response.data;
  },

  reorder: async (orderedIds: string[]): Promise<HomepageSection[]> => {
    const response = await api.put("/admin/homepage-sections/reorder", {
      orderedIds,
    });
    return response.data;
  },

  setVisibility: async (
    publicId: string,
    visible: boolean,
  ): Promise<HomepageSection> => {
    const response = await api.patch(
      `/admin/homepage-sections/${publicId}/visibility`,
      { visible },
    );
    return response.data;
  },
};

export default homepageSectionService;
