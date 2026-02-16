import Navbar from "../components/Navbar";

type Props = {
  children: React.ReactNode;
};

function AppLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* NAV */}
      <Navbar />

      {/* CONTENT */}
      <main className="flex-1 pt-20 px-4 sm:px-6 py-4 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
