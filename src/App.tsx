import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import ProtectedRoute from "./auth/ProtectedRoute";
import RequireActiveBooking from "./auth/RequireActiveBooking";
import AppLayout from "./layout/AppLayout";
import BookSlot from "./pages/BookSlot";
import MyBookings from "./pages/MyBookings";
import ConfirmBooking from "./pages/ConfirmBooking";
import SelectPlayer from "./pages/SelectPlayer";
import CreatePlayer from "./pages/CreatePlayer";
import Payment from "./pages/Payment";
import BookingSuccess from "./pages/BookingSuccess";

function App() {
  return (
    <Routes>
      {/* Default */}
      <Route path="/" element={<Navigate to="/home" replace />} />

      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Home />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/book-slot"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BookSlot />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/confirm-booking"
        element={
          <ProtectedRoute>
            <ConfirmBooking />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payment"
        element={
          <ProtectedRoute>
            <RequireActiveBooking>
              <AppLayout>
                <Payment />
              </AppLayout>
            </RequireActiveBooking>
          </ProtectedRoute>
        }
      />

      <Route
        path="/booking-success"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BookingSuccess />
            </AppLayout>
          </ProtectedRoute>
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

      <Route
        path="/select-player"
        element={
          <ProtectedRoute>
            <SelectPlayer />
          </ProtectedRoute>
        }
      />

      <Route
        path="/create-player"
        element={
          <ProtectedRoute>
            <AppLayout>
              <CreatePlayer />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export default App;
