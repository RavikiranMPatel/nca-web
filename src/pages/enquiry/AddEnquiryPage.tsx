import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import Button from "../../components/Button";
import { enquiryService } from "../../api/enquiryService";
import type { EnquiryFormData, EnquirySource } from "../../api/enquiryService";
import {
  fetchActiveBatches,
  formatBatchTimeRange,
} from "../../api/batchService";
import type { Batch } from "../../types/batch.types";

function AddEnquiryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedEnquiryId, setSavedEnquiryId] = useState("");
  const [savedChildName, setSavedChildName] = useState("");

  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
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
    fetchActiveBatches()
      .then(setAvailableBatches)
      .catch(() => setAvailableBatches([]))
      .finally(() => setLoadingBatches(false));
  }, []);

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

    // Validations
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
      const enquiryData = {
        ...formData,
        preferredBatchIds,
      };

      const result = await enquiryService.createEnquiry(enquiryData);

      setSavedEnquiryId(result.publicId || "");
      setSavedChildName(formData.childName);
      setShowSuccessDialog(true);
    } catch (err: any) {
      console.error("Enquiry creation failed:", err);
      const message =
        err?.response?.data?.message || "Failed to create enquiry";
      setErrorMessage(message);
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
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
    setPreferredBatchIds([]);
  };

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
          <h1 className="text-2xl font-bold">Add New Enquiry</h1>
          <p className="text-sm text-gray-500">Record a new player enquiry</p>
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
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* BATCH SELECTION */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Preferred Batches <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Select batches the child is interested in
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
                    const isSelected = preferredBatchIds.includes(batch.id);

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
            {loading ? "Saving..." : "Create Enquiry"}
          </Button>
        </div>
      </form>

      {/* SUCCESS DIALOG */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl animate-modal-in">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">
                Enquiry Created!
              </h2>
              <p className="text-gray-600 mb-6">
                Enquiry for{" "}
                <span className="font-semibold">{savedChildName}</span> has been
                created successfully.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Enquiry ID: <span className="font-mono">{savedEnquiryId}</span>
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowSuccessDialog(false);
                    resetForm();
                  }}
                >
                  Add Another
                </Button>
                <Button
                  variant="primary"
                  onClick={() => navigate("/admin/enquiries")}
                >
                  View All Enquiries
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ERROR DIALOG */}
      {showErrorDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl animate-modal-in">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">
                Creation Failed
              </h2>
              <p className="text-gray-600 mb-6">{errorMessage}</p>
              <Button
                variant="primary"
                onClick={() => setShowErrorDialog(false)}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddEnquiryPage;
