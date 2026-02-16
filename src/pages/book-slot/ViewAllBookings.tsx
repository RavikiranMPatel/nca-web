import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, ArrowLeft, Search, Download } from "lucide-react";
import api from "../../api/axios";

type Booking = {
  bookingPublicId: string;
  status: string;
  cancelledAt: string | null;
  playerName: string;
  bookedByEmail: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  resourceType: string;
  amount: number;
  paymentStatus: string | null;
  paymentMode: string | null;
};

function ViewAllBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const response = await api.get("/admin/bookings");
      console.log("📥 Bookings response:", response.data);
      setBookings(response.data);
    } catch (error) {
      console.error("Failed to load bookings:", error);
      alert("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
            ✓ Confirmed
          </span>
        );
      case "PENDING_PAYMENT":
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
            ⏳ Pending
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
            ✕ Cancelled
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
            ✓ Completed
          </span>
        );
      default:
        return null;
    }
  };

  const getPaymentBadge = (status: string | null) => {
    if (!status) return <span className="text-xs text-gray-400">-</span>;

    switch (status) {
      case "COMPLETED":
        return (
          <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded font-medium">
            💳 Paid
          </span>
        );
      case "PENDING":
        return (
          <span className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded font-medium">
            ⏳ Pending
          </span>
        );
      case "FAILED":
        return (
          <span className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded font-medium">
            ✕ Failed
          </span>
        );
      case "REFUNDED":
        return (
          <span className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded font-medium">
            ↩ Refunded
          </span>
        );
      default:
        return <span className="text-xs text-gray-400">-</span>;
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    // Safe access with fallbacks
    const playerName = booking.playerName || "";
    const email = booking.bookedByEmail || "";
    const resourceType = booking.resourceType || "";

    const matchesSearch =
      playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resourceType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || booking.status === statusFilter;

    const matchesDate = !dateFilter || booking.slotDate === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const exportToCSV = () => {
    const headers = [
      "Booking ID",
      "User Name",
      "Email",
      "Date",
      "Time",
      "Resource",
      "Amount",
      "Status",
      "Payment Status",
    ];

    const rows = filteredBookings.map((b) => [
      b.bookingPublicId,
      b.playerName,
      b.bookedByEmail,
      b.slotDate,
      `${b.startTime} - ${b.endTime}`,
      b.resourceType,
      b.amount,
      b.status,
      b.paymentStatus || "-",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
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
            <h1 className="text-2xl font-bold">All Bookings</h1>
            <p className="text-gray-600 text-sm mt-1">
              View and manage all user bookings
            </p>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Download size={18} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Confirmed</p>
          <p className="text-2xl font-bold text-green-600">
            {bookings.filter((b) => b.status === "CONFIRMED").length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Pending Payment</p>
          <p className="text-2xl font-bold text-yellow-600">
            {bookings.filter((b) => b.status === "PENDING_PAYMENT").length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-blue-600">
            ₹
            {bookings
              .filter((b) => b.paymentStatus === "COMPLETED")
              .reduce((sum, b) => sum + (b.amount || 0), 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or resource..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING_PAYMENT">Pending Payment</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="w-full md:w-48">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Clear Filters */}
          {(searchTerm || statusFilter !== "ALL" || dateFilter) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setDateFilter("");
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredBookings.length} of {bookings.length} bookings
        </div>
      </div>

      {/* BOOKINGS TABLE */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500 mb-2">No bookings found</p>
            <p className="text-sm text-gray-400">
              {searchTerm || statusFilter !== "ALL" || dateFilter
                ? "Try adjusting your filters"
                : "Bookings will appear here when users make reservations"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">
                    User
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">
                    Date & Time
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">
                    Resource
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">
                    Amount
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">
                    Payment
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBookings.map((booking) => (
                  <tr
                    key={booking.bookingPublicId}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {booking.playerName || "N/A"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {booking.bookedByEmail || "N/A"}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {booking.slotDate || "N/A"}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock size={12} />
                            {booking.startTime || "?"} -{" "}
                            {booking.endTime || "?"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-gray-900">
                        {booking.resourceType || "N/A"}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-gray-900">
                        ₹{booking.amount?.toLocaleString() || 0}
                      </p>
                    </td>
                    <td className="p-4">{getStatusBadge(booking.status)}</td>
                    <td className="p-4">
                      {getPaymentBadge(booking.paymentStatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewAllBookings;
