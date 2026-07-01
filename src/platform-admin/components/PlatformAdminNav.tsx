import { Link, useNavigate, useLocation } from 'react-router-dom';

const navLinks = [
  { label: 'Dashboard', to: '/platform-admin/dashboard' },
  { label: 'Academies', to: '/platform-admin/academies' },
  { label: 'Servers', to: '/platform-admin/servers' },
  { label: 'Backups', to: '/platform-admin/backups' },
  { label: 'Events', to: '/platform-admin/events' },
];

export default function PlatformAdminNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('platformAdminKey');
    navigate('/platform-admin');
  };

  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
      <span className="text-lg font-bold tracking-tight">🏏 CricketMaidan Admin</span>

      <div className="flex items-center gap-1">
        {navLinks.map((link) => {
          const active = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition-colors"
      >
        Logout
      </button>
    </nav>
  );
}
