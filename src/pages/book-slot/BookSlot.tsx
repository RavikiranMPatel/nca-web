import { useEffect, useState } from "react";
import api from "../../api/axios";
import { useNavigate, useLocation } from "react-router-dom";

const resources = ["TURF", "ASTRO"];

type Slot = {
  time: string;
  availableCount: number; // ✅ NEW: How many resources available
  price: number;
  slotType: string;
  lightsRequired: boolean;
};

function BookSlot() {
  const [date, setDate] = useState("");
  const [resource, setResource] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [closedMessage, setClosedMessage] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // Restore state
  useEffect(() => {
    if (location.state) {
      const { date, resource, slot } = location.state as any;
      setDate(date);
      setResource(resource);
      setSelectedSlot(slot);
    }
  }, [location.state]);

  // ✅ Helper function to format time
  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  // Fetch availability
  useEffect(() => {
    if (!date || !resource) {
      setSlots([]);
      setError("");
      setClosedMessage("");
      return;
    }

    const fetchAvailability = async () => {
      setLoading(true);
      setError("");
      setClosedMessage("");

      try {
        const res = await api.get("/slot/availability", {
          params: { date, resourceType: resource },
        });

        // ✅ Handle closed/unavailable dates
        if (!res.data.available) {
          setClosedMessage(res.data.message || "Facility closed on this date");
          setSlots([]);
          return;
        }

        if (!res.data.slots || res.data.slots.length === 0) {
          setError("No slots available for this date and resource");
          setSlots([]);
          return;
        }

        // ✅ Process slots with NEW consolidated format
        const results = res.data.slots.map((s: any) => ({
          time: `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`,
          availableCount: s.availableCount, // ✅ NEW
          price: s.price,
          slotType: s.slotType,
          lightsRequired: s.lightsRequired,
        }));

        console.log("✅ Processed slots:", results);
        setSlots(results);
      } catch (e: any) {
        console.error("❌ API Error:", e);
        setError(
          e.response?.data?.message ||
            e.message ||
            "Failed to load available slots",
        );
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [date, resource]);

  // ✅ Grouping by slotType from backend
  const morningSlots = slots.filter((s) => s.slotType === "MORNING");
  const afternoonSlots = slots.filter((s) => s.slotType === "AFTERNOON");
  const eveningSlots = slots.filter((s) => s.slotType === "EVENING");

  // Date/time helpers
  const today = new Date().toLocaleDateString("en-CA");
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const isSlotDisabled = (slot: Slot) => {
    if (slot.availableCount === 0) return true; // ✅ NEW: Check available count
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        Book a Slot
      </h1>

      {/* DATE + RESOURCE GRID */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* DATE */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <label className="block text-sm font-medium mb-2">Select Date</label>
          <input
            type="date"
            min={today}
            className="border border-gray-300 rounded-lg px-4 py-2 
                 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </section>

        {/* RESOURCE */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <label className="block text-sm font-medium mb-4">
            Select Resource
          </label>
          <div className="flex gap-4">
            {resources.map((r) => (
              <button
                key={r}
                onClick={() => setResource(r)}
                className={`px-6 py-3 rounded-xl border font-semibold transition-all
            ${
              resource === r
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white hover:bg-gray-50 border-gray-300"
            }`}
              >
                {r}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* SLOTS */}
      <section className="bg-white/80 backdrop-blur rounded-xl border border-gray-200 p-6">
        <h2 className="font-medium">Available Slots</h2>

        {!date || !resource ? (
          <p className="text-gray-500">Select date and resource</p>
        ) : loading ? (
          <p className="text-gray-500">Checking availability…</p>
        ) : closedMessage ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-4xl mb-3">🚫</div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Facility Closed
            </h3>
            <p className="text-red-700">{closedMessage}</p>
            <button
              onClick={() => setDate("")}
              className="mt-4 text-blue-600 hover:text-blue-700 text-sm"
            >
              ← Select Another Date
            </button>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-gray-500">No slots available for this date</p>
        ) : (
          <>
            {morningSlots.length > 0 && (
              <SlotGroup
                title="☀️ Morning Slots (Before 12 PM)"
                description="Enjoy natural daylight"
                slots={morningSlots}
                selectedSlot={selectedSlot}
                setSelectedSlot={setSelectedSlot}
                isSlotDisabled={isSlotDisabled}
              />
            )}

            {afternoonSlots.length > 0 && (
              <SlotGroup
                title="🌤️ Afternoon Slots (12 PM - 5 PM)"
                description="Peak daylight hours"
                slots={afternoonSlots}
                selectedSlot={selectedSlot}
                setSelectedSlot={setSelectedSlot}
                isSlotDisabled={isSlotDisabled}
              />
            )}

            {eveningSlots.length > 0 && (
              <SlotGroup
                title="🌙 Evening Slots (After 5 PM)"
                description="Premium floodlit experience"
                slots={eveningSlots}
                selectedSlot={selectedSlot}
                setSelectedSlot={setSelectedSlot}
                isSlotDisabled={isSlotDisabled}
              />
            )}
          </>
        )}
      </section>

      {selectedSlot && (
        <div
          className="bg-gradient-to-r from-blue-50 to-indigo-50 
                border border-blue-200 rounded-xl p-6 
                flex justify-between items-center"
        >
          <div>
            <p className="text-sm text-gray-600">Selected Slot</p>
            <p className="font-semibold">
              {date} • {resource} • {selectedSlot}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Price: ₹{slots.find((s) => s.time === selectedSlot)?.price || 0}
            </p>
          </div>

          <button
            onClick={() => {
              localStorage.setItem(
                "bookingDraft",
                JSON.stringify({ date, resource, slot: selectedSlot }),
              );
              navigate("/confirm-booking");
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl 
           font-semibold hover:bg-blue-700 transition"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

function SlotGroup({
  title,
  description,
  slots,
  selectedSlot,
  setSelectedSlot,
  isSlotDisabled,
}: any) {
  if (slots.length === 0) return null;

  return (
    <div>
      <div className="mb-3">
        <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {slots.map((slot: Slot) => (
          <SlotButton
            key={slot.time}
            slot={slot}
            selectedSlot={selectedSlot}
            setSelectedSlot={setSelectedSlot}
            disabled={isSlotDisabled(slot)}
          />
        ))}
      </div>
    </div>
  );
}

function SlotButton({ slot, selectedSlot, setSelectedSlot, disabled }: any) {
  const isSelected = selectedSlot === slot.time;

  return (
    <button
      disabled={disabled}
      onClick={() => setSelectedSlot(slot.time)}
      className={`rounded-2xl border p-4 transition-all duration-200
  ${
    disabled
      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
      : isSelected
        ? "bg-green-600 text-white border-green-600 shadow-lg scale-[1.04]"
        : "bg-green-50 border-green-200 hover:bg-green-100 hover:shadow-md"
  }`}
    >
      <div className="flex flex-col items-center gap-1">
        <span
          className={`font-semibold text-base ${
            isSelected ? "text-white" : "text-gray-900"
          }`}
        >
          {slot.time}
        </span>

        <span
          className={`text-sm font-medium ${
            isSelected ? "text-white" : "text-gray-600"
          }`}
        >
          ₹{slot.price}
        </span>

        {slot.availableCount > 1 && (
          <span
            className={`text-xs font-semibold ${
              isSelected ? "text-white" : "text-green-700"
            }`}
          >
            {slot.availableCount} available
          </span>
        )}

        {slot.lightsRequired && (
          <span
            className={`text-xs ${
              isSelected ? "text-white" : "text-yellow-600"
            }`}
          >
            💡 Lights included
          </span>
        )}
      </div>
    </button>
  );
}

export default BookSlot;
