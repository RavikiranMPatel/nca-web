import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import logo from "../assets/logos/nca-logo-app.png";

function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const playerName = localStorage.getItem("playerName");
  const playerId = localStorage.getItem("playerId");
  const userRole = localStorage.getItem("userRole"); // ROLE_PARENT / ROLE_PLAYER

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
      {/* Left: Logo + Links */}
      <div className="flex items-center gap-8">
        {/* Logo */}
        <NavLink to="/home" className="flex items-center gap-2">
          <img src={logo} alt="NCA Logo" className="h-10" />
          <span className="text-lg font-semibold text-gray-800">NCA</span>
        </NavLink>

        {/* Navigation Links */}
        <div className="flex gap-4">
          <NavLink to="/home" className={linkClass}>
            Home
          </NavLink>
          <NavLink to="/book-slot" className={linkClass}>
            Book Slot
          </NavLink>
          <NavLink to="/my-bookings" className={linkClass}>
            My Bookings
          </NavLink>
        </div>
      </div>

      {/* Right: Player Info + Actions */}
      <div className="flex items-center gap-4">
        {/* Active Player */}
        {playerName && (
          <div className="text-sm text-gray-700">
            👤 <span className="font-medium">{playerName}</span>
            <span className="text-gray-400 ml-1">({playerId})</span>
          </div>
        )}

        {/* Change Player (Parent only) */}
        {userRole === "ROLE_PARENT" && (
          <button
            onClick={handleChangePlayer}
            className="text-sm text-blue-600 hover:underline"
          >
            Change Player
          </button>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="text-sm bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
