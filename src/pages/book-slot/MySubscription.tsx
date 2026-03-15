import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Zap,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  IndianRupee,
} from "lucide-react";
import api from "../../api/axios";

// ── Types ─────────────────────────────────────────────────────────────────

type Subscription = {
  publicId: string;
  status: "ACTIVE" | "QUEUED" | "EXPIRED" | "CANCELLED";
  sessionsPerMonth: number;
  planMonths: number;
  totalSessions: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  startsOn: string;
  expiresOn: string;
  pricePaid: number;
  registrationFeePaid: boolean;
};

type SubscriptionResponse = {
  hasMembership: boolean;
  hasQueued: boolean;
  subscription?: Subscription;
  queued?: Subscription;
};

type HistoryItem = {
  publicId: string;
  status: string;
  sessionsPerMonth: number;
  planMonths: number;
  totalSessions: number;
  sessionsUsed: number;
  startsOn: string;
  expiresOn: string;
  pricePaid: number;
};

// ── Component ─────────────────────────────────────────────────────────────

function MySubscription() {
  const navigate = useNavigate();

  const [subInfo, setSubInfo] = useState<SubscriptionResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subRes, histRes] = await Promise.all([
        api.get("/subscriptions/my"),
        api.get("/subscriptions/my/history"),
      ]);
      setSubInfo(subRes.data);
      setHistory(histRes.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center mt-20">
        <div
          className="w-8 h-8 border-4 border-slate-200 border-t-blue-600
                        rounded-full animate-spin"
        />
      </div>
    );
  }

  const active = subInfo?.subscription;
  const queued = subInfo?.queued;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/my-bookings")}
          className="w-9 h-9 flex items-center justify-center rounded-full
                     bg-white border border-gray-200 text-gray-600 shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Subscription</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Bowling machine membership details
          </p>
        </div>
      </div>

      {/* ── ACTIVE SUBSCRIPTION ──────────────────────────────────────── */}
      {active ? (
        <div
          className="bg-gradient-to-br from-blue-600 to-blue-700
                        rounded-2xl p-5 text-white shadow-lg"
        >
          {/* Status badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-blue-100 uppercase tracking-wide">
                Active Membership
              </span>
            </div>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
              {active.sessionsPerMonth} sessions/month
            </span>
          </div>

          {/* Sessions count */}
          <div className="mb-4">
            <p className="text-5xl font-bold">{active.sessionsRemaining}</p>
            <p className="text-blue-200 text-sm mt-1">
              sessions remaining out of {active.totalSessions} total
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-blue-200 mb-1.5">
              <span>{active.sessionsUsed} used</span>
              <span>{active.sessionsRemaining} left</span>
            </div>
            <div className="h-3 bg-blue-500 rounded-full overflow-hidden">
              <div
                className="h-3 bg-white rounded-full transition-all"
                style={{
                  width: `${Math.round(
                    (active.sessionsRemaining / active.totalSessions) * 100,
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-200 mb-1">Plan</p>
              <p className="text-sm font-semibold">
                {active.planMonths} month{active.planMonths > 1 ? "s" : ""}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-200 mb-1">Amount Paid</p>
              <p className="text-sm font-semibold">
                ₹{active.pricePaid?.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-200 mb-1">Started</p>
              <p className="text-sm font-semibold">{active.startsOn}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-200 mb-1">Valid Till</p>
              <p className="text-sm font-semibold">{active.expiresOn}</p>
            </div>
          </div>
        </div>
      ) : (
        /* No active subscription */
        <div
          className="bg-slate-50 border-2 border-dashed border-slate-200
                        rounded-2xl p-8 text-center"
        >
          <div
            className="w-14 h-14 bg-slate-100 rounded-full flex items-center
                          justify-center mx-auto mb-3"
          >
            <Zap size={24} className="text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700 mb-1">
            No Active Membership
          </p>
          <p className="text-sm text-slate-500 mb-4">
            Subscribe to book bowling machine slots without payment every time
          </p>
          <button
            onClick={() => navigate("/my-bookings")}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl
                       text-sm font-semibold hover:bg-blue-700 transition"
          >
            View Plans
          </button>
        </div>
      )}

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      {active && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">How it works</p>
          <div className="space-y-2.5">
            <HowItWorksRow
              icon={<CheckCircle size={15} className="text-green-500" />}
              text="Book any bowling machine slot — payment is automatically skipped"
            />
            <HowItWorksRow
              icon={<Zap size={15} className="text-blue-500" />}
              text="60 balls = 1 session deducted · 120 balls = 2 sessions deducted"
            />
            <HowItWorksRow
              icon={<XCircle size={15} className="text-red-400" />}
              text="Cancelling a booking restores your sessions automatically"
            />
            <HowItWorksRow
              icon={<Calendar size={15} className="text-amber-500" />}
              text="Unused sessions expire on your membership end date"
            />
          </div>
        </div>
      )}

      {/* ── QUEUED SUBSCRIPTION ──────────────────────────────────────── */}
      {queued && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              Next Plan Queued
            </p>
          </div>
          <p className="text-xs text-amber-700 mb-3">
            {queued.totalSessions} sessions · {queued.planMonths} month
            {queued.planMonths > 1 ? "s" : ""} — activates automatically when
            your current plan expires
          </p>
          <div className="bg-amber-100 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-amber-700">Amount paid</span>
            <span className="text-sm font-bold text-amber-800">
              ₹{queued.pricePaid?.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      )}

      {/* ── SUBSCRIPTION HISTORY ─────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowHistory((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-3.5
                       hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-2">
              <IndianRupee size={15} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">
                Subscription History
              </span>
              <span
                className="text-xs bg-slate-100 text-slate-500
                               px-2 py-0.5 rounded-full"
              >
                {history.length}
              </span>
            </div>
            {showHistory ? (
              <ChevronUp size={16} className="text-slate-400" />
            ) : (
              <ChevronDown size={16} className="text-slate-400" />
            )}
          </button>

          {showHistory && (
            <div className="border-t border-slate-100 divide-y divide-slate-100">
              {history.map((item) => (
                <div
                  key={item.publicId}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <StatusBadge status={item.status} />
                      <p className="text-xs text-slate-500">
                        {item.sessionsPerMonth} sessions × {item.planMonths}mo
                      </p>
                    </div>
                    <p className="text-xs text-slate-400">
                      {item.startsOn || "—"} → {item.expiresOn || "—"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Used {item.sessionsUsed} of {item.totalSessions} sessions
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-700">
                      ₹{item.pricePaid?.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Book a slot CTA */}
      {active && (
        <button
          onClick={() => navigate("/book-slot")}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl
                     font-bold text-base hover:bg-blue-700 transition shadow-md"
        >
          🏏 Book a Slot Now
        </button>
      )}
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────

function HowItWorksRow({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <p className="text-xs text-slate-600">{text}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    QUEUED: "bg-amber-100 text-amber-700",
    EXPIRED: "bg-slate-100 text-slate-500",
    CANCELLED: "bg-red-100 text-red-600",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? "bg-slate-100 text-slate-500"}`}
    >
      {status}
    </span>
  );
}

export default MySubscription;
