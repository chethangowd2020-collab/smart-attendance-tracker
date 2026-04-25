import { Outlet, NavLink } from 'react-router-dom';
import { Home, Book, Calendar, GraduationCap, Settings, History } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/subjects', label: 'Subjects', icon: Book },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/history', label: 'History', icon: History },
  { path: '/academics', label: 'Academics', icon: GraduationCap },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden text-gray-100 bg-transparent">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 hide-scrollbar">
        <div className="max-w-4xl mx-auto w-full p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation for Mobile / Side Navigation for Desktop */}
      <nav className="fixed bottom-0 left-0 w-full glass pb-safe z-50 md:hidden border-t-0 border-b-0 rounded-t-2xl">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors',
                  isActive ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-gray-200'
                )
              }
            >
              <item.icon size={20} />
              <span className="text-[10px]">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full w-64 glass border-y-0 border-l-0">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="text-blue-500" />
            Academics Tracker
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium',
                  isActive ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/10' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                )
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* For desktop, adjust main content margin */}
      <style>{`
        @media (min-width: 768px) {
          main {
            margin-left: 16rem; /* 64 * 0.25rem = 16rem */
          }
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}
