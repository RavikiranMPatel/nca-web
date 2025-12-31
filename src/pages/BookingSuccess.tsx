import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";

type BookingStatusResponse = {
  bookingPublicId: string;
  status: "CONFIRMED" | "PENDING_PAYMENT" | "CANCELLED" | "EXPIRED";
  playerName: string;
  date: string;
  slot: string;
  resource: string;
};

function BookingSuccess() {
  const navigate = useNavigate();
  const { state } = useLocation() as {
    state?: { bookingPublicId?: string };
  };

  const [booking, setBooking] = useState<BookingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
  const bookingId = state?.bookingPublicId;

  if (!bookingId) {
    navigate("/home", { replace: true });
    return;
  }

  let attempts = 0;
  let cancelled = false;

  const poll = async () => {
    if (cancelled) return;

    attempts++;

    try {
      const res = await api.get(`/bookings/${bookingId}/status`);
      const data = res.data;
      setBooking(data);

      if (data.status === "CONFIRMED") {
        setLoading(false);
        return; // ✅ STOP polling
      }

      if (data.status === "CANCELLED" || data.status === "EXPIRED") {
        setLoading(false);
        setError("Booking was not completed.");
        return;
      }

      if (attempts >= 10) {
        setLoading(false);
        setError("Payment confirmation is taking longer than expected.");
        return;
      }

      // ⏱️ schedule next poll
      setTimeout(poll, 3000);

    } catch {
      setLoading(false);
      setError("Unable to verify booking status.");
    }
  };

  poll();

  return () => {
    cancelled = true; // 🔥 HARD STOP on unmount
  };
}, [navigate, state?.bookingPublicId]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <p className="text-lg font-medium">Confirming your payment…</p>
          <p className="text-sm text-gray-500 mt-2">
            Please don’t close this page
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/my-bookings")}
            className="bg-blue-600 text-white px-6 py-2 rounded"
          >
            Go to My Bookings
          </button>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="max-w-xl mx-auto mt-16 bg-white p-8 rounded shadow space-y-6 text-center">
      <h1 className="text-2xl font-semibold text-green-600">
        🎉 Booking Confirmed!
      </h1>

      <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
        <p><strong>Player:</strong> {booking.playerName}</p>
        <p><strong>Date:</strong> {booking.date}</p>
        <p><strong>Time:</strong> {booking.slot}</p>
        <p><strong>Resource:</strong> {booking.resource}</p>
        <p className="font-semibold text-green-600">Status: CONFIRMED</p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => navigate("/my-bookings")}
          className="flex-1 bg-blue-600 text-white py-3 rounded"
        >
          View My Bookings
        </button>

        <button
          onClick={() => navigate("/home")}
          className="flex-1 border py-3 rounded"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}

export default BookingSuccess;
