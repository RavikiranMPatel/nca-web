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
  CheckCircle,
  Home,
  CalendarDays,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import LoginPromptModal from "../components/LoginPromptModal";
import { getImageUrl } from "../utils/imageUrl";
import publicApi from "../api/publicApi";

const ADMIN_ROLES = ["ROLE_ADMIN", "ROLE_SUPER_ADMIN"];

function LogoutConfirmModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <LogOut size={22} className="text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Log out?</h2>
          <p className="text-sm text-gray-500">
            Are you sure you want to log out of your account?
          </p>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition"
          >
            Yes, log out
          </button>
        </div>
      </div>
    </div>
  );
}

function LogoutToast({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
      <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
      You've been logged out successfully
    </div>
  );
}

// ─── Drawer nav item ────────────────────────────────────────────
function DrawerItem({
  icon: Icon,
  label,
  onClick,
  active = false,
  badge,
  iconBg,
  iconColor,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: string | number;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left ${
        active ? "bg-blue-50" : "hover:bg-gray-50"
      }`}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBg || (active ? "#eff6ff" : "#f3f4f6") }}
      >
        <Icon
          size={17}
          style={{ color: iconColor || (active ? "#2563eb" : "#6b7280") }}
          strokeWidth={1.8}
        />
      </div>
      <span
        className={`flex-1 text-sm font-medium ${
          active ? "text-blue-600" : "text-gray-700"
        }`}
      >
        {label}
      </span>
      {badge ? (
        <span className="bg-red-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      ) : (
        <ChevronRight
          size={14}
          className={active ? "text-blue-400" : "text-gray-300"}
        />
      )}
    </button>
  );
}

function Navbar() {
  const { logout, isAuthenticated, userName, userRole, branchName } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLogoutToast, setShowLogoutToast] = useState(false);

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

        const sections: { id: string; label: string }[] = [];
        if (d.SECTION_FACILITIES_ENABLED !== "false")
          sections.push({ id: "facilities", label: "Facilities" });
        if (d.SECTION_TESTIMONIALS_ENABLED !== "false")
          sections.push({ id: "testimonials", label: "Testimonials" });
        if (d.SECTION_NEWS_ENABLED !== "false")
          sections.push({ id: "news", label: "News" });
        if (d.SECTION_GALLERY_ENABLED !== "false")
          sections.push({ id: "gallery", label: "Gallery" });
        sections.push({ id: "contact", label: "Contact" });
        setEnabledSections(sections);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setMoreMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      )
        setUserMenuOpen(false);
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node)
      )
        setMoreMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const requestLogout = () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/home");
    setShowLogoutToast(true);
    setTimeout(() => setShowLogoutToast(false), 3000);
  };

  const cancelLogout = () => setShowLogoutConfirm(false);

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

  const avatarLetter = userName ? userName.charAt(0).toUpperCase() : "?";

  // ── Section label colors for drawer items
  const sectionColors: Record<string, { bg: string; color: string }> = {
    facilities: { bg: "#eff6ff", color: "#2563eb" },
    testimonials: { bg: "#f0fdf4", color: "#16a34a" },
    news: { bg: "#fef3c7", color: "#d97706" },
    gallery: { bg: "#fce7f3", color: "#db2777" },
    contact: { bg: "#f3f4f6", color: "#6b7280" },
  };

  return (
    <>
      {/* ── TOP NAV BAR ── */}
      <nav className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
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
              <span className="text-base font-bold hidden sm:block whitespace-nowrap">
                {academyName}
              </span>
            </NavLink>

            {/* Desktop nav — unchanged */}
            <div className="hidden md:flex items-center gap-0.5 flex-shrink-0">
              <NavLink to="/home" className={linkClass}>
                Home
              </NavLink>

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

              {/* User avatar dropdown */}
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
                          onClick={() => {
                            navigate("/profile");
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <User size={15} />
                          My Profile
                        </button>
                        {!isAdmin && (
                          <button
                            onClick={() => {
                              navigate("/my-subscription");
                              setUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                          >
                            <span className="text-base leading-none">🏏</span>My
                            Subscription
                          </button>
                        )}
                        {userRole === "ROLE_PLAYER" && isAuthenticated && (
                          <button
                            onClick={() => {
                              navigate("/my-coaching");
                              setUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                          >
                            <span className="text-base leading-none">🏋️</span>My
                            Coaching
                          </button>
                        )}
                        <div className="h-px bg-gray-100 my-1" />
                        <button
                          onClick={requestLogout}
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

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition flex-shrink-0"
              aria-label="Toggle menu"
            >
              <Menu size={22} className="text-gray-700" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── MOBILE SIDE DRAWER ── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 md:hidden transition-opacity duration-300 ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Drawer panel — slides in from right */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-[80vw] max-w-xs bg-white z-50 md:hidden flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="bg-blue-700 px-4 pt-12 pb-5 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {isAuthenticated && userName ? (
              <>
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-base mb-2">
                  {avatarLetter}
                </div>
                <p className="text-white font-semibold text-sm truncate">
                  {userName}
                </p>
                <p className="text-blue-200 text-xs mt-0.5 truncate">
                  {userRole?.replace("ROLE_", "")}
                </p>
                {isAdmin && branchName && (
                  <p className="text-blue-200 text-xs truncate">{branchName}</p>
                )}
              </>
            ) : (
              <>
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center mb-2">
                  <User size={22} className="text-white/70" />
                </div>
                <p className="text-white font-semibold text-sm">Guest</p>
                <p className="text-blue-200 text-xs mt-0.5">Not logged in</p>
              </>
            )}
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 self-start mt-1"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Scrollable nav items */}
        <div className="flex-1 overflow-y-auto py-3 px-2">
          {/* Public section */}
          <p className="px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Explore
          </p>
          <DrawerItem
            icon={Home}
            label="Home"
            active={location.pathname === "/home"}
            onClick={() => {
              navigate("/home");
              setMobileOpen(false);
            }}
            iconBg="#eff6ff"
            iconColor="#2563eb"
          />
          {!isAdmin && (
            <DrawerItem
              icon={CalendarDays}
              label="Book a Slot"
              active={location.pathname === "/book-slot"}
              onClick={() => {
                navigate("/book-slot");
                setMobileOpen(false);
              }}
              iconBg="#f0fdf4"
              iconColor="#16a34a"
            />
          )}
          {!isAdmin && (
            <DrawerItem
              icon={BookOpen}
              label="My Bookings"
              active={location.pathname === "/my-bookings"}
              onClick={() =>
                guardedNavigate(
                  "/my-bookings",
                  "Please login to view your bookings.",
                )
              }
              iconBg="#fef3c7"
              iconColor="#d97706"
            />
          )}
          {!isAdmin && starPerformerEnabled && (
            <DrawerItem
              icon={User}
              label="Star Performer"
              active={location.pathname === "/star-performer"}
              onClick={() => {
                navigate("/star-performer");
                setMobileOpen(false);
              }}
              iconBg="#fce7f3"
              iconColor="#db2777"
            />
          )}

          {/* Sections scroll */}
          {enabledSections.length > 0 && (
            <>
              <p className="px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-1">
                Jump to section
              </p>
              {enabledSections.map((section) => {
                const c = sectionColors[section.id] || {
                  bg: "#f3f4f6",
                  color: "#6b7280",
                };
                return (
                  <DrawerItem
                    key={section.id}
                    icon={ChevronRight}
                    label={section.label}
                    onClick={() => scrollToSection(section.id)}
                    iconBg={c.bg}
                    iconColor={c.color}
                  />
                );
              })}
            </>
          )}

          {/* Admin section */}
          {isAdmin && (
            <>
              <p className="px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-1">
                Admin
              </p>
              <DrawerItem
                icon={LayoutDashboard}
                label="Admin Dashboard"
                active={location.pathname.startsWith("/admin")}
                onClick={() => {
                  navigate("/admin");
                  setMobileOpen(false);
                }}
                iconBg="#fef3c7"
                iconColor="#d97706"
              />
            </>
          )}

          {/* Account */}
          {isAuthenticated && (
            <>
              <p className="px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-1">
                Account
              </p>
              <DrawerItem
                icon={User}
                label="My Profile"
                active={location.pathname === "/profile"}
                onClick={() => {
                  navigate("/profile");
                  setMobileOpen(false);
                }}
                iconBg="#f3f4f6"
                iconColor="#374151"
              />
              {!isAdmin && (
                <DrawerItem
                  icon={User}
                  label="My Subscription"
                  active={location.pathname === "/my-subscription"}
                  onClick={() => {
                    navigate("/my-subscription");
                    setMobileOpen(false);
                  }}
                  iconBg="#f3f4f6"
                  iconColor="#374151"
                />
              )}
              {userRole === "ROLE_PLAYER" && (
                <DrawerItem
                  icon={User}
                  label="My Coaching"
                  active={location.pathname === "/my-coaching"}
                  onClick={() => {
                    navigate("/my-coaching");
                    setMobileOpen(false);
                  }}
                  iconBg="#f3f4f6"
                  iconColor="#374151"
                />
              )}
            </>
          )}
        </div>

        {/* Drawer footer — login/logout */}
        <div className="border-t border-gray-100 p-3 pb-16 sm:pb-0">
          {isAuthenticated ? (
            <button
              onClick={requestLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl text-sm font-semibold hover:bg-red-100 transition"
            >
              <LogOut size={16} />
              Log out
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigate("/login");
                  setMobileOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
              >
                <LogIn size={15} />
                Login
              </button>
              <button
                onClick={() => {
                  navigate("/signup");
                  setMobileOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 border-2 border-blue-600 text-blue-600 py-3 rounded-xl text-sm font-semibold hover:bg-blue-50 transition"
              >
                <UserPlus size={15} />
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      <LoginPromptModal
        open={!!loginPromptMessage}
        message={loginPromptMessage || ""}
        onConfirm={() => navigate("/login")}
        onCancel={() => setLoginPromptMessage(null)}
      />
      <LogoutConfirmModal
        open={showLogoutConfirm}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />
      <LogoutToast show={showLogoutToast} />
    </>
  );
}

export default Navbar;
