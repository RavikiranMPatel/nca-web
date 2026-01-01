import { Navigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./AuthContext";

type Props = {
  children: JSX.Element;
  roles?: string[]; // ✅ optional role support
};

function ProtectedRoute({ children, roles }: Props) {
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

  // 🔐 Role check (only if roles are provided)
  if (roles && roles.length > 0) {
    if (!auth.userRole || !roles.includes(auth.userRole)) {
      return <Navigate to="/home" replace />;
    }
  }

  // ✅ Allowed
  return children;
}

export default ProtectedRoute;
