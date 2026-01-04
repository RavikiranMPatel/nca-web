import { Navigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";

type Props = {
  children: ReactNode;
  roles?: string[];
};

function ProtectedRoute({ children, roles }: Props) {
  const auth = useContext(AuthContext);
  const location = useLocation();

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  if (!auth.isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (roles && roles.length > 0) {
    if (!auth.userRole || !roles.includes(auth.userRole)) {
      return <Navigate to="/home" replace />;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;
