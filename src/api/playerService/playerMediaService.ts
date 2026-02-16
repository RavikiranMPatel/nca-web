/**
 * Player Media Service - API calls for media gallery
 *
 * Endpoints:
 * GET    /api/admin/players/{id}/media?page=0&size=20&type=&tag=  - Paginated list
 * POST   /api/admin/players/{id}/media/photo                      - Upload photo
 * POST   /api/admin/players/{id}/media/video                      - Add video link
 * PUT    /api/admin/players/{id}/media/{mediaId}                   - Update tag/note
 * DELETE /api/admin/players/{id}/media/{mediaId}                   - Delete
 */

import api from "../axios";

// ==================== TYPES ====================

export type MediaType = "PHOTO" | "VIDEO";
export type VideoPlatform = "YOUTUBE" | "INSTAGRAM";
export type MediaTag =
  | "BATTING"
  | "BOWLING"
  | "FIELDING"
  | "MATCH"
  | "FITNESS"
  | "OTHER";

export interface PlayerMediaResponse {
  publicId: string;
  playerPublicId: string;
  mediaType: MediaType;
  mediaUrl: string;
  videoPlatform?: VideoPlatform;
  videoId?: string;
  thumbnailUrl?: string;
  tag: MediaTag;
  note?: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaginatedMediaResponse {
  content: PlayerMediaResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
}

export interface AddVideoRequest {
  mediaType: "VIDEO";
  mediaUrl: string;
  videoPlatform: VideoPlatform;
  tag: MediaTag;
  note?: string;
}

// ==================== HELPERS ====================

export function extractYouTubeId(url: string): string | null {
  const m1 = url.match(/(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/);
  if (m1) return m1[1];
  const m2 = url.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (m2) return m2[1];
  const m3 = url.match(/(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (m3) return m3[1];
  const m4 = url.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (m4) return m4[1];
  return null;
}

export function extractInstagramId(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

export function detectPlatform(url: string): VideoPlatform | null {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YOUTUBE";
  if (url.includes("instagram.com")) return "INSTAGRAM";
  return null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function getInstagramEmbedUrl(reelId: string): string {
  return `https://www.instagram.com/reel/${reelId}/embed/`;
}

// ==================== SERVICE ====================

export const playerMediaService = {
  /**
   * Paginated list
   */
  getAll: async (
    playerPublicId: string,
    page = 0,
    size = 20,
    type?: string,
    tag?: string,
  ): Promise<PaginatedMediaResponse> => {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("size", String(size));
    if (type) params.append("type", type);
    if (tag) params.append("tag", tag);

    const response = await api.get(
      `/admin/players/${playerPublicId}/media?${params.toString()}`,
    );
    return response.data;
  },

  uploadPhoto: async (
    playerPublicId: string,
    file: File,
    tag: MediaTag,
    note?: string,
  ): Promise<PlayerMediaResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tag", tag);
    if (note) formData.append("note", note);

    const response = await api.post(
      `/admin/players/${playerPublicId}/media/photo`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  addVideo: async (
    playerPublicId: string,
    data: AddVideoRequest,
  ): Promise<PlayerMediaResponse> => {
    const response = await api.post(
      `/admin/players/${playerPublicId}/media/video`,
      data,
    );
    return response.data;
  },

  update: async (
    playerPublicId: string,
    mediaPublicId: string,
    tag?: MediaTag,
    note?: string,
  ): Promise<PlayerMediaResponse> => {
    const params = new URLSearchParams();
    if (tag) params.append("tag", tag);
    if (note !== undefined) params.append("note", note);

    const response = await api.put(
      `/admin/players/${playerPublicId}/media/${mediaPublicId}?${params.toString()}`,
    );
    return response.data;
  },

  delete: async (
    playerPublicId: string,
    mediaPublicId: string,
  ): Promise<void> => {
    await api.delete(`/admin/players/${playerPublicId}/media/${mediaPublicId}`);
  },
};

export default playerMediaService;
