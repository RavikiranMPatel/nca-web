import Navbar from "../components/Navbar";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import {
  Home,
  CalendarDays,
  BookOpen,
  LayoutDashboard,
  User,
} from "lucide-react";

type Props = {
  children: React.ReactNode;
};

const ADMIN_ROLES = ["ROLE_ADMIN", "ROLE_SUPER_ADMIN"];

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, userRole } = useAuth();

  const isAdmin = !!userRole && ADMIN_ROLES.includes(userRole);
  const path = location.pathname;

  const navItems = isAdmin
    ? [
        { icon: Home, label: "Home", to: "/home" },
        { icon: LayoutDashboard, label: "Dashboard", to: "/admin" },
        { icon: User, label: "Profile", to: "/profile" },
      ]
    : [
        { icon: Home, label: "Home", to: "/home" },
        { icon: CalendarDays, label: "Book Slot", to: "/book-slot" },
        { icon: BookOpen, label: "My Bookings", to: "/my-bookings" },
        {
          icon: User,
          label: "Profile",
          to: isAuthenticated ? "/profile" : "/login",
        },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white border-t border-gray-200 safe-area-inset-bottom">
      <div className="flex items-stretch h-16">
        {navItems.map(({ icon: Icon, label, to }) => {
          const isActive =
            path === to || (to !== "/home" && path.startsWith(to));
          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors"
            >
              {/* Active indicator pill */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full"
                  style={{ backgroundColor: "var(--primary, #2563eb)" }}
                />
              )}
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={isActive ? "text-blue-600" : "text-gray-400"}
              />
              <span
                className={`text-[10px] font-medium leading-none ${
                  isActive ? "text-blue-600" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Safe area spacer for notched phones */}
      <div className="h-safe-bottom bg-white" />
    </nav>
  );
}

function AppLayout({ children }: Props) {
  const location = useLocation();
  const isHome = location.pathname === "/home";

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main
        className={`flex-1 ${
          isHome ? "pt-16" : "pt-20 px-4 sm:px-6 py-4 max-w-7xl mx-auto w-full"
        } pb-16 sm:pb-0`}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export default AppLayout;
