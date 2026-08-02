import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import StarPerformer from "./pages/admin/StarPerformer";
import ProtectedRoute from "./auth/ProtectedRoute";
import AppLayout from "./layout/AppLayout";
import AdminSliderManager from "./pages/AdminSliderManager";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AttendancePage from "./pages/regular-camp-attendance/AttendancePage";
import AttendanceDayHistoryPage from "./pages/regular-camp-attendance/AttendanceDayHistoryPage";
import AttendanceStatsPage from "./pages/regular-camp-attendance/AttendanceStatsPage";
import RegisterPlayer from "./pages/player/RegisterPlayer";
import PlayersListPage from "./pages/player/PlayersListPage";
import PlayerOverviewPage from "./pages/player/PlayerOverviewPage";
import PlayerInfoPage from "./pages/player/PlayerInfoPage";
import PlayerStatsPage from "./pages/player/PlayerStatsPage";
import UpdatePlayer from "./pages/player/UpdatePlayer";
import AddCricketStats from "./pages/player/AddCricketStats";
import BatchManagementPage from "./pages/BatchManagementPage";
import AcademySettings from "./pages/admin/AcademySettings";
import EnquiryListPage from "./pages/enquiry/EnquiryListPage";
import AddEnquiryPage from "./pages/enquiry/AddEnquiryPage";
import EnquiryDetailsPage from "./pages/enquiry/EnquiryDetailsPage";
import UpdateEnquiryPage from "./pages/enquiry/UpdateEnquiryPage";
import HomepageSectionsPage from "./pages/admin/HomepageSectionsPage";
import ClubsListPage from "./pages/admin/clubs/ClubsListPage";
import ClubDetailPage from "./pages/admin/clubs/ClubDetailPage";
import SummerCampList from "./pages/summercamp/SummerCampList";
import SummerCampCreate from "./pages/summercamp/SummerCampCreate";
import SummerCampDetails from "./pages/summercamp/SummerCampDetails";
import SummerCampEdit from "./pages/summercamp/SummerCampEdit";
import SummerCampEnrollments from "./pages/summercamp/SummerCampEnrollments";
import SummerCampConversion from "./pages/summercamp/SummerCampConversion";
import SummerCampAttendance from "./pages/summercamp/SummerCampAttendance";
import SummerCampEnrollmentDetail from "./pages/summercamp/SummerCampEnrollmentDetail";
import PlayerAttendanceHistoryPage from "./pages/regular-camp-attendance/PlayerAttendanceHistoryPage";
import PlayerAnalysisPage from "./pages/player/PlayerAnalysisPage";
import PlayerAssessmentDashboardPage from "./pages/player/PlayerAssessmentDashboardPage";
import PlayerFeesTab from "./pages/player/PlayerFeesTab";
import PlayerMediaPage from "./pages/player/PlayerMediaPage";
import { useTenant } from "./context/TenantContext";
import TeamMembersAdmin from "./pages/admin/TeamMembersAdmin";
import ManageUsersPage from "./pages/ManageUsersPage";
import ManageBranchesPage from "./pages/ManageBranchesPage";
import UserProfilePage from "./pages/UserProfilePage";
import AdminRevenueDashboard from "./pages/admin/AdminRevenueDashboard";
import PlayerCoachingPage from "./pages/player/PlayerCoachingPage";
import CoachingDashboardPage from "./pages/coaching/CoachingDashboardPage";
import PlayerCoachingViewPage from "./pages/player/PlayerCoachingViewPage";
import UserFormPage from "./pages/UserFormPage";
import MatchSetupPage from "./pages/scoring/MatchSetupPage";
import LiveScorerPage from "./pages/scoring/LiveScorerPage";
import ManualEntryPage from "./pages/scoring/ManualEntryPage";
import PublicScorecardPage from "./pages/scoring/PublicScorecardPage";
import PublicPlayerProfilePage from "./pages/scoring/PublicPlayerProfilePage";
import PublicClubDetail from "./pages/PublicClubDetail";
import MatchListPage from "./pages/scoring/MatchListPage";
import ExternalMatchReportPage from "./pages/scoring/ExternalMatchReportPage";
import TournamentCreatePage from "./pages/scoring/TournamentCreatePage";
import TournamentDetailPage from "./pages/scoring/TournamentDetailPage";
import TournamentListPage from "./pages/scoring/TournamentListPage";
import CricketStatsPage from "./pages/CricketStatsPage";
import PlatformAdminPage from "./pages/platform/PlatformAdminPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import RepresentativeHonorsAdmin from "./pages/admin/RepresentativeHonorsAdmin";
import BulkImportPlayerPage from "./pages/player/BulkImportPlayerPage";
import PlayerKitPage from "./pages/player/PlayerKitPage";
import KitBulkPage from "./pages/kit/KitBulkPage";
import KitPurchaseOrderPage from "./pages/kit/KitPurchaseOrderPage";
import InventoryListPage from "./pages/inventory/InventoryListPage";
import InventoryCheckoutsPage from "./pages/inventory/InventoryCheckoutsPage";
import AuditLogPage from "./pages/AuditLogPage";

function App() {
  const { loading: tenantLoading, error: tenantError, tenant } = useTenant();

  useEffect(() => {
    if (!tenant) return;
    const name = tenant.name || "Cricket Academy";
    const city = tenant.city ? ` ${tenant.city}` : "";
    document.title = `${name}${city} | Cricket Academy`;

    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) {
      descEl.setAttribute(
        "content",
        `${name} — professional cricket coaching${city ? ` in${city}` : ""}.`,
      );
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", `${name}${city}`);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute(
        "content",
        `${name} — professional cricket coaching${city ? ` in${city}` : ""}.`,
      );
    }

    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute("content", `${name}${city}`);
  }, [tenant]);

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (tenantError && !window.location.pathname.startsWith("/platform")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Academy not found</h1>
          <p className="text-sm text-gray-500">
            This address doesn't match any academy on our platform.
            If you're an academy owner, contact your platform administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* DEFAULT */}
      <Route path="/" element={<Navigate to="/home" replace />} />

      {/* PUBLIC */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route
        path="/home"
        element={
          <AppLayout>
            <Home />
          </AppLayout>
        }
      />
      <Route
        path="/star-performer"
        element={
          <AppLayout>
            <StarPerformer />
          </AppLayout>
        }
      />

      <Route
        path="/cricket-stats"
        element={
          <AppLayout>
            <CricketStatsPage />
          </AppLayout>
        }
      />

      <Route
        path="/admin/cms/team"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <TeamMembersAdmin />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* PROTECTED */}







      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <UserProfilePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= ADMIN ================= */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <AdminDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attendance"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <AttendancePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attendance/history/date/:date"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <AttendanceDayHistoryPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attendance/stats"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <AttendanceStatsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/players/:playerId/attendance-history"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <PlayerAttendanceHistoryPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/slider"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <AdminSliderManager />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attendance/day/:date"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <AttendanceDayHistoryPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <AdminUsers />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/new"
        element={
          <ProtectedRoute roles={["ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <UserFormPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/:publicId/edit"
        element={
          <ProtectedRoute roles={["ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <UserFormPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/players/register"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <RegisterPlayer />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/players/bulk-import"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <BulkImportPlayerPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <AcademySettings />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= HOMEPAGE & CLUBS ================= */}
      <Route
        path="/admin/settings/homepage"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <HomepageSectionsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/clubs"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <ClubsListPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/clubs/:publicId"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <ClubDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/representative-honors"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <RepresentativeHonorsAdmin />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/cricket/matches"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <MatchListPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cricket/matches/new"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <MatchSetupPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cricket/matches/:matchId/score"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            {/* No AppLayout — Live scorer is full screen dark UI */}
            <LiveScorerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cricket/matches/:matchId/enter"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <ManualEntryPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cricket/matches/:publicId/report"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <ExternalMatchReportPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/cricket/tournaments"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <TournamentListPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cricket/tournaments/new"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <TournamentCreatePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cricket/tournaments/:publicId"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <TournamentDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= PLAYERS ================= */}
      <Route
        path="/admin/players"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <PlayersListPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/batches"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <BatchManagementPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />




      <Route
        path="/admin/revenue"
        element={
          <ProtectedRoute roles={["ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <AdminRevenueDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />


      {/* PLAYER OVERVIEW WITH NESTED TABS */}
      <Route
        path="/admin/players/:playerPublicId"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <PlayerOverviewPage />
            </AppLayout>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="info" replace />} />
        <Route path="info" element={<PlayerInfoPage />} />
        <Route path="stats" element={<PlayerStatsPage />} />
        <Route path="analysis" element={<PlayerAnalysisPage />} />
        <Route path="fees" element={<PlayerFeesTab />} />
        <Route path="media" element={<PlayerMediaPage />} />
        <Route path="coaching" element={<PlayerCoachingPage />} />
        <Route path="kit" element={<PlayerKitPage />} />
      </Route>

      <Route
        path="/admin/kit"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <KitBulkPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/kit/purchase-order"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <KitPurchaseOrderPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/inventory"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <InventoryListPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/inventory/checkouts"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <InventoryCheckoutsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/audit-log"
        element={
          <ProtectedRoute roles={["ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <AuditLogPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/coaching"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <CoachingDashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/players/:playerPublicId/edit"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <UpdatePlayer />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= CRICKET STATS ================= */}
      <Route
        path="/admin/cricket-stats/add"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <AddCricketStats />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/player-assessment"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <PlayerAssessmentDashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-coaching"
        element={
          <ProtectedRoute
            roles={["ROLE_PLAYER", "ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}
          >
            <AppLayout>
              <PlayerCoachingViewPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />





      <Route
        path="/admin/branches"
        element={
          <ProtectedRoute roles={["ROLE_SUPER_ADMIN"]}>
            <ManageBranchesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={["ROLE_SUPER_ADMIN"]}>
            <ManageUsersPage />
          </ProtectedRoute>
        }
      />

      {/* ================= ENQUIRIES ================= */}
      <Route
        path="/admin/enquiries"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <EnquiryListPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/enquiries/add"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <AddEnquiryPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/enquiries/:enquiryId"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <EnquiryDetailsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/enquiries/:enquiryId/edit"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <UpdateEnquiryPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= SUMMER CAMPS ================= */}
      <Route
        path="/admin/summer-camps"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <SummerCampList />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/summer-camps/create"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <SummerCampCreate />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/summer-camps/:campId/edit"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <SummerCampEdit />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/summer-camps/:campId"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <SummerCampDetails />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/summer-camps/:campId/enrollments"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <SummerCampEnrollments />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/summer-camps/:campId/enrollments/:enrollmentId"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <SummerCampEnrollmentDetail />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/summer-camps/:campId/enroll"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <SummerCampEnrollments />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/summer-camps/:campId/attendance"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <SummerCampAttendance />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/summer-camps/:campId/convert"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <SummerCampConversion />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/match/:matchId/scorecard"
        element={<PublicScorecardPage />}
      />
      <Route
        path="/players/:playerPublicId/profile"
        element={<PublicPlayerProfilePage />}
      />
      <Route
        path="/clubs/:publicId"
        element={<PublicClubDetail />}
      />

      {/* Platform admin — self-managed auth, no ProtectedRoute wrapper */}
      <Route path="/platform" element={<PlatformAdminPage />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export default App;
