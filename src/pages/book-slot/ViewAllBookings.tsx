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
  notifyPhone: string | null;
  isGuest: boolean;
  ballCount: number | null;
  sessionsRemaining: number | null;
};

function ViewAllBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [marking, setMarking] = useState<string | null>(null);

  const markAsPaid = async (publicId: string) => {
    if (!window.confirm("Mark this booking as paid and confirm the slot?"))
      return;
    setMarking(publicId);
    try {
      await api.post(`/bookings/${publicId}/mark-paid`);
      setBookings((prev) =>
        prev.map((b) =>
          b.bookingPublicId === publicId
            ? { ...b, status: "CONFIRMED", paymentStatus: "PAID" }
            : b,
        ),
      );
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to mark as paid");
    } finally {
      setMarking(null);
    }
  };

  const [playedModal, setPlayedModal] = useState<{
    publicId: string;
    playerName: string;
    bookedBallCount: number;
    sessionsRemaining: number | null;
  } | null>(null);
  const [actualBalls, setActualBalls] = useState<number>(60);

  const openPlayedModal = (booking: Booking) => {
    const booked = booking.ballCount ?? 60;
    setActualBalls(booked);
    setPlayedModal({
      publicId: booking.bookingPublicId,
      playerName: booking.playerName,
      bookedBallCount: booked,
      sessionsRemaining: booking.sessionsRemaining,
    });
  };

  const confirmMarkAsPlayed = async () => {
    if (!playedModal) return;
    setMarking(playedModal.publicId);
    try {
      await api.post(`/bookings/${playedModal.publicId}/mark-played`, {
        actualBallCount: actualBalls,
      });
      setBookings((prev) =>
        prev.map((b) =>
          b.bookingPublicId === playedModal.publicId
            ? { ...b, status: "CONFIRMED" }
            : b,
        ),
      );
      setPlayedModal(null);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to mark as played");
    } finally {
      setMarking(null);
    }
  };

  const downloadReceipt = async (publicId: string) => {
    try {
      const response = await api.get(`/bookings/admin/${publicId}/receipt`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${publicId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to download receipt");
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const response = await api.get("/admin/bookings");
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
      case "PENDING_CONFIRMATION":
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
            🏏 Pending Play
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

  const pendingCount = bookings.filter(
    (b) => b.status === "PENDING_PAYMENT",
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* ── HEADER ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin")}
          className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-2xl font-bold truncate">
            All Bookings
          </h1>
          <p className="text-xs text-gray-500">
            View and manage all user bookings
          </p>
        </div>
        {/* Action buttons — icon+label on desktop, icon-only on mobile */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {pendingCount > 0 && (
            <button
              onClick={() => setStatusFilter("PENDING_PAYMENT")}
              className="flex items-center gap-1.5 px-2.5 py-2 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition"
            >
              <span>⏳</span>
              <span className="hidden sm:inline">Pending</span>
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            </button>
          )}
          <button
            onClick={() => navigate("/admin/bookings/manual")}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
          >
            <span>📞</span>
            <span className="hidden sm:inline">Manual Booking</span>
          </button>
          <button
            onClick={() => {
              setLoading(true);
              loadBookings();
            }}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── STATS — 2-col on mobile, 4-col on desktop ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
          <p className="text-xs text-gray-500">Total Bookings</p>
          <p className="text-xl md:text-2xl font-bold text-gray-900">
            {bookings.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
          <p className="text-xs text-gray-500">Confirmed</p>
          <p className="text-xl md:text-2xl font-bold text-green-600">
            {bookings.filter((b) => b.status === "CONFIRMED").length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
          <p className="text-xs text-gray-500">Pending Payment</p>
          <p className="text-xl md:text-2xl font-bold text-yellow-600">
            {pendingCount}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
          <p className="text-xs text-gray-500">Total Revenue</p>
          <p className="text-xl md:text-2xl font-bold text-blue-600">
            ₹
            {bookings
              .filter((b) => b.paymentStatus === "PAID")
              .reduce((sum, b) => sum + (b.amount || 0), 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or resource…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Status + Date filters — 2-col grid on mobile */}
        <div className="grid grid-cols-2 md:flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING_PAYMENT">Pending</option>
            <option value="PENDING_CONFIRMATION">Pending Play</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />

          {(searchTerm || statusFilter !== "ALL" || dateFilter) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setDateFilter("");
              }}
              className="col-span-2 md:col-span-1 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              ✕ Clear
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500">
          Showing {filteredBookings.length} of {bookings.length} bookings
        </p>
      </div>

      {/* ── TABLE — unchanged, desktop only ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500 mb-1 text-sm">No bookings found</p>
            <p className="text-xs text-gray-400">
              {searchTerm || statusFilter !== "ALL" || dateFilter
                ? "Try adjusting your filters"
                : "Bookings will appear here when users make reservations"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      User
                    </th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Date & Time
                    </th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Resource
                    </th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Amount
                    </th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Payment
                    </th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBookings.map((booking) => (
                    <tr
                      key={booking.bookingPublicId}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="p-4">
                        <p className="font-medium text-gray-900 text-sm">
                          {booking.playerName || "N/A"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {booking.bookedByEmail || "N/A"}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {booking.slotDate || "N/A"}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock size={11} /> {booking.startTime || "?"} -{" "}
                              {booking.endTime || "?"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-gray-900 text-sm">
                          {booking.resourceType || "N/A"}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-gray-900 text-sm">
                          ₹{booking.amount?.toLocaleString() || 0}
                        </p>
                      </td>
                      <td className="p-4">{getStatusBadge(booking.status)}</td>
                      <td className="p-4">
                        {getPaymentBadge(booking.paymentStatus)}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {booking.status === "PENDING_PAYMENT" && (
                            <>
                              <button
                                onClick={() =>
                                  markAsPaid(booking.bookingPublicId)
                                }
                                disabled={marking === booking.bookingPublicId}
                                className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition disabled:opacity-50"
                              >
                                {marking === booking.bookingPublicId
                                  ? "..."
                                  : "✓ Mark Paid"}
                              </button>
                              {booking.notifyPhone && (
                                <span className="text-xs text-gray-500">
                                  📱 {booking.notifyPhone}
                                </span>
                              )}
                            </>
                          )}
                          {booking.status === "PENDING_CONFIRMATION" && (
                            <button
                              onClick={() => openPlayedModal(booking)}
                              disabled={marking === booking.bookingPublicId}
                              className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                            >
                              {marking === booking.bookingPublicId
                                ? "..."
                                : "🏏 Mark as Played"}
                            </button>
                          )}
                          {booking.status === "CONFIRMED" && (
                            <button
                              onClick={() =>
                                downloadReceipt(booking.bookingPublicId)
                              }
                              className="flex items-center gap-1 border border-blue-300 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-50 transition"
                            >
                              <Download size={12} /> Receipt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredBookings.map((booking) => (
                <div key={booking.bookingPublicId} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900 text-sm">
                      {booking.playerName || "N/A"}
                    </p>
                    {getStatusBadge(booking.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>📅 {booking.slotDate}</span>
                    <span>
                      🕐 {booking.startTime} – {booking.endTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {booking.resourceType}
                    </span>
                    <span className="font-bold text-gray-900">
                      ₹{booking.amount?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPaymentBadge(booking.paymentStatus)}
                    <div className="ml-auto flex gap-2">
                      {booking.status === "PENDING_PAYMENT" && (
                        <button
                          onClick={() => markAsPaid(booking.bookingPublicId)}
                          disabled={marking === booking.bookingPublicId}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition"
                        >
                          {marking === booking.bookingPublicId
                            ? "..."
                            : "✓ Mark Paid"}
                        </button>
                      )}
                      {booking.status === "PENDING_CONFIRMATION" && (
                        <button
                          onClick={() => openPlayedModal(booking)}
                          disabled={marking === booking.bookingPublicId}
                          className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 transition"
                        >
                          {marking === booking.bookingPublicId
                            ? "..."
                            : "🏏 Played"}
                        </button>
                      )}
                      {booking.status === "CONFIRMED" && (
                        <button
                          onClick={() =>
                            downloadReceipt(booking.bookingPublicId)
                          }
                          className="border border-blue-300 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-50 transition flex items-center gap-1"
                        >
                          <Download size={11} /> Receipt
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {playedModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">Mark as Played</h3>

            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
              <p>
                <span className="text-gray-500">Player:</span>{" "}
                <strong>{playedModal.playerName}</strong>
              </p>
              <p>
                <span className="text-gray-500">Booked:</span>{" "}
                <strong>{playedModal.bookedBallCount} balls</strong>
              </p>
              {playedModal.sessionsRemaining !== null && (
                <p>
                  <span className="text-gray-500">Sessions remaining:</span>{" "}
                  <strong>{playedModal.sessionsRemaining}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Actual balls played
              </label>
              <select
                value={actualBalls}
                onChange={(e) => setActualBalls(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
              >
                {[60, 120, 180, 240, 300].map((b) => (
                  <option key={b} value={b}>
                    {b} balls — {b / 60} session{b / 60 > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Sessions to deduct */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-800">
              Sessions to deduct: <strong>{actualBalls / 60}</strong>
              {actualBalls > playedModal.bookedBallCount && (
                <span className="text-purple-600 ml-2">
                  (booked {playedModal.bookedBallCount / 60}, extra +
                  {(actualBalls - playedModal.bookedBallCount) / 60})
                </span>
              )}
              {actualBalls < playedModal.bookedBallCount && (
                <span className="text-purple-600 ml-2">
                  (booked {playedModal.bookedBallCount / 60}, played less)
                </span>
              )}
            </div>

            {/* Warning if not enough sessions */}
            {playedModal.sessionsRemaining !== null &&
              actualBalls / 60 > playedModal.sessionsRemaining && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  ⚠️ Member only has{" "}
                  <strong>{playedModal.sessionsRemaining}</strong> session
                  {playedModal.sessionsRemaining !== 1 ? "s" : ""} remaining.
                  Confirming will make the balance negative.
                </div>
              )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setPlayedModal(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkAsPlayed}
                disabled={!!marking}
                className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-50"
              >
                {marking ? "..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewAllBookings;
