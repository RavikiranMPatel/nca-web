import { useNavigate, useParams, useLocation, Outlet } from "react-router-dom";
import { ArrowLeft, ChevronRight, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "../../components/Button";
import api from "../../api/axios";

function PlayerOverviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { playerPublicId } = useParams();

  const role = localStorage.getItem("userRole");
  const isSuperAdmin = role === "ROLE_SUPER_ADMIN";
  const isAdmin = role === "ROLE_ADMIN" || role === "ROLE_SUPER_ADMIN";

  const [playerName, setPlayerName] = useState<string>("");
  const [showTooltip, setShowTooltip] = useState(false);

  /* ================= LOAD PLAYER NAME ================= */
  useEffect(() => {
    if (!playerPublicId) return;

    api
      .get(`/admin/players/${playerPublicId}`)
      .then((res) => {
        setPlayerName(res.data.displayName);
      })
      .catch(() => {});
  }, [playerPublicId]);

  if (!playerPublicId) return null;

  /* ================= ACTIVE TAB ================= */
  const activeTab = location.pathname.includes("/stats")
    ? "Stats"
    : location.pathname.includes("/analysis")
      ? "Analysis"
      : location.pathname.includes("/fees")
        ? "Fees"
        : location.pathname.includes("/media")
          ? "Media"
          : "Info";

  const handleUpdateClick = () => {
    if (isSuperAdmin) {
      navigate(`/admin/players/${playerPublicId}/edit`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 px-4 md:px-0">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/players")}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft size={20} />
          </button>

          <h1 className="text-xl md:text-2xl font-bold break-words">
            Player Overview · {playerPublicId}
          </h1>
        </div>

        {/* UPDATE BUTTON - VISIBLE FOR ALL ADMINS */}
        {isAdmin && (
          <div className="relative self-start md:self-auto">
            <div
              onMouseEnter={() => !isSuperAdmin && setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => !isSuperAdmin && setShowTooltip(true)}
            >
              <Button
                variant="primary"
                onClick={handleUpdateClick}
                disabled={!isSuperAdmin}
              >
                <div className="flex items-center gap-2">
                  {!isSuperAdmin && <Lock size={16} />}
                  Update Player
                </div>
              </Button>
            </div>

            {/* TOOLTIP */}
            {showTooltip && !isSuperAdmin && (
              <div className="absolute top-full mt-2 right-0 md:left-1/2 md:-translate-x-1/2 z-50 w-64 md:w-auto">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                  <div className="flex items-center gap-2">
                    <Lock size={14} />
                    <span>Update option only for Super Admin</span>
                  </div>
                  <div className="absolute -top-1 right-4 md:left-1/2 md:-translate-x-1/2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= BREADCRUMB ================= */}
      <div className="flex items-center text-xs md:text-sm text-gray-600 gap-1 flex-wrap">
        <button
          onClick={() => navigate("/admin/players")}
          className="hover:text-blue-600"
        >
          Players
        </button>

        <ChevronRight size={14} className="flex-shrink-0" />

        <span className="font-medium text-gray-800 break-all">
          {playerName || playerPublicId}
        </span>

        <ChevronRight size={14} className="flex-shrink-0" />

        <span className="text-blue-600 font-medium">{activeTab}</span>
      </div>

      {/* ================= TABS ================= */}
      <div className="flex gap-2 border-b overflow-x-auto">
        <TabButton
          active={activeTab === "Info"}
          onClick={() => navigate(`/admin/players/${playerPublicId}/info`)}
        >
          Info
        </TabButton>

        <TabButton
          active={activeTab === "Stats"}
          onClick={() => navigate(`/admin/players/${playerPublicId}/stats`)}
        >
          Stats
        </TabButton>

        <TabButton
          active={activeTab === "Analysis"}
          onClick={() => navigate(`/admin/players/${playerPublicId}/analysis`)}
        >
          Analysis
        </TabButton>

        <TabButton
          active={activeTab === "Fees"}
          onClick={() => navigate(`/admin/players/${playerPublicId}/fees`)}
        >
          Fees
        </TabButton>

        <TabButton
          active={activeTab === "Media"}
          onClick={() => navigate(`/admin/players/${playerPublicId}/media`)}
        >
          📸 Media
        </TabButton>
      </div>

      {/* ================= CHILD CONTENT ================= */}
      <Outlet />
    </div>
  );
}

/* ================= TAB BUTTON ================= */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-600 hover:text-blue-600"
      }`}
    >
      {children}
    </button>
  );
}

export default PlayerOverviewPage;
