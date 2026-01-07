import { useEffect, useState } from "react";
import api from "../api/axios";
import { useNavigate, useLocation } from "react-router-dom";

const resources = ["TURF", "ASTRO"];

type Slot = {
  time: string;
  available: boolean;
};

function BookSlot() {
  const [date, setDate] = useState("");
  const [resource, setResource] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // --------------------
  // RESTORE STATE
  // --------------------
  useEffect(() => {
    if (location.state) {
      const { date, resource, slot } = location.state as any;
      setDate(date);
      setResource(resource);
      setSelectedSlot(slot);
    }
  }, []);

  // --------------------
  // FETCH AVAILABILITY
  // --------------------
  // --------------------
// FETCH AVAILABILITY (SINGLE API CALL)
// --------------------
useEffect(() => {
  if (!date || !resource) {
    setSlots([]);
    return;
  }

  const fetchAvailability = async () => {
    setLoading(true);

    try {
      const res = await api.get("/slot/availability", {
        params: { date, resourceType: resource },
      });

      const results = res.data.map((s: any) => ({
        time: `${s.startTime} - ${s.endTime}`,
        available: s.available,
      }));

      setSlots(results);
    } catch (e) {
      console.error("Availability fetch failed", e);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  fetchAvailability();
}, [date, resource]);



  // --------------------
  // GROUPING
  // --------------------
  const morningSlots = slots.filter(s => {
    const h = parseInt(s.time.split(":")[0]);
    return h >= 8 && h < 16;
  });

  const eveningSlots = slots.filter(s => {
    const h = parseInt(s.time.split(":")[0]);
    return h >= 19 || h === 0;
  });

  // --------------------
  // DATE / TIME HELPERS
  // --------------------
  const today = new Date().toLocaleDateString("en-CA");
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const isSlotDisabled = (slot: Slot) => {
    if (!slot.available) return true;

    // ❌ Past date
    if (date < today) return true;

    // ⏱ Today – disable past time slots
    if (date === today) {
      const start = slot.time.split(" - ")[0];
      let [hour, min] = start.split(":").map(Number);

      // Handle 00:00 (midnight)
      if (hour === 0) hour = 24;

      const slotMinutes = hour * 60 + min;
      if (slotMinutes <= nowMinutes) return true;
    }

    return false;
  };

  // --------------------
  // UI
  // --------------------
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold">Book a Slot</h1>

      {/* DATE */}
      <section className="bg-white p-6 rounded shadow">
        <label className="block text-sm font-medium mb-2">Select Date</label>
        <input
          type="date"
          min={today} // ✅ BLOCK PAST DATES
          className="border rounded px-3 py-2"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </section>

      {/* RESOURCE */}
      <section className="bg-white p-6 rounded shadow">
        <label className="block text-sm font-medium mb-4">Select Resource</label>
        <div className="flex gap-4">
          {resources.map(r => (
            <button
              key={r}
              onClick={() => setResource(r)}
              className={`px-6 py-2 rounded border ${
                resource === r
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-100"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </section>

      {/* SLOTS */}
      <section className="bg-white p-6 rounded shadow space-y-6">
        <h2 className="font-medium">Available Slots</h2>

        {!date || !resource ? (
          <p className="text-gray-500">Select date and resource</p>
        ) : loading ? (
          <p className="text-gray-500">Checking availability…</p>
        ) : (
          <>
            <SlotGroup
              title="🌤 Morning Slots (8 AM – 4 PM)"
              slots={morningSlots}
              selectedSlot={selectedSlot}
              setSelectedSlot={setSelectedSlot}
              isSlotDisabled={isSlotDisabled}
            />

            <SlotGroup
              title="🌙 Evening Slots (7 PM – 12 AM)"
              slots={eveningSlots}
              selectedSlot={selectedSlot}
              setSelectedSlot={setSelectedSlot}
              isSlotDisabled={isSlotDisabled}
            />
          </>
        )}
      </section>

      {selectedSlot && (
        <div className="bg-blue-50 border p-6 rounded flex justify-between">
          <div>
            <p className="text-sm text-gray-600">Selected Slot</p>
            <p className="font-semibold">
              {date} • {resource} • {selectedSlot}
            </p>
          </div>

          <button
            onClick={() => {
              localStorage.setItem(
                "bookingDraft",
                JSON.stringify({ date, resource, slot: selectedSlot })
              );
              navigate("/confirm-booking");
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

// --------------------
// SLOT GROUP
// --------------------
function SlotGroup({
  title,
  slots,
  selectedSlot,
  setSelectedSlot,
  isSlotDisabled,
}: any) {
  if (slots.length === 0) return null;

  return (
    <div>
      <h3 className="font-semibold mb-3">{title}</h3>
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

// --------------------
// SLOT BUTTON
// --------------------
function SlotButton({
  slot,
  selectedSlot,
  setSelectedSlot,
  disabled,
}: any) {
  const isSelected = selectedSlot === slot.time;

  return (
    <button
      disabled={disabled}
      onClick={() => setSelectedSlot(slot.time)}
      className={`py-2 rounded border text-sm font-medium
        ${
          disabled
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : isSelected
            ? "bg-green-600 text-white"
            : "bg-green-50 hover:bg-green-100"
        }`}
    >
      {slot.time}
    </button>
  );
}

export default BookSlot;
