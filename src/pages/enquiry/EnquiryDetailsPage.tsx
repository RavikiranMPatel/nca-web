import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle, XCircle, UserPlus } from "lucide-react";
import { toast } from "react-hot-toast";
import Button from "../../components/Button";
import { enquiryService } from "../../api/enquiryService";
import type {
  EnquiryDetails,
  FollowUpMethod,
  EnquiryStatus,
} from "../../api/enquiryService";
import {
  getStatusColor,
  getStatusText,
  getSourceText,
  getMethodText,
} from "../../api/enquiryService";
import { formatBatchTimeRange } from "../../api/batchService";

function EnquiryDetailsPage() {
  const { enquiryId } = useParams();
  const navigate = useNavigate();

  const [enquiry, setEnquiry] = useState<EnquiryDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const role = localStorage.getItem("userRole");
  const isSuperAdmin = role === "ROLE_SUPER_ADMIN";

  useEffect(() => {
    if (enquiryId) {
      loadEnquiry();
    }
  }, [enquiryId]);

  const loadEnquiry = async () => {
    try {
      const data = await enquiryService.getEnquiryById(enquiryId!);
      setEnquiry(data);
    } catch (error) {
      toast.error("Failed to load enquiry details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-500">
        Loading enquiry details...
      </div>
    );
  }

  if (!enquiry) {
    return (
      <div className="text-center py-10 text-gray-500">Enquiry not found</div>
    );
  }

  const canSendFollowUp =
    enquiry.followUpCount < 3 &&
    !["ENROLLED", "NOT_ENROLLED", "LOST"].includes(enquiry.status);

  const canConvert =
    isSuperAdmin &&
    !["ENROLLED", "NOT_ENROLLED", "LOST"].includes(enquiry.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{enquiry.childName}</h1>
          <p className="text-sm text-gray-500">
            Enquiry ID: {enquiry.publicId}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(enquiry.status)}`}
        >
          {getStatusText(enquiry.status)}
        </span>
      </div>

      {/* ACTION BUTTONS */}
      {/* ACTION BUTTONS */}
      <div className="flex flex-wrap gap-3">
        {/* ✅ Only show Edit if not in final status */}
        {!["ENROLLED", "NOT_ENROLLED", "LOST"].includes(enquiry.status) && (
          <button
            onClick={() => navigate(`/admin/enquiries/${enquiryId}/edit`)}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
          >
            Edit Enquiry
          </button>
        )}

        {canSendFollowUp && (
          <button
            onClick={() => setShowFollowUpModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Send size={18} />
            Send Follow-up
          </button>
        )}

        {/* ✅ Only show Update Status if not in final status */}
        {!["ENROLLED", "NOT_ENROLLED", "LOST"].includes(enquiry.status) && (
          <button
            onClick={() => setShowStatusModal(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Update Status
          </button>
        )}

        {canConvert && (
          <button
            onClick={() => setShowConvertModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <UserPlus size={18} />
            Convert to Player
          </button>
        )}
      </div>

      {/* CHILD INFO */}
      <Section title="Child Information">
        <Field label="Child Name" value={enquiry.childName} />
        <Field
          label="Date of Birth"
          value={
            enquiry.childDob
              ? new Date(enquiry.childDob).toLocaleDateString("en-GB")
              : "-"
          }
        />
        <Field label="Gender" value={enquiry.childGender || "-"} />
      </Section>

      {/* PARENT INFO */}
      <Section title="Parent Information">
        <Field label="Parent Name" value={enquiry.parentName} />
        <Field label="Phone" value={enquiry.parentPhone} />
        <Field label="Email" value={enquiry.parentEmail || "-"} />
        <Field label="Address" value={enquiry.address || "-"} full />
      </Section>

      {/* ENQUIRY INFO */}
      <Section title="Enquiry Information">
        <Field
          label="Enquiry Date"
          value={new Date(enquiry.enquiryDate).toLocaleDateString("en-GB")}
        />
        <Field label="Source" value={getSourceText(enquiry.enquirySource)} />
        <Field
          label="Follow-up Count"
          value={enquiry.followUpCount.toString()}
        />
        <Field
          label="Next Follow-up"
          value={
            enquiry.nextFollowUpDate
              ? new Date(enquiry.nextFollowUpDate).toLocaleDateString("en-GB")
              : "-"
          }
        />
      </Section>

      {/* PREFERRED BATCHES */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Preferred Batches</h2>
        {enquiry.preferredBatches.length > 0 ? (
          <div className="space-y-2">
            {enquiry.preferredBatches.map((batch) => (
              <div
                key={batch.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: batch.color || "#3B82F6" }}
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{batch.name}</p>
                  <p className="text-xs text-gray-600">
                    {formatBatchTimeRange(batch)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No preferred batches selected</p>
        )}
      </div>

      {/* NOTES */}
      {enquiry.notes && (
        <Section title="Notes">
          <p className="text-sm text-gray-700 whitespace-pre-line col-span-2">
            {enquiry.notes}
          </p>
        </Section>
      )}

      {/* FOLLOW-UP HISTORY */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Follow-up History</h2>
        {enquiry.followUpHistory.length > 0 ? (
          <div className="space-y-4">
            {enquiry.followUpHistory.map((followUp, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">
                    Follow-up {followUp.followUpNumber}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(followUp.followUpDate).toLocaleDateString(
                      "en-GB",
                    )}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  Method: {getMethodText(followUp.method)}
                </p>
                {followUp.notes && (
                  <p className="text-sm text-gray-700 italic">
                    Notes: {followUp.notes}
                  </p>
                )}
                {followUp.response && (
                  <p className="text-sm text-green-700 mt-1">
                    Response: {followUp.response}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  By: {followUp.createdBy}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No follow-ups sent yet</p>
        )}
      </div>

      {/* MODALS */}
      <SendFollowUpModal
        open={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        onSuccess={loadEnquiry}
        enquiryId={enquiryId!}
        followUpNumber={enquiry.followUpCount + 1}
      />

      <UpdateStatusModal
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onSuccess={loadEnquiry}
        enquiryId={enquiryId!}
        currentStatus={enquiry.status}
      />

      {canConvert && (
        <ConvertToPlayerModal
          open={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          onSuccess={() => {
            toast.success("Enquiry converted to player successfully!");
            navigate("/admin/enquiries");
          }}
          enquiryId={enquiryId!}
          enquiry={enquiry}
        />
      )}
    </div>
  );
}

/* ================= HELPERS ================= */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  full = false,
}: {
  label: string;
  value?: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <p className="text-gray-500">{label}</p>
      <p className="font-medium">{value || "-"}</p>
    </div>
  );
}

/* ================= MODALS ================= */

function SendFollowUpModal({
  open,
  onClose,
  onSuccess,
  enquiryId,
  followUpNumber,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  enquiryId: string;
  followUpNumber: number;
}) {
  const [method, setMethod] = useState<FollowUpMethod>("BOTH");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await enquiryService.sendFollowUp(enquiryId, { method, notes });
      toast.success(`Follow-up ${followUpNumber} sent successfully!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send follow-up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl animate-modal-in">
        <h2 className="text-xl font-bold mb-4">
          Send Follow-up {followUpNumber}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as FollowUpMethod)}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="BOTH">Email + WhatsApp</option>
              <option value="EMAIL">Email Only</option>
              <option value="WHATSAPP">WhatsApp Only</option>
              <option value="PHONE">Phone Call</option>
              <option value="IN_PERSON">In-Person</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Any notes about this follow-up..."
            />
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={loading}>
              {loading ? "Sending..." : "Send Follow-up"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UpdateStatusModal({
  open,
  onClose,
  onSuccess,
  enquiryId,
  currentStatus,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  enquiryId: string;
  currentStatus: EnquiryStatus;
}) {
  const [status, setStatus] = useState<EnquiryStatus>(currentStatus);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (status === currentStatus) {
      toast.error("Please select a different status");
      return;
    }

    setLoading(true);
    try {
      await enquiryService.updateStatus(enquiryId, { status, reason });
      toast.success("Status updated successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl animate-modal-in">
        <h2 className="text-xl font-bold mb-4">Update Status</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">New Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EnquiryStatus)}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="FOLLOW_UP_1">Follow-up 1</option>
              <option value="FOLLOW_UP_2">Follow-up 2</option>
              <option value="FOLLOW_UP_3">Follow-up 3</option>
              <option value="ENROLLED">Enrolled</option>
              <option value="NOT_ENROLLED">Not Enrolled</option>
              <option value="LOST">Lost</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Reason for status change..."
            />
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={loading}>
              {loading ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConvertToPlayerModal({
  open,
  onClose,
  onSuccess,
  enquiryId,
  enquiry,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  enquiryId: string;
  enquiry: EnquiryDetails;
}) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleConvert = async () => {
    setLoading(true);
    try {
      // Pre-fill player data from enquiry
      const playerData = {
        displayName: enquiry.childName,
        dob: enquiry.childDob || "",
        gender: enquiry.childGender || "",
        phone: "",
        parentsPhone: enquiry.parentPhone,
        email: enquiry.parentEmail || "",
        address: enquiry.address || "",
        profession: "STUDENT",
        batchIds: enquiry.preferredBatches.map((b) => b.id),
        joiningDate: new Date().toISOString().split("T")[0],
        notes: enquiry.notes || "",
      };

      await enquiryService.convertToPlayer(enquiryId, {
        createNewPlayer: true,
        playerData,
      });

      onSuccess();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to convert to player",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl animate-modal-in">
        <h2 className="text-xl font-bold mb-4">Convert to Player</h2>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              This will create a new player record with the following details:
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Name: {enquiry.childName}</li>
              <li>• Parent Phone: {enquiry.parentPhone}</li>
              <li>
                • Batches:{" "}
                {enquiry.preferredBatches.map((b) => b.name).join(", ")}
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConvert}
              disabled={loading}
            >
              {loading ? "Converting..." : "Confirm Conversion"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnquiryDetailsPage;
