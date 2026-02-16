/**
 * SUMMER CAMP BATCH SERVICE
 *
 * This is a SEPARATE service specifically for summer camp operations.
 * It wraps the regular batchService to provide batch selection for summer camp enrollments.
 *
 * DO NOT confuse with the regular batchService.ts used by AttendancePage!
 *
 * Usage in Summer Camp components:
 * import { getAllBatches } from "../../services/summerCampBatchService";
 */

import api from "../api/axios";
import type { Batch } from "../types/batch.types";

/**
 * Get all active batches for summer camp enrollment
 *
 * Used when:
 * - Creating summer camp enrollment (selecting which batches student will attend)
 * - Showing available batches in enrollment forms
 * - Filtering attendance by batch
 */
export async function getAllBatches(moduleType: string) {
  const response = await api.get("/admin/batches/active", {
    params: { moduleType },
  });
  return response.data;
}

/**
 * Format batch time for display
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

export default {
  getAllBatches,
  formatBatchTime,
  formatBatchTimeRange,
};
