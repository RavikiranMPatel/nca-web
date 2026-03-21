import { Camera, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "./../Button";
import {
  fetchActiveBatches,
  formatBatchTimeRange,
} from "../../api/batchService";
import type { Batch } from "../../types/batch.types";
import type { PlayerFormData } from "../../api/playerService/playerService";
import type { Branch } from "../../api/branch.api";

type FeePlanOption = {
  publicId: string;
  name: string;
  amount: number;
  discountAmount: number;
  durationLabel: string;
};

type Props = {
  formData: PlayerFormData;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  photoPreview?: string;
  onPhotoChange?: (file: File | null) => void;
  onCancel?: () => void;
  submitLabel?: string;
  loading?: boolean;
  batchIds?: string[];
  onBatchChange?: (batchIds: string[]) => void;
  invalidFields?: Record<string, boolean>;
  feePlans?: FeePlanOption[];
  selectedFeePlan?: string;
  onFeePlanChange?: (planPublicId: string) => void;
  branches?: Branch[];
  selectedBranchId?: string;
  onBranchChange?: (branchId: string) => void;
};

// ── Reusable field wrapper ──────────────────────────────────────
function Field({
  label,
  required,
  error,
  children,
  colSpan2 = false,
}: {
  label: string;
  required?: boolean;
  error?: boolean;
  children: React.ReactNode;
  colSpan2?: boolean;
}) {
  return (
    <div className={colSpan2 ? "md:col-span-2" : ""}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 mt-1">This field is required</p>
      )}
    </div>
  );
}

// ── Shared input class builder ──────────────────────────────────
function inputCls(error?: boolean) {
  return `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition ${
    error
      ? "border-red-400 focus:ring-red-300"
      : "border-gray-300 focus:ring-blue-300 focus:border-blue-400"
  }`;
}

// ── Section card ────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          {title}
        </h2>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

function PlayerForm({
  formData,
  onChange,
  photoPreview = "",
  onPhotoChange,
  onCancel,
  submitLabel = "Save",
  loading = false,
  batchIds = [],
  onBatchChange,
  invalidFields = {},
  feePlans = [],
  selectedFeePlan = "",
  onFeePlanChange,
  branches = [],
  selectedBranchId = "",
  onBranchChange,
}: Props) {
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  useEffect(() => {
    if (onBranchChange && !selectedBranchId) {
      setAvailableBatches([]);
      setLoadingBatches(false);
      return;
    }
    const loadBatches = async () => {
      setLoadingBatches(true);
      try {
        const data = await fetchActiveBatches(
          "REGULAR",
          selectedBranchId || undefined,
        );
        setAvailableBatches(data);
      } catch {
        setAvailableBatches([]);
      } finally {
        setLoadingBatches(false);
      }
    };
    loadBatches();
  }, [selectedBranchId, onBranchChange]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Photo size must be less than 5MB");
      return;
    }
    onPhotoChange?.(file);
  };

  const removePhoto = () => onPhotoChange?.(null);

  const toggleBatch = (batchId: string) => {
    if (!onBatchChange) return;
    const newBatchIds = batchIds.includes(batchId)
      ? batchIds.filter((id) => id !== batchId)
      : [...batchIds, batchId];
    onBatchChange(newBatchIds);
  };

  return (
    <div className="space-y-4">
      {/* ── PHOTO UPLOAD ── */}
      {onPhotoChange && (
        <Section title="Player Photo">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {photoPreview ? (
                <>
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                  <Camera className="text-gray-400" size={28} />
                </div>
              )}
            </div>
            {/* Upload button */}
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                <Upload size={15} />
                <span>{photoPreview ? "Change Photo" : "Upload Photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-400 mt-1.5">
                JPG, PNG or JPEG · Max 5MB
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* ── PERSONAL INFO ── */}
      <Section title="Personal Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Full Name"
            required
            error={invalidFields.displayName}
            colSpan2
          >
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={onChange}
              className={inputCls(invalidFields.displayName)}
              placeholder="Name as per Aadhar card"
            />
          </Field>

          <Field label="Aadhar Number">
            <input
              type="text"
              name="aadharNumber"
              value={formData.aadharNumber}
              onChange={onChange}
              maxLength={12}
              className={inputCls()}
              placeholder="XXXX XXXX XXXX"
            />
          </Field>

          <Field label="Date of Birth" required error={invalidFields.dob}>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={onChange}
              className={inputCls(invalidFields.dob)}
            />
          </Field>

          <Field label="Gender" required error={invalidFields.gender}>
            <select
              name="gender"
              value={formData.gender}
              onChange={onChange}
              className={inputCls(invalidFields.gender)}
            >
              <option value="">Select Gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>

          <Field label="Father's Name">
            <input
              type="text"
              name="fatherName"
              value={formData.fatherName}
              onChange={onChange}
              className={inputCls()}
              placeholder="Father's name"
            />
          </Field>

          <Field label="Mother's Name">
            <input
              type="text"
              name="motherName"
              value={formData.motherName}
              onChange={onChange}
              className={inputCls()}
              placeholder="Mother's name"
            />
          </Field>

          <Field label="Player Phone">
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={onChange}
              className={inputCls()}
              placeholder="10-digit mobile number"
            />
          </Field>

          <Field
            label="Parents Phone"
            required
            error={invalidFields.parentsPhone}
          >
            <input
              type="tel"
              name="parentsPhone"
              value={formData.parentsPhone}
              onChange={onChange}
              className={inputCls(invalidFields.parentsPhone)}
              placeholder="10-digit mobile number"
            />
          </Field>

          <Field label="Email" required error={invalidFields.email} colSpan2>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              className={inputCls(invalidFields.email)}
              placeholder="player@example.com"
            />
          </Field>

          <Field
            label="Address"
            required
            error={invalidFields.address}
            colSpan2
          >
            <textarea
              name="address"
              value={formData.address}
              onChange={onChange}
              rows={2}
              className={inputCls(invalidFields.address)}
              placeholder="Full address"
            />
          </Field>
        </div>
      </Section>

      {/* ── ACADEMY INFO ── */}
      <Section title="Academy Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Branch — super admin only */}
          {onBranchChange && (
            <Field
              label="Branch"
              required
              error={invalidFields.branchId}
              colSpan2
            >
              <select
                value={selectedBranchId}
                onChange={(e) => onBranchChange(e.target.value)}
                className={inputCls(invalidFields.branchId)}
              >
                <option value="">Select Branch</option>
                {branches
                  .filter((b) => b.active)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.isMainBranch ? " (Main)" : ""}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Player will be assigned to this branch
              </p>
            </Field>
          )}

          <Field label="Profession" required error={invalidFields.profession}>
            <select
              name="profession"
              value={formData.profession}
              onChange={onChange}
              className={inputCls(invalidFields.profession)}
            >
              <option value="">Select Profession</option>
              <option value="STUDENT">Student</option>
              <option value="WORKING">Working Professional</option>
            </select>
          </Field>

          <Field label="School / College">
            <input
              type="text"
              name="schoolOrCollege"
              value={formData.schoolOrCollege}
              onChange={onChange}
              className={inputCls()}
              placeholder="Institution name"
            />
          </Field>

          <Field label="Joining Date">
            <input
              type="date"
              name="joiningDate"
              value={formData.joiningDate}
              onChange={onChange}
              className={inputCls()}
            />
          </Field>

          {/* Fee Plan — optional */}
          {onFeePlanChange && (
            <Field label="Fee Plan">
              <select
                value={selectedFeePlan}
                onChange={(e) => onFeePlanChange(e.target.value)}
                className={inputCls()}
              >
                <option value="">Select Fee Plan (Optional)</option>
                {feePlans.map((plan) => {
                  const finalAmount = plan.amount - (plan.discountAmount || 0);
                  return (
                    <option key={plan.publicId} value={plan.publicId}>
                      {plan.name} — ₹{finalAmount.toLocaleString("en-IN")}
                      {plan.discountAmount > 0
                        ? ` (₹${plan.discountAmount.toLocaleString("en-IN")} off)`
                        : ""}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Can be assigned later from the Fees tab
              </p>
            </Field>
          )}

          {/* Batch selection */}
          <div
            id="batch-section"
            className={`md:col-span-2 ${
              invalidFields.batchIds ? "ring-2 ring-red-400 rounded-xl p-3" : ""
            }`}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batches <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Player can be assigned to multiple batches
            </p>

            {onBranchChange && !selectedBranchId ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">
                  Select a branch first to see available batches
                </p>
              </div>
            ) : loadingBatches ? (
              <div className="text-sm text-gray-400 py-4 text-center">
                Loading batches…
              </div>
            ) : availableBatches.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-sm text-yellow-800">
                  No batches available. Please create batches first.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableBatches.map((batch) => {
                  const isSelected = batchIds.includes(batch.id);
                  return (
                    <button
                      key={batch.id}
                      type="button"
                      onClick={() => toggleBatch(batch.id)}
                      className={`w-full p-3 rounded-xl border-2 transition-all text-left active:scale-[0.99] ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: batch.color || "#3B82F6",
                            }}
                          />
                          <div>
                            <div className="font-medium text-sm">
                              {batch.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatBatchTimeRange(batch)}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {isSelected ? "✓" : ""}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {invalidFields.batchIds && (
              <p className="text-xs text-red-500 mt-2">
                ⚠️ Please select at least one batch
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* ── CRICKET PROFILE ── */}
      <Section title="Cricket Profile">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="KSCA ID">
            <input
              type="text"
              name="kscaId"
              value={formData.kscaId}
              onChange={onChange}
              className={inputCls()}
              placeholder="Enter KSCA ID"
            />
          </Field>

          <Field label="Skill Level">
            <select
              name="skillLevel"
              value={formData.skillLevel}
              onChange={onChange}
              className={inputCls()}
            >
              <option value="">Select Level</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="PROFESSIONAL">Professional</option>
            </select>
          </Field>

          <Field label="Batting Style">
            <select
              name="battingStyle"
              value={formData.battingStyle}
              onChange={onChange}
              className={inputCls()}
            >
              <option value="">Select Style</option>
              <option value="RIGHT_HAND">Right-handed</option>
              <option value="LEFT_HAND">Left-handed</option>
            </select>
          </Field>

          <Field label="Bowling Style">
            <select
              name="bowlingStyle"
              value={formData.bowlingStyle}
              onChange={onChange}
              className={inputCls()}
            >
              <option value="">Select Style</option>
              <option value="RIGHT_ARM_FAST">Right-arm Fast</option>
              <option value="LEFT_ARM_FAST">Left-arm Fast</option>
              <option value="RIGHT_ARM_SPIN">Right-arm Spin</option>
              <option value="LEFT_ARM_SPIN">Left-arm Spin</option>
              <option value="NONE">Not a Bowler</option>
            </select>
          </Field>

          <Field label="Previous Representation" colSpan2>
            <textarea
              name="previousRepresentation"
              value={formData.previousRepresentation}
              onChange={onChange}
              rows={2}
              className={inputCls()}
              placeholder="E.g., District U-19, School Team, Club Cricket…"
            />
          </Field>
        </div>
      </Section>

      {/* ── NOTES ── */}
      <Section title="Additional Notes">
        <textarea
          name="notes"
          value={formData.notes}
          onChange={onChange}
          rows={3}
          className={inputCls()}
          placeholder="Any additional information about the player…"
        />
      </Section>

      {/* ── SUBMIT — sticky on mobile ── */}
      <div className="sticky bottom-16 sm:bottom-0 z-10 bg-white border-t border-gray-100 px-0 py-3 -mx-0 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end sm:static sm:border-none sm:bg-transparent sm:py-0 sm:px-0">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <button
          type="submit"
          disabled={loading}
          className={`flex-1 sm:flex-none px-6 py-3 sm:py-2 bg-blue-600 text-white rounded-xl sm:rounded-lg text-sm font-semibold transition ${
            loading
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-blue-700 active:scale-[0.98]"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              Saving…
            </span>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </div>
  );
}

export default PlayerForm;
