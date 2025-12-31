import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

type BookingDetails = {
  bookingPublicId: string;
  playerName: string;
  date: string;
  slot: string;
  resource: string;
  amount: number;
  expiresAt: string;
};

function Payment() {
  const navigate = useNavigate();
  const bookingId = localStorage.getItem("activeBookingId");

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---------------- FETCH BOOKING ----------------
  useEffect(() => {
    if (!bookingId) {
      navigate("/book-slot", { replace: true });
      return;
    }

    api
      .get(`/bookings/details/${bookingId}`)
      .then((res) => setBooking(res.data))
      .catch(() =>
        setError("Unable to load booking. Please try again.")
      );
  }, [bookingId, navigate]);

  // ---------------- COUNTDOWN ----------------
  useEffect(() => {
    if (!booking?.expiresAt) return;

    const expiry = new Date(booking.expiresAt).getTime();

    const interval = setInterval(() => {
      const diff = Math.max(
        0,
        Math.floor((expiry - Date.now()) / 1000)
      );
      setTimeLeft(diff);
      if (diff <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [booking?.expiresAt]);

  // ---------------- PAY ----------------
  const handlePay = async () => {
    if (!booking || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await api.post(
        `/payments/razorpay/order/${booking.bookingPublicId}`
      );

      openRazorpay(res.data);
    } catch {
      setError("Unable to initiate payment.");
      setLoading(false);
    }
  };

  // ---------------- RAZORPAY ----------------
  const openRazorpay = (payment: any) => {
    if (!(window as any).Razorpay) {
      setError("Razorpay SDK not loaded.");
      setLoading(false);
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY,
      amount: payment.amount * 100,
      currency: "INR",
      name: "NextGen Cricket Academy",
      description: "Slot Booking",
      order_id: payment.razorpayOrderId,

      handler: async (response: any) => {
        try {
          // ✅ VERIFY PAYMENT
          await api.post("/payments/razorpay/verify", {
            razorpayOrderId: payment.razorpayOrderId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });

          localStorage.removeItem("bookingDraft");
          localStorage.removeItem("activeBookingId");

          navigate("/booking-success", {
            replace: true,
            state: { bookingPublicId: booking!.bookingPublicId },
          });
        } catch {
          setError("Payment verification failed.");
          setLoading(false);
        }
      },

      modal: {
        ondismiss: () => {
          setLoading(false);
          setError("Payment was cancelled.");
        },
      },
    };

    // @ts-expect-error Razorpay injected globally
    new window.Razorpay(options).open();
  };

  // ---------------- UI ----------------
  if (error) return <div className="text-red-600">{error}</div>;
  if (!booking) return <div>Loading booking…</div>;

  if (timeLeft <= 0)
    return (
      <div className="text-center">
        Booking expired.
        <button onClick={() => navigate("/book-slot")}>
          Book Again
        </button>
      </div>
    );

  return (
    <div className="max-w-xl mx-auto mt-16 bg-white p-8 rounded shadow space-y-6">
      <h1 className="text-2xl font-semibold text-center">
        Complete Payment
      </h1>

      <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
        <p><strong>Player:</strong> {booking.playerName}</p>
        <p><strong>Date:</strong> {booking.date}</p>
        <p><strong>Time:</strong> {booking.slot}</p>
        <p><strong>Resource:</strong> {booking.resource}</p>
        <p className="font-semibold">Amount: ₹{booking.amount}</p>
      </div>

      <div className="text-orange-600 text-center">
        ⏳ {Math.floor(timeLeft / 60)}:
        {(timeLeft % 60).toString().padStart(2, "0")}
      </div>

      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full bg-green-600 text-white py-3 rounded"
      >
        {loading ? "Opening payment…" : `Pay ₹${booking.amount}`}
      </button>
    </div>
  );
}

export default Payment;
