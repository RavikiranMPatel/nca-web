import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Calendar,
  Clock,
  Grid3x3,
  Home,
  List,
} from "lucide-react";
import api from "../../api/axios";
import publicApi from "../../api/publicApi";

type BookingStatusResponse = {
  bookingPublicId: string;
  status: "CONFIRMED" | "PENDING_PAYMENT" | "CANCELLED" | "EXPIRED";
  date: string;
  slot: string;
  resource: string;
  isGuest: boolean;
  playerName?: string;
  guestPhone?: string;
};

function BookingSuccess() {
  const navigate = useNavigate();
  const { state } = useLocation() as {
    state?: { bookingPublicId?: string; isGuest?: boolean };
  };

  const [booking, setBooking] = useState<BookingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isGuest = state?.isGuest || false;

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
        const apiClient = isGuest ? publicApi : api;
        const endpoint = isGuest
          ? `/bookings/guest/${bookingId}`
          : `/bookings/${bookingId}/status`;

        const res = await apiClient.get(endpoint);
        const data: BookingStatusResponse = res.data;
        setBooking(data);

        if (data.status === "CONFIRMED") {
          setLoading(false);
          return;
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

        setTimeout(poll, 3000);
      } catch {
        setLoading(false);
        setError("Unable to verify booking status.");
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [navigate, state?.bookingPublicId, isGuest]);

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="flex justify-center mb-6">
            <svg
              className="animate-spin h-16 w-16 text-blue-600"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Confirming Your Payment
          </h2>
          <p className="text-gray-600">
            Please wait while we verify your payment...
          </p>
          <p className="text-sm text-gray-500 mt-4">Don't close this page</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Booking Not Completed
          </h2>
          <p className="text-gray-600 mb-8">{error}</p>

          {isGuest ? (
            <button
              onClick={() => navigate("/book-slot")}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              Try Again
            </button>
          ) : (
            <button
              onClick={() => navigate("/my-bookings")}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              Go to My Bookings
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!booking) return null;

  // ============================================
  // SUCCESS STATE
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-12 text-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-green-100 text-lg">
              Your slot has been successfully booked
            </p>
            {booking.isGuest && (
              <p className="text-green-100 text-sm mt-2">
                Confirmation sent to: {booking.guestPhone}
              </p>
            )}
          </div>

          {/* Booking Details */}
          <div className="p-8 space-y-6">
            <div className="bg-gradient-to-br from-gray-50 to-green-50 rounded-xl p-6 space-y-4 border border-green-100">
              {/* Booking ID */}
              <div className="text-center pb-4 border-b border-green-200">
                <p className="text-sm text-gray-500">Booking ID</p>
                <p className="text-lg font-bold text-gray-900 font-mono">
                  {booking.bookingPublicId}
                </p>
              </div>

              {/* Date */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium">Date</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {formatDate(booking.date)}
                  </p>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium">Time Slot</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {booking.slot}
                  </p>
                </div>
              </div>

              {/* Resource */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Grid3x3 className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium">Resource</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {booking.resource}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="pt-4 border-t border-green-200">
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold text-lg">CONFIRMED</span>
                </div>
              </div>
            </div>

            {/* Guest Notice */}
            {booking.isGuest && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 mb-2">
                  <strong>📱 Guest Booking</strong>
                </p>
                <p className="text-sm text-blue-700 mb-3">
                  Save this booking ID:{" "}
                  <strong>{booking.bookingPublicId}</strong>
                </p>
                <p className="text-xs text-blue-600">
                  💡 Tip:{" "}
                  <a href="/signup" className="underline font-medium">
                    Create an account
                  </a>{" "}
                  to track all your bookings!
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              {!booking.isGuest && (
                <button
                  onClick={() => navigate("/my-bookings")}
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                >
                  <List className="w-5 h-5" />
                  My Bookings
                </button>
              )}

              <button
                onClick={() => navigate("/home")}
                className={`flex items-center justify-center gap-2 ${
                  booking.isGuest
                    ? "col-span-2 bg-blue-600 text-white"
                    : "border-2 border-gray-300 text-gray-700"
                } py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors`}
              >
                <Home className="w-5 h-5" />
                Go Home
              </button>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-900">
                {booking.isGuest
                  ? "SMS confirmation sent to your phone"
                  : "A confirmation email has been sent to your registered email address"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingSuccess;
