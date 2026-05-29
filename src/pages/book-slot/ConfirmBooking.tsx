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

type MemberStatus = {
  isMember: boolean;
  sessionsRemaining?: number;
  expiresOn?: string;
};

function ConfirmBooking() {
  const navigate = useNavigate();
  const location = useLocation();
  const draft = location.state as BookingDraft | null;

  const [loading, setLoading] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [error, setError] = useState("");
  const [memberStatus, setMemberStatus] = useState<MemberStatus | null>(null);

  // Guest fields
  const [guestPhone, setGuestPhone] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  // Notify fields (logged-in users)
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");

  const isLoggedIn = !!localStorage.getItem("accessToken");
  const isBowlingMachine = draft?.resource === "BOWLING_MACHINE";

  useEffect(() => {
    if (!draft) navigate("/book-slot", { replace: true });
  }, [draft, navigate]);

  // Check membership status for logged-in bowling machine bookings
  useEffect(() => {
    if (!isLoggedIn || !isBowlingMachine) return;

    setMemberLoading(true);
    api
      .get("/subscriptions/is-member")
      .then((res) => setMemberStatus(res.data))
      .catch(() => setMemberStatus({ isMember: false }))
      .finally(() => setMemberLoading(false));
  }, [isLoggedIn, isBowlingMachine]);

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

  const isMember = memberStatus?.isMember === true;
  const sessionsNeeded = ballCount === 120 ? 2 : 1;

  const handleConfirm = async () => {
    setLoading(true);
    setError("");

    try {
      let bookingId: string;

      if (isLoggedIn) {
        // Members don't need notify phone — confirmation sent automatically
        if (!isMember && (!notifyPhone || notifyPhone.length !== 10)) {
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

        // Members: booking is already confirmed, skip payment
        // Members: no payment, go to pending approval screen
        if (isMember) {
          // Go straight to success, don't wait on payment screen
          navigate("/booking-success", {
            replace: true,
            state: {
              bookingPublicId: bookingId,
              isMember: true,
            },
          });
          return;
        }

        // Non-members: save notify details, go to payment
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
              navigate("/book-slot", { state: { date, resource, slot } })
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

        {/* Member Info Card */}
        {isLoggedIn && isBowlingMachine && (
          <>
            {memberLoading ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500">
                  Checking membership…
                </span>
              </div>
            ) : isMember ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 text-lg">🏏</span>
                  <p className="font-semibold text-green-800">Active Member</p>
                </div>
                <p className="text-sm text-green-700">
                  Sessions remaining:{" "}
                  <strong>{memberStatus?.sessionsRemaining}</strong>
                  {sessionsNeeded === 2 && (
                    <span className="text-green-600">
                      {" "}
                      (2 will be deducted for 120 balls)
                    </span>
                  )}
                </p>
                <p className="text-sm text-green-700">
                  Valid till: <strong>{memberStatus?.expiresOn}</strong>
                </p>
                <div className="bg-blue-50 rounded-xl px-3 py-2 mt-1">
                  <p className="text-xs text-blue-800 font-medium">
                    🏏 No payment needed — admin will confirm after you play
                  </p>
                </div>
              </div>
            ) : (
              // AFTER
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
                💡 Not a member yet?{" "}
                <button
                  onClick={() => navigate("/my-bookings")}
                  className="underline font-semibold text-blue-800 hover:text-blue-900"
                >
                  View subscription plans
                </button>{" "}
                to book without payment every time.
              </div>
            )}
          </>
        )}

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
                placeholder="e.g. 9876543210"
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

        {/* Notify Fields — logged-in NON-members only */}
        {isLoggedIn && !isMember && (
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
                placeholder=""
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
          disabled={loading || memberLoading}
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
          {loading ? "Processing…" : "Continue →"}
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
