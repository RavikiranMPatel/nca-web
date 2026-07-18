import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Trophy,
  Award,
  ArrowRight,
  Star,
  X,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  Youtube,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Users,
} from "lucide-react";
import LoginPromptModal from "../components/LoginPromptModal";
import publicApi from "../api/publicApi";
import { getImageUrl } from "../utils/imageUrl";
import ContactForm from "../components/ContactForm";
import type { PublicClub, ClubSeasonStandingData } from "../types/club";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

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
  SECTION_CRICKET_STATS_ENABLED?: string;
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
type InningsSummary = {
  inningsNumber: number;
  battingTeamName: string;
  totalRuns: number;
  totalWickets: number;
  totalBalls: number;
  status: string;
  target?: number;
};

type ScorecardSummary = {
  innings: InningsSummary[];
  resultDescription?: string;
};

type RecentMatch = LiveMatch & {
  resultDescription?: string;
};

type TopPerformer = {
  playerName: string;
  photoUrl?: string;
  matches: number;
  runs?: number;
  highScore?: number;
  average?: number;
  wickets?: number;
  bestFigures?: string;
  economy?: number;
};
type LiveMatch = {
  matchPublicId: string;
  title: string;
  matchType: string;
  venue?: string;
  matchDate?: string;
  totalOvers: number;
  tournamentName?: string;
};

function YoutubeGrid({
  videos,
  getShadowClass,
  getCardStyle,
  getButtonStyle,
  youtubeChannelUrl,
}: {
  videos: string[];
  primaryColor: string;
  getShadowClass: () => string;
  getCardStyle: () => object;
  getButtonStyle: () => object;
  youtubeChannelUrl?: string;
}) {
  const getVideoInfo = (
    url: string,
  ): { embedUrl: string; isShort: boolean } | null => {
    try {
      const u = new URL(url);
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/shorts/")[1].split("?")[0];
        return {
          embedUrl: `https://www.youtube.com/embed/${id}`,
          isShort: true,
        };
      }
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
          href={youtubeChannelUrl || "https://www.youtube.com"}
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
    const win = window as Window & {
      instgrm?: { Embeds: { process: () => void } };
    };
    if (win.instgrm) {
      win.instgrm.Embeds.process();
    } else {
      const script = document.createElement("script");
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      script.onload = () => {
        if (win.instgrm) win.instgrm.Embeds.process();
      };
      document.body.appendChild(script);
    }
  }, [posts]);
  const getCleanUrl = (url: string): string => {
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

function publicStandingOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function PublicClubStandingBadge({ standing }: { standing: ClubSeasonStandingData }) {
  const { division, position, movement } = standing;
  const label = position === 1
    ? `🏆 Champions · Div ${division}`
    : position === 2
    ? `🥈 Runners-up · Div ${division}`
    : position
    ? `Div ${division} · ${publicStandingOrdinal(position)}`
    : `Div ${division}`;

  const movStyle =
    movement === "PROMOTED" ? "bg-emerald-100 text-emerald-700" :
    movement === "RELEGATED" ? "bg-red-100 text-red-700" :
    "bg-slate-100 text-slate-600";
  const movArrow = movement === "PROMOTED" ? "↑" : movement === "RELEGATED" ? "↓" : movement === "RETAINED" ? "→" : null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
        {label}
      </span>
      {movArrow && movement && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${movStyle}`}>
          {movArrow} {movement.charAt(0) + movement.slice(1).toLowerCase()}
        </span>
      )}
    </div>
  );
}

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
    <div className="text-center mb-6 md:mb-12">
      <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
        {title}
      </h2>
      {subtitle && (
        <p className="text-gray-500 text-sm md:text-lg max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
      <div
        className="h-1 w-12 md:w-16 mx-auto mt-3 rounded-full"
        style={{ backgroundColor: primaryColor }}
      />
    </div>
  );
}

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
  const [homepageSections, setHomepageSections] = useState<
    Array<{ sectionType: string; displayOrder: number }>
  >([]);
  const [clubs, setClubs] = useState<PublicClub[]>([]);
  const [publicStats, setPublicStats] = useState<{
    totalPlayers: number;
    activePlayers: number;
    todayPresent: number;
    weekPresent: number;
  } | null>(null);

  // ── LIVE MATCHES STATE ──────────────────────────────────────────────────────
  const [liveMatches] = useState<LiveMatch[]>([]);
  const [liveScores, setLiveScores] = useState<
    Record<string, ScorecardSummary>
  >({});
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [recentScores, setRecentScores] = useState<
    Record<string, ScorecardSummary>
  >({});
  const [topPerformers, setTopPerformers] = useState<{
    topBatters: TopPerformer[];
    topBowlers: TopPerformer[];
  } | null>(null);
  const academyName = settings.ACADEMY_NAME || "";
  const logoUrl = settings.LOGO_URL;
  const primaryColor = settings.PRIMARY_COLOR || "#2563eb";
  const secondaryColor = settings.SECONDARY_COLOR || "#10b981";
  const buttonRadius = settings.BUTTON_RADIUS || "8";
  const cardRadius = settings.CARD_RADIUS || "12";
  const shadowIntensity = settings.SHADOW_INTENSITY || "md";
  const slideDuration = parseInt(settings.SLIDE_DURATION || "5000");
  const sliderEnabled = settings.SECTION_SLIDER_ENABLED !== "false";
  const starPerformerEnabled =
    settings.SECTION_STAR_PERFORMER_ENABLED !== "false";
  const youtubeEnabled = settings.SECTION_YOUTUBE_ENABLED !== "false";
  const cricketStatsEnabled =
    settings.SECTION_CRICKET_STATS_ENABLED !== "false";
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

  // ── LIVE MATCHES POLL ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const res = await publicApi.get("/public/live-matches");
        const matches: RecentMatch[] = res.data;
        setRecentMatches(matches);
        for (const m of matches) {
          try {
            const sc = await publicApi.get(
              `/public/scorecard/${m.matchPublicId}`,
            );
            setLiveScores((prev) => ({ ...prev, [m.matchPublicId]: sc.data }));
          } catch {
            /* silent */
          }
        }
      } catch {
        /* silent */
      }
    };
    fetchLive();
    const interval = setInterval(fetchLive, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await publicApi.get("/public/recent-matches?limit=3");
        const matches: RecentMatch[] = res.data;
        setRecentMatches(matches);
        for (const m of matches) {
          try {
            const sc = await publicApi.get(
              `/public/matches/${m.matchPublicId}/scorecard`,
            );
            setRecentScores((prev) => ({
              ...prev,
              [m.matchPublicId]: sc.data,
            }));
          } catch {
            /* silent */
          }
        }
      } catch {
        /* silent */
      }
    };
    fetchRecent();
  }, []);

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
        statsRes,
        topPerformersRes,
        homepageSectionsRes,
        clubsRes,
      ] = await Promise.allSettled([
        publicApi.get("/settings/public"),
        publicApi.get("/cms/gallery"),
        publicApi.get("/home-slider"),
        publicApi.get("/cms/facilities"),
        publicApi.get("/cms/testimonials"),
        publicApi.get("/team"),
        publicApi.get("/cms/news?status=PUBLISHED"),
        publicApi.get("/public/stats"),
        publicApi.get("/public/cricket-stats/top-performers?period=alltime"),
        publicApi.get("/public/homepage-sections"),
        publicApi.get("/public/clubs"),
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
      if (statsRes.status === "fulfilled" && statsRes.value?.status === 200)
        setPublicStats(statsRes.value.data);
      if (topPerformersRes.status === "fulfilled")
        setTopPerformers(topPerformersRes.value.data);
      if (homepageSectionsRes.status === "fulfilled")
        setHomepageSections(homepageSectionsRes.value.data);
      if (clubsRes.status === "fulfilled")
        setClubs(clubsRes.value.data);
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

      {/* ── 🔴 LIVE MATCHES SECTION ── */}
      {liveMatches.length > 0 && (
        <section className="py-4 px-4 bg-red-50 border-b border-red-100">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
              </span>
              <span className="text-sm font-bold text-red-700 uppercase tracking-wide">
                Live Matches
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {liveMatches.map((match) => {
                const sc = liveScores[match.matchPublicId];
                const innings = sc?.innings ?? [];
                return (
                  <a
                    key={match.matchPublicId}
                    href={`/match/${match.matchPublicId}/scorecard`}
                    className="flex-shrink-0 bg-white border border-red-200 rounded-2xl p-3 min-w-[220px] max-w-[260px] shadow-sm hover:shadow-md transition-shadow active:scale-95"
                  >
                    {match.tournamentName && (
                      <div className="text-xs text-red-500 font-medium mb-1 truncate">
                        🏆 {match.tournamentName}
                      </div>
                    )}
                    <div className="text-xs font-semibold text-gray-800 mb-2 leading-tight truncate">
                      {match.title}
                    </div>
                    {innings.length > 0 ? (
                      <div className="space-y-1">
                        {innings.map((inn) => (
                          <div key={inn.inningsNumber}>
                            <div className="flex items-baseline justify-between">
                              <span
                                className={`text-xs truncate max-w-[120px] ${inn.status === "IN_PROGRESS" ? "font-bold text-gray-900" : "text-gray-500"}`}
                              >
                                {inn.battingTeamName}
                              </span>
                              <span
                                className={`text-sm font-black ml-2 ${inn.status === "IN_PROGRESS" ? "text-gray-900" : "text-gray-500"}`}
                              >
                                {inn.totalRuns}/{inn.totalWickets}
                                <span className="text-xs font-normal text-gray-400 ml-1">
                                  ({Math.floor(inn.totalBalls / 6)}.
                                  {inn.totalBalls % 6} ov)
                                </span>
                              </span>
                            </div>
                            {/* Target & required runs — only for live 2nd innings */}
                            {inn.status === "IN_PROGRESS" && inn.target && (
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="text-xs text-gray-400">
                                  Target:{" "}
                                  <b className="text-gray-700">{inn.target}</b>
                                </span>
                                <span className="text-xs font-semibold text-orange-500">
                                  Need {inn.target - inn.totalRuns} runs
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">
                        Match in progress
                      </div>
                    )}
                    <div className="mt-2 text-xs text-red-500 font-medium">
                      View Scorecard →
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── RECENT MATCHES ── */}
      {recentMatches.length > 0 && (
        <section className="py-4 px-4 bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={14} className="text-gray-400" />
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                Recent Matches
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {recentMatches.map((match) => {
                const sc = recentScores[match.matchPublicId];
                const innings = sc?.innings ?? [];
                const resultDesc =
                  match.resultDescription || sc?.resultDescription;
                return (
                  <a
                    key={match.matchPublicId}
                    href={`/match/${match.matchPublicId}/scorecard`}
                    className="flex-shrink-0 bg-white border border-gray-200 rounded-2xl p-3 min-w-[220px] max-w-[260px] shadow-sm hover:shadow-md transition-shadow active:scale-95"
                  >
                    {match.tournamentName && (
                      <div className="text-xs text-gray-400 font-medium mb-1 truncate">
                        🏆 {match.tournamentName}
                      </div>
                    )}
                    <div className="text-xs font-semibold text-gray-800 mb-2 leading-tight truncate">
                      {match.title}
                    </div>
                    {innings.length > 0 ? (
                      <div className="space-y-1 mb-2">
                        {innings.map((inn) => (
                          <div
                            key={inn.inningsNumber}
                            className="flex items-baseline justify-between"
                          >
                            <span className="text-xs truncate max-w-[120px] text-gray-500">
                              {inn.battingTeamName}
                            </span>
                            <span className="text-sm font-black ml-2 text-gray-700">
                              {inn.totalRuns}/{inn.totalWickets}
                              <span className="text-xs font-normal text-gray-400 ml-1">
                                ({Math.floor(inn.totalBalls / 6)}.
                                {inn.totalBalls % 6} ov)
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 mb-2">
                        Loading scores…
                      </div>
                    )}
                    {resultDesc && (
                      <div
                        className="text-xs font-semibold truncate"
                        style={{ color: secondaryColor }}
                      >
                        {resultDesc}
                      </div>
                    )}
                    <div className="mt-1.5 text-xs text-gray-400 font-medium">
                      Full Scorecard →
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── SLIDER ── */}
      {hasSlider && (
        <section className="w-full bg-gray-100 relative">
          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            autoplay={{ delay: slideDuration, disableOnInteraction: false }}
            pagination={{ clickable: true, el: ".slider-pagination" }}
            navigation={{ prevEl: ".slider-prev", nextEl: ".slider-next" }}
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
          <div className="slider-pagination flex justify-center py-2" />
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

      {/* ── CTA STRIP ── */}
      {hasSlider && (
        <section
          className="py-4 px-4 border-b"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}08 0%, #ffffff 60%, ${secondaryColor}08 100%)`,
          }}
        >
          <div className="flex gap-3 max-w-lg mx-auto">
            <button
              onClick={() => navigate("/book-slot")}
              style={{ backgroundColor: primaryColor, ...getButtonStyle() }}
              className="flex-1 py-3 text-white font-bold text-sm hover:opacity-90 transition shadow-md flex items-center justify-center gap-1.5"
            >
              🏏 Book a Training Slot
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() =>
                document
                  .getElementById("contact")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="flex-1 py-3 border-2 font-semibold text-sm hover:bg-gray-50 transition flex items-center justify-center"
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

      {/* ── ACADEMY AT A GLANCE ── */}
      {settings.SECTION_STATS_ENABLED !== "false" && publicStats && (
        <section className="py-8 md:py-12 px-4 bg-white border-b">
          <div className="max-w-6xl mx-auto">
            <SectionHeading
              title="Academy at a Glance"
              subtitle="Live numbers from our training ground"
              primaryColor={primaryColor}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Total Players",
                  value: publicStats.totalPlayers,
                  emoji: "🏏",
                },
                {
                  label: "Active Players",
                  value: publicStats.activePlayers,
                  emoji: "✅",
                },
                {
                  label: "Present Today",
                  value: publicStats.todayPresent,
                  emoji: "📋",
                },
                {
                  label: "This Week",
                  value: publicStats.weekPresent,
                  emoji: "📈",
                },
              ].map(({ label, value, emoji }) => (
                <div
                  key={label}
                  className={`text-center p-4 md:p-5 ${getShadowClass()}`}
                  style={{
                    ...getCardStyle(),
                    border: `1px solid ${primaryColor}20`,
                    background: `${primaryColor}06`,
                  }}
                >
                  <div className="text-xl md:text-2xl mb-1">{emoji}</div>
                  <div
                    className="text-2xl md:text-3xl font-extrabold"
                    style={{ color: primaryColor }}
                  >
                    {value}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 leading-tight">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {cricketStatsEnabled &&
        topPerformers &&
        (topPerformers.topBatters.length > 0 ||
          topPerformers.topBowlers.length > 0) && (
          <section className="py-8 md:py-12 px-4 bg-white border-b">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                    🏆 Top Performers
                  </h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Academy cricket leaderboard
                  </p>
                </div>
                <button
                  onClick={() => navigate("/cricket-stats")}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition"
                  style={{
                    color: primaryColor,
                    background: `${primaryColor}10`,
                  }}
                >
                  View All →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Top Batter */}
                {topPerformers.topBatters[0] && (
                  <div
                    className={`bg-white overflow-hidden cursor-pointer ${getShadowClass()}`}
                    style={{
                      ...getCardStyle(),
                      border: `1px solid ${primaryColor}20`,
                    }}
                    onClick={() => navigate("/cricket-stats")}
                  >
                    <div
                      className="px-4 py-2 flex items-center gap-2"
                      style={{ background: `${primaryColor}08` }}
                    >
                      <span className="text-sm">🏏</span>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Top Batter
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-white text-base"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {topPerformers.topBatters[0].photoUrl ? (
                            <img
                              src={topPerformers.topBatters[0].photoUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            topPerformers.topBatters[0].playerName.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {topPerformers.topBatters[0].playerName}
                          </div>
                          <div className="text-xs text-gray-400">
                            {topPerformers.topBatters[0].matches} matches
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {
                            label: "Runs",
                            value: topPerformers.topBatters[0].runs,
                          },
                          {
                            label: "HS",
                            value: topPerformers.topBatters[0].highScore,
                          },
                          {
                            label: "Avg",
                            value: topPerformers.topBatters[0].average,
                          },
                        ].map(({ label, value }) => (
                          <div
                            key={label}
                            className="text-center p-2 rounded-xl"
                            style={{ background: `${primaryColor}08` }}
                          >
                            <div
                              className="text-base font-black"
                              style={{ color: primaryColor }}
                            >
                              {value ?? "—"}
                            </div>
                            <div className="text-xs text-gray-400">{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {/* Top Bowler */}
                {topPerformers.topBowlers[0] && (
                  <div
                    className={`bg-white overflow-hidden cursor-pointer ${getShadowClass()}`}
                    style={{
                      ...getCardStyle(),
                      border: `1px solid ${primaryColor}20`,
                    }}
                    onClick={() => navigate("/cricket-stats")}
                  >
                    <div
                      className="px-4 py-2 flex items-center gap-2"
                      style={{ background: `${primaryColor}08` }}
                    >
                      <span className="text-sm">⚾</span>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Top Bowler
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-white text-base"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {topPerformers.topBowlers[0].photoUrl ? (
                            <img
                              src={topPerformers.topBowlers[0].photoUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            topPerformers.topBowlers[0].playerName.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {topPerformers.topBowlers[0].playerName}
                          </div>
                          <div className="text-xs text-gray-400">
                            {topPerformers.topBowlers[0].matches} matches
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {
                            label: "Wkts",
                            value: topPerformers.topBowlers[0].wickets,
                          },
                          {
                            label: "Best",
                            value: topPerformers.topBowlers[0].bestFigures,
                          },
                          {
                            label: "Econ",
                            value: topPerformers.topBowlers[0].economy,
                          },
                        ].map(({ label, value }) => (
                          <div
                            key={label}
                            className="text-center p-2 rounded-xl"
                            style={{ background: `${primaryColor}08` }}
                          >
                            <div
                              className="text-base font-black"
                              style={{ color: primaryColor }}
                            >
                              {value ?? "—"}
                            </div>
                            <div className="text-xs text-gray-400">{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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

      {/* ── CMS SECTIONS — ordered and visibility-controlled via HomepageSection API ── */}
      {homepageSections.map((section) => {
        switch (section.sectionType) {
          case "FACILITIES":
            return facilities.length > 0 ? (
              <section key="facilities" id="facilities" className="py-8 md:py-14 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                  <SectionHeading
                    title="World-Class Facilities"
                    subtitle="State-of-the-art infrastructure designed to bring out the best in every player"
                    primaryColor={primaryColor}
                  />
                  <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto pb-2 md:overflow-visible md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory scroll-smooth">
                    {facilities.map((facility) => (
                      <div
                        key={facility.id}
                        className={`bg-white p-5 md:p-7 border-t-4 ${getShadowClass()} flex-shrink-0 w-[72vw] md:w-auto snap-start`}
                        style={{ borderColor: primaryColor, ...getCardStyle() }}
                      >
                        <div
                          className="w-11 h-11 md:w-14 md:h-14 rounded-xl mb-4 flex items-center justify-center"
                          style={{ backgroundColor: `${primaryColor}12` }}
                        >
                          <Award size={24} style={{ color: primaryColor }} />
                        </div>
                        <h3 className="text-base md:text-lg font-bold mb-1.5 text-gray-800">
                          {facility.title}
                        </h3>
                        <p className="text-gray-500 text-xs md:text-sm leading-relaxed">
                          {facility.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null;

          case "TEAM":
            return team.length > 0 ? (
              <section
                key="team"
                id="team"
                className="py-8 md:py-14 px-4"
                style={{ backgroundColor: `${primaryColor}06` }}
              >
                <div className="max-w-6xl mx-auto">
                  <SectionHeading
                    title="Meet Our Team"
                    subtitle={`The coaches and management team${academyName ? ` behind ${academyName}` : ""}`}
                    primaryColor={primaryColor}
                  />
                  <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto pb-2 md:overflow-visible md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory scroll-smooth">
                    {team.map((member) => (
                      <div
                        key={member.id}
                        className={`bg-white text-center p-5 hover:shadow-xl transition-shadow relative group ${getShadowClass()} flex-shrink-0 w-[56vw] md:w-auto snap-start`}
                        style={getCardStyle()}
                        onClick={() =>
                          setExpandedMemberId(
                            expandedMemberId === member.id ? null : member.id,
                          )
                        }
                      >
                        <div
                          className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden mx-auto mb-3"
                          style={{ border: `3px solid ${primaryColor}30` }}
                        >
                          {member.photoUrl ? (
                            <img
                              src={getImageUrl(member.photoUrl) || ""}
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-white text-xl font-bold"
                              style={{ backgroundColor: primaryColor }}
                            >
                              {member.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-800 text-sm md:text-base">
                          {member.name}
                        </h3>
                        <p
                          className="text-xs md:text-sm font-medium mt-0.5"
                          style={{ color: primaryColor }}
                        >
                          {member.role}
                        </p>
                        {member.bio && (
                          <p className="text-xs text-gray-400 mt-2 leading-relaxed line-clamp-2 md:line-clamp-3">
                            {member.bio}
                          </p>
                        )}
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
                        {member.bio && expandedMemberId === member.id && (
                          <div
                            className="sm:hidden mt-3 p-3 rounded-xl text-xs text-left leading-relaxed text-white"
                            style={{ backgroundColor: "#1f2937" }}
                          >
                            {member.bio}
                          </div>
                        )}
                        {member.bio && (
                          <div
                            className="hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-gray-900 text-white text-xs leading-relaxed rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-30 text-left"
                            style={{ maxWidth: "min(256px, 90vw)" }}
                          >
                            {member.bio}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null;

          case "TESTIMONIALS":
            return testimonials.length > 0 ? (
              <section key="testimonials" id="testimonials" className="py-10 md:py-14 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                  <SectionHeading
                    title={testimonialsHeading}
                    subtitle={testimonialsSubheading}
                    primaryColor={primaryColor}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {testimonials.slice(0, 3).map((t) => (
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
            ) : null;

          case "NEWS":
            return news.length > 0 ? (
              <section
                key="news"
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
                    {news.map((article) => (
                      <div
                        key={article.id}
                        className={`bg-white overflow-hidden hover:shadow-xl transition-shadow ${getShadowClass()}`}
                        style={getCardStyle()}
                      >
                        {"featuredImageUrl" in article && article.featuredImageUrl ? (
                          <div className="h-44 overflow-hidden">
                            <img
                              src={getImageUrl(article.featuredImageUrl as string) || ""}
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
            ) : null;

          case "GALLERY":
            return (
              <section key="gallery" id="gallery" className="py-10 md:py-14 px-4 bg-white">
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
                            className={`overflow-hidden shadow-sm hover:shadow-xl transition cursor-pointer relative group ${wideImages[image.id] ? "col-span-2 aspect-[16/9]" : "col-span-1 aspect-square"}`}
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
            );

          case "CLUB":
            return clubs.length > 0 ? (
              <section
                key="clubs"
                id="clubs"
                className="py-10 md:py-14 px-4"
                style={{ backgroundColor: `${primaryColor}06` }}
              >
                <div className="max-w-6xl mx-auto">
                  <SectionHeading
                    title="Our Clubs"
                    subtitle="Meet the clubs representing our academy"
                    primaryColor={primaryColor}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {clubs.map((club) => (
                      <div
                        key={club.publicId}
                        className={`bg-white p-6 flex flex-col ${getShadowClass()}`}
                        style={getCardStyle()}
                      >
                        <h3 className="text-xl font-bold text-gray-800 mb-1">
                          {club.name}
                        </h3>
                        {club.ownerName && (
                          <p
                            className="text-sm font-medium mb-3"
                            style={{ color: primaryColor }}
                          >
                            {club.ownerName}
                          </p>
                        )}
                        {club.history && (
                          <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 whitespace-pre-line mb-4 flex-1">
                            {club.history}
                          </p>
                        )}
                        {club.currentStanding && (
                          <div className="mb-3">
                            <PublicClubStandingBadge standing={club.currentStanding} />
                          </div>
                        )}
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Users size={14} style={{ color: primaryColor }} />
                            <span>
                              <strong>{club.totalMembers}</strong> current
                            </span>
                          </div>
                          {club.alumniCount > 0 && (
                            <div className="text-sm text-gray-500">
                              {club.alumniCount} alumni
                            </div>
                          )}
                        </div>
                        <Link
                          to={`/clubs/${club.publicId}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold self-start"
                          style={{ color: primaryColor }}
                        >
                          View Club <ArrowRight size={14} />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null;

          default:
            return null;
        }
      })}

      {/* ── YOUTUBE (not CMS-managed, fixed position after CMS sections) ── */}
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
              youtubeChannelUrl={socialLinks.youtube}
            />
          </div>
        </section>
      )}

      {/* ── INSTAGRAM (not CMS-managed, fixed position after CMS sections) ── */}
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

      <ContactForm
        primaryColor={primaryColor}
        cardStyle={getCardStyle()}
        getShadowClass={getShadowClass}
        settings={settings}
      />

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
          © {new Date().getFullYear()} {academyName}. All rights reserved.
        </p>
        <div className="flex justify-center gap-4 mt-3 text-xs text-gray-400">
          <Link to="/terms" className="hover:text-gray-600 hover:underline">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-gray-600 hover:underline">Privacy Policy</Link>
        </div>
      </footer>

      <LoginPromptModal
        open={showLoginPrompt}
        message="Please login to book a slot."
        onConfirm={() => navigate("/login")}
        onCancel={() => setShowLoginPrompt(false)}
      />

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
