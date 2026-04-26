import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Calendar, Settings, History, Zap, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

// Desktop sidebar shows all routes
const sidebarItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/subjects', label: 'Subjects', icon: BookOpen },
  { path: '/history', label: 'History', icon: History },
  { path: '/settings', label: 'Settings', icon: Settings },
];

// Mobile bottom nav: Ajack layout — Home, Calendar, Subjects, Grades, Profile
const mobileNavItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/subjects', label: 'Subjects', icon: BookOpen },
  { path: '/settings', label: 'Profile', icon: User },
];

function NavIcon({ icon: Icon, isActive }) {
  return (
    <div className="relative flex flex-col items-center gap-1">
      <Icon
        size={26}
        strokeWidth={isActive ? 2.5 : 1.8}
        className={clsx(
          'transition-all duration-200',
          isActive ? 'text-white scale-110' : 'text-[#737373]'
        )}
        fill={isActive ? 'white' : 'none'}
      />
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get page title for mobile header
  const pageLabels = {
    '/': 'Trackify',
    '/subjects': 'Subjects',
    '/calendar': 'Calendar',
    '/history': 'History',
    '/settings': 'Profile',
  };
  const currentLabel = pageLabels[location.pathname] || 'Trackify';

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-[244px] lg:w-[335px] border-r border-[#262626] h-full shrink-0 overflow-y-auto">
        {/* Logo */}
        <div className="px-6 py-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 px-3"
          >
            <div className="w-9 h-9 bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] rounded-xl flex items-center justify-center shadow-lg">
              <Zap size={18} className="text-white" fill="white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Trackify</span>
          </motion.div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-150 group',
                  isActive ? 'bg-[#1a1a1a] font-bold' : 'hover:bg-[#1a1a1a]'
                )}
              >
                <item.icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  fill={isActive ? 'white' : 'none'}
                  className="text-white transition-all"
                />
                <span className={clsx(
                  'text-[15px] transition-all',
                  isActive ? 'font-semibold text-white' : 'font-normal text-white/90'
                )}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* User profile at bottom */}
        <div className="p-4 mx-3 mb-6">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-[#1a1a1a] transition-all"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.email?.split('@')[0] || 'User'}</p>
              <p className="text-xs text-[#737373] truncate">{user?.email || ''}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Top Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#262626] bg-black sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" fill="white" />
            </div>
            <span className="text-lg font-bold text-white">{currentLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* History shortcut in header on mobile */}
            <NavLink to="/history">
              <History
                size={24}
                strokeWidth={1.8}
                className={clsx(
                  'transition-all',
                  location.pathname === '/history' ? 'text-white' : 'text-[#737373]'
                )}
              />
            </NavLink>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="min-h-full pb-24 md:pb-8"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Mobile Bottom Nav (Instagram-style) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#262626] bg-black">
        <div className="flex justify-around items-center h-14 px-2">
          {mobileNavItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex-1 flex items-center justify-center h-full"
              >
                {item.path === '/settings' ? (
                  // Profile tab: show user avatar
                  <div className={clsx(
                    'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                    'bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888]',
                    isActive ? 'ring-2 ring-white ring-offset-1 ring-offset-black scale-110' : 'opacity-80'
                  )}>
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                ) : (
                  <motion.div
                    whileTap={{ scale: 0.85 }}
                    transition={{ duration: 0.1 }}
                  >
                    <NavIcon icon={item.icon} isActive={isActive} />
                  </motion.div>
                )}
              </NavLink>
            );
          })}
        </div>
        {/* Safe area spacer for iOS */}
        <div className="h-safe-area-inset-bottom bg-black" style={{ height: 'env(safe-area-inset-bottom)' }} />
      </nav>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
