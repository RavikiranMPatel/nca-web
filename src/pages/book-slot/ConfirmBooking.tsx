import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api/axios";
import publicApi from "../../api/publicApi";

type BookingDraft = {
  date: string;
  resource: string;
  slot: string;
  ballCount?: number | null;
};

function ConfirmBooking() {
  const navigate = useNavigate();
  const location = useLocation();
  const draft = location.state as BookingDraft | null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Guest fields
  const [guestPhone, setGuestPhone] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  // Notify fields (logged-in users)
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");

  const isLoggedIn = !!localStorage.getItem("accessToken");

  useEffect(() => {
    if (!draft) navigate("/book-slot", { replace: true });
  }, [draft, navigate]);

  if (!draft)
    return (
      <div className="text-center mt-16 text-gray-400 text-sm">Loading…</div>
    );

  const { date, resource, slot, ballCount } = draft;
  const startTime = slot.split(" - ")[0] + ":00";

  const resourceLabel =
    resource === "BOWLING_MACHINE"
      ? "Bowling Machine"
      : resource === "TURF"
        ? "Turf"
        : "Astro";

  const handleConfirm = async () => {
    setLoading(true);
    setError("");

    try {
      let bookingId: string;

      if (isLoggedIn) {
        if (!notifyPhone || notifyPhone.length !== 10) {
          setError("Please enter a valid 10-digit WhatsApp number");
          setLoading(false);
          return;
        }

        const res = await api.post("/bookings", {
          date,
          startTime,
          resourceType: resource,
          ...(ballCount ? { ballCount } : {}),
        });
        bookingId = res.data.bookingPublicId;

        await api.patch(`/bookings/${bookingId}/notify-details`, {
          notifyPhone,
          notifyEmail,
        });
      } else {
        if (!guestPhone || guestPhone.length !== 10) {
          setError("Please enter a valid 10-digit phone number");
          setLoading(false);
          return;
        }

        const res = await publicApi.post("/bookings/guest", {
          date,
          startTime,
          resourceType: resource,
          guestPhone,
          guestEmail,
          guestName,
          ...(ballCount ? { ballCount } : {}),
        });
        bookingId = res.data.bookingPublicId;

        await publicApi.patch(`/bookings/${bookingId}/notify-details`, {
          notifyPhone: guestPhone,
          notifyEmail: guestEmail,
        });

        localStorage.setItem("isGuestBooking", "true");
      }

      localStorage.setItem("activeBookingId", bookingId);
      navigate("/payment", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              navigate("/book-slot", {
                state: { date, resource, slot },
              })
            }
            className="w-9 h-9 flex items-center justify-center rounded-full 
                       bg-white border border-gray-200 text-gray-600 shadow-sm"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-900">Confirm Booking</h1>
        </div>

        {/* Booking Summary */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-blue-600 px-5 py-4">
            <p className="text-blue-100 text-xs font-medium uppercase tracking-wide">
              Your Booking
            </p>
            <p className="text-white text-xl font-bold mt-1">{slot}</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <SummaryRow label="Date" value={date} />
            <SummaryRow label="Resource" value={resourceLabel} />
            {ballCount && (
              <SummaryRow
                label="Session"
                value={`${ballCount} balls (${ballCount === 60 ? "15 mins" : "30 mins"})`}
              />
            )}
          </div>
        </div>

        {/* Guest Fields */}
        {!isLoggedIn && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <p className="font-semibold text-gray-900">Your Details</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                value={guestPhone}
                onChange={(e) =>
                  setGuestPhone(e.target.value.replace(/\D/g, ""))
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Name <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="Your name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                type="email"
                inputMode="email"
                placeholder="your@email.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Notify Fields — logged-in users */}
        {isLoggedIn && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
              📲 We'll send your confirmation to these details after payment.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                WhatsApp Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                value={notifyPhone}
                onChange={(e) =>
                  setNotifyPhone(e.target.value.replace(/\D/g, ""))
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                type="email"
                inputMode="email"
                placeholder="your@email.com"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-base
                     hover:bg-blue-700 active:scale-95 transition-all shadow-md
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && (
            <svg
              className="animate-spin w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
          )}
          {loading ? "Processing…" : "Continue to Payment →"}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

export default ConfirmBooking;
