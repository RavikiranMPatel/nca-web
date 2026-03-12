import { useEffect, useState } from "react";
import api from "../../api/axios";
import { useNavigate, useLocation } from "react-router-dom";

const RESOURCES = [
  { id: "TURF", label: "Turf", icon: "🏏" },
  { id: "ASTRO", label: "Astro", icon: "⭐" },
  { id: "BOWLING_MACHINE", label: "Bowling", icon: "🎯" },
];

const BALL_OPTIONS = [
  { count: 60, label: "60 Balls", duration: "15 mins", desc: "Quick session" },
  { count: 120, label: "120 Balls", duration: "30 mins", desc: "Full session" },
];

type Slot = {
  time: string;
  availableCount: number;
  price: number;
  slotType: string;
  lightsRequired: boolean;
  price60Balls?: number;
  price120Balls?: number;
};

function BookSlot() {
  const today = new Date().toLocaleDateString("en-CA");
  const [date, setDate] = useState(today);
  const [resource, setResource] = useState("");
  const [ballCount, setBallCount] = useState<60 | 120 | null>(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [closedMessage, setClosedMessage] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // Restore state if coming back
  useEffect(() => {
    if (location.state) {
      const {
        date: restoredDate,
        resource: restoredResource,
        slot: restoredSlot,
      } = location.state as any;
      if (restoredDate) setDate(restoredDate);
      if (restoredResource) setResource(restoredResource);
      if (restoredSlot) setSelectedSlot(restoredSlot);
    }
  }, []);

  const formatTime = (time: string) => time.substring(0, 5);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Reset ball count and slots when resource changes
  useEffect(() => {
    setBallCount(null);
    setSelectedSlot("");
    setSlots([]);
    setError("");
    setClosedMessage("");
  }, [resource]);

  // Reset slots when ball count changes
  useEffect(() => {
    setSelectedSlot("");
    setSlots([]);
    setError("");
    setClosedMessage("");
  }, [ballCount]);

  // Fetch availability
  useEffect(() => {
    if (!date || !resource) {
      setSlots([]);
      setError("");
      setClosedMessage("");
      return;
    }
    if (resource === "BOWLING_MACHINE" && !ballCount) {
      setSlots([]);
      return;
    }

    const fetchAvailability = async () => {
      setLoading(true);
      setError("");
      setClosedMessage("");

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
          setClosedMessage(res.data.message || "Facility closed on this date");
          setSlots([]);
          return;
        }

        if (!res.data.slots || res.data.slots.length === 0) {
          setError("No slots available for this date");
          setSlots([]);
          return;
        }

        const results = res.data.slots.map((s: any) => ({
          time: `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`,
          availableCount: s.availableCount,
          price:
            resource === "BOWLING_MACHINE"
              ? ballCount === 60
                ? s.price60Balls
                : s.price120Balls
              : s.price,
          slotType: s.slotType,
          lightsRequired: s.lightsRequired,
          price60Balls: s.price60Balls,
          price120Balls: s.price120Balls,
        }));

        setSlots(results);
      } catch (e: any) {
        setError(
          e.response?.data?.message || "Failed to load slots. Try again.",
        );
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [date, resource, ballCount]);

  const isSlotDisabled = (slot: Slot) => {
    if (slot.availableCount === 0) return true;
    if (date < today) return true;
    if (date === today) {
      const start = slot.time.split(" - ")[0];
      let [hour, min] = start.split(":").map(Number);
      if (hour === 0) hour = 24;
      const slotMinutes = hour * 60 + min;
      if (slotMinutes <= nowMinutes) return true;
    }
    return false;
  };

  const morningSlots = slots.filter((s) => s.slotType === "MORNING");
  const afternoonSlots = slots.filter((s) => s.slotType === "AFTERNOON");
  const eveningSlots = slots.filter((s) => s.slotType === "EVENING");

  const selectedSlotData = slots.find((s) => s.time === selectedSlot);

  const showBallPicker = resource === "BOWLING_MACHINE" && !!date;
  const showSlots =
    date && resource && (resource !== "BOWLING_MACHINE" || !!ballCount);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Book a Slot</h1>

        {/* DATE */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📅 Select Date
          </label>
          <input
            type="date"
            min={today}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSelectedSlot("");
            }}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* RESOURCE */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            🏟️ Select Resource
          </label>
          <div className="grid grid-cols-3 gap-2">
            {RESOURCES.map((r) => (
              <button
                key={r.id}
                onClick={() => setResource(r.id)}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 
                            font-semibold text-sm transition-all
                  ${
                    resource === r.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-md"
                      : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                  }`}
              >
                <span className="text-2xl">{r.icon}</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* BALL PICKER — bowling machine only */}
        {showBallPicker && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              🎯 Select Session
            </label>
            <div className="grid grid-cols-2 gap-3">
              {BALL_OPTIONS.map(({ count, label, duration, desc }) => (
                <button
                  key={count}
                  onClick={() => setBallCount(count as 60 | 120)}
                  className={`rounded-xl border-2 p-4 text-left transition-all
                    ${
                      ballCount === count
                        ? "bg-blue-600 border-blue-600 text-white shadow-md"
                        : "bg-white border-gray-200 hover:border-blue-300"
                    }`}
                >
                  <p
                    className={`font-bold text-lg leading-tight ${
                      ballCount === count ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {label}
                  </p>
                  <p
                    className={`text-sm font-medium mt-0.5 ${
                      ballCount === count ? "text-blue-100" : "text-blue-600"
                    }`}
                  >
                    {duration}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      ballCount === count ? "text-blue-200" : "text-gray-400"
                    }`}
                  >
                    {desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SLOTS */}
        {showSlots && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              🕐 Available Slots
            </h2>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
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
                <span className="text-sm">Checking availability…</span>
              </div>
            ) : closedMessage ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">🚫</div>
                <p className="font-semibold text-red-800 text-sm">
                  {closedMessage}
                </p>
                <button
                  onClick={() => {
                    setResource("");
                    setSelectedSlot("");
                  }}
                  className="mt-3 text-blue-600 text-sm font-medium"
                >
                  ← Pick another date
                </button>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                {error}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">
                No slots available
              </p>
            ) : (
              <div className="space-y-5">
                {morningSlots.length > 0 && (
                  <SlotGroup
                    title="☀️ Morning"
                    subtitle="Before 12 PM"
                    slots={morningSlots}
                    selectedSlot={selectedSlot}
                    setSelectedSlot={setSelectedSlot}
                    isSlotDisabled={isSlotDisabled}
                  />
                )}
                {afternoonSlots.length > 0 && (
                  <SlotGroup
                    title="🌤️ Afternoon"
                    subtitle="12 PM – 5 PM"
                    slots={afternoonSlots}
                    selectedSlot={selectedSlot}
                    setSelectedSlot={setSelectedSlot}
                    isSlotDisabled={isSlotDisabled}
                  />
                )}
                {eveningSlots.length > 0 && (
                  <SlotGroup
                    title="🌙 Evening"
                    subtitle="After 5 PM"
                    slots={eveningSlots}
                    selectedSlot={selectedSlot}
                    setSelectedSlot={setSelectedSlot}
                    isSlotDisabled={isSlotDisabled}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Prompt when nothing selected yet */}

        {date && !resource && (
          <p className="text-center text-gray-400 text-sm pt-2">
            Now select a resource
          </p>
        )}
        {date && resource === "BOWLING_MACHINE" && !ballCount && (
          <p className="text-center text-gray-400 text-sm pt-2">
            Now select your session type
          </p>
        )}
      </div>

      {/* STICKY BOTTOM BAR — shown when slot selected */}
      {selectedSlot && selectedSlotData && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 
                      shadow-2xl px-4 py-4"
        >
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500 font-medium">
                  {date} • {resource}
                  {resource === "BOWLING_MACHINE" && ballCount
                    ? ` • ${ballCount} balls`
                    : ""}
                </p>
                <p className="font-bold text-gray-900">{selectedSlot}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Total</p>
                <p className="text-xl font-bold text-blue-600">
                  ₹{selectedSlotData.price}
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                navigate("/confirm-booking", {
                  state: {
                    date,
                    resource,
                    slot: selectedSlot,
                    ballCount:
                      resource === "BOWLING_MACHINE" ? ballCount : null,
                  },
                })
              }
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold 
                         text-base hover:bg-blue-700 active:scale-95 transition-all shadow-md"
            >
              Continue to Confirm →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SlotGroup({
  title,
  subtitle,
  slots,
  selectedSlot,
  setSelectedSlot,
  isSlotDisabled,
}: {
  title: string;
  subtitle: string;
  slots: Slot[];
  selectedSlot: string;
  setSelectedSlot: (t: string) => void;
  isSlotDisabled: (s: Slot) => boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <p className="font-semibold text-gray-800 text-sm">{title}</p>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot) => {
          const disabled = isSlotDisabled(slot);
          const selected = selectedSlot === slot.time;
          return (
            <button
              key={slot.time}
              disabled={disabled}
              onClick={() => setSelectedSlot(selected ? "" : slot.time)}
              className={`rounded-xl border-2 p-2.5 text-center transition-all
                ${
                  disabled
                    ? "bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed"
                    : selected
                      ? "bg-green-600 border-green-600 text-white shadow-md scale-[1.03]"
                      : "bg-white border-gray-200 hover:border-green-400 active:scale-95"
                }`}
            >
              <p
                className={`text-xs font-bold leading-tight ${
                  disabled
                    ? "text-gray-300 line-through"
                    : selected
                      ? "text-white"
                      : "text-gray-800"
                }`}
              >
                {slot.time.split(" - ")[0]}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  selected ? "text-green-100" : "text-gray-400"
                }`}
              >
                {slot.time.split(" - ")[1]}
              </p>
              <p
                className={`text-xs font-semibold mt-1 ${
                  selected ? "text-white" : "text-gray-700"
                }`}
              >
                ₹{slot.price}
              </p>
              {slot.availableCount > 1 && !disabled && (
                <p
                  className={`text-xs mt-0.5 ${
                    selected ? "text-green-200" : "text-green-600"
                  }`}
                >
                  {slot.availableCount} left
                </p>
              )}
              {slot.availableCount === 0 && (
                <p className="text-xs text-red-400 mt-0.5">Full</p>
              )}
              {slot.lightsRequired && !disabled && (
                <p
                  className={`text-xs mt-0.5 ${
                    selected ? "text-yellow-200" : "text-yellow-500"
                  }`}
                >
                  💡
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default BookSlot;
