import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Zap, CheckCircle } from "lucide-react";
import api from "../../api/axios";

type Booking = {
  bookingPublicId: string;
  date: string;
  slot: string;
  resource: string;
  amount: number;
  status: "CONFIRMED" | "PENDING_PAYMENT" | "CANCELLED" | "EXPIRED";
};

type SubscriptionInfo = {
  hasMembership: boolean;
  hasQueued: boolean;
  subscription?: {
    sessionsRemaining: number;
    totalSessions: number;
    sessionsUsed: number;
    expiresOn: string;
    planMonths: number;
    sessionsPerMonth: number;
  };
  queued?: {
    totalSessions: number;
    planMonths: number;
    pricePaid: number;
  };
};

type Plan = {
  publicId: string;
  sessionsPerMonth: number;
  months: number;
  totalSessions: number;
  price: number;
  registrationFee: number;
  active: boolean;
  description: string;
};

const PAGE_SIZE = 5;

function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  const [showPlansModal, setShowPlansModal] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);

  const [filter, setFilter] = useState<"UPCOMING" | "PAST">("UPCOMING");
  const [page, setPage] = useState(1);

  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/bookings/my")
      .then((res) => setBookings(res.data))
      .catch((err) => {
        if (err?.response?.status === 401) return;
        setError("Unable to load bookings");
      })
      .finally(() => setLoading(false));

    api
      .get("/subscriptions/my")
      .then((res) => setSubInfo(res.data))
      .catch((err) => {
        if (err?.response?.status !== 401) setSubInfo(null);
      })
      .finally(() => setSubLoading(false));
  }, []);

  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await api.get("/subscriptions/plans");
      setPlans(res.data.filter((p: Plan) => p.active));
    } catch {
      // silently fail
    } finally {
      setPlansLoading(false);
    }
  };

  const handleOpenPlans = () => {
    setRequestSuccess(false);
    setShowPlansModal(true);
    loadPlans();
  };

  const handleRequestPlan = async (planPublicId: string) => {
    setRequesting(planPublicId);
    try {
      await api.post("/subscriptions/request", { planPublicId });
      setRequestSuccess(true);
      const res = await api.get("/subscriptions/my");
      setSubInfo(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to request subscription");
    } finally {
      setRequesting(null);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (filter === "UPCOMING") {
        return (
          b.status === "PENDING_PAYMENT" ||
          (b.status === "CONFIRMED" && b.date >= today)
        );
      }
      return (
        b.status === "CANCELLED" ||
        b.status === "EXPIRED" ||
        (b.status === "CONFIRMED" && b.date < today)
      );
    });
  }, [bookings, filter, today]);

  const totalPages = Math.ceil(filteredBookings.length / PAGE_SIZE);

  const pagedBookings = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, page]);

  const cancelBooking = async (bookingId: string) => {
    if (!confirm("Cancel this booking?")) return;
    try {
      await api.delete(`/bookings/${bookingId}`);
      setBookings((prev) =>
        prev.map((b) =>
          b.bookingPublicId === bookingId ? { ...b, status: "CANCELLED" } : b,
        ),
      );
    } catch {
      alert("Unable to cancel booking");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-600 mt-10">{error}</div>;
  }

  const grouped = plans.reduce(
    (acc, plan) => {
      const key = plan.sessionsPerMonth;
      if (!acc[key]) acc[key] = [];
      acc[key].push(plan);
      return acc;
    },
    {} as Record<number, Plan[]>,
  );

  const monthLabel = (m: number) =>
    m === 1 ? "1 Month" : m === 12 ? "1 Year" : `${m} Months`;

  const statusStyle = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "text-green-600";
      case "PENDING_PAYMENT":
        return "text-orange-500";
      default:
        return "text-red-500";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "Confirmed";
      case "PENDING_PAYMENT":
        return "Pending Payment";
      case "CANCELLED":
        return "Cancelled";
      case "EXPIRED":
        return "Expired";
      default:
        return status;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <h1 className="text-xl font-bold text-gray-900 mb-4">My Bookings</h1>

      {/* ── ACTIVE MEMBERSHIP CARD ── */}
      {!subLoading && subInfo?.hasMembership && subInfo.subscription && (
        <div className="mb-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-md">
          <p className="text-blue-100 text-xs font-medium uppercase tracking-wide mb-1">
            🏏 Active Membership
          </p>
          <p className="text-2xl font-bold">
            {subInfo.subscription.sessionsRemaining}{" "}
            <span className="text-base font-normal text-blue-100">
              sessions remaining
            </span>
          </p>
          <div className="flex items-center justify-between mt-2 gap-3">
            <div className="flex-1">
              <div className="w-full bg-blue-500 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all"
                  style={{
                    width: `${Math.round(
                      (subInfo.subscription.sessionsRemaining /
                        subInfo.subscription.totalSessions) *
                        100,
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-blue-200 mt-1">
                {subInfo.subscription.sessionsUsed} used · valid till{" "}
                {subInfo.subscription.expiresOn}
              </p>
            </div>
            <button
              onClick={() => navigate("/my-subscription")}
              className="shrink-0 text-xs bg-white text-blue-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
            >
              Details
            </button>
          </div>
        </div>
      )}

      {/* ── QUEUED SUBSCRIPTION ── */}
      {!subLoading && subInfo?.hasQueued && subInfo.queued && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-amber-500 text-xl mt-0.5">⏳</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              Subscription Pending Activation
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Your {subInfo.queued.totalSessions}-session /{" "}
              {subInfo.queued.planMonths}-month plan is queued. Admin will
              activate after payment verification.
            </p>
            <div className="mt-3 bg-amber-100 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-amber-800">
                📲 Next Steps:
              </p>
              <p className="text-xs text-amber-700">
                1. Pay ₹{subInfo.queued.pricePaid?.toLocaleString("en-IN")} via
                UPI/cash to the academy
              </p>
              <p className="text-xs text-amber-700">
                2. Call or WhatsApp the academy to confirm
              </p>
              <p className="text-xs text-amber-700">
                3. Admin activates within 24 hours
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── NO MEMBERSHIP NUDGE ── */}
      {!subLoading &&
        subInfo &&
        !subInfo.hasMembership &&
        !subInfo.hasQueued && (
          <div className="mb-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              🏏 Subscribe to book bowling machine slots without paying every
              time!
            </p>
            <button
              onClick={handleOpenPlans}
              className="shrink-0 text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
            >
              View Plans
            </button>
          </div>
        )}

      {/* ── FILTER TABS ── */}
      <div className="flex gap-2 mb-4">
        {(["UPCOMING", "PAST"] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
              filter === f
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            {f === "UPCOMING" ? "Upcoming" : "Past"}
          </button>
        ))}
      </div>

      {/* ── EMPTY STATE ── */}
      {filteredBookings.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm">No {filter.toLowerCase()} bookings found.</p>
        </div>
      )}

      {/* ── BOOKING CARDS ── */}
      <div className="space-y-3">
        {pagedBookings.map((b) => (
          <div
            key={b.bookingPublicId}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
          >
            {/* Top row: resource + status badge */}
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-900 text-sm">
                {b.resource}
              </p>
              <span
                className={`text-xs font-semibold ${statusStyle(b.status)}`}
              >
                {statusLabel(b.status)}
              </span>
            </div>

            {/* Date / time / amount row */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
              <span>📅 {b.date}</span>
              <span>🕐 {b.slot}</span>
              <span className="ml-auto font-semibold text-gray-800 text-sm">
                ₹{b.amount}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {b.status === "PENDING_PAYMENT" && (
                <button
                  onClick={() => {
                    localStorage.setItem("activeBookingId", b.bookingPublicId);
                    navigate("/payment");
                  }}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                >
                  Pay Now
                </button>
              )}
              {b.status === "CONFIRMED" && filter === "UPCOMING" && (
                <button
                  onClick={() => cancelBooking(b.bookingPublicId)}
                  className="flex-1 border border-red-300 text-red-500 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition"
          >
            Next
          </button>
        </div>
      )}

      {/* ── SUBSCRIPTION PLANS MODAL ── */}
      {showPlansModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50 rounded-t-2xl sticky top-0">
              <div>
                <h3 className="font-bold text-base">🏏 Membership Plans</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Book slots without paying every time
                </p>
              </div>
              <button
                onClick={() => setShowPlansModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              {requestSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-600" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">
                    Request Submitted!
                  </h4>
                  <p className="text-sm text-slate-600 mb-2">
                    Your subscription request has been received.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mt-4 space-y-1">
                    <p className="text-xs font-semibold text-amber-800">
                      📲 Next Steps:
                    </p>
                    <p className="text-xs text-amber-700">
                      1. Pay the amount to the academy via UPI/cash
                    </p>
                    <p className="text-xs text-amber-700">
                      2. Call or WhatsApp the academy to confirm
                    </p>
                    <p className="text-xs text-amber-700">
                      3. Admin activates within 24 hours
                    </p>
                    <p className="text-xs text-amber-700 font-medium">
                      You'll get a WhatsApp confirmation once activated!
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPlansModal(false)}
                    className="mt-5 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
                  >
                    Got it!
                  </button>
                </div>
              ) : plansLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p>No plans available at the moment.</p>
                  <p className="text-xs mt-1">Please contact the academy.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-xs text-blue-800">
                      <strong>ℹ️ One-time registration fee</strong> of ₹
                      {plans[0]?.registrationFee.toLocaleString("en-IN")} is
                      charged only on your first subscription. Renewals are
                      cheaper!
                    </p>
                  </div>

                  {Object.entries(grouped)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([sessions, groupPlans]) => (
                      <div key={sessions}>
                        <div className="flex items-center gap-2 mb-3">
                          <Zap size={14} className="text-blue-600" />
                          <p className="text-sm font-bold text-slate-700">
                            {sessions} Sessions / Month
                          </p>
                        </div>
                        <div className="space-y-2">
                          {groupPlans
                            .sort((a, b) => a.months - b.months)
                            .map((plan) => {
                              const firstTimeTotal =
                                plan.price + plan.registrationFee;
                              const isRequesting = requesting === plan.publicId;
                              return (
                                <div
                                  key={plan.publicId}
                                  className="border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 transition"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-bold text-slate-900">
                                        {monthLabel(plan.months)}
                                      </p>
                                      <p className="text-xs text-slate-500 mt-0.5">
                                        {plan.totalSessions} total sessions
                                      </p>
                                      {plan.description && (
                                        <p className="text-xs text-blue-600 mt-0.5 font-medium">
                                          {plan.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-3">
                                      <p className="text-xl font-bold text-blue-700">
                                        ₹{plan.price.toLocaleString("en-IN")}
                                      </p>
                                      <p className="text-xs text-slate-400">
                                        +₹
                                        {plan.registrationFee.toLocaleString(
                                          "en-IN",
                                        )}{" "}
                                        reg (1st)
                                      </p>
                                      <p className="text-xs text-slate-500 font-medium">
                                        Total: ₹
                                        {firstTimeTotal.toLocaleString("en-IN")}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() =>
                                      handleRequestPlan(plan.publicId)
                                    }
                                    disabled={!!requesting}
                                    className="mt-3 w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                  >
                                    {isRequesting ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                                        Requesting…
                                      </>
                                    ) : (
                                      "Request This Plan"
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyBookings;
