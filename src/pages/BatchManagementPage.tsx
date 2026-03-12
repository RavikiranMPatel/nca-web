import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../auth/useAuth";
import { getAdminBranches, type Branch } from "../api/branch.api";
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  Users,
  X,
  Check,
  ArrowLeft,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  fetchActiveBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  formatBatchTimeRange,
  getDefaultBatchColor,
  getPlayersInBatch,
  fetchBatchModuleTypes,
} from "../api/batchService";
import type { Batch, BatchCreateRequest } from "../types/batch.types";

type BatchFormData = {
  name: string;
  startTime: string;
  endTime: string;
  description: string;
  color: string;
};

function BatchManagementPage() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const isSuperAdmin = userRole === "ROLE_SUPER_ADMIN";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});
  const [moduleTypes, setModuleTypes] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const [formData, setFormData] = useState<BatchFormData>({
    name: "",
    startTime: "",
    endTime: "",
    description: "",
    color: "",
  });

  useEffect(() => {
    if (moduleTypes.length > 0 && !selectedModule) {
      setSelectedModule(moduleTypes[0]);
    }
  }, [moduleTypes, selectedModule]);

  useEffect(() => {
    loadModuleTypes();
    if (isSuperAdmin) {
      getAdminBranches()
        .then(setBranches)
        .catch(() => setBranches([]));
    }
  }, []);

  useEffect(() => {
    if (selectedModule) {
      loadBatches();
    }
  }, [selectedModule]);

  const loadModuleTypes = async () => {
    try {
      const types = await fetchBatchModuleTypes();
      setModuleTypes(types);
    } catch (error) {
      console.error("Error loading module types:", error);
      toast.error("Failed to load module types");
    }
  };

  const loadBatches = async () => {
    try {
      setLoading(true);
      const data = await fetchActiveBatches(selectedModule);
      setBatches(data);

      const counts: Record<string, number> = {};
      await Promise.all(
        data.map(async (batch) => {
          try {
            const players = await getPlayersInBatch(batch.id);
            counts[batch.id] = players.length;
          } catch {
            counts[batch.id] = 0;
          }
        }),
      );
      setPlayerCounts(counts);
    } catch (error) {
      console.error("Error loading batches:", error);
      toast.error("Failed to load batches");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      startTime: "",
      endTime: "",
      description: "",
      color: getDefaultBatchColor(batches.length),
    });
    setEditingId(null);
    setShowCreateForm(false);
  };

  const handleCreate = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    if (!formData.name || !formData.startTime || !formData.endTime) {
      toast.error("Please fill all required fields");
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    try {
      const request: BatchCreateRequest = {
        name: formData.name,
        startTime: formData.startTime,
        endTime: formData.endTime,
        description: formData.description || undefined,
        color: formData.color || getDefaultBatchColor(batches.length),
        moduleType: selectedModule,
        branchId:
          isSuperAdmin && selectedBranchId ? selectedBranchId : undefined,
      };
      await createBatch(request);
      toast.success("Batch created successfully");
      resetForm();
      await loadBatches();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create batch");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleUpdate = async (batchId: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    if (!formData.name || !formData.startTime || !formData.endTime) {
      toast.error("Please fill all required fields");
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    try {
      await updateBatch(batchId, {
        name: formData.name,
        startTime: formData.startTime,
        endTime: formData.endTime,
        description: formData.description || undefined,
        color: formData.color,
        moduleType: selectedModule,
        branchId:
          isSuperAdmin && selectedBranchId ? selectedBranchId : undefined,
      });
      toast.success("Batch updated successfully");
      resetForm();
      await loadBatches();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update batch");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleDelete = async (batchId: string, batchName: string) => {
    const playerCount = playerCounts[batchId] || 0;

    if (
      !window.confirm(
        `Are you sure you want to delete "${batchName}"?\n${playerCount > 0 ? `This will affect ${playerCount} player(s).` : ""}`,
      )
    ) {
      return;
    }

    try {
      await deleteBatch(batchId);
      toast.success("Batch deleted successfully");
      loadBatches();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete batch");
    }
  };

  const startEdit = (batch: Batch) => {
    setFormData({
      name: batch.name,
      startTime: batch.startTime,
      endTime: batch.endTime,
      description: batch.description || "",
      color: batch.color || getDefaultBatchColor(0),
    });
    setSelectedModule(batch.moduleType);
    setEditingId(batch.id);
    if (batch.branchId) setSelectedBranchId(batch.branchId);
    setShowCreateForm(false);
  };

  const startCreate = () => {
    setFormData({
      name: "",
      startTime: "",
      endTime: "",
      description: "",
      color: getDefaultBatchColor(batches.length),
    });
    setEditingId(null);
    setShowCreateForm(true);
  };

  // ✅ MUST be before return — filters batches by selected branch for super admin
  const filteredBatches =
    isSuperAdmin && branchFilter !== "all"
      ? batches.filter((b) => b.branchId === branchFilter)
      : batches;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-20">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm"
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/admin")}
                className="p-2 hover:bg-gray-100 rounded transition"
                title="Back to Admin Dashboard"
              >
                <ArrowLeft size={20} />
              </button>

              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="text-blue-600" size={28} />
                  Batch Management
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Create and manage training batches with custom timings
                </p>
              </div>
            </div>

            <button
              onClick={startCreate}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Create Batch</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* FILTERS */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Filter by Module
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-4 py-2 border rounded-lg w-full md:w-64"
            >
              {moduleTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {isSuperAdmin && branches.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Filter by Branch
              </label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg w-full md:w-64"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* CREATE/EDIT FORM */}
        <AnimatePresence>
          {(showCreateForm || editingId) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-lg"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                {editingId ? "Edit Batch" : "Create New Batch"}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Batch Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Morning Session, Night Training"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startTime: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      End Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData({ ...formData, endTime: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Add any notes or details about this batch..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-20 h-10 rounded-lg border border-slate-300 cursor-pointer"
                  />
                </div>

                {/* Branch dropdown — super admin only */}
                {isSuperAdmin && branches.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Branch <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    >
                      <option value="">Select Branch</option>
                      {branches
                        .filter((b) => b.active)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() =>
                      editingId ? handleUpdate(editingId) : handleCreate()
                    }
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting
                      ? "Saving..."
                      : editingId
                        ? "Update Batch"
                        : "Create Batch"}
                  </button>

                  <button
                    onClick={resetForm}
                    className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BATCH LIST */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Clock className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500 mb-4">
              {branchFilter !== "all"
                ? "No batches found for this branch"
                : "No batches created yet"}
            </p>
            <button
              onClick={startCreate}
              className="text-blue-600 font-medium hover:underline"
            >
              Create your first batch
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredBatches.map((batch, index) => {
              const branchInfo =
                isSuperAdmin && batch.branchId
                  ? branches.find((b) => b.id === batch.branchId)?.name
                  : null;

              return (
                <motion.div
                  key={batch.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all ${
                    batch.active
                      ? "border-slate-200"
                      : "border-red-200 bg-red-50/30"
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: batch.color || "#3B82F6" }}
                        />
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg">
                            {batch.name}
                          </h3>
                          {branchInfo && (
                            <p className="text-xs text-blue-600 font-medium">
                              📍 {branchInfo}
                            </p>
                          )}
                          {!batch.active && (
                            <span className="text-xs text-red-600 font-medium">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(batch)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                          title="Edit batch"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(batch.id, batch.name)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                          title="Delete batch"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                      <Clock size={16} />
                      <span className="font-medium">
                        {formatBatchTimeRange(batch)}
                      </span>
                    </div>

                    {batch.description && (
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                        {batch.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-sm">
                        <Users size={16} className="text-slate-400" />
                        <span className="text-slate-700 font-medium">
                          {playerCounts[batch.id] || 0} players
                        </span>
                      </div>

                      {batch.active ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                          <Check size={12} />
                          Active
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                          <X size={12} />
                          Inactive
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default BatchManagementPage;
