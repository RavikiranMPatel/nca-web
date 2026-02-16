import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, X, Save } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  fetchActiveBatches,
  assignBatchesToPlayer,
  getPlayerBatches,
  formatBatchTimeRange,
} from "../../api/batchService";
import type { Batch } from "../../types/batch.types";

type Props = {
  playerId: string;
  playerName: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

function PlayerBatchAssignmentModal({
  playerId,
  playerName,
  open,
  onClose,
  onSuccess,
}: Props) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && playerId) {
      loadData();
    }
  }, [open, playerId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allBatches, playerBatches] = await Promise.all([
        fetchActiveBatches("REGULAR"), // ✅ regular player assignment
        getPlayerBatches(playerId),
      ]);

      setBatches(allBatches);
      setSelectedBatchIds(new Set(playerBatches.map((b) => b.id)));
    } catch (error) {
      console.error("Error loading batch data:", error);
      toast.error("Failed to load batch data");
    } finally {
      setLoading(false);
    }
  };

  const toggleBatch = (batchId: string) => {
    setSelectedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedBatchIds.size === 0) {
      toast.error("Please select at least one batch");
      return;
    }

    setSaving(true);
    try {
      await assignBatchesToPlayer(playerId, Array.from(selectedBatchIds));
      toast.success("Batch assignment updated successfully");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to update batch assignment",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto"
      >
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold text-slate-900">Assign Batches</h2>
            <p className="text-sm text-slate-600 mt-1">
              Select batches for <strong>{playerName}</strong>
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-500 mt-3">Loading batches...</p>
            </div>
          )}

          {/* Batch List */}
          {!loading && batches.length === 0 && (
            <div className="text-center py-8 bg-slate-50 rounded-lg">
              <p className="text-slate-500">
                No active batches available. Please create batches first.
              </p>
            </div>
          )}

          {!loading && batches.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">
                Available Batches:
              </p>

              {batches.map((batch) => {
                const isSelected = selectedBatchIds.has(batch.id);

                return (
                  <button
                    key={batch.id}
                    onClick={() => toggleBatch(batch.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Color indicator */}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: batch.color || "#3B82F6" }}
                        />

                        {/* Batch info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900">
                            {batch.name}
                          </div>
                          <div className="text-xs text-slate-600">
                            {formatBatchTimeRange(batch)}
                          </div>
                          {batch.description && (
                            <div className="text-xs text-slate-500 mt-1 truncate">
                              {batch.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Checkbox */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        {isSelected ? <Check size={16} /> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || selectedBatchIds.size === 0 || loading}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>

            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 disabled:opacity-50 transition-all"
            >
              Cancel
            </button>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              ℹ️ Players can be assigned to multiple batches. Attendance will be
              tracked separately for each batch.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default PlayerBatchAssignmentModal;
