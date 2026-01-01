import { useNavigate } from "react-router-dom";
import { Image, CalendarCheck, Users } from "lucide-react";

function AdminDashboard() {
  const navigate = useNavigate();

  const Card = ({
    title,
    icon: Icon,
    path,
    description
  }: {
    title: string;
    icon: any;
    path: string;
    description: string;
  }) => (
    <div
      onClick={() => navigate(path)}
      className="bg-white p-6 rounded-lg shadow hover:shadow-lg cursor-pointer transition"
    >
      <div className="flex items-center gap-3 mb-3">
        <Icon size={24} className="text-blue-600" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          title="Home Slider"
          icon={Image}
          path="/admin/slider"
          description="Manage homepage banners and announcements"
        />

        {/* <Card
          title="Bookings"
          icon={CalendarCheck}
          path="/admin/bookings"
          description="View and manage all bookings"
        /> */}

        <Card
          title="Users"
          icon={Users}
          path="/admin/users"
          description="Manage players, parents and admins"
        />
      </div>
    </div>
  );
}

export default AdminDashboard;
