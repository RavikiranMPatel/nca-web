import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  Award,
  ArrowRight,
  Star,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  X,
  Megaphone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import LoginPromptModal from "../components/LoginPromptModal";
import publicApi from "../api/publicApi";
import { getImageUrl } from "../utils/imageUrl";
import ContactForm from "../components/ContactForm";

/* Swiper */
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

/* ─── Types ─────────────────────────────────────────────── */
type SliderImage = {
  id: string;
  imageUrl: string;
  mobileImageUrl?: string;
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
  TESTIMONIALS_HEADING?: string;
  TESTIMONIALS_SUBHEADING?: string;
  NEWS_HEADING?: string;
  NEWS_SUBHEADING?: string;
  GALLERY_HEADING?: string;
  GALLERY_SUBHEADING?: string;
  STAR_PERFORMER_HEADING?: string;
  STAR_PERFORMER_SUBHEADING?: string;
  STAR_PERFORMER_NAME?: string;
  STAR_PERFORMER_ACHIEVEMENT?: string;
  STAR_PERFORMER_PHOTO_URL?: string;
  SOCIAL_FACEBOOK?: string;
  SOCIAL_TWITTER?: string;
  SOCIAL_INSTAGRAM?: string;
  SOCIAL_YOUTUBE?: string;
  SOCIAL_LINKEDIN?: string;
  SECTION_FACILITIES_ENABLED?: string;
  SECTION_TEAM_ENABLED?: string;
  ANNOUNCEMENT_ENABLED?: string;
  ANNOUNCEMENT_TEXT?: string;
  ANNOUNCEMENT_EXPIRY?: string;
  SECTION_YOUTUBE_ENABLED?: string;
  YOUTUBE_HEADING?: string;
  YOUTUBE_SUBHEADING?: string;
  YOUTUBE_VIDEO_1?: string;
  YOUTUBE_VIDEO_2?: string;
  YOUTUBE_VIDEO_3?: string;
  YOUTUBE_VIDEO_4?: string;
  YOUTUBE_VIDEO_5?: string;
  SECTION_INSTAGRAM_ENABLED?: string;
  INSTAGRAM_HEADING?: string;
  INSTAGRAM_SUBHEADING?: string;
  INSTAGRAM_POST_1?: string;
  INSTAGRAM_POST_2?: string;
  INSTAGRAM_POST_3?: string;
  INSTAGRAM_POST_4?: string;
  INSTAGRAM_POST_5?: string;
};

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

/* ─── YouTube Grid ──────────────────────────────────────── */
function YoutubeGrid({
  videos,
  getShadowClass,
  getCardStyle,
  getButtonStyle,
}: {
  videos: string[];
  primaryColor: string;
  getShadowClass: () => string;
  getCardStyle: () => object;
  getButtonStyle: () => object;
}) {
  const getVideoInfo = (
    url: string,
  ): { embedUrl: string; isShort: boolean } | null => {
    try {
      const u = new URL(url);
      // Shorts
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/shorts/")[1].split("?")[0];
        return {
          embedUrl: `https://www.youtube.com/embed/${id}`,
          isShort: true,
        };
      }
      // Regular
      const videoId =
        u.searchParams.get("v") ||
        (u.hostname === "youtu.be" ? u.pathname.slice(1) : null);
      if (videoId)
        return {
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          isShort: false,
        };
      return null;
    } catch {
      return null;
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-start">
        {videos.map((url, i) => {
          const info = getVideoInfo(url);
          if (!info) return null;
          return (
            <div
              key={i}
              className={`overflow-hidden bg-black ${getShadowClass()} ${!info.isShort ? "col-span-2 md:col-span-1" : "col-span-1"}`}
              style={getCardStyle()}
            >
              <div
                className="relative w-full"
                style={{ paddingBottom: info.isShort ? "177.78%" : "56.25%" }}
              >
                <iframe
                  src={info.embedUrl}
                  title={`Video ${i + 1}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                  style={{ border: "none" }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-center mt-8">
        <a
          href="https://www.youtube.com/@nextgencricketacademy-j9t"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold text-sm hover:opacity-90 transition shadow"
          style={{ backgroundColor: "#FF0000", ...getButtonStyle() }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          View Our YouTube Channel
        </a>
      </div>
    </>
  );
}

/* ─── Instagram Grid ─────────────────────────────────────── */
function InstagramGrid({
  posts,
  getShadowClass,
  getCardStyle,
  getButtonStyle,
  instagramUrl,
}: {
  posts: string[];
  primaryColor: string;
  getShadowClass: () => string;
  getCardStyle: () => object;
  getButtonStyle: () => object;
  instagramUrl?: string;
}) {
  useEffect(() => {
    // Load Instagram embed script
    if ((window as any).instgrm) {
      (window as any).instgrm.Embeds.process();
    } else {
      const script = document.createElement("script");
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      script.onload = () => {
        if ((window as any).instgrm) {
          (window as any).instgrm.Embeds.process();
        }
      };
      document.body.appendChild(script);
    }
  }, [posts]);

  const getCleanUrl = (url: string): string => {
    // Strip query params like ?utm_source etc, keep just the post URL
    try {
      const u = new URL(url);
      return `${u.origin}${u.pathname}`;
    } catch {
      return url;
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {posts.map((url, i) => (
          <div
            key={i}
            className={`overflow-hidden bg-white ${getShadowClass()}`}
            style={getCardStyle()}
          >
            <blockquote
              className="instagram-media"
              data-instgrm-permalink={getCleanUrl(url)}
              data-instgrm-version="14"
              style={{
                background: "#FFF",
                border: 0,
                borderRadius: "3px",
                boxShadow: "none",
                margin: "0",
                maxWidth: "100%",
                minWidth: "100%",
                padding: 0,
                width: "100%",
              }}
            />
          </div>
        ))}
      </div>
      <div className="text-center mt-8">
        <a
          href={instagramUrl || "https://www.instagram.com"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold text-sm hover:opacity-90 transition shadow"
          style={{
            background:
              "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
            ...getButtonStyle(),
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
          </svg>
          Follow Us on Instagram
        </a>
      </div>
    </>
  );
}

/* ─── Section Heading ───────────────────────────────────── */
function SectionHeading({
  title,
  subtitle,
  primaryColor,
}: {
  title: string;
  subtitle?: string;
  primaryColor: string;
}) {
  return (
    <div className="text-center mb-12">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
        {title}
      </h2>
      {subtitle && (
        <p className="text-gray-500 text-base md:text-lg max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
      <div
        className="h-1 w-16 mx-auto mt-4 rounded-full"
        style={{ backgroundColor: primaryColor }}
      />
    </div>
  );
}

/* ─── Home ──────────────────────────────────────────────── */
function Home() {
  const navigate = useNavigate();

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
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

  /* ── Derived settings ── */
  const academyName = settings.ACADEMY_NAME || "NextGen Cricket Academy";
  const logoUrl = settings.LOGO_URL;
  const primaryColor = settings.PRIMARY_COLOR || "#2563eb";
  const secondaryColor = settings.SECONDARY_COLOR || "#10b981";
  const buttonRadius = settings.BUTTON_RADIUS || "8";
  const cardRadius = settings.CARD_RADIUS || "12";
  const shadowIntensity = settings.SHADOW_INTENSITY || "md";
  const slideDuration = parseInt(settings.SLIDE_DURATION || "5000");

  const sliderEnabled = settings.SECTION_SLIDER_ENABLED !== "false";

  const facilitiesEnabled = settings.SECTION_FACILITIES_ENABLED !== "false";
  const testimonialsEnabled = settings.SECTION_TESTIMONIALS_ENABLED !== "false";
  const newsEnabled = settings.SECTION_NEWS_ENABLED !== "false";
  const galleryEnabled = settings.SECTION_GALLERY_ENABLED !== "false";
  const starPerformerEnabled =
    settings.SECTION_STAR_PERFORMER_ENABLED !== "false";

  const youtubeEnabled = settings.SECTION_YOUTUBE_ENABLED !== "false";
  const youtubeHeading = settings.YOUTUBE_HEADING || "Watch Us in Action";
  const youtubeSubheading =
    settings.YOUTUBE_SUBHEADING ||
    "Training highlights, match moments and more from our academy";
  const youtubeVideos = [
    settings.YOUTUBE_VIDEO_1,
    settings.YOUTUBE_VIDEO_2,
    settings.YOUTUBE_VIDEO_3,
    settings.YOUTUBE_VIDEO_4,
    settings.YOUTUBE_VIDEO_5,
  ].filter(Boolean) as string[];

  const instagramEnabled = settings.SECTION_INSTAGRAM_ENABLED !== "false";
  const instagramHeading =
    settings.INSTAGRAM_HEADING || "Follow Us on Instagram";
  const instagramSubheading =
    settings.INSTAGRAM_SUBHEADING || "Stay connected with our latest updates";
  const instagramPosts = [
    settings.INSTAGRAM_POST_1,
    settings.INSTAGRAM_POST_2,
    settings.INSTAGRAM_POST_3,
    settings.INSTAGRAM_POST_4,
    settings.INSTAGRAM_POST_5,
  ].filter(Boolean) as string[];

  const starPerformerHeading =
    settings.STAR_PERFORMER_HEADING || "Star Performer of the Week";
  const starPerformerSubheading =
    settings.STAR_PERFORMER_SUBHEADING ||
    "Celebrating excellence and dedication";
  const starPerformerName = settings.STAR_PERFORMER_NAME || "";
  const starPerformerAchievement = settings.STAR_PERFORMER_ACHIEVEMENT || "";
  const starPerformerPhotoUrl = settings.STAR_PERFORMER_PHOTO_URL || "";

  const testimonialsHeading =
    settings.TESTIMONIALS_HEADING || "What Our Students Say";
  const testimonialsSubheading =
    settings.TESTIMONIALS_SUBHEADING ||
    "Real success stories from our cricket family";
  const newsHeading = settings.NEWS_HEADING || "Latest News & Updates";
  const newsSubheading =
    settings.NEWS_SUBHEADING || "Stay updated with our latest achievements";
  const galleryHeading = settings.GALLERY_HEADING || "Gallery";
  const gallerySubheading =
    settings.GALLERY_SUBHEADING ||
    "Glimpses from our training sessions and tournaments";

  const socialLinks = {
    facebook: settings.SOCIAL_FACEBOOK,
    twitter: settings.SOCIAL_TWITTER,
    instagram: settings.SOCIAL_INSTAGRAM,
    youtube: settings.SOCIAL_YOUTUBE,
    linkedin: settings.SOCIAL_LINKEDIN,
  };

  const getButtonStyle = () => ({ borderRadius: `${buttonRadius}px` });
  const getCardStyle = () => ({ borderRadius: `${cardRadius}px` });
  const getShadowClass = () =>
    shadowIntensity === "none"
      ? "border border-gray-200"
      : `shadow-${shadowIntensity}`;

  /* ── Load data ── */
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div
          className="animate-spin rounded-full h-14 w-14 border-4 border-t-transparent"
          style={{
            borderColor: `${primaryColor}40`,
            borderTopColor: primaryColor,
          }}
        />
      </div>
    );
  }

  const hasSlider = sliderEnabled && sliderImages.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      {/* ── ANNOUNCEMENT BAR ── */}
      {/* ── ANNOUNCEMENT BAR ── */}
      {(() => {
        const enabled = settings.ANNOUNCEMENT_ENABLED !== "false";
        const text = settings.ANNOUNCEMENT_TEXT || "";
        const expiry = settings.ANNOUNCEMENT_EXPIRY;
        const expired = expiry ? new Date() > new Date(expiry) : false;
        if (!enabled || !text || expired) return null;
        return (
          announcementVisible && (
            <div
              className="relative z-40 py-2.5 px-4"
              style={{
                background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
              }}
            >
              <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Megaphone
                    size={15}
                    className="text-white shrink-0 opacity-90"
                  />
                  <p className="text-white text-xs sm:text-sm font-medium truncate">
                    {text}
                    <button
                      onClick={() =>
                        document
                          .getElementById("contact")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                      className="underline underline-offset-2 ml-2 opacity-90 hover:opacity-100 whitespace-nowrap"
                    >
                      Register now →
                    </button>
                  </p>
                </div>
                <button
                  onClick={() => setAnnouncementVisible(false)}
                  className="text-white opacity-70 hover:opacity-100 transition shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )
        );
      })()}

      {/* ── SLIDER ── */}
      {hasSlider && (
        <section className="w-full bg-gray-100 relative">
          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            autoplay={{ delay: slideDuration, disableOnInteraction: false }}
            pagination={{
              clickable: true,
              el: ".slider-pagination",
            }}
            navigation={{
              prevEl: ".slider-prev",
              nextEl: ".slider-next",
            }}
            loop
            speed={700}
            className="w-full"
          >
            {sliderImages.map((img) => {
              const imgContent = (
                <div className="relative w-full bg-gray-100 flex items-center justify-center">
                  <img
                    src={getImageUrl(img.imageUrl) || ""}
                    alt={img.title || academyName}
                    className="w-full object-contain max-h-[50vw] min-h-[200px] md:max-h-[60vh]"
                    style={{ display: "block" }}
                  />
                  {img.title && (
                    <div className="absolute inset-0 flex items-end justify-center pb-8 bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
                      <div className="text-center text-white px-4">
                        <h2 className="text-xl sm:text-3xl md:text-5xl font-bold mb-1 drop-shadow-lg">
                          {img.title}
                        </h2>
                        {img.description && (
                          <p className="text-xs sm:text-base drop-shadow-md">
                            {img.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
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
                      {imgContent}
                    </a>
                  ) : (
                    imgContent
                  )}
                </SwiperSlide>
              );
            })}
          </Swiper>

          {/* Pagination dots — below image, always visible */}
          <div className="slider-pagination flex justify-center py-2" />

          {/* Nav arrows — desktop only */}
          <button
            className="slider-prev hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md items-center justify-center transition"
            style={{ color: primaryColor }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="slider-next hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md items-center justify-center transition"
            style={{ color: primaryColor }}
          >
            <ChevronRight size={20} />
          </button>
        </section>
      )}

      {/* ── CTA STRIP — shown below slider ── */}
      {hasSlider && (
        <section
          className="py-5 px-4 border-b"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}08 0%, #ffffff 60%, ${secondaryColor}08 100%)`,
          }}
        >
          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate("/book-slot")}
              style={{ backgroundColor: primaryColor, ...getButtonStyle() }}
              className="px-8 py-3 text-white font-bold text-sm hover:opacity-90 transition shadow-md flex items-center gap-2"
            >
              🏏 Book a Training Slot
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() =>
                document
                  .getElementById("contact")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="px-8 py-3 border-2 font-semibold text-sm hover:bg-gray-50 transition flex items-center gap-2"
              style={{
                borderColor: primaryColor,
                color: primaryColor,
                ...getButtonStyle(),
              }}
            >
              Contact Us
            </button>
          </div>
        </section>
      )}

      {/* ── HERO (no slider) ── */}
      {!hasSlider && (
        <section
          className="py-16 md:py-24 px-4 text-center"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}12 0%, #ffffff 50%, ${secondaryColor}10 100%)`,
          }}
        >
          <div className="max-w-4xl mx-auto">
            {logoUrl ? (
              <div className="flex justify-center mb-6">
                <img
                  src={getImageUrl(logoUrl) || ""}
                  alt={academyName}
                  className="h-28 sm:h-36 object-contain"
                />
              </div>
            ) : (
              <div className="flex justify-center mb-6">
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-xl"
                  style={{ backgroundColor: primaryColor }}
                >
                  {academyName.substring(0, 3).toUpperCase()}
                </div>
              </div>
            )}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-5 leading-tight">
              {academyName}
            </h1>
            <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto mb-10">
              Transform your cricket skills with professional coaching,
              world-class facilities, and a winning environment.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate("/book-slot")}
                style={{ backgroundColor: primaryColor, ...getButtonStyle() }}
                className="w-full sm:w-auto px-8 py-4 text-white text-base font-semibold hover:opacity-90 transition shadow-lg flex items-center justify-center gap-2"
              >
                Book a Slot <ArrowRight size={18} />
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("contact")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="w-full sm:w-auto px-8 py-4 border-2 text-base font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
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
      )}

      {/* ── STAR PERFORMER ── */}
      {starPerformerEnabled && (
        <section
          className="py-10 md:py-14 px-4"
          style={{ backgroundColor: `${primaryColor}06` }}
        >
          <div className="max-w-4xl mx-auto">
            <SectionHeading
              title={starPerformerHeading}
              subtitle={starPerformerSubheading}
              primaryColor={primaryColor}
            />
            {starPerformerName ? (
              <div
                className={`bg-white overflow-hidden border-2 ${getShadowClass()}`}
                style={{ borderColor: `${primaryColor}40`, ...getCardStyle() }}
              >
                <div
                  className="h-1.5"
                  style={{
                    background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
                  }}
                />
                <div className="p-8 md:p-10">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="flex justify-center">
                      {starPerformerPhotoUrl ? (
                        <div className="relative">
                          <img
                            src={getImageUrl(starPerformerPhotoUrl) || ""}
                            alt={starPerformerName}
                            className="w-52 h-52 md:w-60 md:h-60 object-cover shadow-lg"
                            style={getCardStyle()}
                          />
                          <div
                            className="absolute -top-3 -right-3 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Trophy size={22} className="text-white" />
                          </div>
                        </div>
                      ) : (
                        <div
                          className="w-52 h-52 flex items-center justify-center"
                          style={{
                            backgroundColor: `${primaryColor}12`,
                            ...getCardStyle(),
                          }}
                        >
                          <Star size={56} className="text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                        {starPerformerName}
                      </h3>
                      <div className="flex items-center gap-1 mb-5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={18}
                            className="fill-current"
                            style={{ color: primaryColor }}
                          />
                        ))}
                      </div>
                      <div className="bg-gray-50 p-5 rounded-xl mb-5">
                        <h4
                          className="font-semibold mb-2 flex items-center gap-2"
                          style={{ color: primaryColor }}
                        >
                          <Trophy size={16} /> Achievement
                        </h4>
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-5">
                          {starPerformerAchievement ||
                            "Outstanding performance!"}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate("/star-performer")}
                        className="px-5 py-2.5 text-white text-sm font-semibold hover:opacity-90 transition shadow flex items-center gap-2"
                        style={{
                          backgroundColor: primaryColor,
                          ...getButtonStyle(),
                        }}
                      >
                        View Full Profile <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`bg-white p-10 text-center ${getShadowClass()}`}
                style={getCardStyle()}
              >
                <Star size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">
                  The academy admin will announce the star performer soon!
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── FACILITIES ── */}
      {facilitiesEnabled && (
        <section id="facilities" className="py-10 md:py-14 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <SectionHeading
              title="World-Class Facilities"
              subtitle="State-of-the-art infrastructure designed to bring out the best in every player"
              primaryColor={primaryColor}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(facilities.length > 0
                ? facilities
                : [
                    {
                      id: "1",
                      title: "Professional Turf Wickets",
                      description:
                        "International-standard cricket pitches for match-like practice",
                      displayOrder: 1,
                      active: true,
                    },
                    {
                      id: "2",
                      title: "Premium Astro Turf",
                      description:
                        "All-weather synthetic surface for consistent training",
                      displayOrder: 2,
                      active: true,
                    },
                    {
                      id: "3",
                      title: "Flexible Timing",
                      description:
                        "Morning, evening, and weekend slots to fit your schedule",
                      displayOrder: 3,
                      active: true,
                    },
                  ]
              ).map((facility) => (
                <div
                  key={facility.id}
                  className={`bg-white p-7 hover:shadow-xl transition-shadow border-t-4 ${getShadowClass()}`}
                  style={{ borderColor: primaryColor, ...getCardStyle() }}
                >
                  <div
                    className="w-14 h-14 rounded-xl mb-5 flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}12` }}
                  >
                    <Award size={28} style={{ color: primaryColor }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-gray-800">
                    {facility.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {facility.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TEAM ── */}
      {/* ── TEAM ── */}
      {settings.SECTION_TEAM_ENABLED !== "false" && team.length > 0 && (
        <section
          id="team"
          className="py-10 md:py-14 px-4"
          style={{ backgroundColor: `${primaryColor}06` }}
        >
          <div className="max-w-6xl mx-auto">
            <SectionHeading
              title="Meet Our Coaches"
              subtitle="Expert coaches dedicated to your cricket development"
              primaryColor={primaryColor}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {team.map((member) => (
                <div
                  key={member.id}
                  className={`bg-white text-center p-6 hover:shadow-xl transition-shadow relative group ${getShadowClass()}`}
                  style={getCardStyle()}
                  onClick={() =>
                    setExpandedMemberId(
                      expandedMemberId === member.id ? null : member.id,
                    )
                  }
                >
                  <div
                    className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 ring-4"
                    style={{ ringColor: `${primaryColor}30` }}
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

                  <h3 className="font-bold text-gray-800">{member.name}</h3>
                  <p
                    className="text-sm font-medium mt-0.5"
                    style={{ color: primaryColor }}
                  >
                    {member.role}
                  </p>

                  {member.bio && (
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed line-clamp-3">
                      {member.bio}
                    </p>
                  )}

                  {/* Tap hint — mobile only */}
                  {member.bio && (
                    <p
                      className="sm:hidden text-xs mt-2 font-medium"
                      style={{ color: primaryColor }}
                    >
                      {expandedMemberId === member.id
                        ? "Tap to close ▲"
                        : "Tap to read more ▼"}
                    </p>
                  )}

                  {/* Mobile expanded bio */}
                  {member.bio && expandedMemberId === member.id && (
                    <div
                      className="sm:hidden mt-3 p-3 rounded-xl text-xs text-left leading-relaxed text-white"
                      style={{ backgroundColor: "#1f2937" }}
                    >
                      {member.bio}
                    </div>
                  )}

                  {/* Desktop hover tooltip */}
                  {member.bio && (
                    <div
                      className="hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-gray-900 text-white text-xs leading-relaxed rounded-xl shadow-xl
                   opacity-0 group-hover:opacity-100 pointer-events-none
                   transition-opacity duration-200 z-30 text-left"
                      style={{ maxWidth: "min(256px, 90vw)" }}
                    >
                      {member.bio}
                      <div
                        className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0
                        border-l-8 border-r-8 border-t-8
                        border-l-transparent border-r-transparent border-t-gray-900"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ── */}
      {testimonialsEnabled && (
        <section id="testimonials" className="py-10 md:py-14 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <SectionHeading
              title={testimonialsHeading}
              subtitle={testimonialsSubheading}
              primaryColor={primaryColor}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(testimonials.length > 0
                ? testimonials.slice(0, 3)
                : [
                    {
                      id: "1",
                      name: "Rahul Sharma",
                      role: "U-16 Player",
                      text: "The coaching here is exceptional! I improved my batting average by 40% in just 6 months.",
                      rating: 5,
                      active: true,
                    },
                    {
                      id: "2",
                      name: "Priya Patel",
                      role: "Parent",
                      text: "My daughter absolutely loves training here. The coaches are professional and genuinely care.",
                      rating: 5,
                      active: true,
                    },
                    {
                      id: "3",
                      name: "Amit Kumar",
                      role: "U-19 Player",
                      text: "Best academy in the city! Got selected for state trials thanks to the coaching here.",
                      rating: 5,
                      active: true,
                    },
                  ]
              ).map((t) => (
                <div
                  key={t.id}
                  className={`bg-white p-7 hover:shadow-xl transition-shadow flex flex-col ${getShadowClass()}`}
                  style={getCardStyle()}
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(t.rating || 5)].map((_, i) => (
                      <Star
                        key={i}
                        size={15}
                        fill={primaryColor}
                        style={{ color: primaryColor }}
                      />
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed italic flex-1 mb-5 line-clamp-4">
                    "{t.text}"
                  </p>
                  <div className="flex items-center gap-3">
                    {"photoUrl" in t && t.photoUrl ? (
                      <img
                        src={getImageUrl(t.photoUrl as string) || ""}
                        alt={t.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {t.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-sm text-gray-800">
                        {t.name}
                      </div>
                      <div className="text-xs text-gray-400">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── NEWS ── */}
      {newsEnabled && (
        <section
          id="news"
          className="py-10 md:py-14 px-4"
          style={{ backgroundColor: `${primaryColor}06` }}
        >
          <div className="max-w-6xl mx-auto">
            <SectionHeading
              title={newsHeading}
              subtitle={newsSubheading}
              primaryColor={primaryColor}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(news.length > 0
                ? news
                : [
                    {
                      id: "1",
                      title: "Summer Camp 2026 Registration Open",
                      publishedAt: "2026-01-25",
                      category: "Announcement",
                      shortDescription:
                        "Join our intensive 6-week summer training program. Expert coaching, match practice, and fitness sessions included.",
                      slug: "",
                      status: "PUBLISHED",
                    },
                    {
                      id: "2",
                      title: "Students Win District Championship",
                      publishedAt: "2026-01-20",
                      category: "Achievement",
                      shortDescription:
                        "Our U-16 team clinched the district championship. Three players selected for state-level trials.",
                      slug: "",
                      status: "PUBLISHED",
                    },
                    {
                      id: "3",
                      title: "New Indoor Practice Facility",
                      publishedAt: "2026-01-15",
                      category: "Facility Update",
                      shortDescription:
                        "We're launching a new climate-controlled indoor practice center with bowling machines and video analysis.",
                      slug: "",
                      status: "PUBLISHED",
                    },
                  ]
              ).map((article) => (
                <div
                  key={article.id}
                  className={`bg-white overflow-hidden hover:shadow-xl transition-shadow ${getShadowClass()}`}
                  style={getCardStyle()}
                >
                  {"featuredImageUrl" in article && article.featuredImageUrl ? (
                    <div className="h-44 overflow-hidden">
                      <img
                        src={
                          getImageUrl(article.featuredImageUrl as string) || ""
                        }
                        alt={article.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div
                      className="h-1.5"
                      style={{
                        background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
                      }}
                    />
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="text-xs px-2.5 py-0.5 rounded-full font-semibold text-white"
                        style={{ backgroundColor: secondaryColor }}
                      >
                        {article.category || "News"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(article.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">
                      {article.shortDescription}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── YOUTUBE VIDEOS ── */}

      {youtubeEnabled && youtubeVideos.length > 0 && (
        <section id="videos" className="py-10 md:py-14 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <SectionHeading
              title={youtubeHeading}
              subtitle={youtubeSubheading}
              primaryColor={primaryColor}
            />
            <YoutubeGrid
              videos={youtubeVideos}
              primaryColor={primaryColor}
              getShadowClass={getShadowClass}
              getCardStyle={getCardStyle}
              getButtonStyle={getButtonStyle}
            />
          </div>
        </section>
      )}

      {/* ── INSTAGRAM ── */}
      {instagramEnabled && instagramPosts.length > 0 && (
        <section
          id="instagram"
          className="py-10 md:py-14 px-4"
          style={{ backgroundColor: `${primaryColor}06` }}
        >
          <div className="max-w-6xl mx-auto">
            <SectionHeading
              title={instagramHeading}
              subtitle={instagramSubheading}
              primaryColor={primaryColor}
            />
            <InstagramGrid
              posts={instagramPosts}
              primaryColor={primaryColor}
              getShadowClass={getShadowClass}
              getCardStyle={getCardStyle}
              getButtonStyle={getButtonStyle}
              instagramUrl={socialLinks.instagram}
            />
          </div>
        </section>
      )}

      {/* ── GALLERY ── */}
      {galleryEnabled && (
        <section id="gallery" className="py-10 md:py-14 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <SectionHeading
              title={galleryHeading}
              subtitle={gallerySubheading}
              primaryColor={primaryColor}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {gallery.length > 0
                ? gallery.map((image) => (
                    <div
                      key={image.id}
                      onClick={() => setSelectedGalleryImage(image)}
                      className={`overflow-hidden shadow-sm hover:shadow-xl transition cursor-pointer relative group
                        ${wideImages[image.id] ? "col-span-2 aspect-[16/9]" : "col-span-1 aspect-square"}
                      `}
                      style={{ borderRadius: `${cardRadius}px` }}
                    >
                      <img
                        src={getImageUrl(image.imageUrl) || ""}
                        alt={image.caption || "Gallery"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onLoad={(e) => {
                          const imgEl = e.currentTarget;
                          const wide =
                            imgEl.naturalWidth / imgEl.naturalHeight > 1.25;
                          setWideImages((prev) => {
                            if (prev[image.id] === wide) return prev;
                            return { ...prev, [image.id]: wide };
                          });
                        }}
                      />
                      {image.caption && (
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4"
                          style={{ backgroundColor: `${primaryColor}90` }}
                        >
                          <span className="text-white font-semibold text-center text-sm">
                            {image.caption}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                : [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                      key={i}
                      className="aspect-square overflow-hidden shadow-sm hover:shadow-xl transition cursor-pointer relative group"
                      style={{
                        backgroundColor: `${primaryColor}10`,
                        borderRadius: `${cardRadius}px`,
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                        <span className="text-sm">Photo {i}</span>
                      </div>
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                        style={{ backgroundColor: `${primaryColor}90` }}
                      >
                        <span className="text-white font-semibold text-sm">
                          View
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CONTACT ── */}
      <ContactForm
        primaryColor={primaryColor}
        cardStyle={getCardStyle()}
        getShadowClass={getShadowClass}
        settings={settings}
      />

      {/* ── FOOTER ── */}
      <footer className="py-8 px-4 text-center border-t bg-white">
        {(socialLinks.facebook ||
          socialLinks.instagram ||
          socialLinks.twitter ||
          socialLinks.youtube ||
          socialLinks.linkedin) && (
          <div className="flex justify-center gap-3 mb-5">
            {socialLinks.facebook && (
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-full hover:bg-gray-100 transition"
                style={{ color: primaryColor }}
              >
                <Facebook size={20} />
              </a>
            )}
            {socialLinks.instagram && (
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-full hover:bg-gray-100 transition"
                style={{ color: primaryColor }}
              >
                <Instagram size={20} />
              </a>
            )}
            {socialLinks.twitter && (
              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-full hover:bg-gray-100 transition"
                style={{ color: primaryColor }}
              >
                <Twitter size={20} />
              </a>
            )}
            {socialLinks.youtube && (
              <a
                href={socialLinks.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-full hover:bg-gray-100 transition"
                style={{ color: primaryColor }}
              >
                <Youtube size={20} />
              </a>
            )}
            {socialLinks.linkedin && (
              <a
                href={socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-full hover:bg-gray-100 transition"
                style={{ color: primaryColor }}
              >
                <Linkedin size={20} />
              </a>
            )}
          </div>
        )}
        <p className="text-gray-400 text-sm">
          © 2026 {academyName}. All rights reserved.
        </p>
      </footer>

      {/* ── FLOATING MOBILE CTA ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 sm:hidden px-4 pb-4 pt-2"
        style={{
          background:
            "linear-gradient(to top, rgba(255,255,255,0.98) 70%, transparent)",
        }}
      >
        <button
          onClick={() => navigate("/book-slot")}
          style={{
            backgroundColor: primaryColor,
            borderRadius: `${buttonRadius}px`,
          }}
          className="w-full py-4 text-white font-bold text-base shadow-xl flex items-center justify-center gap-2 active:opacity-90"
        >
          🏏 Book a Training Slot
          <ArrowRight size={18} />
        </button>
      </div>

      {/* ── LOGIN MODAL ── */}
      <LoginPromptModal
        open={showLoginPrompt}
        message="Please login to book a slot."
        onConfirm={() => navigate("/login")}
        onCancel={() => setShowLoginPrompt(false)}
      />

      {/* ── GALLERY LIGHTBOX ── */}
      {selectedGalleryImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setSelectedGalleryImage(null)}
        >
          <div
            className="relative bg-white max-w-5xl w-full max-h-[90vh] overflow-hidden"
            style={getCardStyle()}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 z-10 bg-black/70 text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-black transition"
              onClick={() => setSelectedGalleryImage(null)}
            >
              <X size={16} />
            </button>
            <div className="w-full max-h-[80vh] bg-black flex items-center justify-center">
              <img
                src={getImageUrl(selectedGalleryImage.imageUrl) || ""}
                alt={selectedGalleryImage.caption || "Gallery"}
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
            {selectedGalleryImage.caption && (
              <div className="p-4 text-center text-gray-600 text-sm">
                {selectedGalleryImage.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
