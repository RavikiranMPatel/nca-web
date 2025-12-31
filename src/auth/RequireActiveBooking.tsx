import { Navigate } from "react-router-dom";

function RequireActiveBooking({
  children,
}: {
  children: JSX.Element;
}) {
  const bookingId = localStorage.getItem("activeBookingId");

  if (!bookingId) {
    return <Navigate to="/book-slot" replace />;
  }

  return children;
}

export default RequireActiveBooking;
