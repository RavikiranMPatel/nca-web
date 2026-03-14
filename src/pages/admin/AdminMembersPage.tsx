import { useEffect, useState } from "react";
import api from "../../api/axios";
import { toast } from "react-hot-toast";
import {
  Users,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Calendar,
  Activity,
  IndianRupee,
  Send,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

type ActiveSubscriber = {
  publicId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  sessionsPerMonth: number;
  planMonths: number;
  totalSessions: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  startsOn: string;
  expiresOn: string;
  pricePaid: number;
  registrationFeePaid: boolean;
  activatedBy: string;
  notes: string;
  status: string;
};

type NonSubscriber = {
  userId: string;
  name: string;
  email: string;
  phone: string;
  bookingCount: number;
  lastBookingAt: string;
  totalSpent: number;
};

type GuestBooker = {
  phone: string;
  name: string;
  email: string;
  bookingCount: number;
  lastBookingAt: string;
  totalSpent: number;
};

type Tab = "ACTIVE" | "QUEUED" | "NON_SUBSCRIBERS" | "GUESTS";

// ── Main Component ────────────────────────────────────────────────────────

function AdminMembersPage() {
  const [activeTab, setActiveTab] = useState<Tab>("ACTIVE");

  const [activeSubscribers, setActiveSubscribers] = useState<
    ActiveSubscriber[]
  >([]);
  const [nonSubscribers, setNonSubscribers] = useState<NonSubscriber[]>([]);
  const [guests, setGuests] = useState<GuestBooker[]>([]);

  const [queuedSubscriptions, setQueuedSubscriptions] = useState<
    ActiveSubscriber[]
  >([]);
  const [loadingQueued, setLoadingQueued] = useState(false);

  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingNonSub, setLoadingNonSub] = useState(false);
  const [loadingGuests, setLoadingGuests] = useState(false);

  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Fetch active subscribers on mount ──────────────────────────────────
  useEffect(() => {
    fetchActive();
    fetchQueued();
  }, []);

  // ── Fetch on tab switch ─────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "NON_SUBSCRIBERS" && nonSubscribers.length === 0) {
      fetchNonSubscribers();
    }
    if (activeTab === "GUESTS" && guests.length === 0) {
      fetchGuests();
    }
  }, [activeTab]);

  const fetchActive = async () => {
    setLoadingActive(true);
    try {
      const res = await api.get("/admin/subscriptions/active");
      setActiveSubscribers(res.data);
    } catch {
      toast.error("Failed to load active subscribers");
    } finally {
      setLoadingActive(false);
    }
  };

  const fetchQueued = async () => {
    setLoadingQueued(true);
    try {
      const res = await api.get("/admin/subscriptions/queued");
      setQueuedSubscriptions(res.data);
    } catch {
      toast.error("Failed to load queued subscriptions");
    } finally {
      setLoadingQueued(false);
    }
  };

  const fetchNonSubscribers = async () => {
    setLoadingNonSub(true);
    try {
      const res = await api.get("/admin/subscriptions/members/non-subscribers");
      setNonSubscribers(res.data);
    } catch {
      toast.error("Failed to load non-subscribers");
    } finally {
      setLoadingNonSub(false);
    }
  };

  const fetchGuests = async () => {
    setLoadingGuests(true);
    try {
      const res = await api.get("/admin/subscriptions/members/guests");
      setGuests(res.data);
    } catch {
      toast.error("Failed to load guest bookers");
    } finally {
      setLoadingGuests(false);
    }
  };

  const handleInvite = async (userId: string, name: string) => {
    setInvitingId(userId);
    try {
      await api.post("/admin/subscriptions/members/invite", {
        userPublicId: userId,
      });
      toast.success(`Invite sent to ${name}`);
    } catch {
      toast.error("Failed to send invite");
    } finally {
      setInvitingId(null);
    }
  };

  const handleCancelSubscription = async (publicId: string) => {
    const notes = window.prompt("Reason for cancellation (optional):");
    if (notes === null) return; // cancelled prompt

    try {
      await api.post(`/admin/subscriptions/${publicId}/cancel`, { notes });
      toast.success("Subscription cancelled");
      fetchActive();
    } catch {
      toast.error("Failed to cancel subscription");
    }
  };

  const handleActivate = async (publicId: string, name: string) => {
    if (
      !confirm(
        `Activate subscription for ${name}? Make sure payment has been received.`,
      )
    )
      return;
    try {
      await api.post(`/admin/subscriptions/${publicId}/activate`);
      toast.success(`Subscription activated for ${name}!`);
      fetchActive();
      fetchQueued();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to activate");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ── Tab counts ──────────────────────────────────────────────────────────
  const tabs: {
    key: Tab;
    label: string;
    count: number;
    icon: any;
    color: string;
  }[] = [
    {
      key: "ACTIVE",
      label: "Active Subscribers",
      count: activeSubscribers.length,
      icon: UserCheck,
      color: "green",
    },
    {
      key: "QUEUED",
      label: "Pending Activation",
      count: queuedSubscriptions.length,
      icon: Clock,
      color: "amber",
    },
    {
      key: "NON_SUBSCRIBERS",
      label: "Logged-in (No Plan)",
      count: nonSubscribers.length,
      icon: Users,
      color: "amber",
    },
    {
      key: "GUESTS",
      label: "Guests",
      count: guests.length,
      icon: UserX,
      color: "blue",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Bowling Machine Members
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage subscribers, logged-in users, and guest bookers
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const colorMap: Record<string, string> = {
            green: isActive
              ? "bg-green-600 text-white border-green-600"
              : "border-slate-200 text-slate-600 hover:border-green-300",
            amber: isActive
              ? "bg-amber-500 text-white border-amber-500"
              : "border-slate-200 text-slate-600 hover:border-amber-300",
            blue: isActive
              ? "bg-blue-600 text-white border-blue-600"
              : "border-slate-200 text-slate-600 hover:border-blue-300",
          };

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border
                          text-sm font-medium transition ${colorMap[tab.color]}`}
            >
              <Icon size={15} />
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                  ${isActive ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: ACTIVE SUBSCRIBERS ──────────────────────────────────── */}
      {activeTab === "ACTIVE" && (
        <>
          {loadingActive ? (
            <Spinner />
          ) : activeSubscribers.length === 0 ? (
            <EmptyState
              icon={<UserCheck size={40} className="text-slate-300" />}
              message="No active subscribers yet"
            />
          ) : (
            <div className="space-y-3">
              {activeSubscribers.map((sub) => {
                const isExpanded = expandedId === sub.publicId;
                const pct = Math.round(
                  (sub.sessionsRemaining / sub.totalSessions) * 100,
                );

                return (
                  <div
                    key={sub.publicId}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                  >
                    {/* Card Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer
                                 hover:bg-slate-50 transition"
                      onClick={() => toggleExpand(sub.publicId)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full bg-green-100 flex items-center
                                        justify-center text-green-700 font-bold text-sm"
                        >
                          {sub.userName.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {sub.userName || "—"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {sub.userEmail}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Sessions pill */}
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-bold text-slate-900">
                            {sub.sessionsRemaining}
                            <span className="text-slate-400 font-normal">
                              /{sub.totalSessions}
                            </span>
                          </p>
                          <p className="text-xs text-slate-500">
                            sessions left
                          </p>
                        </div>

                        {/* Progress bar */}
                        <div className="w-20 hidden sm:block">
                          <div className="h-2 bg-slate-100 rounded-full">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                pct > 50
                                  ? "bg-green-500"
                                  : pct > 20
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 text-right">
                            {pct}%
                          </p>
                        </div>

                        {/* Expiry */}
                        <div className="text-right hidden md:block">
                          <p className="text-xs text-slate-500">Expires</p>
                          <p className="text-sm font-medium text-slate-700">
                            {sub.expiresOn}
                          </p>
                        </div>

                        {isExpanded ? (
                          <ChevronUp size={16} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <InfoTile
                            icon={<Phone size={13} />}
                            label="Phone"
                            value={sub.userPhone || "—"}
                          />
                          <InfoTile
                            icon={<Activity size={13} />}
                            label="Plan"
                            value={`${sub.sessionsPerMonth} sessions × ${sub.planMonths} months`}
                          />
                          <InfoTile
                            icon={<IndianRupee size={13} />}
                            label="Paid"
                            value={`₹${sub.pricePaid?.toLocaleString("en-IN")}`}
                          />
                          <InfoTile
                            icon={<Calendar size={13} />}
                            label="Started"
                            value={sub.startsOn}
                          />
                        </div>

                        {sub.activatedBy && (
                          <p className="text-xs text-slate-400">
                            Activated by: {sub.activatedBy}
                          </p>
                        )}

                        {sub.notes && (
                          <p className="text-xs text-slate-500 italic">
                            Note: {sub.notes}
                          </p>
                        )}

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() =>
                              handleCancelSubscription(sub.publicId)
                            }
                            className="text-xs px-3 py-1.5 border border-red-300
                                       text-red-600 rounded-lg hover:bg-red-50 transition"
                          >
                            Cancel Subscription
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── TAB: QUEUED / PENDING ACTIVATION ─────────────────────────── */}
      {activeTab === "QUEUED" && (
        <>
          {loadingQueued ? (
            <Spinner />
          ) : queuedSubscriptions.length === 0 ? (
            <EmptyState
              icon={<Clock size={40} className="text-slate-300" />}
              message="No pending subscriptions"
            />
          ) : (
            <div className="space-y-3">
              {queuedSubscriptions.map((sub) => (
                <div
                  key={sub.publicId}
                  className="bg-white rounded-xl border border-amber-200 p-4
                       flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full bg-amber-100 flex items-center
                              justify-center text-amber-700 font-bold text-sm shrink-0"
                    >
                      {sub.userName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {sub.userName || "—"}
                      </p>
                      <p className="text-xs text-slate-500">{sub.userEmail}</p>
                      {sub.userPhone && (
                        <p className="text-xs text-slate-500">
                          {sub.userPhone}
                        </p>
                      )}
                      <p className="text-xs text-amber-600 font-medium mt-0.5">
                        {sub.sessionsPerMonth} sessions × {sub.planMonths} month
                        {sub.planMonths > 1 ? "s" : ""} · {sub.totalSessions}{" "}
                        total
                      </p>
                      <p className="text-xs text-slate-500">
                        Amount to collect: ₹
                        {sub.pricePaid?.toLocaleString("en-IN")}
                        {sub.registrationFeePaid && (
                          <span className="text-amber-600">
                            {" "}
                            (incl. reg. fee)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleActivate(sub.publicId, sub.userName)}
                    className="shrink-0 flex items-center gap-1.5 text-xs bg-green-600
                         text-white px-4 py-2 rounded-lg hover:bg-green-700
                         transition font-semibold"
                  >
                    <UserCheck size={13} />
                    Activate
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: LOGGED-IN NON-SUBSCRIBERS ──────────────────────────── */}
      {activeTab === "NON_SUBSCRIBERS" && (
        <>
          {loadingNonSub ? (
            <Spinner />
          ) : nonSubscribers.length === 0 ? (
            <EmptyState
              icon={<Users size={40} className="text-slate-300" />}
              message="No logged-in users without subscription"
            />
          ) : (
            <div className="space-y-3">
              {nonSubscribers.map((user) => (
                <div
                  key={user.userId}
                  className="bg-white rounded-xl border border-slate-200 p-4
                             flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full bg-amber-100 flex items-center
                                    justify-center text-amber-700 font-bold text-sm shrink-0"
                    >
                      {user.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {user.name || "—"}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {user.phone && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Phone size={11} /> {user.phone}
                          </span>
                        )}
                        {user.email && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Mail size={11} /> {user.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-slate-900">
                        {user.bookingCount}
                      </p>
                      <p className="text-xs text-slate-500">bookings</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-slate-900">
                        ₹{user.totalSpent?.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-slate-500">spent</p>
                    </div>
                    <button
                      onClick={() => handleInvite(user.userId, user.name)}
                      disabled={invitingId === user.userId}
                      className="flex items-center gap-1.5 text-xs bg-blue-600 text-white
                                 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {invitingId === user.userId ? (
                        <div
                          className="w-3 h-3 border-2 border-white border-t-transparent
                                        rounded-full animate-spin"
                        />
                      ) : (
                        <Send size={11} />
                      )}
                      Invite
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB 3: GUESTS ─────────────────────────────────────────────── */}
      {activeTab === "GUESTS" && (
        <>
          {loadingGuests ? (
            <Spinner />
          ) : guests.length === 0 ? (
            <EmptyState
              icon={<UserX size={40} className="text-slate-300" />}
              message="No guest bowling machine bookings yet"
            />
          ) : (
            <div className="space-y-3">
              {guests.map((guest) => (
                <div
                  key={guest.phone}
                  className="bg-white rounded-xl border border-slate-200 p-4
                             flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full bg-blue-100 flex items-center
                                    justify-center text-blue-700 font-bold text-sm shrink-0"
                    >
                      {guest.name?.charAt(0)?.toUpperCase() || "G"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {guest.name || "Guest"}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Phone size={11} /> {guest.phone}
                        </span>
                        {guest.email && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Mail size={11} /> {guest.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-slate-900">
                        {guest.bookingCount}
                      </p>
                      <p className="text-xs text-slate-500">bookings</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-slate-900">
                        ₹{guest.totalSpent?.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-slate-500">spent</p>
                    </div>
                    <span
                      className="text-xs bg-slate-100 text-slate-500
                                     px-2 py-1 rounded-lg font-medium"
                    >
                      Guest
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Small reusable components ─────────────────────────────────────────────

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-lg p-3 border border-slate-100">
      <div className="flex items-center gap-1 text-slate-400 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div
        className="w-8 h-8 border-4 border-slate-200 border-t-blue-600
                      rounded-full animate-spin"
      />
    </div>
  );
}

function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div
      className="text-center py-16 bg-slate-50 rounded-xl border-2
                    border-dashed border-slate-200"
    >
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-slate-500 font-medium">{message}</p>
    </div>
  );
}

export default AdminMembersPage;
