import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

type Booking = {
  bookingPublicId: string;
  playerName: string;
  date: string; // yyyy-mm-dd
  slot: string;
  resource: string;
  amount: number;
  status: "CONFIRMED" | "PENDING_PAYMENT" | "CANCELLED" | "EXPIRED";
};

const PAGE_SIZE = 5;

function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState<"UPCOMING" | "PAST">("UPCOMING");
  const [page, setPage] = useState(1);

  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/bookings/my")
      .then(res => setBookings(res.data))
      .catch(() => setError("Unable to load bookings"))
      .finally(() => setLoading(false));
  }, []);

  // ---------------- FILTER LOGIC ----------------

  const today = new Date().toISOString().split("T")[0];

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (filter === "UPCOMING") {
        return (
          b.status === "PENDING_PAYMENT" ||
          (b.status === "CONFIRMED" && b.date >= today)
        );
      }

      // PAST
      return (
        b.status === "CANCELLED" ||
        b.status === "EXPIRED" ||
        (b.status === "CONFIRMED" && b.date < today)
      );
    });
  }, [bookings, filter, today]);

  // ---------------- PAGINATION ----------------

  const totalPages = Math.ceil(filteredBookings.length / PAGE_SIZE);

  const pagedBookings = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, page]);

  // ---------------- ACTIONS ----------------

  const cancelBooking = async (bookingId: string) => {
    if (!confirm("Cancel this booking?")) return;

    try {
      await api.delete(`/bookings/${bookingId}`);
      setBookings(prev =>
        prev.map(b =>
          b.bookingPublicId === bookingId
            ? { ...b, status: "CANCELLED" }
            : b
        )
      );
    } catch {
      alert("Unable to cancel booking");
    }
  };

  // ---------------- UI ----------------

  if (loading) {
    return <div className="text-center mt-10">Loading bookings…</div>;
  }

  if (error) {
    return <div className="text-center text-red-600 mt-10">{error}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto mt-10">
      <h1 className="text-2xl font-semibold mb-6">My Bookings</h1>

      {/* FILTER TABS */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => {
            setFilter("UPCOMING");
            setPage(1);
          }}
          className={`px-4 py-2 rounded ${
            filter === "UPCOMING"
              ? "bg-blue-600 text-white"
              : "border"
          }`}
        >
          Upcoming
        </button>

        <button
          onClick={() => {
            setFilter("PAST");
            setPage(1);
          }}
          className={`px-4 py-2 rounded ${
            filter === "PAST"
              ? "bg-blue-600 text-white"
              : "border"
          }`}
        >
          Past
        </button>
      </div>

      {/* EMPTY STATE */}
      {filteredBookings.length === 0 && (
        <div className="text-center mt-10 text-gray-500">
          No {filter.toLowerCase()} bookings found.
        </div>
      )}

      {/* LIST */}
      <div className="space-y-4">
        {pagedBookings.map(b => (
          <div
            key={b.bookingPublicId}
            className="border rounded p-4 flex justify-between items-center"
          >
            <div className="space-y-1 text-sm">
              <p><strong>Player:</strong> {b.playerName}</p>
              <p><strong>Date:</strong> {b.date}</p>
              <p><strong>Time:</strong> {b.slot}</p>
              <p><strong>Resource:</strong> {b.resource}</p>
              <p><strong>Amount:</strong> ₹{b.amount}</p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={
                    b.status === "CONFIRMED"
                      ? "text-green-600"
                      : b.status === "PENDING_PAYMENT"
                      ? "text-orange-600"
                      : "text-red-600"
                  }
                >
                  {b.status}
                </span>
              </p>
            </div>

            <div className="flex gap-2">
              {b.status === "PENDING_PAYMENT" && (
                <button
                  onClick={() => {
                    localStorage.setItem("activeBookingId", b.bookingPublicId);
                    navigate("/payment");
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  Pay Now
                </button>
              )}

              {b.status === "CONFIRMED" && filter === "UPCOMING" && (
                <button
                  onClick={() => cancelBooking(b.bookingPublicId)}
                  className="border border-red-500 text-red-500 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          <span className="px-4 py-2">
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default MyBookings;
