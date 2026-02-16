/**
 * REGULAR BATCH SERVICE
 *
 * This service handles regular training batch operations.
 * Used by: AttendancePage, Batch Management, Player Assignment
 *
 * For summer camp batch operations, see summerCampBatchService.ts
 */

import api from "./axios";
import type {
  Batch,
  BatchCreateRequest,
  BatchUpdateRequest,
} from "../types/batch.types";

// ==========================================
// BATCH API SERVICES
// ==========================================

/**
 * Fetch all batches (active and inactive)
 */
export async function fetchAllBatches(): Promise<Batch[]> {
  const response = await api.get("/admin/batches");
  return response.data;
}

/**
 * Fetch only active batches
 */
export async function fetchActiveBatches(moduleType: string): Promise<Batch[]> {
  const response = await api.get("/admin/batches/active", {
    params: { moduleType },
  });
  return response.data;
}

/**
 * Fetch a single batch by ID
 */
export async function fetchBatchById(batchId: string): Promise<Batch> {
  const response = await api.get(`/admin/batches/${batchId}`);
  return response.data;
}

/**
 * Create a new batch
 */
export async function createBatch(data: BatchCreateRequest): Promise<Batch> {
  const response = await api.post("/admin/batches", data);
  return response.data;
}

/**
 * Update an existing batch
 */
export async function updateBatch(
  batchId: string,
  data: BatchUpdateRequest,
): Promise<Batch> {
  const response = await api.put(`/admin/batches/${batchId}`, data);
  return response.data;
}

/**
 * Delete a batch (soft delete - sets active to false)
 */
export async function deleteBatch(batchId: string): Promise<void> {
  await api.delete(`/admin/batches/${batchId}`);
}

/**
 * Assign batches to a player
 */
export async function assignBatchesToPlayer(
  playerId: string,
  batchIds: string[],
): Promise<void> {
  await api.put(`/admin/players/${playerId}/batches`, { batchIds });
}

/**
 * Get batches assigned to a specific player
 */
export async function getPlayerBatches(playerId: string): Promise<Batch[]> {
  const response = await api.get(`/admin/players/${playerId}/batches`);
  return response.data;
}

/**
 * Get all players in a specific batch
 */
export async function getPlayersInBatch(batchId: string): Promise<any[]> {
  const response = await api.get(`/admin/batches/${batchId}/players`);
  return response.data;
}

/**
 * Format time for display (HH:mm to 12-hour format)
 */
export function formatBatchTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Format batch time range for display
 */
export function formatBatchTimeRange(batch: Batch): string {
  return `${formatBatchTime(batch.startTime)} - ${formatBatchTime(batch.endTime)}`;
}

/**
 * Get default colors for batches (if not set by admin)
 */
export const DEFAULT_BATCH_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EF4444", // Red
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
];

export function getDefaultBatchColor(index: number): string {
  return DEFAULT_BATCH_COLORS[index % DEFAULT_BATCH_COLORS.length];
}

export async function fetchBatchModuleTypes(): Promise<string[]> {
  const response = await api.get("/admin/settings/batch-module-types");
  return response.data;
}
