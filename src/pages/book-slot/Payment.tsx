import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const bookingId = localStorage.getItem("activeBookingId");
  const isGuestBooking = localStorage.getItem("isGuestBooking") === "true";

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchError, setFetchError] = useState(false);

  // ============================================
  // FETCH BOOKING DETAILS
  // ============================================
  useEffect(() => {
    if (!bookingId) {
      navigate("/book-slot", { replace: true });
      return;
    }

    const fetchBooking = async () => {
      try {
        let res;

        // ✅ CHANGED: Use correct endpoint based on booking type
        if (isGuestBooking) {
          // Guest booking - use public API
          res = await publicApi.get(`/bookings/guest/${bookingId}`);
          console.log("📦 Guest booking loaded:", res.data);
        } else {
          // User booking - use authenticated API
          res = await api.get(`/bookings/details/${bookingId}`);
          console.log("📦 User booking loaded:", res.data);
        }

        setBooking(res.data);
        setFetchError(false);
      } catch (err: any) {
        console.error("❌ Failed to load booking:", err);
        setFetchError(true);
        setError("Unable to load booking details. Please try again.");
      }
    };

    fetchBooking();
  }, [bookingId, isGuestBooking, navigate]);

  // ============================================
  // CLIENT-SIDE COUNTDOWN
  // ============================================
  useEffect(() => {
    if (!booking?.expiresAt) return;

    const expiry = new Date(booking.expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(diff);

      if (diff <= 0) {
        setError("Booking expired. Please try again.");
      }
    };

    // Update immediately
    updateTimer();

    // Then update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [booking?.expiresAt]);

  // ============================================
  // PAYMENT HANDLER
  // ============================================
  const handlePay = async () => {
    if (!booking || loading || timeLeft <= 0) return;

    setLoading(true);
    setError("");

    try {
      console.log("💳 Creating Razorpay order for:", booking.bookingPublicId);

      // ✅ Use publicApi for payment creation (works for both guest and user)
      const res = await publicApi.post(
        `/payments/razorpay/order/${booking.bookingPublicId}`,
      );

      console.log("✅ Razorpay order created:", res.data);

      openRazorpay(res.data);
    } catch (err: any) {
      console.error("❌ Payment creation failed:", err);
      setError(err.response?.data?.message || "Unable to initiate payment.");
      setLoading(false);
    }
  };

  // ============================================
  // RAZORPAY
  // ============================================
  const openRazorpay = (payment: any) => {
    if (!(window as any).Razorpay) {
      setError("Razorpay SDK not loaded. Please refresh the page.");
      setLoading(false);
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY,
      amount: payment.amount * 100,
      currency: "INR",
      name: "NCA Cricket Academy",
      description: "Slot Booking",
      order_id: payment.razorpayOrderId,

      prefill: {
        name: booking!.playerName || "",
        email: booking!.isGuest
          ? booking!.guestPhone
            ? `${booking!.guestPhone}@guest.com`
            : ""
          : "",
        contact: booking!.guestPhone || "",
      },

      handler: async (response: any) => {
        try {
          console.log("✅ Payment successful, verifying...", response);

          // ✅ Use publicApi for verification (works for both guest and user)
          await publicApi.post("/payments/razorpay/verify", {
            razorpayOrderId: payment.razorpayOrderId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });

          console.log("✅ Payment verified!");

          // Clean up
          localStorage.removeItem("bookingDraft");
          localStorage.removeItem("activeBookingId");
          localStorage.removeItem("isGuestBooking");

          // Navigate to success
          navigate("/booking-success", {
            replace: true,
            state: {
              bookingPublicId: booking!.bookingPublicId,
              isGuest: booking!.isGuest,
            },
          });
        } catch (err: any) {
          console.error("❌ Payment verification failed:", err);
          setError("Payment verification failed. Please contact support.");
          setLoading(false);
        }
      },

      modal: {
        ondismiss: () => {
          console.log("⚠️ Payment cancelled by user");
          setLoading(false);
          setError("Payment was cancelled.");
        },
      },

      theme: {
        color: "#2563eb",
      },
    };

    console.log("🚀 Opening Razorpay with options:", options);

    // @ts-expect-error Razorpay injected globally
    const rzp = new window.Razorpay(options);

    rzp.on("payment.failed", function (response: any) {
      console.error("❌ Payment failed:", response.error);
      setError(`Payment failed: ${response.error.description}`);
      setLoading(false);
    });

    rzp.open();
  };

  // ============================================
  // RENDER - FETCH ERROR
  // ============================================
  if (fetchError) {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-red-50 border border-red-300 p-6 rounded text-center">
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={() => navigate("/book-slot")}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          Back to Booking
        </button>
      </div>
    );
  }

  // ============================================
  // RENDER - LOADING
  // ============================================
  if (!booking) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center">
        <p className="text-gray-500">Loading booking details…</p>
      </div>
    );
  }

  // ============================================
  // RENDER - EXPIRED
  // ============================================
  if (timeLeft <= 0) {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-yellow-50 border border-yellow-300 p-6 rounded text-center">
        <p className="text-yellow-800 text-lg font-semibold mb-4">
          Booking Expired
        </p>
        <p className="text-gray-700 mb-6">
          Your booking has expired. Please create a new booking.
        </p>
        <button
          onClick={() => {
            localStorage.removeItem("activeBookingId");
            localStorage.removeItem("bookingDraft");
            localStorage.removeItem("isGuestBooking");
            navigate("/book-slot");
          }}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          Book Again
        </button>
      </div>
    );
  }

  // ============================================
  // RENDER - PAYMENT PAGE
  // ============================================
  return (
    <div className="max-w-xl mx-auto mt-16 bg-white p-8 rounded shadow space-y-6">
      <h1 className="text-2xl font-semibold text-center">Complete Payment</h1>

      {/* Guest Notice */}
      {booking.isGuest && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-sm text-blue-900 mb-2">
            <strong>📱 Guest Booking</strong>
          </p>
          <p className="text-sm text-blue-700">
            Booking as guest with phone: {booking.guestPhone}
          </p>
        </div>
      )}

      {/* Booking Details */}
      <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
        {booking.playerName && (
          <p>
            <strong>Name:</strong> {booking.playerName}
          </p>
        )}
        <p>
          <strong>Date:</strong> {booking.date}
        </p>
        <p>
          <strong>Time:</strong> {booking.slot}
        </p>
        <p>
          <strong>Resource:</strong> {booking.resource}
        </p>
        <p className="font-semibold text-lg pt-2 border-t">
          Amount: ₹{booking.amount}
        </p>
      </div>

      {/* Timer */}
      <div className="bg-orange-50 border border-orange-200 rounded p-4 text-center">
        <p className="text-sm text-orange-700 mb-2">Time Remaining</p>
        <p className="text-3xl font-bold text-orange-600">
          {Math.floor(timeLeft / 60)}:
          {(timeLeft % 60).toString().padStart(2, "0")}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded text-center">
          {error}
        </div>
      )}

      {/* Pay Button */}
      <button
        onClick={handlePay}
        disabled={loading || timeLeft <= 0}
        className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </span>
        ) : (
          `Pay ₹${booking.amount}`
        )}
      </button>

      <p className="text-xs text-center text-gray-500">
        🔒 Secure payment powered by Razorpay
      </p>
    </div>
  );
}

export default Payment;
