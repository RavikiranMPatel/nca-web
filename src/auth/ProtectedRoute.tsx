import { Navigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./AuthContext";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const auth = useContext(AuthContext);
  const location = useLocation();

  // ⛔ Safety: context not ready
  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  // 🔒 Not authenticated → login
  if (!auth.isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // ✅ Auth OK → render page
  return children;
}

export default ProtectedRoute;
