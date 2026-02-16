import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import publicApi from "../../api/publicApi";

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
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [guestPhone, setGuestPhone] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  const isLoggedIn = !!localStorage.getItem("accessToken");

  useEffect(() => {
    const saved = localStorage.getItem("bookingDraft");
    if (saved) {
      setDraft(JSON.parse(saved));
    } else {
      navigate("/book-slot", { replace: true });
    }
  }, [navigate]);

  if (!draft) {
    return (
      <div className="text-center mt-16">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const { date, resource, slot } = draft;
  const startTime = slot.split(" - ")[0];

  const confirmBooking = async () => {
    // ✅ GUEST: Show phone capture modal first
    if (!isLoggedIn) {
      setShowPhoneModal(true);
      return;
    }

    // ✅ USER: Create booking directly
    await createUserBooking();
  };

  const createUserBooking = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/bookings", {
        date,
        startTime,
        resourceType: resource,
      });

      localStorage.setItem("activeBookingId", res.data.bookingPublicId);
      navigate("/payment", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  const createGuestBooking = async () => {
    if (!guestPhone || guestPhone.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await publicApi.post("/bookings/guest", {
        date,
        startTime,
        resourceType: resource,
        guestPhone,
        guestEmail,
        guestName,
      });

      localStorage.setItem("activeBookingId", res.data.bookingPublicId);
      localStorage.setItem("isGuestBooking", "true");
      navigate("/payment", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-16 bg-white p-8 rounded shadow space-y-6">
      <h1 className="text-2xl font-semibold text-center">Confirm Booking</h1>

      <div className="bg-gray-50 p-4 rounded space-y-2">
        <p>
          <strong>Date:</strong> {date}
        </p>
        <p>
          <strong>Resource:</strong> {resource}
        </p>
        <p>
          <strong>Time:</strong> {slot}
        </p>
      </div>

      {/* Login Reminder for Guests */}
      {!isLoggedIn && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm">
          <p className="text-blue-900 font-medium mb-2">📱 Guest Booking</p>
          <p className="text-blue-700">
            You're booking as a guest. We'll need your phone number for payment
            and confirmation.
          </p>
        </div>
      )}

      {error && <p className="text-red-600 text-center">{error}</p>}

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

      {/* Phone Capture Modal for Guests */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Enter Your Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone Number (Required) *
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  className="w-full border rounded px-3 py-2"
                  value={guestPhone}
                  onChange={(e) =>
                    setGuestPhone(e.target.value.replace(/\D/g, ""))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Your name"
                  className="w-full border rounded px-3 py-2"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full border rounded px-3 py-2"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
              </div>

              <p className="text-xs text-gray-500">
                We need your phone number for payment confirmation and refunds
                (if applicable).
              </p>
            </div>

            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowPhoneModal(false)}
                disabled={loading}
                className="flex-1 border rounded py-2"
              >
                Cancel
              </button>
              <button
                onClick={createGuestBooking}
                disabled={loading}
                className="flex-1 bg-green-600 text-white rounded py-2"
              >
                {loading ? "Processing..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConfirmBooking;
