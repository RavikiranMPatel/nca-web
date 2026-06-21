import { useNavigate, useParams, useLocation, Outlet } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "../../components/Button";
import api from "../../api/axios";

function PlayerOverviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { playerPublicId } = useParams();

  const role = localStorage.getItem("userRole");
  const isAdmin = role === "ROLE_ADMIN" || role === "ROLE_SUPER_ADMIN";
  const isSuperAdmin = role === "ROLE_SUPER_ADMIN";

  const [playerName, setPlayerName] = useState<string>("");

  const isExternalPlayer = playerPublicId?.startsWith("EXT-") ?? false;

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
          : location.pathname.includes("/coaching")
            ? "Coaching"
            : "Info";

  const handleUpdateClick = () => {
    navigate(`/admin/players/${playerPublicId}/edit`);
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

        {/* UPDATE BUTTON */}
        {isAdmin && (
          <div className="self-start md:self-auto">
            <Button variant="primary" onClick={handleUpdateClick}>
              Update Player
            </Button>
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

        {!isExternalPlayer && (
          <>
            <TabButton
              active={activeTab === "Stats"}
              onClick={() => navigate(`/admin/players/${playerPublicId}/stats`)}
            >
              Stats
            </TabButton>

            <TabButton
              active={activeTab === "Analysis"}
              onClick={() =>
                navigate(`/admin/players/${playerPublicId}/analysis`)
              }
            >
              Analysis
            </TabButton>

            {isSuperAdmin && (
              <TabButton
                active={activeTab === "Fees"}
                onClick={() => navigate(`/admin/players/${playerPublicId}/fees`)}
              >
                Fees
              </TabButton>
            )}

            <TabButton
              active={activeTab === "Media"}
              onClick={() => navigate(`/admin/players/${playerPublicId}/media`)}
            >
              📸 Media
            </TabButton>
          </>
        )}

        <TabButton
          active={activeTab === "Coaching"}
          onClick={() => navigate(`/admin/players/${playerPublicId}/coaching`)}
        >
          🏋️ Coaching
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
