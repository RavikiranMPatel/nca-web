import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import logo from "../assets/logos/nca-logo-app.png";
import { Image, Users, LayoutDashboard } from "lucide-react";

function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const playerName = localStorage.getItem("playerName");
  const playerId = localStorage.getItem("playerId");
  const userRole = localStorage.getItem("userRole");

  const isAdmin = userRole === "ROLE_ADMIN";

  const handleLogout = () => {
    logout();
    localStorage.clear();
    navigate("/login");
  };

  const handleChangePlayer = () => {
    localStorage.removeItem("playerId");
    localStorage.removeItem("playerName");
    navigate("/select-player");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded text-sm font-medium ${
      isActive
        ? "text-blue-600 border-b-2 border-blue-600"
        : "text-gray-600 hover:text-blue-600"
    }`;

  return (
    <nav className="bg-white shadow-sm px-6 py-3 flex items-center justify-between">
      {/* LEFT */}
      <div className="flex items-center gap-8">
        <NavLink to="/home" className="flex items-center gap-2">
          <img src={logo} alt="NCA Logo" className="h-10" />
          <span className="text-lg font-semibold">NCA</span>
        </NavLink>

        <div className="flex gap-4 items-center">
          <NavLink to="/home" className={linkClass}>Home</NavLink>

          {!isAdmin && (
            <NavLink to="/book-slot" className={linkClass}>Book Slot</NavLink>
          )}

          {!isAdmin && (
            <NavLink to="/my-bookings" className={linkClass}>My Bookings</NavLink>
          )}

          {/* ✅ ADMIN HOVER DROPDOWN */}
          {isAdmin && (
            <div className="relative group">
              <NavLink
                to="/admin"
                className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <LayoutDashboard size={16} />
                Admin
              </NavLink>

              <div className="absolute left-0 mt-2 w-52 bg-white border rounded-md shadow-lg hidden group-hover:block z-50">
                <NavLink
                  to="/admin/slider"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                >
                  <Image size={16} /> Slider
                </NavLink>

                {/* <NavLink
                  to="/admin/bookings"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                >
                  <CalendarCheck size={16} /> Bookings
                </NavLink> */}

                <NavLink
                  to="/admin/users"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                >
                  <Users size={16} /> Users
                </NavLink>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">
        {!isAdmin && playerName && (
          <div className="text-sm">
            👤 <strong>{playerName}</strong> ({playerId})
          </div>
        )}

        {userRole === "ROLE_PARENT" && (
          <button onClick={handleChangePlayer} className="text-sm text-blue-600">
            Change Player
          </button>
        )}

        <button
          onClick={handleLogout}
          className="text-sm bg-red-500 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
