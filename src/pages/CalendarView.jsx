import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay, isSameDay, startOfDay } from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  CheckCircle2, XCircle, Slash, Filter, Plus, Info, 
  MoreVertical, X, Calendar, Activity, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterSubjectId, setFilterSubjectId] = useState('all');
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);

  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const allRecords = useLiveQuery(() => db.attendance_records.toArray(), []);
  const timetable = useLiveQuery(() => db.timetable.toArray(), []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = Array.from({ length: getDay(monthStart) }).map((_, i) => i);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Filtered records for the current view
  const filteredRecords = useMemo(() => {
    if (!allRecords) return [];
    return allRecords.filter(r => filterSubjectId === 'all' || r.subjectId === Number(filterSubjectId));
  }, [allRecords, filterSubjectId]);

  // Monthly stats calculation
  const stats = useMemo(() => {
    const monthRecords = filteredRecords.filter(r => isSameMonth(new Date(r.date), currentDate));
    const present = monthRecords.filter(r => r.status === 'present').length;
    const absent = monthRecords.filter(r => r.status === 'absent').length;
    const cancelled = monthRecords.filter(r => r.status === 'cancelled').length;
    const total = present + absent;
    const percentage = total === 0 ? 0 : (present / total) * 100;
    
    return { present, absent, cancelled, total, percentage };
  }, [filteredRecords, currentDate]);

  const handleQuickMark = async (subjectId, status) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    try {
      await db.transaction('rw', db.attendance_records, db.subjects, async () => {
        const subject = await db.subjects.get(subjectId);
        if (!subject) return;

        await db.attendance_records.add({
          subjectId,
          date: dateStr,
          status,
          timetableId: null // Manual mark
        });

        if (status === 'present') {
          await db.subjects.update(subjectId, {
            attendedClasses: subject.attendedClasses + 1,
            totalClasses: subject.totalClasses + 1
          });
        } else if (status === 'absent') {
          await db.subjects.update(subjectId, {
            totalClasses: subject.totalClasses + 1
          });
        }
      });
      toast.success(`Marked ${status}`, { icon: status === 'present' ? '✅' : '❌' });
    } catch (e) {
      toast.error('Failed to mark attendance');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-2xl mx-auto pb-32"
    >
      <header className="px-3 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">CALENDAR</h1>
          <p className="text-gray-500 font-black text-[10px] uppercase tracking-[0.3em] mt-1">Interactive Log</p>
        </div>
        <div className="relative group">
          <select 
            className="bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-[10px] font-black uppercase tracking-widest text-white outline-none appearance-none pr-12 focus:ring-4 focus:ring-blue-600/20 transition-all cursor-pointer shadow-inner"
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
          >
            <option value="all">ALL MODULES</option>
            {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" size={14} />
        </div>
      </header>

      {/* Monthly Summary Card */}
      <section className="mx-3 p-8 glass-card rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden relative group">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-600/10 blur-3xl group-hover:bg-blue-600/20 transition-all duration-1000" />
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-blue-500" />
            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{format(currentDate, 'MMMM')} METRICS</h3>
          </div>
          <span className="text-sm font-black text-blue-400 tracking-tighter">{Math.round(stats.percentage)}% RATE</span>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
          <div>
            <div className="text-5xl font-black text-white tracking-tighter">{stats.present}</div>
            <div className="text-[9px] font-black text-blue-500/50 uppercase tracking-widest mt-1">SESSIONS ATTENDED</div>
          </div>
          <div className="text-right">
            <div className="text-5xl font-black text-white tracking-tighter">{stats.absent}</div>
            <div className="text-[9px] font-black text-red-500/50 uppercase tracking-widest mt-1">SESSIONS MISSED</div>
          </div>
        </div>

        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden relative z-10 p-0.5 border border-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${stats.percentage}%` }}
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]"
          />
        </div>
      </section>

      {/* Calendar Grid */}
      <div className="mx-3 glass-card p-8 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-10">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePrevMonth} 
            className="p-4 bg-white/5 hover:bg-blue-600 hover:text-white rounded-3xl text-blue-400 transition-all border border-white/5 shadow-inner"
          >
            <ChevronLeft size={24} />
          </motion.button>
          <div className="text-center">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{format(currentDate, 'MMMM')}</h2>
            <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.4em] mt-2">{format(currentDate, 'yyyy')}</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleNextMonth} 
            className="p-4 bg-white/5 hover:bg-blue-600 hover:text-white rounded-3xl text-blue-400 transition-all border border-white/5 shadow-inner"
          >
            <ChevronRight size={24} />
          </motion.button>
        </div>

        <div className="grid grid-cols-7 gap-3 text-center mb-6">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <div key={day} className="text-[10px] font-black text-gray-800 py-1 tracking-widest">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3">
          {startPadding.map(i => <div key={`empty-${i}`} className="aspect-square"></div>)}
          
          {daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayRecords = filteredRecords.filter(r => r.date === dateStr);
            
            const presentCount = dayRecords.filter(r => r.status === 'present').length;
            const absentCount = dayRecords.filter(r => r.status === 'absent').length;
            const cancelledCount = dayRecords.filter(r => r.status === 'cancelled').length;
            const isSel = selectedDate && isSameDay(day, selectedDate);

            return (
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.9 }}
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={clsx(
                  "aspect-square relative flex flex-col items-center justify-center rounded-[1.25rem] text-sm font-black transition-all",
                  isSameMonth(day, currentDate) ? "text-white" : "text-gray-900 opacity-20",
                  isToday(day) 
                    ? "bg-blue-600 shadow-2xl shadow-blue-600/30 border-blue-500 scale-105 z-10" 
                    : isSel 
                      ? "bg-white text-black border-white shadow-xl" 
                      : "bg-white/5 border border-white/5 hover:bg-white/10",
                )}
              >
                <span className={clsx(isToday(day) ? "text-white" : isSel ? "text-black" : "group-hover:text-blue-400")}>{format(day, 'd')}</span>
                <div className="flex gap-1 mt-1.5">
                  {presentCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]"></div>}
                  {absentCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>}
                  {cancelledCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-gray-500 shadow-[0_0_8px_rgba(107,114,128,0.6)]"></div>}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bottom Sheet Details */}
      <AnimatePresence>
        {selectedDate && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
              className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[60]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 w-full bg-[#0a0a0a] rounded-t-[4rem] p-10 z-[70] border-t border-white/10 shadow-2xl max-h-[85vh] overflow-y-auto hide-scrollbar"
            >
              <div className="w-16 h-2 bg-white/10 rounded-full mx-auto mb-10" onClick={() => setSelectedDate(null)} />
              
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase">{format(selectedDate, 'EEEE')}</h3>
                  <p className="text-blue-500 font-black text-[10px] uppercase tracking-widest mt-1">{format(selectedDate, 'do MMMM, yyyy')}</p>
                </div>
                <button onClick={() => setSelectedDate(null)} className="p-4 bg-white/5 rounded-3xl text-gray-600 hover:text-white transition-colors border border-white/5">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-5">
                {filteredRecords.filter(r => r.date === format(selectedDate, 'yyyy-MM-dd')).length === 0 ? (
                  <div className="py-20 text-center bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-white/5">
                    <p className="text-gray-700 font-black text-[10px] uppercase tracking-widest italic">Zero activity recorded</p>
                  </div>
                ) : (
                  filteredRecords
                    .filter(r => r.date === format(selectedDate, 'yyyy-MM-dd'))
                    .map(record => {
                      const subject = subjects?.find(s => s.id === record.subjectId);
                      if (!subject) return null;
                      return (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={record.id} 
                          className="p-6 bg-white/5 rounded-[2.5rem] border border-white/5 flex items-center justify-between group active:bg-white/10 transition-all shadow-xl"
                        >
                          <div className="flex items-center gap-5">
                            <div className={clsx(
                              "w-14 h-14 rounded-[1.25rem] flex items-center justify-center border-2 shadow-lg",
                              record.status === 'present' ? "bg-blue-600/10 border-blue-600/30 text-blue-400" :
                              record.status === 'absent' ? "bg-red-600/10 border-red-600/30 text-red-400" : "bg-gray-600/10 border-gray-600/30 text-gray-500"
                            )}>
                              {record.status === 'present' && <CheckCircle2 size={28} />}
                              {record.status === 'absent' && <XCircle size={28} />}
                              {record.status === 'cancelled' && <Slash size={28} />}
                            </div>
                            <div>
                              <p className="font-black text-white text-lg tracking-tight leading-tight mb-1">{subject.name}</p>
                              <div className="flex items-center gap-2">
                                <Zap size={10} className="text-gray-600" />
                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                                  {record.timetableId ? 'SCHEDULER SYNC' : 'MANUAL INJECTION'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className={clsx(
                            "text-[10px] font-black uppercase px-4 py-1.5 rounded-full border",
                            record.status === 'present' ? "text-blue-400 border-blue-500/20 bg-blue-500/5" :
                            record.status === 'absent' ? "text-red-400 border-red-500/20 bg-red-500/5" : "text-gray-500 border-gray-500/20 bg-gray-500/5"
                          )}>
                            {record.status}
                          </div>
                        </motion.div>
                      );
                    })
                )}
              </div>

              <div className="mt-10">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsMarkModalOpen(true)}
                  className="w-full py-6 bg-blue-600 rounded-[2.5rem] text-white font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl shadow-blue-600/40 transition-all text-lg"
                >
                  <Plus size={24} strokeWidth={3} />
                  Mark Attendance
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Quick Mark Modal */}
      <AnimatePresence>
        {isMarkModalOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100]">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-[#0a0a0a] p-10 rounded-t-[4rem] sm:rounded-[4rem] w-full max-w-lg shadow-2xl border-t sm:border border-white/10"
            >
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Quick Log</h2>
                  <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-1">Manual Attendance Override</p>
                </div>
                <button onClick={() => setIsMarkModalOpen(false)} className="p-4 bg-white/5 rounded-3xl text-gray-500 hover:text-white transition-colors">
                  <X size={28} />
                </button>
              </div>
              
              <div className="space-y-6">
                <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest ml-1">Select Module</p>
                <div className="space-y-4 max-h-80 overflow-y-auto pr-3 hide-scrollbar">
                  {subjects?.map(sub => (
                    <div key={sub.id} className="p-6 bg-white/[0.03] rounded-[2rem] border border-white/5 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                      <span className="font-black text-white text-base tracking-tight">{sub.name}</span>
                      <div className="flex gap-3">
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => { handleQuickMark(sub.id, 'present'); setIsMarkModalOpen(false); }}
                          className="w-12 h-12 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-600/10"
                        >
                          <CheckCircle2 size={24} />
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => { handleQuickMark(sub.id, 'absent'); setIsMarkModalOpen(false); }}
                          className="w-12 h-12 bg-red-600/10 text-red-400 rounded-2xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-600/10"
                        >
                          <XCircle size={24} />
                        </motion.button>
                      </div>
                    </div>
                  ))}
                  {(!subjects || subjects.length === 0) && (
                    <div className="text-center py-10 opacity-30 italic text-sm">No subjects defined yet.</div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
