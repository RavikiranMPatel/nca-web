import Navbar from "../components/Navbar";
import { useLocation } from "react-router-dom";

type Props = {
  children: React.ReactNode;
};

function AppLayout({ children }: Props) {
  const location = useLocation();
  const isHome = location.pathname === "/home";

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main
        className={`flex-1 ${isHome ? "pt-16" : "pt-20 px-4 sm:px-6 py-4 max-w-7xl mx-auto w-full"}`}
      >
        {children}
      </main>
    </div>
  );
}
export default AppLayout;
