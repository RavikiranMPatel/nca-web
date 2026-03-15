import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

type Slot = {
  time: string;
  slotId: string;
  availableCount: number;
  price: number;
  price60Balls: number | null;
  price120Balls: number | null;
  slotType: "MORNING" | "AFTERNOON" | "EVENING";
  lightsRequired: boolean;
};

type UserSuggestion = {
  publicId: string;
  name: string;
  phone: string;
  email: string;
};

type BookerType = "REGISTERED" | "GUEST";
type PaymentStatus = "CONFIRMED" | "PENDING_PAYMENT";

const RESOURCES = ["TURF", "ASTRO", "BOWLING_MACHINE"];

const SLOT_GROUPS = [
  { key: "MORNING", label: "☀️ Morning", sub: "Before 12 PM" },
  { key: "AFTERNOON", label: "🌤️ Afternoon", sub: "12 PM – 5 PM" },
  { key: "EVENING", label: "🌙 Evening", sub: "After 5 PM" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (t: string) => t.substring(0, 5);

const today = () => new Date().toLocaleDateString("en-CA");

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminManualBooking() {
  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [mode, setMode] = useState<"FUTURE" | "PAST">("FUTURE");

  // Mode B — past session fields
  const [pastDate, setPastDate] = useState("");
  const [pastTime, setPastTime] = useState("");
  const [pastResource, setPastResource] = useState("");
  const [pastSlots, setPastSlots] = useState<
    { startTime: string; endTime: string }[]
  >([]);
  const [pastSlotsLoading, setPastSlotsLoading] = useState(false);
  // Step 1 – slot selection
  const [date, setDate] = useState(today());
  const [resource, setResource] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [closedMsg, setClosedMsg] = useState("");

  // Step 2 – booker details
  const [bookerType, setBookerType] = useState<BookerType>("GUEST");

  // Registered user search
  const [userSearch, setUserSearch] = useState("");
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Guest fields
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  // Step 3 – confirm
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("CONFIRMED");
  const [ballCount, setBallCount] = useState<60 | 120 | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  // Reset ball count when resource changes
  useEffect(() => {
    setBallCount(null);
    setSelectedSlot(null);
    setSlots([]);
  }, [resource]);

  // Fetch past slots when date + resource selected in Mode B
  useEffect(() => {
    if (mode !== "PAST" || !pastDate || !pastResource) {
      setPastSlots([]);
      setBallCount(null);
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
  }, [mode, pastDate, pastResource]);

  // ── Fetch slots ──────────────────────────────────────────────────────────────

  // Reset slots and selection when ball count changes
  useEffect(() => {
    setSlots([]);
    setSelectedSlot(null);
    setSlotsError("");
    setClosedMsg("");
  }, [ballCount]);

  useEffect(() => {
    if (!date || !resource) {
      setSlots([]);
      setSlotsError("");
      setClosedMsg("");
      return;
    }

    // Don't fetch for bowling machine until ball count selected
    if (resource === "BOWLING_MACHINE" && !ballCount) {
      setSlots([]);
      return;
    }

    const run = async () => {
      setSlotsLoading(true);
      setSlotsError("");
      setClosedMsg("");
      setSelectedSlot(null);
      try {
        const res =
          resource === "BOWLING_MACHINE"
            ? await api.get("/slot/bowling/availability", {
                params: { date, ballCount },
              })
            : await api.get("/slot/availability", {
                params: { date, resourceType: resource },
              });
        if (!res.data.available) {
          setClosedMsg(res.data.message || "Facility closed");
          setSlots([]);
          return;
        }
        if (!res.data.slots?.length) {
          setSlotsError("No slots available");
          setSlots([]);
          return;
        }

        setSlots(
          res.data.slots.map((s: any) => ({
            time: `${fmt(s.startTime)} - ${fmt(s.endTime)}`,
            slotId: s.slotId,
            availableCount: s.availableCount,
            price:
              resource === "BOWLING_MACHINE"
                ? ballCount === 60
                  ? s.price60Balls
                  : s.price120Balls
                : s.price,
            price60Balls: s.price60Balls ?? null,
            price120Balls: s.price120Balls ?? null,
            slotType: s.slotType,
            lightsRequired: s.lightsRequired,
          })),
        );
      } catch (e: any) {
        setSlotsError(e.response?.data?.message || "Failed to load slots");
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    run();
  }, [date, resource]);

  // ── User search ──────────────────────────────────────────────────────────────

  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await api.get("/admin/users/search", { params: { q } });
      setSuggestions(res.data || []);
    } catch {
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchUsers(userSearch), 300);
    return () => clearTimeout(t);
  }, [userSearch, searchUsers]);

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload: Record<string, any> =
        mode === "PAST"
          ? {
              date: pastDate,
              startTime: pastTime,
              resourceType: pastResource,
              isPastSession: true,
              isGuest: true,
              guestName,
              guestPhone,
              paymentStatus: "CONFIRMED",
              notes,
            }
          : {
              date,
              startTime: selectedSlot!.time.split(" - ")[0] + ":00",
              resourceType: resource,
              isPastSession: false,
              ...(resource === "BOWLING_MACHINE" && ballCount
                ? { ballCount }
                : {}),
              paymentStatus,
              notes,
              isGuest: bookerType === "GUEST",
              ...(bookerType === "REGISTERED" && selectedUser
                ? { userId: selectedUser.publicId }
                : { guestName, guestPhone, guestEmail }),
            };

      await api.post("/bookings/admin/manual", payload);
      setSuccess(true);
    } catch (e: any) {
      setSubmitError(e.response?.data?.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Validation ───────────────────────────────────────────────────────────────

  const step1Valid =
    !!selectedSlot && (resource !== "BOWLING_MACHINE" || ballCount !== null);
  const step2Valid =
    bookerType === "REGISTERED"
      ? !!selectedUser
      : guestName.trim().length > 1 && guestPhone.trim().length >= 10;

  // ─────────────────────────────────────────────────────────────────────────────
  // Success screen
  // ─────────────────────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-6 px-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-4xl">
          ✅
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Booking Created!</h2>
        <p className="text-gray-500">
          {mode === "PAST" ? (
            <>
              Past session recorded for <strong>{guestName}</strong> on{" "}
              <strong>{pastDate}</strong> ({pastResource} ·{" "}
              {pastTime.substring(0, 5)})
            </>
          ) : (
            <>
              Manual booking for{" "}
              <strong>
                {bookerType === "GUEST" ? guestName : selectedUser?.name}
              </strong>{" "}
              on <strong>{date}</strong> ({resource} · {selectedSlot?.time}) has
              been saved.
            </>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setSuccess(false);
              setStep(1);
              setMode("FUTURE");
              setSelectedSlot(null);
              setSelectedUser(null);
              setGuestName("");
              setGuestPhone("");
              setGuestEmail("");
              setUserSearch("");
              setNotes("");
              setPastDate(""); // ← add
              setPastTime(""); // ← add
              setPastResource(""); // ← add
              setPastSlots([]);
            }}
            className="px-5 py-2.5 rounded-xl border border-gray-300 font-medium hover:bg-gray-50 transition"
          >
            + New Booking
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Main layout
  // ─────────────────────────────────────────────────────────────────────────────

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
          <h1 className="text-2xl font-bold text-gray-900">Manual Booking</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create a booking on behalf of a caller or walk-in
          </p>
        </div>

        {/* Step indicator — only show for future mode */}
        {mode === "FUTURE" && (
          <div className="hidden md:flex items-center gap-2">
            {(["Slot", "Booker", "Confirm"] as const).map((label, i) => {
              const n = (i + 1) as 1 | 2 | 3;
              const active = step === n;
              const done = step > n;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${done ? "bg-green-500 text-white" : active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}
                  >
                    {done ? "✓" : n}
                  </div>
                  <span
                    className={`text-sm font-medium ${active ? "text-blue-600" : done ? "text-green-600" : "text-gray-400"}`}
                  >
                    {label}
                  </span>
                  {i < 2 && <span className="text-gray-300 text-xs">──</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mode toggle */}
      <div className="inline-flex rounded-xl border border-gray-200 overflow-hidden">
        {(
          [
            { value: "FUTURE", label: "📅 Upcoming" },
            { value: "PAST", label: "📋 Past Session" },
          ] as { value: "FUTURE" | "PAST"; label: string }[]
        ).map((m) => (
          <button
            key={m.value}
            onClick={() => {
              setMode(m.value);
              setStep(1);
            }}
            className={`px-5 py-2.5 text-sm font-medium transition
        ${mode === m.value ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── MODE B: Past Session ─────────────────────────────────────────── */}
      {mode === "PAST" && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            ⚠️ Recording a past session — booking will be saved as{" "}
            <strong>Confirmed</strong> regardless of payment status.
          </div>

          {/* Session details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <p className="font-semibold text-gray-900">Session Details</p>
            <div className="grid md:grid-cols-2 gap-4">
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
                        {s.startTime} - {s.endTime}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource *
                </label>

                <div className="flex flex-col sm:flex-row gap-3">
                  {RESOURCES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setPastResource(r)}
                      className={`px-6 py-2.5 rounded-xl border font-semibold transition-all
                  ${pastResource === r ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:bg-gray-50"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Booker details — inline, no step 2 needed */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <p className="font-semibold text-gray-900">Booker Details</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rohit Sharma"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
      ${
        guestPhone.length > 0 && guestPhone.trim().length < 10
          ? "border-red-400 bg-red-50"
          : "border-gray-300"
      }`}
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

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              disabled={
                !pastDate ||
                !pastTime ||
                !pastResource ||
                !guestName ||
                guestPhone.trim().length < 10 ||
                submitting
              }
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
      )}

      {/* ── STEP 1: Slot Selection ─────────────────────────────────────────────── */}
      {mode === "FUTURE" && step === 1 && (
        <div className="space-y-6">
          {/* Date + Resource */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={date}
                min={today()}
                onChange={(e) => setDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Resource
              </label>

              <div className="flex flex-col sm:flex-row gap-3">
                {RESOURCES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setResource(r)}
                    className={`px-6 py-2.5 rounded-xl border font-semibold transition-all
                      ${resource === r ? "bg-blue-600 text-white border-blue-600 shadow" : "border-gray-300 hover:bg-gray-50"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ball count selector — only for bowling machine */}
          {resource === "BOWLING_MACHINE" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Session *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBallCount(60)}
                  className={`py-4 rounded-xl border-2 text-center transition ${
                    ballCount === 60
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <p className="text-xl font-bold text-blue-700">60</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    balls · 15 mins
                  </p>
                </button>
                <button
                  onClick={() => setBallCount(120)}
                  className={`py-4 rounded-xl border-2 text-center transition ${
                    ballCount === 120
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <p className="text-xl font-bold text-blue-700">120</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    balls · 30 mins
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Slot grid */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
            <h2 className="font-semibold text-gray-900">Available Slots</h2>

            {!date || !resource ? (
              <p className="text-gray-400 text-sm">
                Select a date and resource above
              </p>
            ) : slotsLoading ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
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
                Checking availability…
              </div>
            ) : closedMsg ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">🚫</div>
                <p className="font-semibold text-red-800">{closedMsg}</p>
              </div>
            ) : slotsError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                {slotsError}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-gray-400 text-sm">No slots found</p>
            ) : (
              SLOT_GROUPS.map(({ key, label, sub }) => {
                const group = slots.filter((s) => s.slotType === key);
                if (!group.length) return null;
                return (
                  <div key={key}>
                    <div className="mb-3">
                      <p className="font-semibold text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400">{sub}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {group.map((slot) => {
                        const isToday = date === today();
                        const disabled = (() => {
                          if (slot.availableCount === 0) return true;
                          if (isToday) {
                            const start = slot.time.split(" - ")[0];
                            let [hour, min] = start.split(":").map(Number);
                            if (hour === 0) hour = 24;
                            const slotMinutes = hour * 60 + min;
                            const now = new Date();
                            const nowMinutes =
                              now.getHours() * 60 + now.getMinutes();
                            if (slotMinutes <= nowMinutes) return true;
                          }
                          return false;
                        })();
                        const selected = selectedSlot?.time === slot.time;
                        return (
                          <button
                            key={slot.time}
                            disabled={disabled}
                            onClick={() =>
                              setSelectedSlot(selected ? null : slot)
                            }
                            className={`rounded-xl border p-3 text-left transition-all duration-150
  ${
    disabled
      ? "bg-gray-100 border-gray-200 cursor-not-allowed opacity-50"
      : selected
        ? "bg-blue-600 border-blue-600 text-white shadow-md scale-[1.02]"
        : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer"
  }`}
                          >
                            <p
                              className={`text-sm font-bold ${disabled ? "line-through text-gray-400" : selected ? "text-white" : "text-gray-900"}`}
                            >
                              {slot.time}
                            </p>
                            <p
                              className={`text-xs mt-0.5 ${selected ? "text-blue-100" : "text-gray-500"}`}
                            >
                              ₹{slot.price}
                            </p>
                            {slot.availableCount > 1 && (
                              <p
                                className={`text-xs mt-0.5 font-medium ${selected ? "text-white" : "text-green-600"}`}
                              >
                                {slot.availableCount} left
                              </p>
                            )}
                            {slot.availableCount === 0 && (
                              <p className="text-xs text-red-400">Full</p>
                            )}
                            {disabled && slot.availableCount > 0 && (
                              <p className="text-xs text-gray-400">Past</p>
                            )}
                            {slot.lightsRequired && (
                              <p
                                className={`text-xs mt-0.5 ${selected ? "text-yellow-200" : "text-yellow-500"}`}
                              >
                                💡 Lights
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Next */}
          <div className="flex justify-end">
            <button
              disabled={!step1Valid}
              onClick={() => setStep(2)}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition shadow-sm"
            >
              Next: Booker Details →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Booker Details ─────────────────────────────────────────────── */}
      {mode === "FUTURE" && step === 2 && (
        <div className="space-y-6">
          {/* Slot summary pill */}
          <SlotSummaryBadge
            date={date}
            resource={resource}
            slot={selectedSlot}
          />

          {/* Toggle */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
            <div>
              <p className="font-semibold text-gray-900 mb-3">
                Who is booking?
              </p>
              <div className="inline-flex rounded-xl border border-gray-200 overflow-hidden">
                {(["GUEST", "REGISTERED"] as BookerType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setBookerType(t);
                      setSelectedUser(null);
                      setUserSearch("");
                    }}
                    className={`px-5 py-2.5 text-sm font-medium transition
                      ${bookerType === t ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                  >
                    {t === "GUEST"
                      ? "👤 Guest / Walk-in"
                      : "🔍 Registered User"}
                  </button>
                ))}
              </div>
            </div>

            {bookerType === "GUEST" ? (
              <div className="grid md:grid-cols-2 gap-4">
                <FormField label="Full Name *">
                  <input
                    type="text"
                    placeholder="e.g. Rohit Sharma"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </FormField>
                <FormField label="Phone Number *">
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
      ${
        guestPhone.length > 0 && guestPhone.trim().length < 10
          ? "border-red-400 bg-red-50"
          : "border-gray-300"
      }`}
                  />
                  {guestPhone.length > 0 && guestPhone.trim().length < 10 && (
                    <p className="text-xs text-red-500 mt-1">
                      Enter a valid 10-digit phone number (
                      {guestPhone.trim().length}/10)
                    </p>
                  )}
                </FormField>
                <FormField label="Email (optional)" className="md:col-span-2">
                  <input
                    type="email"
                    placeholder="e.g. rohit@email.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </FormField>
              </div>
            ) : (
              <div className="relative">
                <FormField label="Search by name or phone *">
                  <input
                    type="text"
                    placeholder="Type at least 2 characters…"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setSelectedUser(null);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </FormField>

                {/* Dropdown */}
                {userSearch.length >= 2 && !selectedUser && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-auto">
                    {searchLoading ? (
                      <p className="px-4 py-3 text-sm text-gray-400">
                        Searching…
                      </p>
                    ) : suggestions.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400">
                        No users found
                      </p>
                    ) : (
                      suggestions.map((u) => (
                        <button
                          key={u.publicId}
                          onClick={() => {
                            setSelectedUser(u);
                            setUserSearch(u.name);
                            setSuggestions([]);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b border-gray-100 last:border-0"
                        >
                          <p className="text-sm font-semibold text-gray-900">
                            {u.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {u.phone} · {u.email}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {selectedUser && (
                  <div className="mt-3 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-blue-900">
                        {selectedUser.name}
                      </p>
                      <p className="text-xs text-blue-600">
                        {selectedUser.phone} · {selectedUser.email}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setUserSearch("");
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      ✕ Change
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 transition"
            >
              ← Back
            </button>
            <button
              disabled={!step2Valid}
              onClick={() => setStep(3)}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition shadow-sm"
            >
              Next: Confirm →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Confirm ───────────────────────────────────────────────────── */}
      {mode === "FUTURE" && step === 3 && (
        <div className="space-y-6">
          <SlotSummaryBadge
            date={date}
            resource={resource}
            slot={selectedSlot}
          />

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
            {/* Summary table */}
            <div>
              <p className="font-semibold text-gray-900 mb-4">
                Booking Summary
              </p>
              <div className="rounded-xl border border-gray-100 divide-y divide-gray-100">
                <SummaryRow label="Date" value={date} />
                <SummaryRow label="Resource" value={resource} />
                <SummaryRow label="Slot" value={selectedSlot?.time ?? ""} />
                {resource === "BOWLING_MACHINE" && ballCount && (
                  <SummaryRow
                    label="Session"
                    value={`${ballCount} balls (${ballCount === 60 ? "15 mins" : "30 mins"})`}
                  />
                )}
                <SummaryRow
                  label="Amount"
                  value={`₹${
                    resource === "BOWLING_MACHINE"
                      ? ballCount === 60
                        ? (selectedSlot?.price60Balls ??
                          selectedSlot?.price ??
                          0)
                        : (selectedSlot?.price120Balls ??
                          selectedSlot?.price ??
                          0)
                      : (selectedSlot?.price ?? 0)
                  }`}
                />
                <SummaryRow
                  label="Booker"
                  value={
                    bookerType === "REGISTERED" && selectedUser
                      ? `${selectedUser.name} (${selectedUser.phone})`
                      : `${guestName} · ${guestPhone}${guestEmail ? ` · ${guestEmail}` : ""}`
                  }
                />
                <SummaryRow
                  label="Type"
                  value={
                    bookerType === "GUEST"
                      ? "Guest / Walk-in"
                      : "Registered User"
                  }
                />
              </div>
            </div>

            {/* Payment status */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Payment Status
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                {(
                  [
                    {
                      value: "CONFIRMED",
                      label: "✅ Confirmed",
                      sub: "Cash collected",
                    },
                    {
                      value: "PENDING_PAYMENT",
                      label: "⏳ Pending Payment",
                      sub: "Will pay later",
                    },
                  ] as { value: PaymentStatus; label: string; sub: string }[]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPaymentStatus(opt.value)}
                    className={`flex-1 rounded-xl border p-4 text-left transition
                      ${
                        paymentStatus === opt.value
                          ? opt.value === "CONFIRMED"
                            ? "border-green-500 bg-green-50"
                            : "border-orange-400 bg-orange-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        paymentStatus === opt.value
                          ? opt.value === "CONFIRMED"
                            ? "text-green-800"
                            : "text-orange-800"
                          : "text-gray-700"
                      }`}
                    >
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Admin Notes (optional)
              </p>
              <textarea
                rows={2}
                placeholder="e.g. Caller requested floodlights, paid via PhonePe…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 transition"
            >
              ← Back
            </button>
            <button
              disabled={submitting}
              onClick={handleSubmit}
              className="px-7 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-sm disabled:opacity-60 flex items-center gap-2"
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
              {submitting ? "Creating…" : "✅ Create Booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SlotSummaryBadge({
  date,
  resource,
  slot,
}: {
  date: string;
  resource: string;
  slot: Slot | null;
}) {
  if (!slot) return null;
  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
      <span className="text-blue-500 text-xl">📅</span>
      <div>
        <p className="text-sm font-semibold text-blue-900">
          {date} · {resource} · {slot.time}
        </p>
        <p className="text-xs text-blue-500">
          ₹{slot.price}
          {slot.lightsRequired ? " · 💡 Lights" : ""}
        </p>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-2.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right max-w-xs break-all">
        {value}
      </span>
    </div>
  );
}
