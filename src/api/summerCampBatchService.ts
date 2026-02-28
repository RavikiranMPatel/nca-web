/**
 * SUMMER CAMP BATCH SERVICE
 *
 * Camp batches are managed separately from regular batches.
 * Always fetch by campId — never by moduleType for camps.
 */

import api from "../api/axios";
// ADD this instead:
import type { Batch } from "../types/batch.types";
export type { Batch };

export type CampBatchCreateRequest = {
  name: string;
  startTime: string; // "HH:mm:ss"
  endTime: string; // "HH:mm:ss"
  description?: string;
  color?: string;
};

// ── Camp Batch CRUD ───────────────────────────────────────────────────────────

/**
 * Get all active batches for a camp
 * Used in: EnrollmentFormModal, SummerCampAttendance
 */
export async function getCampBatches(campId: string): Promise<Batch[]> {
  const response = await api.get(`/admin/summer-camps/${campId}/batches`);
  return response.data;
}

/**
 * Create a batch for a camp
 * Used in: SummerCampCreate (inline)
 */
export async function createCampBatch(
  campId: string,
  data: CampBatchCreateRequest,
): Promise<Batch> {
  const response = await api.post(
    `/admin/summer-camps/${campId}/batches`,
    data,
  );
  return response.data;
}

/**
 * Update a camp batch
 */
export async function updateCampBatch(
  campId: string,
  batchPublicId: string,
  data: Partial<CampBatchCreateRequest>,
): Promise<Batch> {
  const response = await api.put(
    `/admin/summer-camps/${campId}/batches/${batchPublicId}`,
    data,
  );
  return response.data;
}

/**
 * Delete a camp batch
 */
export async function deleteCampBatch(
  campId: string,
  batchPublicId: string,
): Promise<void> {
  await api.delete(`/admin/summer-camps/${campId}/batches/${batchPublicId}`);
}

// ── Regular batch helper (for conversion page) ────────────────────────────────

/**
 * Get active regular batches (campId IS NULL)
 * Used in: SummerCampConversion when assigning a converted student to a regular batch
 */
export async function getRegularBatches(): Promise<Batch[]> {
  const response = await api.get("/admin/batches/active", {
    params: { moduleType: "REGULAR" },
  });
  return response.data;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatTime(time: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function formatTimeRange(batch: Batch): string {
  return `${formatTime(batch.startTime)} – ${formatTime(batch.endTime)}`;
}
