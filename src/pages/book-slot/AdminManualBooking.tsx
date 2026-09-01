import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

type GuestSuggestion = {
  name: string;
  phone: string;
  email: string;
};


const RESOURCES = ["TURF", "ASTRO", "BOWLING_MACHINE"] as const;
type ResourceKey = (typeof RESOURCES)[number];

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  TURF:            "Turf",
  ASTRO:           "Astro Turf",
  BOWLING_MACHINE: "Bowling Machine",
};

const PAYMENT_MODES = [
  { value: "PHONE_PE", label: "PhonePe" },
  { value: "GOOGLE_PAY", label: "Google Pay" },
  { value: "CASH", label: "Cash" },
  { value: "ONLINE", label: "Online / Bank Transfer" },
  { value: "OTHER", label: "Other" },
];


// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (t: string) => t.substring(0, 5);
const fmt12 = (t: string): string => {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${period}`;
};
const today = () => new Date().toLocaleDateString("en-CA");

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminManualBooking() {
  const navigate = useNavigate();


  // ── Mode B — past session fields ──────────────────────────────────────────
  const [pastDate, setPastDate] = useState(today());
  const [pastTime, setPastTime] = useState("");
  const [pastResource, setPastResource] = useState("");
  const [pastSlots, setPastSlots] = useState<
    {
      startTime: string;
      endTime: string;
      price: number;
      price60Balls: number | null;
      price120Balls: number | null;
      price180Balls: number | null;
      price240Balls: number | null;
    }[]
  >([]);
  const [pastSlotsLoading, setPastSlotsLoading] = useState(false);
  // ── NEW: past session extra fields ──
  const [pastBallCount, setPastBallCount] = useState<60 | 120 | 180 | 240 | null>(null);
  const [pastAmount, setPastAmount] = useState("");
  const [pastPaymentMode, setPastPaymentMode] = useState("CASH");


  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestSuggestions, setGuestSuggestions] = useState<GuestSuggestion[]>([]);
  const [guestSearchLoading, setGuestSearchLoading] = useState(false);
  const [guestBookerPicked, setGuestBookerPicked] = useState(false);

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  // ── Reset past ball count + amount when resource changes in past mode ─────
  useEffect(() => {
    setPastBallCount(null);
    setPastAmount("");
    setPastTime("");
  }, [pastResource]);

  // ── Auto-fill past amount from slot price when ball count selected ─────────
  useEffect(() => {
    if (!pastBallCount || pastSlots.length === 0 || !pastTime) return;
    const slot = pastSlots.find((s) => s.startTime + ":00" === pastTime);
    if (!slot) return;
    const priceMap: Record<60 | 120 | 180 | 240, number | null> = {
      60:  slot.price60Balls,
      120: slot.price120Balls,
      180: slot.price180Balls,
      240: slot.price240Balls,
    };
    const price = priceMap[pastBallCount];
    if (price) setPastAmount(String(price));
  }, [pastBallCount, pastTime, pastSlots]);

  // ── Fetch past slots ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!pastDate || !pastResource) {
      setPastSlots([]);
      setPastBallCount(null);
      setPastAmount("");
      setPastTime("");
      return;
    }
    const run = async () => {
      setPastSlotsLoading(true);
      try {
        const res = await api.get("/slot/availability", {
          params: { date: pastDate, resourceType: pastResource },
        });
        if (res.data.slots?.length) {
          setPastSlots(
            res.data.slots.map((s: any) => ({
              startTime: fmt(s.startTime),
              endTime: fmt(s.endTime),
              price: s.price,
              price60Balls: s.price60Balls ?? null,
              price120Balls: s.price120Balls ?? null,
              price180Balls: s.price180Balls ?? null,
              price240Balls: s.price240Balls ?? null,
            })),
          );
        } else {
          setPastSlots([]);
        }
      } catch {
        setPastSlots([]);
      } finally {
        setPastSlotsLoading(false);
      }
    };
    run();
  }, [pastDate, pastResource]);

  // ── Auto-fill amount when time selected (non-bowling) ─────────────────────
  useEffect(() => {
    if (!pastTime || pastResource === "BOWLING_MACHINE") return;
    const slot = pastSlots.find((s) => s.startTime + ":00" === pastTime);
    if (slot?.price) setPastAmount(String(slot.price));
  }, [pastTime, pastSlots, pastResource]);

  // ── Guest booker search (past walk-ins) ───────────────────────────────────
  const searchGuestBookers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setGuestSuggestions([]);
      return;
    }
    setGuestSearchLoading(true);
    try {
      const res = await api.get("/bookings/admin/guest-bookers/search", { params: { q } });
      setGuestSuggestions(res.data || []);
    } catch {
      setGuestSuggestions([]);
    } finally {
      setGuestSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (guestBookerPicked) return;
    const t = setTimeout(() => searchGuestBookers(guestName), 300);
    return () => clearTimeout(t);
  }, [guestName, guestBookerPicked, searchGuestBookers]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      // isPastSession / isGuest / userId / paymentStatus were retired with the
      // Upcoming mode — every manual booking is now a past session, guest-booked and
      // CONFIRMED, and the backend no longer reads those fields.
      const payload: Record<string, any> = {
        date: pastDate,
        startTime: pastTime,
        resourceType: pastResource,
        guestName,
        guestPhone,
        notes,
        ...(pastResource === "BOWLING_MACHINE" && pastBallCount
          ? { ballCount: pastBallCount }
          : {}),
        ...(pastAmount ? { amount: parseFloat(pastAmount) } : {}),
        paymentMode: pastPaymentMode,
      };

      await api.post("/bookings/admin/manual", payload);
      setSuccess(true);
    } catch (e: any) {
      setSubmitError(e.response?.data?.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const pastValid =
    !!pastDate &&
    !!pastTime &&
    !!pastResource &&
    guestName.trim().length > 1 &&
    guestPhone.trim().length >= 10 &&
    (pastResource !== "BOWLING_MACHINE" || pastBallCount !== null) &&
    !!pastAmount &&
    !!pastPaymentMode;

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-6 px-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-4xl">
          ✅
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Session Recorded!</h2>
        <p className="text-gray-500">
          Past session recorded for <strong>{guestName}</strong> on{" "}
          <strong>{pastDate}</strong> ({pastResource} ·{" "}
          {pastTime.substring(0, 5)}){pastAmount && <> · ₹{pastAmount}</>}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setSuccess(false);
              setGuestName("");
              setGuestPhone("");
              setGuestSuggestions([]);
              setGuestBookerPicked(false);
              setNotes("");
              setPastDate("");
              setPastTime("");
              setPastResource("");
              setPastSlots([]);
              setPastBallCount(null);
              setPastAmount("");
              setPastPaymentMode("CASH");
            }}
            className="px-5 py-2.5 rounded-xl border border-gray-300 font-medium hover:bg-gray-50 transition"
          >
            + Record Another
          </button>
          <button
            onClick={() => navigate("/admin/bookings")}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            View All Bookings →
          </button>
        </div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate("/admin/bookings")}
            className="text-sm text-blue-600 hover:underline mb-1 flex items-center gap-1"
          >
            ← Back to All Bookings
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Record Past Session</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Log a session that already happened, for a walk-in or a caller
          </p>
        </div>

      </div>

      {/* ── Past session form ─────────────────────────────────────────────────── */}
      <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            ⚠️ Recording a past session — booking will be saved as{" "}
            <strong>Confirmed</strong> regardless of payment status.
          </div>

          {/* Session details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <p className="font-semibold text-gray-900">Session Details</p>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={pastDate}
                  max={today()}
                  onChange={(e) => setPastDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Resource */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RESOURCES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setPastResource(r)}
                      className={`px-3 py-2.5 rounded-xl border font-semibold text-sm transition-all text-center leading-tight ${pastResource === r ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:bg-gray-50"}`}
                    >
                      {RESOURCE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ball count — bowling machine only */}
              {pastResource === "BOWLING_MACHINE" && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(
                      [
                        { b: 60,  label: "15 mins · 1 session" },
                        { b: 120, label: "30 mins · 2 sessions" },
                        { b: 180, label: "45 mins · 3 sessions" },
                        { b: 240, label: "60 mins · 4 sessions" },
                      ] as const
                    ).map(({ b, label }) => (
                      <button
                        key={b}
                        onClick={() => setPastBallCount(b)}
                        className={`py-3 rounded-xl border-2 text-center transition ${pastBallCount === b ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
                      >
                        <p
                          className={`text-lg font-bold ${pastBallCount === b ? "text-blue-700" : "text-gray-800"}`}
                        >
                          {b} balls
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                {!pastResource || !pastDate ? (
                  <p className="text-xs text-gray-400 mt-1">
                    Select date and resource first
                  </p>
                ) : pastSlotsLoading ? (
                  <p className="text-xs text-gray-400 mt-1">Loading slots…</p>
                ) : (
                  <select
                    value={pastTime}
                    onChange={(e) => setPastTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select time</option>
                    {pastSlots.map((s) => (
                      <option key={s.startTime} value={s.startTime + ":00"}>
                        {fmt12(s.startTime)} – {fmt12(s.endTime)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹) *
                  <span className="text-xs text-gray-400 font-normal ml-1">
                    auto-filled from slot price
                  </span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={pastAmount}
                  onChange={(e) => setPastAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Payment Mode */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Mode *
                </label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_MODES.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setPastPaymentMode(m.value)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${pastPaymentMode === m.value ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Booker details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <p className="font-semibold text-gray-900">Booker Details</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rohit Sharma"
                  value={guestName}
                  onChange={(e) => {
                    setGuestName(e.target.value);
                    setGuestBookerPicked(false);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {guestName.length >= 2 && !guestBookerPicked && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-auto">
                    {guestSearchLoading ? (
                      <p className="px-4 py-3 text-sm text-gray-400">Searching…</p>
                    ) : guestSuggestions.length === 0 ? null : (
                      guestSuggestions.map((g, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setGuestName(g.name);
                            setGuestPhone(g.phone);
                            setGuestSuggestions([]);
                            setGuestBookerPicked(true);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b border-gray-100 last:border-0"
                        >
                          <p className="text-sm font-semibold text-gray-900">{g.name}</p>
                          <p className="text-xs text-gray-500">{g.phone}{g.email ? ` · ${g.email}` : ""}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${guestPhone.length > 0 && guestPhone.trim().length < 10 ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                />
                {guestPhone.length > 0 && guestPhone.trim().length < 10 && (
                  <p className="text-xs text-red-500 mt-1">
                    Enter a valid 10-digit phone number (
                    {guestPhone.trim().length}/10)
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Notes (optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Player came in without prior booking…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Summary preview */}
          {pastAmount && pastPaymentMode && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 space-y-1">
              <p className="font-semibold text-slate-800">Session Summary</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
                {pastDate && <span>📅 {pastDate}</span>}
                {pastResource && <span>🏏 {RESOURCE_LABELS[pastResource as ResourceKey] ?? pastResource}</span>}
                {pastTime && <span>🕐 {fmt12(pastTime)}</span>}
                {pastResource === "BOWLING_MACHINE" && pastBallCount && (
                  <span>🎯 {pastBallCount} balls</span>
                )}
                {pastAmount && (
                  <span>₹{parseFloat(pastAmount).toLocaleString("en-IN")}</span>
                )}
                {pastPaymentMode && (
                  <span>
                    💳{" "}
                    {
                      PAYMENT_MODES.find((m) => m.value === pastPaymentMode)
                        ?.label
                    }
                  </span>
                )}
              </div>
            </div>
          )}

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              disabled={!pastValid || submitting}
              onClick={handleSubmit}
              className="px-7 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-sm disabled:opacity-40 flex items-center gap-2"
            >
              {submitting && (
                <svg
                  className="animate-spin w-4 h-4"
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
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
              )}
              {submitting ? "Saving…" : "✅ Record Session"}
            </button>
          </div>
        </div>

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

