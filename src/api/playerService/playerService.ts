/**
 * Player Service - Centralized API calls for player management
 *
 * Usage:
 * import { playerService } from '../api/playerService';
 * const players = await playerService.getAllPlayers(true); // activeOnly
 * 
 * impact in below files:
 * 
 * AttendancePage.tsx - Fixes activeOnly filter (HIGH PRIORITY)
✅ RegisterPlayer.tsx - Simplifies a lot
✅ UpdatePlayer.tsx - Simplifies a lot
⏳ AddCricketStats.tsx - For consistency
⏳ PlayersListPage.tsx - For consistency
⏳ PlayerInfoPage.tsx - Already works, update when convenient
 */

import api from "../axios";

// ==================== TYPES ====================

export interface Player {
  id: string;
  publicId: string;
  displayName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  batch: string;
  profession: string;
  phone?: string;
  email?: string;
  parentsPhone?: string;
  joiningDate?: string;
  active: boolean;
  status: string;
  batches?: Batch[];
  photoUrl?: string;
  kscaId?: string;
  dob?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  aadharNumber?: string;
  schoolOrCollege?: string;
  skillLevel?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  previousRepresentation?: string;
  notes?: string;
}

export interface Batch {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

export interface PlayerFormData {
  displayName: string;
  kscaId?: string;
  dob?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  phone?: string;
  parentsPhone?: string;
  email?: string;
  aadharNumber?: string;
  gender: string;
  profession: string;
  batchIds: string[];
  schoolOrCollege?: string;
  skillLevel?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  previousRepresentation?: string;
  joiningDate?: string;
  notes?: string;
  active?: boolean;
  status?: string;
}

export interface PlayerStatusResponse {
  playerPublicId: string;
  playerName: string;
  active: boolean;
  status: string;
  message: string;
}

export interface AttendanceRecord {
  date: string;
  status: "PRESENT" | "ABSENT";
  batch: string;
  overridden: boolean;
  overrideReason?: string;
}

// ==================== SERVICE ====================

export const playerService = {
  /**
   * Get all players
   * @param activeOnly - If true, returns only active players (for attendance)
   */
  getAllPlayers: async (activeOnly: boolean = false): Promise<Player[]> => {
    const url = activeOnly
      ? "/admin/players?activeOnly=true"
      : "/admin/players";

    const response = await api.get(url);
    return response.data;
  },

  /**
   * Get player by public ID
   */
  getPlayerById: async (publicId: string): Promise<Player> => {
    const response = await api.get(`/admin/players/${publicId}`);
    return response.data;
  },

  /**
   * Get player details (from info endpoint)
   */
  getPlayerDetails: async (playerPublicId: string): Promise<any> => {
    const response = await api.get(`/admin/players/${playerPublicId}/info`);
    return response.data;
  },

  /**
   * Register new player
   */
  registerPlayer: async (
    playerData: PlayerFormData,
    photoFile?: File | null,
  ): Promise<any> => {
    const fd = new FormData();

    fd.append(
      "player",
      new Blob([JSON.stringify(playerData)], { type: "application/json" }),
    );

    if (photoFile) {
      fd.append("photo", photoFile);
    }

    const response = await api.post("/admin/players", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data;
  },

  /**
   * Update existing player
   */
  updatePlayer: async (
    publicId: string,
    playerData: PlayerFormData,
    photoFile?: File | null,
  ): Promise<any> => {
    const fd = new FormData();

    fd.append(
      "player",
      new Blob([JSON.stringify(playerData)], { type: "application/json" }),
    );

    if (photoFile) {
      fd.append("photo", photoFile);
    }

    const response = await api.put(`/admin/players/${publicId}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data;
  },

  /**
   * Check if email already exists
   */
  checkEmailExists: async (email: string): Promise<boolean> => {
    if (!email) return false;

    try {
      const response = await api.get("/admin/players/check-email", {
        params: { email },
      });
      return response.data.exists;
    } catch (error) {
      console.error("Error checking email:", error);
      return false;
    }
  },

  /**
   * Toggle player status (active/inactive)
   * Only for SUPER_ADMIN
   */
  togglePlayerStatus: async (
    playerPublicId: string,
    reason: string,
  ): Promise<PlayerStatusResponse> => {
    const response = await api.put(
      `/admin/players/${playerPublicId}/toggle-status`,
      { reason },
    );
    return response.data;
  },

  /**
   * Get player's attendance history
   */
  getAttendanceHistory: async (
    playerId: string,
  ): Promise<AttendanceRecord[]> => {
    const response = await api.get(`/admin/players/${playerId}/attendance`);
    return response.data;
  },

  /**
   * Delete player photo
   */
  deletePhoto: async (publicId: string): Promise<void> => {
    await api.delete(`/admin/players/${publicId}/photo`);
  },
};

// ==================== LEGACY EXPORTS ====================
// Keep these for backward compatibility with existing code
// Files using these can still work while you gradually migrate

/**
 * @deprecated Use playerService.togglePlayerStatus() instead
 */
export async function togglePlayerStatus(
  playerPublicId: string,
  reason: string,
): Promise<PlayerStatusResponse> {
  return playerService.togglePlayerStatus(playerPublicId, reason);
}

/**
 * @deprecated Use playerService.getPlayerDetails() instead
 */
export async function getPlayerDetails(playerPublicId: string): Promise<any> {
  return playerService.getPlayerDetails(playerPublicId);
}

/**
 * @deprecated Use playerService.checkEmailExists() instead
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  return playerService.checkEmailExists(email);
}

// Export as default
export default playerService;
