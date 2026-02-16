import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import LoginPromptModal from "../components/LoginPromptModal";
import { getImageUrl } from "../utils/imageUrl";
import publicApi from "../api/publicApi";

const ADMIN_ROLES = ["ROLE_ADMIN", "ROLE_SUPER_ADMIN"];

function Navbar() {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const userRole = localStorage.getItem("userRole");
  const isAdmin = !!userRole && ADMIN_ROLES.includes(userRole);

  // ✅ DECLARE ALL STATE FIRST
  const [loginPromptMessage, setLoginPromptMessage] = useState<string | null>(
    null,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [academyName, setAcademyName] = useState("NCA");
  const [starPerformerEnabled, setStarPerformerEnabled] = useState(false);

  // ✅ THEN USE THEM IN EFFECTS
  useEffect(() => {
    publicApi
      .get("/settings/public")
      .then((res) => {
        setLogoUrl(res.data.LOGO_URL || null);
        setAcademyName(res.data.ACADEMY_NAME || "NCA");
        setStarPerformerEnabled(
          res.data.SECTION_STAR_PERFORMER_ENABLED === "true",
        );
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/home");
    setMobileOpen(false);
  };

  // ✅ CHANGED: This function now only guards "My Bookings"
  // Book Slot is now public and doesn't need a guard
  const guardedNavigate = (path: string, message: string) => {
    if (!isAuthenticated) {
      setLoginPromptMessage(message);
      return;
    }
    navigate(path);
    setMobileOpen(false);
  };

  const scrollToSection = (sectionId: string) => {
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
    setMobileOpen(false);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded text-sm font-medium transition ${
      isActive
        ? "text-blue-600 bg-blue-50"
        : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
    }`;

  return (
    <>
      <nav className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* LEFT - Logo */}
            <div className="flex items-center gap-3">
              <NavLink to="/home" className="flex items-center gap-2">
                {logoUrl ? (
                  <img
                    src={getImageUrl(logoUrl) || ""}
                    alt={academyName}
                    className="h-10 object-contain"
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {academyName.substring(0, 3).toUpperCase()}
                  </div>
                )}
                <span className="text-lg font-bold hidden sm:block">
                  {academyName}
                </span>
              </NavLink>
            </div>

            {/* DESKTOP MENU */}
            <div className="hidden md:flex items-center gap-1">
              <NavLink to="/home" className={linkClass}>
                Home
              </NavLink>

              {location.pathname === "/home" && (
                <>
                  <button
                    onClick={() => scrollToSection("facilities")}
                    className="px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded transition"
                  >
                    Facilities
                  </button>
                  <button
                    onClick={() => scrollToSection("testimonials")}
                    className="px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded transition"
                  >
                    Testimonials
                  </button>
                  <button
                    onClick={() => scrollToSection("news")}
                    className="px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded transition"
                  >
                    News
                  </button>
                  <button
                    onClick={() => scrollToSection("gallery")}
                    className="px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded transition"
                  >
                    Gallery
                  </button>
                  <button
                    onClick={() => scrollToSection("contact")}
                    className="px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded transition"
                  >
                    Contact
                  </button>
                </>
              )}

              {!isAdmin && starPerformerEnabled && (
                <NavLink to="/star-performer" className={linkClass}>
                  Star Performer
                </NavLink>
              )}

              {!isAdmin && (
                <>
                  {/* ✅ CHANGED: Book Slot is now PUBLIC - direct navigation */}
                  <NavLink to="/book-slot" className={linkClass}>
                    Book Slot
                  </NavLink>

                  {/* ✅ My Bookings still requires login */}
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

              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="ml-2 text-sm bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                >
                  Logout
                </button>
              )}
            </div>

            {/* MOBILE TOGGLE */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden p-2 rounded hover:bg-gray-100 transition"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 py-3 space-y-1">
              <NavLink
                to="/home"
                className={linkClass}
                onClick={() => setMobileOpen(false)}
              >
                Home
              </NavLink>

              {location.pathname === "/home" && (
                <>
                  <button
                    onClick={() => scrollToSection("facilities")}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded"
                  >
                    Facilities
                  </button>
                  <button
                    onClick={() => scrollToSection("testimonials")}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded"
                  >
                    Testimonials
                  </button>
                  <button
                    onClick={() => scrollToSection("news")}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded"
                  >
                    News
                  </button>
                  <button
                    onClick={() => scrollToSection("gallery")}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded"
                  >
                    Gallery
                  </button>
                  <button
                    onClick={() => scrollToSection("contact")}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded"
                  >
                    Contact
                  </button>
                </>
              )}

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
                  {/* ✅ CHANGED: Book Slot is now PUBLIC - direct navigation */}
                  <NavLink
                    to="/book-slot"
                    className={linkClass}
                    onClick={() => setMobileOpen(false)}
                  >
                    Book Slot
                  </NavLink>

                  {/* ✅ My Bookings still requires login */}
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
                  className="block px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                  onClick={() => setMobileOpen(false)}
                >
                  Admin Dashboard
                </NavLink>
              )}

              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-500 text-white py-2 rounded mt-2 hover:bg-red-600 transition"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

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
