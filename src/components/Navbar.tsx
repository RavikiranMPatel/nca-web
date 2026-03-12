import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import {
  LayoutDashboard,
  Menu,
  X,
  User,
  LogOut,
  LogIn,
  UserPlus,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import LoginPromptModal from "../components/LoginPromptModal";
import { getImageUrl } from "../utils/imageUrl";
import publicApi from "../api/publicApi";

const ADMIN_ROLES = ["ROLE_ADMIN", "ROLE_SUPER_ADMIN"];

function Navbar() {
  const { logout, isAuthenticated, userName, userRole, branchName } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = !!userRole && ADMIN_ROLES.includes(userRole);

  const [loginPromptMessage, setLoginPromptMessage] = useState<string | null>(
    null,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [academyName, setAcademyName] = useState("NCA");
  const [starPerformerEnabled, setStarPerformerEnabled] = useState(false);

  // Dynamic sections from settings — these are the home scroll links
  const [enabledSections, setEnabledSections] = useState<
    { id: string; label: string }[]
  >([]);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    publicApi
      .get("/settings/public")
      .then((res) => {
        const d = res.data;
        setLogoUrl(d.LOGO_URL || null);
        setAcademyName(d.ACADEMY_NAME || "NCA");
        setStarPerformerEnabled(d.SECTION_STAR_PERFORMER_ENABLED === "true");

        // Build dynamic section list based on what's enabled in settings
        const sections: { id: string; label: string }[] = [];
        if (d.SECTION_FACILITIES_ENABLED !== "false")
          sections.push({ id: "facilities", label: "Facilities" });
        if (d.SECTION_TESTIMONIALS_ENABLED !== "false")
          sections.push({ id: "testimonials", label: "Testimonials" });
        if (d.SECTION_NEWS_ENABLED !== "false")
          sections.push({ id: "news", label: "News" });
        if (d.SECTION_GALLERY_ENABLED !== "false")
          sections.push({ id: "gallery", label: "Gallery" });
        sections.push({ id: "contact", label: "Contact" }); // always show contact
        setEnabledSections(sections);
      })
      .catch(() => {});
  }, []);

  // Close all menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setMoreMenuOpen(false);
  }, [location.pathname]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    navigate("/home");
    setMobileOpen(false);
    setUserMenuOpen(false);
  };

  const guardedNavigate = (path: string, message: string) => {
    if (!isAuthenticated) {
      setLoginPromptMessage(message);
      return;
    }
    navigate(path);
    setMobileOpen(false);
  };

  const scrollToSection = (sectionId: string) => {
    setMoreMenuOpen(false);
    setMobileOpen(false);
    if (location.pathname !== "/home") {
      navigate("/home");
      setTimeout(() => {
        document
          .getElementById(sectionId)
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded text-sm font-medium transition ${
      isActive
        ? "text-blue-600 bg-blue-50"
        : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
    }`;

  const isHomePage = location.pathname === "/home";
  const avatarLetter = userName ? userName.charAt(0).toUpperCase() : "?";

  return (
    <>
      <nav className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* LEFT — Logo + Full Name (no truncation) */}
            <NavLink
              to="/home"
              className="flex items-center gap-2 flex-shrink-0"
            >
              {logoUrl ? (
                <img
                  src={getImageUrl(logoUrl) || ""}
                  alt={academyName}
                  className="h-10 object-contain flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {academyName.substring(0, 3).toUpperCase()}
                </div>
              )}
              {/* Show full name — no max-w truncation */}
              <span className="text-base font-bold hidden sm:block whitespace-nowrap">
                {academyName}
              </span>
            </NavLink>

            {/* DESKTOP NAV — right side, compact */}
            <div className="hidden md:flex items-center gap-0.5 flex-shrink-0">
              <NavLink to="/home" className={linkClass}>
                Home
              </NavLink>

              {/* "Explore" dropdown — contains all dynamic scroll sections */}
              {enabledSections.length > 0 && (
                <div className="relative" ref={moreMenuRef}>
                  <button
                    onClick={() => setMoreMenuOpen((o) => !o)}
                    className={`flex items-center gap-1 px-3 py-2 rounded text-sm font-medium transition ${
                      moreMenuOpen
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                    }`}
                  >
                    Explore
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${moreMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {moreMenuOpen && (
                    <div className="absolute left-0 top-11 w-44 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                      {enabledSections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition"
                        >
                          {section.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!isAdmin && starPerformerEnabled && (
                <NavLink to="/star-performer" className={linkClass}>
                  Star Performer
                </NavLink>
              )}

              {!isAdmin && (
                <>
                  <NavLink to="/book-slot" className={linkClass}>
                    Book Slot
                  </NavLink>

                  {isAuthenticated ? (
                    <NavLink to="/my-bookings" className={linkClass}>
                      My Bookings
                    </NavLink>
                  ) : (
                    <button
                      onClick={() =>
                        guardedNavigate(
                          "/my-bookings",
                          "Please login to view your bookings.",
                        )
                      }
                      className="px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded transition"
                    >
                      My Bookings
                    </button>
                  )}
                </>
              )}

              {isAdmin && (
                <NavLink
                  to="/admin"
                  className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded flex items-center gap-1 transition"
                >
                  <LayoutDashboard size={16} />
                  Admin
                </NavLink>
              )}

              {/* USER AVATAR DROPDOWN */}
              <div className="relative ml-1" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition border-2 ${
                    isAuthenticated
                      ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                      : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                  }`}
                  title={isAuthenticated ? userName || "Account" : "Login"}
                >
                  {isAuthenticated ? avatarLetter : <User size={16} />}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-11 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                    {isAuthenticated ? (
                      <>
                        {userName && (
                          <div className="px-4 py-2.5 border-b border-gray-100">
                            <p className="text-xs text-gray-400">
                              Signed in as
                            </p>
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {userName}
                            </p>
                          </div>
                        )}
                        {isAdmin && branchName && (
                          <div className="px-4 py-2 border-b border-gray-100">
                            <p className="text-xs text-gray-400">Branch</p>
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {branchName}
                            </p>
                          </div>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                        >
                          <LogOut size={15} />
                          Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            navigate("/login");
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <LogIn size={15} />
                          Login
                        </button>
                        <button
                          onClick={() => {
                            navigate("/signup");
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <UserPlus size={15} />
                          Sign Up
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* MOBILE — Hamburger */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden p-2 rounded hover:bg-gray-100 transition flex-shrink-0"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-16 left-0 right-0 z-50 md:hidden bg-white border-t shadow-lg max-h-[calc(100vh-64px)] overflow-y-auto">
            <div className="px-4 py-3 space-y-1">
              {/* User info strip */}
              {isAuthenticated && userName && (
                <div className="flex items-center gap-3 px-3 py-2 mb-1 bg-blue-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {avatarLetter}
                  </div>
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {userName}
                  </span>
                </div>
              )}

              <NavLink
                to="/home"
                className={linkClass}
                onClick={() => setMobileOpen(false)}
              >
                Home
              </NavLink>

              {/* Dynamic scroll sections — all shown individually on mobile */}
              {enabledSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded transition"
                >
                  {section.label}
                </button>
              ))}

              {!isAdmin && starPerformerEnabled && (
                <NavLink
                  to="/star-performer"
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  Star Performer
                </NavLink>
              )}

              {!isAdmin && (
                <>
                  <NavLink
                    to="/book-slot"
                    className={linkClass}
                    onClick={() => setMobileOpen(false)}
                  >
                    Book Slot
                  </NavLink>

                  {isAuthenticated ? (
                    <NavLink
                      to="/my-bookings"
                      className={linkClass}
                      onClick={() => setMobileOpen(false)}
                    >
                      My Bookings
                    </NavLink>
                  ) : (
                    <button
                      onClick={() =>
                        guardedNavigate(
                          "/my-bookings",
                          "Please login to view your bookings.",
                        )
                      }
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded"
                    >
                      My Bookings
                    </button>
                  )}
                </>
              )}

              {isAdmin && (
                <NavLink
                  to="/admin"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                  onClick={() => setMobileOpen(false)}
                >
                  <LayoutDashboard size={16} />
                  Admin Dashboard
                </NavLink>
              )}

              <div className="h-px bg-gray-100 my-2" />

              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-2.5 rounded hover:bg-red-600 transition text-sm font-medium"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              ) : (
                <div className="space-y-2">
                  <NavLink
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-2.5 rounded hover:bg-blue-700 transition text-sm font-medium"
                  >
                    <LogIn size={15} />
                    Login
                  </NavLink>
                  <NavLink
                    to="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full border border-blue-600 text-blue-600 py-2.5 rounded hover:bg-blue-50 transition text-sm font-medium"
                  >
                    <UserPlus size={15} />
                    Sign Up
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* LOGIN PROMPT */}
      <LoginPromptModal
        open={!!loginPromptMessage}
        message={loginPromptMessage || ""}
        onConfirm={() => navigate("/login")}
        onCancel={() => setLoginPromptMessage(null)}
      />
    </>
  );
}

export default Navbar;
