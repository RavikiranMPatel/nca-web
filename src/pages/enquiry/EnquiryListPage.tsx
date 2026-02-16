import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { UserPlus, ArrowLeft } from "lucide-react";
import { enquiryService } from "../../api/enquiryService";
import type { EnquiryListItem } from "../../api/enquiryService";
import {
  getStatusColor,
  getStatusText,
  getSourceText,
  isFollowUpOverdue,
} from "../../api/enquiryService";

function EnquiryListPage() {
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState<EnquiryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const role = localStorage.getItem("userRole");
  const isSuperAdmin = role === "ROLE_SUPER_ADMIN";

  useEffect(() => {
    loadEnquiries();
  }, []);

  const loadEnquiries = async () => {
    try {
      const data = await enquiryService.getAllEnquiries();
      setEnquiries(data);
    } catch (error) {
      toast.error("Failed to load enquiries");
      setEnquiries([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEnquiries = enquiries.filter((e) => {
    const matchesSearch =
      e.childName.toLowerCase().includes(search.toLowerCase()) ||
      e.parentName.toLowerCase().includes(search.toLowerCase()) ||
      e.parentPhone.includes(search);

    const matchesStatus = statusFilter === "ALL" || e.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-500">
        Loading enquiries...
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin")}
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-bold">Admin · Enquiries</h1>
          <button
            onClick={() => navigate("/admin/enquiries/add")}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <UserPlus size={18} />
            Add Enquiry
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="space-y-3">
        {/* SEARCH */}
        <input
          className="border p-2 w-full rounded-md"
          placeholder="Search by child name, parent name, or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* STATUS FILTER */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border p-2 rounded-md w-full md:w-64"
        >
          <option value="ALL">All Status</option>
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

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Enquiries</p>
          <p className="text-2xl font-bold">{enquiries.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">New</p>
          <p className="text-2xl font-bold text-blue-600">
            {enquiries.filter((e) => e.status === "NEW").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Follow-ups</p>
          <p className="text-2xl font-bold text-yellow-600">
            {
              enquiries.filter((e) =>
                ["FOLLOW_UP_1", "FOLLOW_UP_2", "FOLLOW_UP_3"].includes(
                  e.status,
                ),
              ).length
            }
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Enrolled</p>
          <p className="text-2xl font-bold text-green-600">
            {enquiries.filter((e) => e.status === "ENROLLED").length}
          </p>
        </div>
      </div>

      {/* ================= MOBILE VIEW ================= */}
      <div className="md:hidden space-y-3">
        {filteredEnquiries.map((e) => (
          <div
            key={e.publicId}
            className="bg-white rounded-lg shadow p-4 space-y-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-xs text-gray-500">
                  {e.publicId}
                </span>
                <p className="font-semibold mt-1">{e.childName}</p>
                <p className="text-sm text-gray-600">Parent: {e.parentName}</p>
                <p className="text-sm text-gray-600">{e.parentPhone}</p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs ${getStatusColor(e.status)}`}
              >
                {getStatusText(e.status)}
              </span>
            </div>

            <div className="text-sm text-gray-600">
              <p>Source: {getSourceText(e.enquirySource)}</p>
              <p>
                Enquiry Date:{" "}
                {new Date(e.enquiryDate).toLocaleDateString("en-GB")}
              </p>
              {e.nextFollowUpDate && (
                <p
                  className={
                    isFollowUpOverdue(e.nextFollowUpDate)
                      ? "text-red-600 font-semibold"
                      : ""
                  }
                >
                  Next Follow-up:{" "}
                  {new Date(e.nextFollowUpDate).toLocaleDateString("en-GB")}
                  {isFollowUpOverdue(e.nextFollowUpDate) && " (Overdue)"}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/admin/enquiries/${e.publicId}`)}
                className="flex-1 py-2 bg-blue-600 text-white rounded text-sm"
              >
                View
              </button>

              {/* ✅ Only show Edit if not in final status */}
              {!["ENROLLED", "NOT_ENROLLED", "LOST"].includes(e.status) && (
                <button
                  onClick={() =>
                    navigate(`/admin/enquiries/${e.publicId}/edit`)
                  }
                  className="flex-1 py-2 bg-yellow-500 text-white rounded text-sm"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ================= DESKTOP VIEW ================= */}
      <div className="hidden md:block bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Enquiry ID</th>
              <th className="p-3 text-left">Child Name</th>
              <th className="p-3 text-left">Parent</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">Enquiry Date</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Next Follow-up</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredEnquiries.map((e) => (
              <tr key={e.publicId} className="border-t hover:bg-gray-50">
                <td className="p-3 font-mono text-xs">{e.publicId}</td>
                <td className="p-3 font-medium">{e.childName}</td>
                <td className="p-3">{e.parentName}</td>
                <td className="p-3">{e.parentPhone}</td>
                <td className="p-3">{getSourceText(e.enquirySource)}</td>
                <td className="p-3">
                  {new Date(e.enquiryDate).toLocaleDateString("en-GB")}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${getStatusColor(e.status)}`}
                  >
                    {getStatusText(e.status)}
                  </span>
                </td>
                <td className="p-3">
                  {e.nextFollowUpDate ? (
                    <span
                      className={
                        isFollowUpOverdue(e.nextFollowUpDate)
                          ? "text-red-600 font-semibold"
                          : ""
                      }
                    >
                      {new Date(e.nextFollowUpDate).toLocaleDateString("en-GB")}
                      {isFollowUpOverdue(e.nextFollowUpDate) && " ⚠️"}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-3 text-right space-x-2">
                  <button
                    onClick={() => navigate(`/admin/enquiries/${e.publicId}`)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    View
                  </button>

                  {/* ✅ Only show Edit if not in final status */}
                  {!["ENROLLED", "NOT_ENROLLED", "LOST"].includes(e.status) && (
                    <button
                      onClick={() =>
                        navigate(`/admin/enquiries/${e.publicId}/edit`)
                      }
                      className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredEnquiries.length === 0 && (
        <div className="text-center text-gray-500 py-10">
          No enquiries found
        </div>
      )}
    </div>
  );
}

export default EnquiryListPage;
