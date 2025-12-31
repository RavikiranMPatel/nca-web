import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

type BookingDraft = {
  date: string;
  resource: string;
  slot: string;
};

function ConfirmBooking() {
  const navigate = useNavigate();

  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load draft ONCE (no routing logic here)
  useEffect(() => {
    const saved = localStorage.getItem("bookingDraft");
    if (saved) {
      setDraft(JSON.parse(saved));
    }
  }, []);

  if (!draft) {
    return (
      <div className="text-center mt-16">
        Invalid booking. Please start again.
      </div>
    );
  }

  const { date, resource, slot } = draft;
  const startTime = slot.split(" - ")[0];

  const confirmBooking = async () => {
    const playerId = localStorage.getItem("playerId");
    if (!playerId) {
      setError("Please select a player again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/bookings", {
        playerPublicId: playerId,
        date,
        startTime,
        resourceType: resource,
      });

      localStorage.setItem(
        "activeBookingId",
        res.data.bookingPublicId
      );

      navigate("/payment", { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to create booking."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-16 bg-white p-8 rounded shadow space-y-6">
      <h1 className="text-2xl font-semibold text-center">
        Confirm Your Booking
      </h1>

      <div className="bg-gray-50 p-4 rounded space-y-2">
        <p><strong>Date:</strong> {date}</p>
        <p><strong>Resource:</strong> {resource}</p>
        <p><strong>Time:</strong> {slot}</p>
      </div>

      {error && (
        <p className="text-red-600 text-center">{error}</p>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => navigate("/book-slot")}
          className="flex-1 border rounded py-3"
        >
          Back
        </button>

        <button
          onClick={confirmBooking}
          disabled={loading}
          className="flex-1 bg-green-600 text-white rounded py-3"
        >
          {loading ? "Booking…" : "Confirm Booking"}
        </button>
      </div>
    </div>
  );
}

export default ConfirmBooking;
