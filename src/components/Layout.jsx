import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Book, Calendar, GraduationCap, Settings, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const location = useLocation();

  return (
    <div className="flex flex-col h-screen overflow-hidden text-gray-100 bg-[#0a0a0a]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full w-72 bg-black/40 backdrop-blur-3xl border-r border-white/5 z-50">
        <div className="p-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/30">
              <GraduationCap className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tighter leading-none">TRACKIFY</h1>
            </div>
          </motion.div>
        </div>

        <nav className="flex-1 px-6 space-y-2 mt-4">
          {navItems.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-300 font-black text-[11px] uppercase tracking-widest group relative overflow-hidden',
                  isActive 
                    ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/20' 
                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                )
              }
            >
              <item.icon size={18} />
              {item.label}
              <motion.div 
                className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white opacity-0 group-hover:opacity-20"
                layoutId="nav-indicator"
              />
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-32 md:pb-0 hide-scrollbar md:ml-72">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 sticky top-0 z-[40] bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <GraduationCap className="text-white" size={18} />
            </div>
            <h1 className="text-sm font-black text-white tracking-tight uppercase">Trackify</h1>
          </div>
        </header>

        <div className="max-w-4xl mx-auto w-full p-6 md:p-10 lg:p-12 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 1.02 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-lg z-50 md:hidden">
        <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-2 flex justify-around items-center shadow-2xl shadow-black/50">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'relative flex flex-col items-center justify-center py-3 px-4 rounded-3xl transition-all duration-500',
                  isActive ? 'text-white' : 'text-gray-600'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div 
                      layoutId="bottom-nav-pill"
                      className="absolute inset-0 bg-blue-600 rounded-3xl shadow-lg shadow-blue-600/30"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div className="relative z-10 flex flex-col items-center">
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    {isActive && (
                      <motion.span 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[8px] font-black uppercase tracking-tighter mt-1"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
      
      <style>{`
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
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
}
