import { useEffect, useState } from "react";
import api from "../api/axios";
import { useNavigate, useLocation } from "react-router-dom";

const resources = ["TURF", "ASTRO"];

type Slot = {
  time: string;
  available: boolean;
};

function BookSlot() {
  // --------------------
  // STATE
  // --------------------
  const [date, setDate] = useState("");
  const [resource, setResource] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // --------------------
  // RESTORE STATE (FROM CONFIRM BOOKING)
  // --------------------
  useEffect(() => {
    if (location.state) {
      const { date, resource, slot } = location.state as {
        date: string;
        resource: string;
        slot: string;
      };

      setDate(date);
      setResource(resource);
      setSelectedSlot(slot);
    }
  }, []); // run ONCE on mount

  // --------------------
  // SLOT GENERATION
  // --------------------
  function generateSlots(): string[] {
    const slots: string[] = [];

    const addSlots = (start: number, end: number) => {
      for (let hour = start; hour < end; hour++) {
        const from = hour.toString().padStart(2, "0") + ":00";
        const to = (hour + 1).toString().padStart(2, "0") + ":00";
        slots.push(`${from} - ${to}`);
      }
    };

    addSlots(8, 16);   // Morning 8 AM – 4 PM
    addSlots(19, 24);  // Evening 7 PM – 12 AM

    return slots;
  }

  // --------------------
  // FETCH AVAILABILITY
  // --------------------
  useEffect(() => {
    if (!date || !resource) {
      setSlots([]);
      return;
    }

    const fetchAvailability = async () => {
      setLoading(true);

      const generatedSlots = generateSlots();

      try {
        const results: Slot[] = await Promise.all(
          generatedSlots.map(async (slot) => {
            const startTime = slot.split(" - ")[0];

            try {
              const res = await api.get("/slot/availability", {
                params: {
                  date,
                  startTime,
                  resourceType: resource,
                },
              });

              return {
                time: slot,
                available: res.data.availableCount > 0,
              };
            } catch {
              return {
                time: slot,
                available: false,
              };
            }
          })
        );

        setSlots(results);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [date, resource]);

  // --------------------
  // GROUPING
  // --------------------
  const morningSlots = slots.filter(
    (s) =>
      parseInt(s.time.split(":")[0]) >= 8 &&
      parseInt(s.time.split(":")[0]) < 16
  );

  const eveningSlots = slots.filter(
    (s) => parseInt(s.time.split(":")[0]) >= 19
  );

  // --------------------
  // UI
  // --------------------
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold">Book a Slot</h1>

      {/* DATE */}
      <section className="bg-white p-6 rounded shadow">
        <label className="block text-sm font-medium mb-2">
          Select Date
        </label>
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </section>

      {/* RESOURCE */}
      <section className="bg-white p-6 rounded shadow">
        <label className="block text-sm font-medium mb-4">
          Select Resource
        </label>
        <div className="flex gap-4">
          {resources.map((r) => (
            <button
              key={r}
              onClick={() => setResource(r)}
              className={`px-6 py-2 rounded border font-medium transition ${
                resource === r
                  ? "bg-blue-600 text-white"
                  : "bg-white hover:bg-gray-100"
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
          <p className="text-gray-500">
            Select date and resource to view slots
          </p>
        ) : loading ? (
          <p className="text-gray-500">Checking availability…</p>
        ) : (
          <>
            <SlotGroup
              title="🌤 Morning Slots (8 AM – 4 PM)"
              slots={morningSlots}
              selectedSlot={selectedSlot}
              setSelectedSlot={setSelectedSlot}
            />

            <SlotGroup
              title="🌙 Evening Slots (7 PM – 12 AM)"
              slots={eveningSlots}
              selectedSlot={selectedSlot}
              setSelectedSlot={setSelectedSlot}
            />
          </>
        )}
      </section>

      {/* CONTINUE */}
      {selectedSlot && (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Selected Slot</p>
            <p className="font-semibold">
              {date} • {resource} • {selectedSlot}
            </p>
          </div>

          <button
  onClick={() => {
    const bookingDraft = {
      date,
      resource,
      slot: selectedSlot,
    };

    // 🔑 Persist draft for ConfirmBooking
    localStorage.setItem(
      "bookingDraft",
      JSON.stringify(bookingDraft)
    );

    navigate("/confirm-booking");
  }}
  className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
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
}: {
  title: string;
  slots: Slot[];
  selectedSlot: string;
  setSelectedSlot: (s: string) => void;
}) {
  if (slots.length === 0) return null;

  return (
    <div>
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {slots.map((slot) => (
          <SlotButton
            key={slot.time}
            slot={slot}
            selectedSlot={selectedSlot}
            setSelectedSlot={setSelectedSlot}
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
}: {
  slot: Slot;
  selectedSlot: string;
  setSelectedSlot: (s: string) => void;
}) {
  const isSelected = selectedSlot === slot.time;

  return (
    <button
      disabled={!slot.available}
      onClick={() => setSelectedSlot(slot.time)}
      className={`py-2 rounded border text-sm font-medium transition
        ${
          slot.available
            ? isSelected
              ? "bg-green-600 text-white ring-2 ring-green-300"
              : "bg-green-50 text-green-700 hover:bg-green-100"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
    >
      {slot.time}
    </button>
  );
}

export default BookSlot;
