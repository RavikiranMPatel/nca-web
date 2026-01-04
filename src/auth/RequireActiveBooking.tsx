import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

function RequireActiveBooking({ children }: Props) {
  const bookingId = localStorage.getItem("activeBookingId");

  if (!bookingId) {
    return <Navigate to="/book-slot" replace />;
  }

  return <>{children}</>;
}

export default RequireActiveBooking;
