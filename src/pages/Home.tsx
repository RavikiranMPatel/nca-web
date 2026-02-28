import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Trophy,
  Target,
  Award,
  Calendar,
  ArrowRight,
  Star,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
} from "lucide-react";
import LoginPromptModal from "../components/LoginPromptModal";
import publicApi from "../api/publicApi";
import { getImageUrl } from "../utils/imageUrl";
import ContactForm from "../components/ContactForm";

/* Swiper */
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

/* Types */
type SliderImage = {
  id: string;
  imageUrl: string;
  redirectUrl?: string;
  title?: string;
  description?: string;
};

type AcademySettings = {
  ACADEMY_NAME?: string;
  LOGO_URL?: string;
  PRIMARY_COLOR?: string;
  SECONDARY_COLOR?: string;
  BUTTON_RADIUS?: string;
  CARD_RADIUS?: string;
  SHADOW_INTENSITY?: string;
  SLIDER_HEIGHT?: string;
  KEN_BURNS_ENABLED?: string;
  SLIDE_DURATION?: string;
  SLIDER_IMAGE_FIT?: string;
  SECTION_SLIDER_ENABLED?: string;
  SECTION_STATS_ENABLED?: string;
  SECTION_TESTIMONIALS_ENABLED?: string;
  SECTION_NEWS_ENABLED?: string;
  SECTION_STAR_PERFORMER_ENABLED?: string;
  SECTION_GALLERY_ENABLED?: string;
  CONTACT_ADDRESS_LINE1?: string;
  CONTACT_ADDRESS_LINE2?: string;
  CONTACT_PHONE?: string;
  CONTACT_EMAIL?: string;
  CONTACT_HOURS?: string;
  // Content headings
  TESTIMONIALS_HEADING?: string;
  TESTIMONIALS_SUBHEADING?: string;
  NEWS_HEADING?: string;
  NEWS_SUBHEADING?: string;
  GALLERY_HEADING?: string;
  GALLERY_SUBHEADING?: string;
  // Star Performer
  STAR_PERFORMER_HEADING?: string;
  STAR_PERFORMER_SUBHEADING?: string;
  STAR_PERFORMER_NAME?: string;
  STAR_PERFORMER_ACHIEVEMENT?: string;
  STAR_PERFORMER_PHOTO_URL?: string;
  // Social media
  SOCIAL_FACEBOOK?: string;
  SOCIAL_TWITTER?: string;
  SOCIAL_INSTAGRAM?: string;
  SOCIAL_YOUTUBE?: string;
  SOCIAL_LINKEDIN?: string;
  SECTION_FACILITIES_ENABLED?: string;
  SECTION_TEAM_ENABLED?: string;
};

// ADD after the GalleryImage type block:
type TeamMember = {
  id: string;
  publicId: string;
  name: string;
  role: string;
  bio: string;
  photoUrl: string;
  displayOrder: number;
  active: boolean;
};

type Facility = {
  id: string;
  title: string;
  description: string;
  iconName?: string;
  displayOrder: number;
  active: boolean;
};

type Testimonial = {
  id: string;
  name: string;
  role: string;
  text: string;
  rating?: number;
  photoUrl?: string;
  featured?: boolean;
  active: boolean;
};

type NewsPost = {
  id: string;
  title: string;
  slug: string;
  category?: string;
  shortDescription?: string;
  featuredImageUrl?: string;
  publishedAt: string;
  status: string;
};

type GalleryImage = {
  id: string;
  imageUrl: string;
  caption?: string;
  active: boolean;
};

function Home() {
  const navigate = useNavigate();

  /* Login modal */
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  /* Settings & Data */
  const [settings, setSettings] = useState<AcademySettings>({});
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [sliderImages, setSliderImages] = useState<SliderImage[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [wideImages, setWideImages] = useState<Record<string, boolean>>({});
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [selectedGalleryImage, setSelectedGalleryImage] =
    useState<GalleryImage | null>(null);

  const starPerformerHeading =
    settings.STAR_PERFORMER_HEADING || "Star Performer of the Week";
  const starPerformerSubheading =
    settings.STAR_PERFORMER_SUBHEADING ||
    "Celebrating excellence and dedication";
  const starPerformerName = settings.STAR_PERFORMER_NAME || "";
  const starPerformerAchievement = settings.STAR_PERFORMER_ACHIEVEMENT || "";
  const starPerformerPhotoUrl = settings.STAR_PERFORMER_PHOTO_URL || "";

  /* Auth */
  const token = localStorage.getItem("accessToken");

  // Parse settings
  const academyName = settings.ACADEMY_NAME || "NextGen Cricket Academy";
  const logoUrl = settings.LOGO_URL;
  const primaryColor = settings.PRIMARY_COLOR || "#2563eb";
  const secondaryColor = settings.SECONDARY_COLOR || "#10b981";

  // Theme settings
  const buttonRadius = settings.BUTTON_RADIUS || "8";
  const cardRadius = settings.CARD_RADIUS || "8";
  const shadowIntensity = settings.SHADOW_INTENSITY || "md";

  // Slider settings
  const sliderHeight = settings.SLIDER_HEIGHT || "standard";
  const kenBurnsEnabled = settings.KEN_BURNS_ENABLED !== "false";
  const slideDuration = parseInt(settings.SLIDE_DURATION || "5000");
  const sliderImageFit = settings.SLIDER_IMAGE_FIT || "cover";

  const sliderEnabled = settings.SECTION_SLIDER_ENABLED !== "false";
  const statsEnabled = settings.SECTION_STATS_ENABLED !== "false";
  const facilitiesEnabled = settings.SECTION_FACILITIES_ENABLED !== "false";
  const testimonialsEnabled = settings.SECTION_TESTIMONIALS_ENABLED !== "false";
  const newsEnabled = settings.SECTION_NEWS_ENABLED !== "false";
  const galleryEnabled = settings.SECTION_GALLERY_ENABLED !== "false";
  const starPerformerEnabled =
    settings.SECTION_STAR_PERFORMER_ENABLED !== "false";

  // Content headings
  const testimonialsHeading =
    settings.TESTIMONIALS_HEADING || "What Our Students Say";
  const testimonialsSubheading =
    settings.TESTIMONIALS_SUBHEADING ||
    "Real success stories from our cricket family";
  const newsHeading = settings.NEWS_HEADING || "Latest News & Updates";
  const newsSubheading =
    settings.NEWS_SUBHEADING ||
    "Stay updated with our latest achievements and announcements";
  const galleryHeading = settings.GALLERY_HEADING || "Gallery";
  const gallerySubheading =
    settings.GALLERY_SUBHEADING ||
    "Glimpses from our training sessions and tournaments";

  // Social media
  const socialLinks = {
    facebook: settings.SOCIAL_FACEBOOK,
    twitter: settings.SOCIAL_TWITTER,
    instagram: settings.SOCIAL_INSTAGRAM,
    youtube: settings.SOCIAL_YOUTUBE,
    linkedin: settings.SOCIAL_LINKEDIN,
  };

  // Helper functions for dynamic styles
  const getSliderHeightClass = () => {
    switch (sliderHeight) {
      case "compact":
        return "min-h-[300px] md:min-h-[350px] max-h-[400px]";
      case "standard":
        return "min-h-[350px] md:min-h-[450px] lg:min-h-[500px] max-h-[550px]";
      case "large":
        return "min-h-[450px] md:min-h-[550px] lg:min-h-[650px] max-h-[700px]";
      case "fullscreen":
        return "min-h-[400px] md:min-h-[500px] max-h-[75vh]";
      default:
        return "min-h-[350px] md:min-h-[450px] max-h-[500px]";
    }
  };

  const getShadowClass = () => {
    if (shadowIntensity === "none") return "border border-gray-200";
    return `shadow-${shadowIntensity}`;
  };

  const getButtonStyle = () => ({
    borderRadius: `${buttonRadius}px`,
  });

  const getCardStyle = () => ({
    borderRadius: `${cardRadius}px`,
  });

  // --------------------
  // LOAD DATA
  // --------------------

  useEffect(() => {
    const loadAllData = async () => {
      const [
        settingsRes,
        galleryRes,
        sliderRes,
        facilitiesRes,
        testimonialsRes,
        teamRes,
        newsRes,
      ] = await Promise.allSettled([
        publicApi.get("/settings/public"),
        publicApi.get("/cms/gallery"),
        publicApi.get("/home-slider"),
        publicApi.get("/cms/facilities"),
        publicApi.get("/cms/testimonials"),
        publicApi.get("/team"),
        publicApi.get("/cms/news?status=PUBLISHED"),
      ]);

      if (settingsRes.status === "fulfilled")
        setSettings(settingsRes.value.data);
      if (galleryRes.status === "fulfilled") setGallery(galleryRes.value.data);
      if (sliderRes.status === "fulfilled")
        setSliderImages(sliderRes.value.data.filter((img: SliderImage) => img));
      if (facilitiesRes.status === "fulfilled")
        setFacilities(
          facilitiesRes.value.data.filter((f: Facility) => f.active),
        );
      if (testimonialsRes.status === "fulfilled")
        setTestimonials(
          testimonialsRes.value.data.filter((t: Testimonial) => t.active),
        );
      if (teamRes.status === "fulfilled") setTeam(teamRes.value.data);
      if (newsRes.status === "fulfilled")
        setNews(newsRes.value.data.slice(0, 3));

      setLoading(false);
    };

    loadAllData();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedGalleryImage(null);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // --------------------
  // UI
  // --------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SLIDER */}
      {sliderEnabled && sliderImages.length > 0 && (
        <section className="relative">
          <Swiper
            modules={[Autoplay, Pagination]}
            autoplay={{ delay: slideDuration, disableOnInteraction: false }}
            pagination={{
              clickable: true,
              bulletActiveClass: "swiper-pagination-bullet-active-custom",
            }}
            loop
            speed={800}
            className="w-full home-slider"
          >
            {sliderImages.map((img) => {
              const slideContent = (
                <div
                  className={`relative w-full ${getSliderHeightClass()} overflow-hidden`}
                >
                  <img
                    src={getImageUrl(img.imageUrl) || ""}
                    alt={img.title || "Slider"}
                    className={`w-full h-full ${kenBurnsEnabled ? "ken-burns-zoom" : ""}`}
                    style={{ objectFit: sliderImageFit as any }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-center justify-center">
                    {img.title && (
                      <div className="text-center text-white px-4 animate-fade-in">
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 drop-shadow-lg">
                          {img.title}
                        </h2>
                        {img.description && (
                          <p className="text-lg sm:text-xl md:text-2xl drop-shadow-md">
                            {img.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );

              return (
                <SwiperSlide key={img.id}>
                  {img.redirectUrl ? (
                    <a
                      href={img.redirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {slideContent}
                    </a>
                  ) : (
                    slideContent
                  )}
                </SwiperSlide>
              );
            })}
          </Swiper>
        </section>
      )}
      {/* HERO SECTION */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto px-4 text-center">
          {/* Logo */}
          {logoUrl ? (
            <div className="flex justify-center mb-6">
              <img
                src={getImageUrl(logoUrl) || ""}
                alt={academyName}
                className="h-32 sm:h-40 object-contain"
                onError={(e) => {
                  console.error("Logo failed to load:", logoUrl);
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center mb-6">
              <div
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center text-white text-5xl font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                {academyName.substring(0, 3).toUpperCase()}
              </div>
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{academyName}</h1>

          <p className="text-gray-600 text-lg max-w-3xl mx-auto mb-8">
            Transform your cricket skills with professional coaching,
            world-class facilities, and a winning environment. Join the
            champions today!
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() =>
                token ? navigate("/book-slot") : setShowLoginPrompt(true)
              }
              style={{ backgroundColor: primaryColor, ...getButtonStyle() }}
              className="px-8 py-4 text-white text-lg font-semibold hover:opacity-90 transition shadow-lg flex items-center justify-center gap-2"
            >
              Book a Slot
              <ArrowRight size={20} />
            </button>
            <button
              onClick={() =>
                document
                  .getElementById("contact")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="px-8 py-4 border-2 text-lg font-semibold hover:bg-gray-50 transition"
              style={{
                borderColor: primaryColor,
                color: primaryColor,
                ...getButtonStyle(),
              }}
            >
              Contact Us
            </button>
          </div>
        </div>
      </section>
      {/* STATS */}
      {statsEnabled && (
        <section
          className="py-16 px-4"
          style={{ backgroundColor: `${primaryColor}05` }}
        >
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Our Achievements
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatCard
                icon={<Users size={40} />}
                number="500+"
                label="Students Trained"
                primaryColor={primaryColor}
                cardStyle={getCardStyle()}
                shadowClass={getShadowClass()}
              />
              <StatCard
                icon={<Calendar size={40} />}
                number="10+"
                label="Years Experience"
                primaryColor={primaryColor}
                cardStyle={getCardStyle()}
                shadowClass={getShadowClass()}
              />
              <StatCard
                icon={<Trophy size={40} />}
                number="50+"
                label="Tournaments Won"
                primaryColor={primaryColor}
                cardStyle={getCardStyle()}
                shadowClass={getShadowClass()}
              />
              <StatCard
                icon={<Target size={40} />}
                number="98%"
                label="Success Rate"
                primaryColor={primaryColor}
                cardStyle={getCardStyle()}
                shadowClass={getShadowClass()}
              />
            </div>
          </div>
        </section>
      )}

      {/* STAR PERFORMER SECTION */}
      {starPerformerEnabled && (
        <section
          className="py-16 px-4"
          style={{ backgroundColor: `${primaryColor}05` }}
        >
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="flex justify-center mb-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Star
                    size={32}
                    className="fill-current"
                    style={{ color: primaryColor }}
                  />
                </div>
              </div>
              <h2
                className="text-3xl md:text-4xl font-bold mb-4"
                style={{ color: primaryColor }}
              >
                {starPerformerHeading}
              </h2>
              <p className="text-gray-600 text-lg">{starPerformerSubheading}</p>
            </div>

            {/* Show content if name exists, otherwise show placeholder */}
            {starPerformerName ? (
              <>
                {/* Star Performer Card */}
                <div
                  className={`bg-white overflow-hidden border-2 ${getShadowClass()}`}
                  style={{ borderColor: primaryColor, ...getCardStyle() }}
                >
                  <div
                    className="h-2"
                    style={{ backgroundColor: primaryColor }}
                  ></div>

                  <div className="p-8 md:p-12">
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                      {/* Photo */}
                      <div className="flex justify-center">
                        {starPerformerPhotoUrl ? (
                          <div className="relative">
                            <img
                              src={getImageUrl(starPerformerPhotoUrl) || ""}
                              alt={starPerformerName}
                              className="w-56 h-56 md:w-64 md:h-64 object-cover shadow-lg"
                              style={getCardStyle()}
                            />
                            <div
                              className="absolute -top-4 -right-4 w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                              style={{ backgroundColor: primaryColor }}
                            >
                              <Trophy size={32} className="text-white" />
                            </div>
                          </div>
                        ) : (
                          <div
                            className="w-56 h-56 md:w-64 md:h-64 flex items-center justify-center"
                            style={{
                              backgroundColor: `${primaryColor}15`,
                              ...getCardStyle(),
                            }}
                          >
                            <Star size={64} className="text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div>
                        <div className="mb-6">
                          <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3 break-words">
                            {starPerformerName}
                          </h3>
                          <div className="flex items-center gap-2 mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={20}
                                className="fill-current"
                                style={{ color: primaryColor }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-6" style={getCardStyle()}>
                          <h4
                            className="font-semibold mb-3 flex items-center gap-2 text-lg"
                            style={{ color: primaryColor }}
                          >
                            <Trophy size={20} />
                            Achievement
                          </h4>

                          <p className="text-gray-700 leading-relaxed whitespace-pre-line line-clamp-6 break-words">
                            {starPerformerAchievement ||
                              "Outstanding performance!"}
                          </p>
                        </div>

                        {/* View More Button */}
                        <button
                          onClick={() => navigate("/star-performer")}
                          className="mt-6 px-6 py-3 text-white font-semibold hover:opacity-90 transition shadow-md flex items-center gap-2"
                          style={{
                            backgroundColor: primaryColor,
                            ...getButtonStyle(),
                          }}
                        >
                          View Full Profile
                          <ArrowRight size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    className="h-2"
                    style={{
                      background: `linear-gradient(90deg, ${primaryColor} 0%, ${primaryColor}80 100%)`,
                    }}
                  ></div>
                </div>
              </>
            ) : (
              /* Placeholder when no performer is set */
              <div
                className={`bg-white p-12 text-center ${getShadowClass()}`}
                style={getCardStyle()}
              >
                <div
                  className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Star size={48} style={{ color: primaryColor }} />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  No Star Performer Set
                </h3>
                <p className="text-gray-600">
                  The academy admin will announce the star performer soon!
                </p>
              </div>
            )}
          </div>
        </section>
      )}
      {/* FACILITIES - FROM DATABASE OR FALLBACK */}
      {facilitiesEnabled && (
        <section id="facilities" className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              World-Class Facilities
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              State-of-the-art infrastructure designed to bring out the best in
              every player
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {facilities.length > 0 ? (
                facilities.map((facility) => (
                  <FacilityCard
                    key={facility.id}
                    title={facility.title}
                    description={facility.description}
                    primaryColor={primaryColor}
                    cardStyle={getCardStyle()}
                    shadowClass={getShadowClass()}
                  />
                ))
              ) : (
                <>
                  <FacilityCard
                    title="Professional Turf Wickets"
                    description="International-standard cricket pitches for match-like practice"
                    primaryColor={primaryColor}
                    cardStyle={getCardStyle()}
                    shadowClass={getShadowClass()}
                  />
                  <FacilityCard
                    title="Premium Astro Turf"
                    description="All-weather synthetic surface for consistent training"
                    primaryColor={primaryColor}
                    cardStyle={getCardStyle()}
                    shadowClass={getShadowClass()}
                  />
                  <FacilityCard
                    title="Flexible Timing"
                    description="Morning, evening, and weekend slots to fit your schedule"
                    primaryColor={primaryColor}
                    cardStyle={getCardStyle()}
                    shadowClass={getShadowClass()}
                  />
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── TEAM MEMBERS SECTION ── */}
      {settings.SECTION_TEAM_ENABLED !== "false" && team.length > 0 && (
        <section id="team" className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              Meet Our Coaches
            </h2>
            <p className="text-gray-600 text-center mb-12">
              Expert coaches dedicated to your cricket development
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {team.map((member) => (
                <div
                  key={member.id}
                  className={`bg-white text-center p-6 ${getShadowClass()}`}
                  style={getCardStyle()}
                >
                  <div
                    className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 border-4"
                    style={{ borderColor: `${primaryColor}30` }}
                  >
                    {member.photoUrl ? (
                      <img
                        src={getImageUrl(member.photoUrl) || ""}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {member.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-gray-800 truncate">
                    {member.name}
                  </h3>
                  <p
                    className="text-sm font-medium mb-2"
                    style={{ color: primaryColor }}
                  >
                    {member.role}
                  </p>
                  {member.bio && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 break-words">
                      {member.bio}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS - FROM DATABASE OR FALLBACK */}
      {testimonialsEnabled && (
        <section
          id="testimonials"
          className="py-16 px-4"
          style={{ backgroundColor: `${primaryColor}05` }}
        >
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              {testimonialsHeading}
            </h2>
            <p className="text-gray-600 text-center mb-12">
              {testimonialsSubheading}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.length > 0 ? (
                testimonials
                  .slice(0, 3)
                  .map((testimonial) => (
                    <TestimonialCard
                      key={testimonial.id}
                      name={testimonial.name}
                      role={testimonial.role}
                      text={testimonial.text}
                      rating={testimonial.rating || 5}
                      photoUrl={testimonial.photoUrl}
                      primaryColor={primaryColor}
                      cardStyle={getCardStyle()}
                      shadowClass={getShadowClass()}
                    />
                  ))
              ) : (
                <>
                  <TestimonialCard
                    name="Rahul Sharma"
                    role="U-16 Player"
                    text="The coaching here is exceptional! I improved my batting average by 40% in just 6 months. The facilities are top-notch!"
                    rating={5}
                    primaryColor={primaryColor}
                    cardStyle={getCardStyle()}
                    shadowClass={getShadowClass()}
                  />
                  <TestimonialCard
                    name="Priya Patel"
                    role="Parent"
                    text="My daughter absolutely loves training here. The coaches are professional, patient, and genuinely care about every child's development."
                    rating={5}
                    primaryColor={primaryColor}
                    cardStyle={getCardStyle()}
                    shadowClass={getShadowClass()}
                  />
                  <TestimonialCard
                    name="Amit Kumar"
                    role="U-19 Player"
                    text="Best academy in the city! The training methods are scientific and effective. Got selected for state trials thanks to the coaching here."
                    rating={5}
                    primaryColor={primaryColor}
                    cardStyle={getCardStyle()}
                    shadowClass={getShadowClass()}
                  />
                </>
              )}
            </div>
          </div>
        </section>
      )}
      {/* NEWS & ANNOUNCEMENTS - FROM DATABASE OR FALLBACK */}
      {newsEnabled && (
        <section id="news" className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              {newsHeading}
            </h2>
            <p className="text-gray-600 text-center mb-12">{newsSubheading}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {news.length > 0 ? (
                news.map((article) => (
                  <NewsCard
                    key={article.id}
                    title={article.title}
                    date={new Date(article.publishedAt).toLocaleDateString()}
                    category={article.category || "News"}
                    excerpt={article.shortDescription || ""}
                    imageUrl={article.featuredImageUrl}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    cardStyle={getCardStyle()}
                    shadowClass={getShadowClass()}
                  />
                ))
              ) : (
                <>
                  <NewsCard
                    title="Summer Camp 2026 Registration Open"
                    date="Jan 25, 2026"
                    category="Announcement"
                    excerpt="Join our intensive 6-week summer training program. Expert coaching, match practice, and fitness sessions included. Limited seats!"
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    cardStyle={getCardStyle()}
                    shadowClass={getShadowClass()}
                  />
                  <NewsCard
                    title="Students Win District Championship"
                    date="Jan 20, 2026"
                    category="Achievement"
                    excerpt="Proud moment! Our U-16 team clinched the district championship. Three players selected for state-level trials."
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    cardStyle={getCardStyle()}
                    shadowClass={getShadowClass()}
                  />
                  <NewsCard
                    title="New Indoor Practice Facility"
                    date="Jan 15, 2026"
                    category="Facility Update"
                    excerpt="We're launching a new climate-controlled indoor practice center with bowling machines and video analysis."
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    cardStyle={getCardStyle()}
                    shadowClass={getShadowClass()}
                  />
                </>
              )}
            </div>
          </div>
        </section>
      )}
      {/* GALLERY - FROM DATABASE OR FALLBACK */}
      {galleryEnabled && (
        <section
          id="gallery"
          className="py-12 px-4"
          style={{ backgroundColor: `${primaryColor}05` }}
        >
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              {galleryHeading}
            </h2>
            <p className="text-gray-600 text-center mb-12">
              {gallerySubheading}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {gallery.length > 0 ? (
                gallery.map((image) => (
                  <GalleryImageItem
                    key={image.id}
                    image={image}
                    primaryColor={primaryColor}
                    isWide={!!wideImages[image.id]}
                    cardRadius={cardRadius}
                    onDetectedWide={(isWide) =>
                      setWideImages((prev) => {
                        if (prev[image.id] === isWide) return prev;
                        return { ...prev, [image.id]: isWide };
                      })
                    }
                    onClick={() => setSelectedGalleryImage(image)}
                  />
                ))
              ) : (
                <>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <GalleryItem
                      key={i}
                      primaryColor={primaryColor}
                      cardRadius={cardRadius}
                      index={i}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </section>
      )}
      {/* CONTACT - FROM DATABASE OR FALLBACK */}
      <ContactForm
        primaryColor={primaryColor}
        cardStyle={getCardStyle()}
        getShadowClass={getShadowClass}
        settings={settings}
      />
      {/* FOOTER WITH SOCIAL MEDIA */}
      <footer className="py-8 px-4 text-center border-t bg-white">
        {/* Social Media Icons */}
        {(socialLinks.facebook ||
          socialLinks.instagram ||
          socialLinks.twitter ||
          socialLinks.youtube ||
          socialLinks.linkedin) && (
          <div className="flex justify-center gap-4 mb-6">
            {socialLinks.facebook && (
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full hover:bg-gray-100 transition"
                style={{ color: primaryColor }}
                title="Facebook"
              >
                <Facebook size={24} />
              </a>
            )}
            {socialLinks.instagram && (
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full hover:bg-gray-100 transition"
                style={{ color: primaryColor }}
                title="Instagram"
              >
                <Instagram size={24} />
              </a>
            )}
            {socialLinks.twitter && (
              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full hover:bg-gray-100 transition"
                style={{ color: primaryColor }}
                title="Twitter"
              >
                <Twitter size={24} />
              </a>
            )}
            {socialLinks.youtube && (
              <a
                href={socialLinks.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full hover:bg-gray-100 transition"
                style={{ color: primaryColor }}
                title="YouTube"
              >
                <Youtube size={24} />
              </a>
            )}
            {socialLinks.linkedin && (
              <a
                href={socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-full hover:bg-gray-100 transition"
                style={{ color: primaryColor }}
                title="LinkedIn"
              >
                <Linkedin size={24} />
              </a>
            )}
          </div>
        )}

        <p className="text-gray-600">
          © 2026 {academyName}. All rights reserved.
        </p>
      </footer>
      {/* LOGIN MODAL */}
      <LoginPromptModal
        open={showLoginPrompt}
        message="Please login to book a slot."
        onConfirm={() => navigate("/login")}
        onCancel={() => setShowLoginPrompt(false)}
      />

      {/* GALLERY LIGHTBOX MODAL */}
      {selectedGalleryImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedGalleryImage(null)}
        >
          <div
            className="relative bg-white max-w-5xl w-full max-h-[90vh] overflow-hidden"
            style={getCardStyle()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className="absolute top-3 right-3 z-10 bg-black/70 text-white px-3 py-1 hover:bg-black"
              style={getButtonStyle()}
              onClick={() => setSelectedGalleryImage(null)}
            >
              ✕
            </button>

            {/* Image */}
            <div className="w-full h-[80vh] bg-black flex items-center justify-center">
              <img
                src={getImageUrl(selectedGalleryImage.imageUrl) || ""}
                alt={selectedGalleryImage.caption || "Gallery"}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Caption */}
            {selectedGalleryImage.caption && (
              <div className="p-4 text-center text-gray-700 break-words">
                {selectedGalleryImage.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------
// COMPONENTS
// --------------------

function StatCard({
  icon,
  number,
  label,
  primaryColor,
  cardStyle,
  shadowClass,
}: {
  icon: React.ReactNode;
  number: string;
  label: string;
  primaryColor: string;
  cardStyle: React.CSSProperties;
  shadowClass: string;
}) {
  return (
    <div
      className={`bg-white p-8 text-center hover:shadow-xl transition ${shadowClass}`}
      style={cardStyle}
    >
      <div className="flex justify-center mb-4" style={{ color: primaryColor }}>
        {icon}
      </div>
      <div className="text-4xl font-bold mb-2" style={{ color: primaryColor }}>
        {number}
      </div>
      <div className="text-gray-600">{label}</div>
    </div>
  );
}

function FacilityCard({
  title,
  description,
  primaryColor,
  cardStyle,
  shadowClass,
}: {
  title: string;
  description: string;
  primaryColor: string;
  cardStyle: React.CSSProperties;
  shadowClass: string;
}) {
  return (
    <div
      className={`bg-white p-8 hover:shadow-xl transition border-t-4 ${shadowClass}`}
      style={{ borderColor: primaryColor, ...cardStyle }}
    >
      <div
        className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
        style={{ backgroundColor: `${primaryColor}15` }}
      >
        <Award size={32} style={{ color: primaryColor }} />
      </div>
      <h3 className="text-xl font-bold mb-3 text-center">{title}</h3>

      <p className="text-gray-600 text-center text-sm line-clamp-3 break-words">
        {description}
      </p>
    </div>
  );
}

function TestimonialCard({
  name,
  role,
  text,
  rating,
  photoUrl,
  primaryColor,
  cardStyle,
  shadowClass,
}: {
  name: string;
  role: string;
  text: string;
  rating: number;
  photoUrl?: string;
  primaryColor: string;
  cardStyle: React.CSSProperties;
  shadowClass: string;
}) {
  return (
    <div
      className={`bg-white p-8 hover:shadow-xl transition ${shadowClass}`}
      style={cardStyle}
    >
      <div className="flex justify-center mb-4">
        {[...Array(rating)].map((_, i) => (
          <Star
            key={i}
            className="w-5 h-5"
            fill={primaryColor}
            style={{ color: primaryColor }}
          />
        ))}
      </div>
      <p className="text-gray-700 mb-6 italic line-clamp-4 break-words">
        "{text}"
      </p>
      <div className="flex items-center gap-4">
        {photoUrl ? (
          <img
            src={getImageUrl(photoUrl) || ""}
            alt={name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: primaryColor }}
          >
            {name.charAt(0)}
          </div>
        )}
        <div>
          <div className="font-bold">{name}</div>
          <div className="text-sm text-gray-500">{role}</div>
        </div>
      </div>
    </div>
  );
}

function NewsCard({
  title,
  date,
  category,
  excerpt,
  imageUrl,
  primaryColor,
  secondaryColor,
  cardStyle,
  shadowClass,
}: {
  title: string;
  date: string;
  category: string;
  excerpt: string;
  imageUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  cardStyle: React.CSSProperties;
  shadowClass: string;
}) {
  return (
    <div
      className={`bg-white hover:shadow-xl transition overflow-hidden ${shadowClass}`}
      style={cardStyle}
    >
      {imageUrl && (
        <div className="h-48 overflow-hidden">
          <img
            src={getImageUrl(imageUrl) || ""}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {!imageUrl && (
        <div className="h-3" style={{ backgroundColor: primaryColor }} />
      )}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-xs px-3 py-1 rounded-full font-semibold text-white"
            style={{ backgroundColor: secondaryColor }}
          >
            {category}
          </span>
          <span className="text-xs text-gray-500">{date}</span>
        </div>

        <h3 className="text-xl font-bold mb-3 line-clamp-2">{title}</h3>

        <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 break-words">
          {excerpt}
        </p>
      </div>
    </div>
  );
}

function GalleryImageItem({
  image,
  primaryColor,
  isWide,
  cardRadius,
  onDetectedWide,
  onClick,
}: {
  image: GalleryImage;
  primaryColor: string;
  isWide: boolean;
  cardRadius: string;
  onDetectedWide: (isWide: boolean) => void;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`overflow-hidden shadow-md hover:shadow-xl transition cursor-pointer relative group
        ${isWide ? "col-span-2 aspect-[16/9]" : "col-span-1 aspect-square"}
      `}
      style={{ borderRadius: `${cardRadius}px` }}
    >
      <img
        src={getImageUrl(image.imageUrl) || ""}
        alt={image.caption || "Gallery"}
        className="w-full h-full object-cover transition-transform group-hover:scale-110"
        onLoad={(e) => {
          const imgEl = e.currentTarget;
          const wide = imgEl.naturalWidth / imgEl.naturalHeight > 1.25;
          onDetectedWide(wide);
        }}
      />

      {image.caption && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-4"
          style={{ backgroundColor: `${primaryColor}90` }}
        >
          <span className="text-white font-semibold text-center text-sm">
            {image.caption}
          </span>
        </div>
      )}
    </div>
  );
}

function GalleryItem({
  primaryColor,
  cardRadius,
  index,
}: {
  primaryColor: string;
  cardRadius: string;
  index: number;
}) {
  return (
    <div
      className="aspect-square overflow-hidden shadow-md hover:shadow-xl transition cursor-pointer relative group"
      style={{
        backgroundColor: `${primaryColor}10`,
        borderRadius: `${cardRadius}px`,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
        <span className="text-sm">Photo {index}</span>
      </div>
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
        style={{ backgroundColor: `${primaryColor}90` }}
      >
        <span className="text-white font-semibold">View</span>
      </div>
    </div>
  );
}

export default Home;
