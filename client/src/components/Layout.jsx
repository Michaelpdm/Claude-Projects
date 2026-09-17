import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content — add bottom padding on mobile for nav bar */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Bottom nav — visible on mobile only */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
