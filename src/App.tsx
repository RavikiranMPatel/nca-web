import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import StarPerformer from "./pages/admin/StarPerformer";
import ProtectedRoute from "./auth/ProtectedRoute";
import RequireActiveBooking from "./auth/RequireActiveBooking";
import AppLayout from "./layout/AppLayout";
import BookSlot from "./pages/book-slot/BookSlot";
import MyBookings from "./pages/book-slot/MyBookings";
import ConfirmBooking from "./pages/book-slot/ConfirmBooking";
import Payment from "./pages/book-slot/Payment";
import BookingSuccess from "./pages/book-slot/BookingSuccess";
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
import SlotTemplateManagement from "./pages/slot-templates/SlotTemplateManagement";
import CreateEditTemplate from "./pages/slot-templates/CreateEditTemplate";
import ManageResources from "./pages/ManageResources";
import CalendarView from "./pages/CalendarView";
import ViewAllBookings from "./pages/book-slot/ViewAllBookings";
import AcademySettings from "./pages/admin/AcademySettings";
import EnquiryListPage from "./pages/enquiry/EnquiryListPage";
import AddEnquiryPage from "./pages/enquiry/AddEnquiryPage";
import EnquiryDetailsPage from "./pages/enquiry/EnquiryDetailsPage";
import UpdateEnquiryPage from "./pages/enquiry/UpdateEnquiryPage";
import SummerCampList from "./pages/summercamp/SummerCampList";
import SummerCampCreate from "./pages/summercamp/SummerCampCreate";
import SummerCampDetails from "./pages/summercamp/SummerCampDetails";
import SummerCampEdit from "./pages/summercamp/SummerCampEdit";
import SummerCampEnrollments from "./pages/summercamp/SummerCampEnrollments";
import SummerCampConversion from "./pages/summercamp/SummerCampConversion";
import SummerCampAttendance from "./pages/summercamp/SummerCampAttendance";
import PlayerAttendanceHistoryPage from "./pages/regular-camp-attendance/PlayerAttendanceHistoryPage";
import PlayerAnalysisPage from "./pages/player/PlayerAnalysisPage";
import PlayerAssessmentDashboardPage from "./pages/player/PlayerAssessmentDashboardPage";
import PlayerFeesTab from "./pages/player/PlayerFeesTab";
import PlayerMediaPage from "./pages/player/PlayerMediaPage";

function App() {
  return (
    <Routes>
      {/* DEFAULT */}
      <Route path="/" element={<Navigate to="/home" replace />} />
      {/* PUBLIC */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
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
      {/* PROTECTED */}
      <Route
        path="/book-slot"
        element={
          <AppLayout>
            <BookSlot />
          </AppLayout>
        }
      />
      <Route path="/confirm-booking" element={<ConfirmBooking />} />
      <Route
        path="/payment"
        element={
          <RequireActiveBooking>
            <AppLayout>
              <Payment />
            </AppLayout>
          </RequireActiveBooking>
        }
      />
      <Route
        path="/booking-success"
        element={
          <AppLayout>
            <BookingSuccess />
          </AppLayout>
        }
      />
      <Route
        path="/my-bookings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MyBookings />
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
        element={<PlayerAttendanceHistoryPage />}
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
        element={<AttendanceDayHistoryPage />}
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
        path="/admin/settings"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <AcademySettings />
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
        path="/admin/bookings"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <ViewAllBookings />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/date-overrides"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <CalendarView />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      {/* 🔥 PLAYER OVERVIEW WITH NESTED TABS */}
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
        {/* DEFAULT TAB */}
        <Route index element={<Navigate to="info" replace />} />

        {/* TABS */}
        <Route path="info" element={<PlayerInfoPage />} />
        <Route path="stats" element={<PlayerStatsPage />} />
        <Route path="analysis" element={<PlayerAnalysisPage />} />
        <Route path="fees" element={<PlayerFeesTab />} />
        <Route path="media" element={<PlayerMediaPage />} />
      </Route>
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
        element={<PlayerAssessmentDashboardPage />}
      />
      <Route
        path="/admin/slot-templates"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <SlotTemplateManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/resources"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <ManageResources />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/slot-templates/create"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <CreateEditTemplate />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/slot-templates/:id/edit"
        element={
          <ProtectedRoute roles={["ROLE_ADMIN", "ROLE_SUPER_ADMIN"]}>
            <AppLayout>
              <CreateEditTemplate />
            </AppLayout>
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
      // Inside your Routes component, add:
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
      {/* SUMMER CAMP - Create */}
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
      {/* SUMMER CAMP - Edit */}
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
      {/* SUMMER CAMP - Details */}
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
      {/* SUMMER CAMP - Enrollments */}
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
      {/* SUMMER CAMP - Quick Enroll */}
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
      {/* SUMMER CAMP - Attendance */}
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
      {/* SUMMER CAMP - Conversion */}
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
      {/* CATCH-ALL */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export default App;
