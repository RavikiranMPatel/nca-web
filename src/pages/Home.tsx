import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import academyLogo from "../assets/logos/nca-logo-academy.png";
import LoginPromptModal from "../components/LoginPromptModal";
import publicApi from "../api/publicApi";


/* Swiper */
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

/* Types */
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

  /* ✅ NEW: login modal state (TOP LEVEL – correct) */
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  /* Slider */
  const [sliderImages, setSliderImages] = useState<SliderImage[]>([]);

  /* Auth info (safe to read directly) */
  const token = localStorage.getItem("accessToken");

  // --------------------
  // INITIALIZE PLAYER CONTEXT (ONLY FOR LOGGED-IN USERS)
  // --------------------
  useEffect(() => {
    const init = async () => {
      try {
        // ✅ PUBLIC USER → skip everything
        if (!token) {
          setLoading(false);
          return;
        }

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
      } catch {
        // ✅ Silent for public users
        setLoading(false);
      }
    };

    init();
  }, [navigate, token]);

  // --------------------
  // LOAD HOME SLIDER (PUBLIC)
  // --------------------
  useEffect(() => {
    publicApi
      .get("/home-slider")
      .then((res) => setSliderImages(res.data))
      .catch(() => setSliderImages([]));
  }, []);

  // --------------------
  // LOADING
  // --------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Preparing your dashboard…</p>
      </div>
    );
  }

  // --------------------
  // UI
  // --------------------
  return (
    <div className="space-y-12">
      {/* SLIDER */}
      {sliderImages.length > 0 && (
        <section className="rounded-lg overflow-hidden shadow">
          <Swiper
            modules={[Autoplay]}
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            loop
          >
            {sliderImages.map((img) => (
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

      {/* HERO */}
      <section className="bg-white rounded-lg shadow p-8 flex flex-col items-center text-center">
        <img src={academyLogo} alt="NCA" className="h-48 mb-6" />
        <h1 className="text-3xl font-bold mb-3">NextGen Cricket Academy</h1>
        <p className="text-gray-600 max-w-2xl">
          High-quality turf and astro facilities designed for players of all age groups.
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

      {/* CTA */}
      <section className="text-center">
        <button
          onClick={() =>
            token ? navigate("/book-slot") : setShowLoginPrompt(true)
          }
          className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-700"
        >
          Book a Slot
        </button>
      </section>

      {/* LOGIN MODAL */}
      <LoginPromptModal
        open={showLoginPrompt}
        message="Please login to book a slot."
        onConfirm={() => navigate("/login")}
        onCancel={() => setShowLoginPrompt(false)}
      />
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
