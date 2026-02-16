import { Camera, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "./../Button";
import {
  fetchActiveBatches,
  formatBatchTimeRange,
} from "../../api/batchService";
import type { Batch } from "../../types/batch.types";
import type { PlayerFormData } from "../../api/playerService/playerService";

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
  // Fee plan props (optional — only used in RegisterPlayer, not UpdatePlayer)
  feePlans?: FeePlanOption[];
  selectedFeePlan?: string;
  onFeePlanChange?: (planPublicId: string) => void;
};

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
}: Props) {
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  useEffect(() => {
    const loadBatches = async () => {
      try {
        const data = await fetchActiveBatches("REGULAR");
        setAvailableBatches(data);
      } catch (error) {
        console.error("Failed to load batches:", error);
        setAvailableBatches([]);
      } finally {
        setLoadingBatches(false);
      }
    };

    loadBatches();
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Photo size must be less than 5MB");
      return;
    }

    onPhotoChange?.(file);
  };

  const removePhoto = () => {
    onPhotoChange?.(null);
  };

  const toggleBatch = (batchId: string) => {
    if (!onBatchChange) return;

    const newBatchIds = batchIds.includes(batchId)
      ? batchIds.filter((id) => id !== batchId)
      : [...batchIds, batchId];

    onBatchChange(newBatchIds);
  };

  return (
    <div className="space-y-6">
      {/* PHOTO UPLOAD */}
      {onPhotoChange && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Player Photo</h2>

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              {photoPreview ? (
                <>
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gray-200 flex items-center justify-center border-4 border-dashed border-gray-300">
                  <Camera className="text-gray-400" size={32} />
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                <Upload size={18} />
                <span>Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">
                JPG, PNG or JPEG. Max 5MB.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PERSONAL INFO */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h2 className="text-lg font-semibold">Personal Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={onChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                invalidFields.displayName
                  ? "border-red-500 focus:ring-red-500"
                  : "focus:ring-blue-500"
              }`}
              placeholder="Enter name as per Aadhar card"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Aadhar Number
            </label>
            <input
              type="text"
              name="aadharNumber"
              value={formData.aadharNumber}
              onChange={onChange}
              maxLength={12}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="XXXX XXXX XXXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={onChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                invalidFields.dob
                  ? "border-red-500 focus:ring-red-500"
                  : "focus:ring-blue-500"
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={onChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                invalidFields.gender
                  ? "border-red-500 focus:ring-red-500"
                  : "focus:ring-blue-500"
              }`}
            >
              <option value="">Select Gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Father's Name
            </label>
            <input
              type="text"
              name="fatherName"
              value={formData.fatherName}
              onChange={onChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Father's name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Mother's Name
            </label>
            <input
              type="text"
              name="motherName"
              value={formData.motherName}
              onChange={onChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mother's name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Player Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={onChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Parents Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="parentsPhone"
              value={formData.parentsPhone}
              onChange={onChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                invalidFields.parentsPhone
                  ? "border-red-500 focus:ring-red-500"
                  : "focus:ring-blue-500"
              }`}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                invalidFields.email
                  ? "border-red-500 focus:ring-red-500"
                  : "focus:ring-blue-500"
              }`}
              placeholder="player@example.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Address
              <span className="text-red-500">*</span>
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={onChange}
              rows={2}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                invalidFields.address
                  ? "border-red-500 focus:ring-red-500"
                  : "focus:ring-blue-500"
              }`}
              placeholder="Full address"
            />
          </div>
        </div>
      </div>

      {/* ACADEMY INFO */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h2 className="text-lg font-semibold">Academy Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Profession <span className="text-red-500">*</span>
            </label>
            <select
              name="profession"
              value={formData.profession}
              onChange={onChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                invalidFields.profession
                  ? "border-red-500 focus:ring-red-500"
                  : "focus:ring-blue-500"
              }`}
            >
              <option value="">Select Profession</option>
              <option value="STUDENT">Student</option>
              <option value="WORKING">Working Professional</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              School/College
            </label>
            <input
              type="text"
              name="schoolOrCollege"
              value={formData.schoolOrCollege}
              onChange={onChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Institution name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Joining Date
            </label>
            <input
              type="date"
              name="joiningDate"
              value={formData.joiningDate}
              onChange={onChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* FEE PLAN DROPDOWN — only shown if props are passed */}
          {onFeePlanChange && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fee Plan
              </label>
              <select
                value={selectedFeePlan}
                onChange={(e) => onFeePlanChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <p className="text-xs text-gray-500 mt-1">
                Can also be assigned later from the Fees tab
              </p>
            </div>
          )}

          {/* BATCH SELECTION */}
          <div
            id="batch-section"
            className={`md:col-span-2 ${
              invalidFields.batchIds
                ? "border-2 border-red-500 p-3 rounded-md"
                : ""
            }`}
          >
            <label className="block text-sm font-medium mb-2">
              Select Batches <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Player can be assigned to multiple batches
            </p>

            {loadingBatches ? (
              <div className="text-sm text-gray-500 py-4 text-center">
                Loading batches...
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
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
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
                            <div className="text-xs text-gray-600">
                              {formatBatchTimeRange(batch)}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-400"
                          }`}
                        >
                          {isSelected && "✓"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {invalidFields.batchIds && (
              <p className="text-sm text-red-500 mt-2">
                ⚠️ Please select at least one batch
              </p>
            )}
          </div>
        </div>
      </div>

      {/* CRICKET INFO */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h2 className="text-lg font-semibold">Cricket Profile</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">KSCA ID</label>
            <input
              type="text"
              name="kscaId"
              value={formData.kscaId}
              onChange={onChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter KSCA ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Skill Level
            </label>
            <select
              name="skillLevel"
              value={formData.skillLevel}
              onChange={onChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Level</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="PROFESSIONAL">Professional</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Batting Style
            </label>
            <select
              name="battingStyle"
              value={formData.battingStyle}
              onChange={onChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Style</option>
              <option value="RIGHT_HAND">Right-handed</option>
              <option value="LEFT_HAND">Left-handed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Bowling Style
            </label>
            <select
              name="bowlingStyle"
              value={formData.bowlingStyle}
              onChange={onChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Style</option>
              <option value="RIGHT_ARM_FAST">Right-arm Fast</option>
              <option value="LEFT_ARM_FAST">Left-arm Fast</option>
              <option value="RIGHT_ARM_SPIN">Right-arm Spin</option>
              <option value="LEFT_ARM_SPIN">Left-arm Spin</option>
              <option value="NONE">Not a Bowler</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Previous Representation
            </label>
            <textarea
              name="previousRepresentation"
              value={formData.previousRepresentation}
              onChange={onChange}
              rows={2}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="E.g., District U-19, School Team, Club Cricket..."
            />
          </div>
        </div>
      </div>

      {/* NOTES */}
      <div className="bg-white p-6 rounded-lg shadow">
        <label className="block text-sm font-medium mb-2">
          Additional Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={onChange}
          rows={4}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Any additional information about the player..."
        />
      </div>

      {/* SUBMIT BUTTONS */}
      <div className="flex flex-col md:flex-row gap-3 md:justify-end">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}

export default PlayerForm;
