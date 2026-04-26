import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Book, Calendar, GraduationCap, Settings, History, Activity, Zap } from 'lucide-react';
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
    <div className="flex flex-col h-screen overflow-hidden text-gray-100 bg-[#0a0a0a] selection:bg-blue-600/30 selection:text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full w-80 bg-black/40 backdrop-blur-[100px] border-r border-white/5 z-50 overflow-y-auto hide-scrollbar">
        <div className="p-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-blue-600/30 border border-white/10">
              <Zap className="text-white" size={24} fill="white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tighter leading-none">TRACKIFY</h1>
              <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.4em] mt-1.5">Elite OS v1.8</p>
            </div>
          </motion.div>
        </div>

        <nav className="flex-1 px-8 space-y-3 mt-4">
          {navItems.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-5 px-6 py-5 rounded-[2rem] transition-all duration-500 font-black text-[11px] uppercase tracking-[0.2em] group relative overflow-hidden border border-transparent',
                  isActive 
                    ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/30 border-blue-500' 
                    : 'text-gray-600 hover:bg-white/5 hover:text-gray-300 hover:border-white/5'
                )
              }
            >
              <item.icon size={20} strokeWidth={2.5} />
              {item.label}
              <motion.div 
                className="absolute right-6 w-1.5 h-1.5 rounded-full bg-white opacity-0 group-hover:opacity-40"
                layoutId="nav-indicator"
              />
            </NavLink>
          ))}
        </nav>
        
        <div className="p-8">
           <div className="p-6 glass-card rounded-[2rem] border border-white/5 bg-white/[0.02]">
              <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-3">System Status</p>
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                 <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Network Active</span>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-32 md:pb-0 hide-scrollbar md:ml-80 relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-8 py-6 sticky top-0 z-[40] bg-[#0a0a0a]/80 backdrop-blur-3xl border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-600/30 border border-white/10">
              <Zap className="text-white" size={20} fill="white" />
            </div>
            <div>
               <h1 className="text-lg font-black text-white tracking-tighter uppercase leading-none">Trackify</h1>
               <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest mt-1">Live Instance</p>
            </div>
          </div>
          <div className="flex gap-2">
             <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          </div>
        </header>

        <div className="max-w-4xl mx-auto w-full p-4 md:p-12 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 md:hidden">
        <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-2 flex justify-around items-center shadow-2xl shadow-black/80">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'relative flex flex-col items-center justify-center py-4 px-6 rounded-[2rem] transition-all duration-500',
                  isActive ? 'text-white' : 'text-gray-700'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div 
                      layoutId="bottom-nav-pill"
                      className="absolute inset-0 bg-blue-600 rounded-[2rem] shadow-2xl shadow-blue-600/40 border border-white/10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.8 }}
                    />
                  )}
                  <div className="relative z-10 flex flex-col items-center">
                    <item.icon size={22} strokeWidth={isActive ? 3 : 2} className={clsx("transition-transform duration-500", isActive && "scale-110")} />
                    <AnimatePresence>
                      {isActive && (
                        <motion.span 
                          initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
                          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
                          className="text-[8px] font-black uppercase tracking-[0.2em] mt-1.5"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
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
        @keyframes glow {
          0% { box-shadow: 0 0 5px rgba(37,99,235,0.2); }
          50% { box-shadow: 0 0 20px rgba(37,99,235,0.4); }
          100% { box-shadow: 0 0 5px rgba(37,99,235,0.2); }
        }
      `}</style>
    </div>
  );
}
