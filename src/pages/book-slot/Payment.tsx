import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api/axios";
import publicApi from "../../api/publicApi";

type BookingDetails = {
  bookingPublicId: string;
  playerName: string;
  date: string;
  slot: string;
  resource: string;
  amount: number;
  expiresAt: string;
  isGuest?: boolean;
  guestPhone?: string;
};

function Payment() {
  const navigate = useNavigate();
  const { state } = useLocation() as {
    state?: { isMemberBooking?: boolean };
  };

  const isMemberBooking = state?.isMemberBooking === true;
  const bookingId = localStorage.getItem("activeBookingId");
  const isGuestBooking = localStorage.getItem("isGuestBooking") === "true";

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [fetchError, setFetchError] = useState(false);
  const [upiQrUrl, setUpiQrUrl] = useState("");
  const [upiId, setUpiId] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");

  // ── beforeunload warning ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── UPI settings (only needed for non-members) ────────────────────────
  useEffect(() => {
    if (isMemberBooking) return;
    publicApi
      .get("/settings/public")
      .then((res) => {
        setUpiQrUrl(res.data.UPI_QR_URL || "");
        setUpiId(res.data.UPI_ID || "");
        setBookingPhone(res.data.BOOKING_PHONE || "");
      })
      .catch(() => {});
  }, [isMemberBooking]);

  // ── Fetch booking details ─────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) {
      navigate("/book-slot", { replace: true });
      return;
    }
    const fetch = async () => {
      try {
        const res = isGuestBooking
          ? await publicApi.get(`/bookings/guest/${bookingId}`)
          : await api.get(`/bookings/details/${bookingId}`);
        setBooking(res.data);
      } catch {
        setFetchError(true);
      }
    };
    fetch();
  }, [bookingId, isGuestBooking, navigate]);

  // ── Countdown timer (non-members only) ───────────────────────────────
  useEffect(() => {
    if (isMemberBooking || !booking?.expiresAt) return;
    const expiry = new Date(booking.expiresAt).getTime();
    const tick = () =>
      setTimeLeft(Math.max(0, Math.floor((expiry - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [booking?.expiresAt, isMemberBooking]);

  // ── Poll for confirmation ─────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = isGuestBooking
          ? await publicApi.get(`/bookings/guest/${bookingId}`)
          : await api.get(`/bookings/${bookingId}/status`);

        if (res.data.status === "CONFIRMED") {
          localStorage.removeItem("bookingDraft");
          localStorage.removeItem("activeBookingId");
          localStorage.removeItem("isGuestBooking");
          navigate("/booking-success", {
            replace: true,
            state: {
              bookingPublicId: bookingId,
              isGuest: isGuestBooking,
              isMember: isMemberBooking,
            },
          });
          return;
        }
      } catch {
        /* ignore */
      }
      setTimeout(poll, 5000);
    };

    // Members: start polling after 3s (no payment delay needed)
    // Non-members: start after 10s (give time to pay first)
    const delay = isMemberBooking ? 3000 : 10000;
    const timer = setTimeout(poll, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bookingId, isGuestBooking, isMemberBooking, navigate]);

  // ── Error state ───────────────────────────────────────────────────────
  if (fetchError)
    return (
      <div className="max-w-xl mx-auto mt-16 text-center">
        <p className="text-red-600 mb-4">
          Unable to load booking. Please try again.
        </p>
        <button
          onClick={() => navigate("/book-slot")}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl"
        >
          Back to Booking
        </button>
      </div>
    );

  // ── Loading state ─────────────────────────────────────────────────────
  if (!booking)
    return <div className="text-center mt-16 text-gray-500">Loading…</div>;

  // ── Expired (non-members only) ────────────────────────────────────────
  if (!isMemberBooking && timeLeft <= 0)
    return (
      <div className="max-w-xl mx-auto mt-16 bg-yellow-50 border border-yellow-300 p-8 rounded-2xl text-center space-y-4">
        <p className="text-xl font-semibold text-yellow-800">Booking Expired</p>
        <p className="text-gray-600">
          Your slot hold has expired. Please book again.
        </p>
        <button
          onClick={() => {
            localStorage.removeItem("activeBookingId");
            localStorage.removeItem("bookingDraft");
            localStorage.removeItem("isGuestBooking");
            navigate("/book-slot");
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
        >
          Book Again
        </button>
      </div>
    );

  // ── Main render ───────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto mt-12 space-y-6">
      <div className="bg-white rounded-2xl shadow p-8 space-y-6">
        <h1 className="text-2xl font-semibold text-center">
          {isMemberBooking ? "Booking Pending Approval" : "Complete Payment"}
        </h1>

        {/* Booking Summary */}
        <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
          <p>
            <strong>Date:</strong> {booking.date}
          </p>
          <p>
            <strong>Time:</strong> {booking.slot}
          </p>
          <p>
            <strong>Resource:</strong> {booking.resource}
          </p>
          {!isMemberBooking && (
            <p className="text-lg font-bold pt-2 border-t mt-2">
              Amount: ₹{booking.amount}
            </p>
          )}
        </div>

        {/* ── MEMBER: waiting for admin ── */}
        {isMemberBooking ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center space-y-3">
              <div className="flex justify-center">
                <svg
                  className="animate-spin w-8 h-8 text-blue-500"
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
              </div>
              <p className="font-semibold text-blue-900">
                Waiting for admin confirmation
              </p>
              <p className="text-sm text-blue-700">
                Go play! The admin will mark your booking as played once done.
                Your sessions will be deducted after confirmation.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              ⚠️ Keep this page open if possible — you'll be redirected
              automatically once the admin confirms. If you close it, check{" "}
              <button
                onClick={() => navigate("/my-bookings")}
                className="underline font-semibold"
              >
                My Bookings
              </button>{" "}
              later.
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Booking ID</p>
              <p className="font-mono font-bold text-gray-800 text-sm">
                {booking.bookingPublicId}
              </p>
            </div>
          </div>
        ) : (
          /* ── NON-MEMBER: UPI payment ── */
          <>
            {/* Timer */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
              <p className="text-sm text-orange-600 mb-1">Slot held for</p>
              <p className="text-3xl font-bold text-orange-600">
                {Math.floor(timeLeft / 60)}:
                {(timeLeft % 60).toString().padStart(2, "0")}
              </p>
            </div>

            {/* QR Code */}
            <div className="text-center space-y-3">
              <p className="font-semibold text-gray-800">
                Scan to Pay via PhonePe / Any UPI App
              </p>
              <div className="flex justify-center">
                <img
                  src={upiQrUrl || "/images/nca-upi-qr.png"}
                  alt="UPI QR Code"
                  className="w-52 h-52 border-4 border-blue-100 rounded-2xl"
                />
              </div>
              <p className="text-gray-600 text-sm">
                UPI ID:{" "}
                <span className="font-mono font-semibold">
                  {upiId || "Contact academy"}
                </span>
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
              <p className="font-semibold text-blue-900">
                How to confirm your slot:
              </p>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>
                  Scan the QR above and pay <strong>₹{booking.amount}</strong>
                </li>
                <li>
                  Call us at <strong>{bookingPhone || "the academy"}</strong>{" "}
                  after payment
                </li>
                <li>
                  We'll confirm your slot — this page will update automatically
                  ✅
                </li>
              </ol>
            </div>

            <p className="text-xs text-center text-gray-400">
              This page refreshes automatically once your payment is confirmed.
              Don't close it.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Payment;
