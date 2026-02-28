import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import Button from "../../components/Button";
import { enquiryService } from "../../api/enquiryService";
import type {
  EnquiryFormData,
  EnquirySource,
  BatchOptionGroup,
} from "../../api/enquiryService";
import { formatBatchTimeRange } from "../../api/batchService";

function UpdateEnquiryPage() {
  const navigate = useNavigate();
  const { enquiryId } = useParams();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [batchOptions, setBatchOptions] = useState<BatchOptionGroup[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [selectedGroupType, setSelectedGroupType] = useState<string>("");
  const [preferredBatchIds, setPreferredBatchIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<EnquiryFormData>({
    childName: "",
    childDob: "",
    childGender: "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    address: "",
    preferredBatchIds: [],
    enquiryDate: new Date().toISOString().split("T")[0],
    enquirySource: "WALK_IN" as EnquirySource,
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, [enquiryId]);

  const loadData = async () => {
    try {
      const [options, enquiry] = await Promise.all([
        enquiryService.getBatchOptions(),
        enquiryService.getEnquiryById(enquiryId!),
      ]);

      setBatchOptions(options);

      setFormData({
        childName: enquiry.childName,
        childDob: enquiry.childDob || "",
        childGender: enquiry.childGender || "",
        parentName: enquiry.parentName,
        parentPhone: enquiry.parentPhone,
        parentEmail: enquiry.parentEmail || "",
        address: enquiry.address || "",
        preferredBatchIds: enquiry.preferredBatches.map((b) => b.id),
        enquiryDate: enquiry.enquiryDate,
        enquirySource: enquiry.enquirySource,
        notes: enquiry.notes || "",
      });

      const existingBatchIds = enquiry.preferredBatches.map((b) => b.id);
      setPreferredBatchIds(existingBatchIds);

      // Pre-select the group based on existing batch
      if (existingBatchIds.length > 0) {
        for (const group of options) {
          const found = group.batches.some((b) =>
            existingBatchIds.includes(b.id),
          );
          if (found) {
            setSelectedGroupType(group.type);
            break;
          }
        }
      }
    } catch (error) {
      toast.error("Failed to load enquiry data");
      navigate("/admin/enquiries");
    } finally {
      setLoadingData(false);
      setLoadingBatches(false);
    }
  };
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleBatch = (batchId: string) => {
    setPreferredBatchIds((prev) =>
      prev.includes(batchId)
        ? prev.filter((id) => id !== batchId)
        : [...prev, batchId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.childName.trim()) {
      toast.error("Child name is required");
      return;
    }
    if (!formData.parentName.trim()) {
      toast.error("Parent name is required");
      return;
    }
    if (!formData.parentPhone.trim()) {
      toast.error("Parent phone is required");
      return;
    }
    if (preferredBatchIds.length === 0) {
      toast.error("Please select at least one preferred batch");
      return;
    }

    setLoading(true);

    try {
      await enquiryService.updateEnquiry(enquiryId!, {
        ...formData,
        preferredBatchIds,
      });
      toast.success("Enquiry updated successfully!");
      navigate(`/admin/enquiries/${enquiryId}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update enquiry");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="text-center py-10 text-gray-500">
        Loading enquiry data...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Update Enquiry</h1>
          <p className="text-sm text-gray-500">Modify enquiry details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CHILD INFORMATION */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold">Child Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Child Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="childName"
                value={formData.childName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter child's full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                name="childDob"
                value={formData.childDob}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Gender</label>
              <select
                name="childGender"
                value={formData.childGender}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* PARENT INFORMATION */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold">Parent Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Parent Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="parentName"
                value={formData.parentName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter parent's name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Parent Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="parentPhone"
                value={formData.parentPhone}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+91 XXXXX XXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Parent Email
              </label>
              <input
                type="email"
                name="parentEmail"
                value={formData.parentEmail}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="parent@example.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Full address"
              />
            </div>
          </div>
        </div>

        {/* ENQUIRY DETAILS */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold">Enquiry Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Enquiry Date
              </label>
              <input
                type="date"
                name="enquiryDate"
                value={formData.enquiryDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Enquiry Source
              </label>
              <select
                name="enquirySource"
                value={formData.enquirySource}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="WALK_IN">Walk-in</option>
                <option value="PHONE_CALL">Phone Call</option>
                <option value="WEBSITE">Website</option>
                <option value="REFERRAL">Referral</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* BATCH SELECTION */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Training Interest <span className="text-red-500">*</span>
              </label>

              {loadingBatches ? (
                <div className="text-sm text-gray-500 py-4 text-center">
                  Loading options...
                </div>
              ) : batchOptions.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-yellow-800">
                    No batches available. Please create batches first.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* STEP 1 - Pick group */}
                  <div className="space-y-2">
                    {batchOptions.map((group) => (
                      <label
                        key={group.type}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedGroupType === group.type
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="groupType"
                          value={group.type}
                          checked={selectedGroupType === group.type}
                          onChange={() => {
                            setSelectedGroupType(group.type);
                            setPreferredBatchIds([]);
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-sm">
                            {group.label}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({group.batches.length} batch
                            {group.batches.length !== 1 ? "es" : ""})
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* STEP 2 - Pick batch within group */}
                  {selectedGroupType && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Select Batch
                      </p>
                      <div className="space-y-2">
                        {batchOptions
                          .find((g) => g.type === selectedGroupType)
                          ?.batches.map((batch) => {
                            const isSelected = preferredBatchIds.includes(
                              batch.id,
                            );
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
                                        backgroundColor:
                                          batch.color || "#3B82F6",
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
                    </div>
                  )}
                </div>
              )}

              {preferredBatchIds.length === 0 && (
                <p className="text-sm text-red-500 mt-2">
                  ⚠️ Please select at least one batch
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional notes about the enquiry..."
              />
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTONS */}
        <div className="flex flex-col md:flex-row gap-3 md:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Saving..." : "Update Enquiry"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default UpdateEnquiryPage;
