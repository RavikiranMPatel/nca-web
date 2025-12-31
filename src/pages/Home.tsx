import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import academyLogo from "../assets/logos/nca-logo-academy.png";

/* ✅ ADD: Swiper imports */
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

/* ✅ ADD: Slider image type */
type SliderImage = {
  id: string;
  imageUrl: string;
};

type Player = {
  id: string;
  displayName: string;
};

function Home() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ✅ ADD: slider state */
  const [sliderImages, setSliderImages] = useState<SliderImage[]>([]);

  // --------------------
  // INITIALIZE PLAYER CONTEXT (ROLE-AWARE)
  // --------------------
  useEffect(() => {
    const init = async () => {
      try {
        const role = localStorage.getItem("userRole");
        const existingPlayerId = localStorage.getItem("playerId");

        if (existingPlayerId) {
          setLoading(false);
          return;
        }

        const res = await api.get<Player[]>("/players/my");
        const players = res.data;

        if (role === "ROLE_PLAYER") {
          if (players.length === 0) {
            navigate("/create-player", { replace: true });
            return;
          }

          localStorage.setItem("playerId", players[0].id);
          localStorage.setItem("playerName", players[0].displayName);
          setLoading(false);
          return;
        }

        if (role === "ROLE_PARENT") {
          if (players.length === 0) {
            navigate("/create-player", { replace: true });
            return;
          }

          if (players.length === 1) {
            localStorage.setItem("playerId", players[0].id);
            setLoading(false);
            return;
          }

          navigate("/select-player", { replace: true });
          return;
        }

        setLoading(false);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Failed to initialize player session"
        );
        setLoading(false);
      }
    };

    init();
  }, [navigate]);

  /* ✅ ADD: fetch slider images */
  useEffect(() => {
    api.get("/home-slider")
      .then(res => setSliderImages(res.data))
      .catch(() => setSliderImages([]));
  }, []);

  // --------------------
  // LOADING / ERROR STATES
  // --------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Preparing your dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  // --------------------
  // HOME UI
  // --------------------
  return (
    <div className="space-y-12">

      {/* ✅ ADD: HOME SLIDER */}
      {sliderImages.length > 0 && (
        <section className="rounded-lg overflow-hidden shadow">
          <Swiper
            modules={[Autoplay]}
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            loop
          >
            {sliderImages.map(img => (
              <SwiperSlide key={img.id}>
                <img
                  src={img.imageUrl}
                  alt="Academy Slide"
                  className="w-full h-[220px] sm:h-[300px] md:h-[400px] object-cover"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </section>
      )}

      {/* HERO (UNCHANGED) */}
      <section className="bg-white rounded-lg shadow p-8 flex flex-col items-center text-center">
        <img
          src={academyLogo}
          alt="NextGen Cricket Academy"
          className="h-48 mb-6"
        />

        <h1 className="text-3xl font-bold mb-3">
          NextGen Cricket Academy
        </h1>

        <p className="text-gray-600 max-w-2xl">
          High-quality turf and astro facilities designed for players of all
          age groups. Train smart, play harder, and book slots effortlessly.
        </p>
      </section>

      {/* FACILITIES */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Our Facilities
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FacilityCard title="Turf Wickets" />
          <FacilityCard title="Astro Turf" />
          <FacilityCard title="Flexible Time Slots" />
        </div>
      </section>

      {/* WHY */}
      <section className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Why Choose NCA?
        </h2>

        <ul className="space-y-3 text-gray-700 max-w-xl mx-auto">
          <li>✔ Professional-grade playing surfaces</li>
          <li>✔ Easy and transparent online booking</li>
          <li>✔ Suitable for beginners to advanced players</li>
          <li>✔ Safe and well-maintained facilities</li>
        </ul>
      </section>

      {/* CTA */}
      <section className="text-center">
        <button
          onClick={() => navigate("/book-slot")}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-700"
        >
          Book a Slot
        </button>
      </section>
    </div>
  );
}

function FacilityCard({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
  );
}

export default Home;
