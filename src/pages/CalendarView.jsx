import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay, isSameDay, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, XCircle, Slash, Filter, Plus, Info, MoreVertical, X } from 'lucide-react';
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

        // Note: For calendar quick mark, we don't have a specific timetable slot 
        // unless we add logic to pick one. For now, we'll just add a record.
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
      toast.success(`Marked ${status}`);
    } catch (e) {
      toast.error('Failed to mark attendance');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-32">
      <header className="px-2 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Calendar</h1>
          <p className="text-blue-200/70 font-medium text-sm mt-0.5">Interactive Insights</p>
        </div>
        <div className="relative group">
          <select 
            className="bg-white/5 border border-white/10 rounded-2xl py-2.5 px-4 text-xs text-white outline-none appearance-none pr-10 focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
          >
            <option value="all">All Subjects</option>
            {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" size={14} />
        </div>
      </header>

      {/* Monthly Summary Card */}
      <section className="mx-2 p-6 glass-card rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative group">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-600/10 blur-3xl group-hover:bg-blue-600/20 transition-all duration-700" />
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{format(currentDate, 'MMMM')} Summary</h3>
          <span className="text-xs font-black text-blue-400">{Math.round(stats.percentage)}%</span>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 relative z-10">
          <div>
            <div className="text-3xl font-black text-white">{stats.present}</div>
            <div className="text-[10px] font-bold text-green-500/70 uppercase tracking-tighter">Classes Attended</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-white">{stats.absent}</div>
            <div className="text-[10px] font-bold text-red-500/70 uppercase tracking-tighter">Classes Missed</div>
          </div>
        </div>

        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative z-10">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${stats.percentage}%` }}
            className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
          />
        </div>
      </section>

      {/* Calendar Grid */}
      <div className="mx-2 glass-card p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <button onClick={handlePrevMonth} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-blue-400 transition-all active:scale-90 border border-white/5">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-black text-white uppercase tracking-widest">{format(currentDate, 'MMMM')}</h2>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{format(currentDate, 'yyyy')}</p>
          </div>
          <button onClick={handleNextMonth} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-blue-400 transition-all active:scale-90 border border-white/5">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-[9px] font-black text-gray-600 py-1 uppercase tracking-tighter">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {startPadding.map(i => <div key={`empty-${i}`} className="aspect-square"></div>)}
          
          {daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayRecords = filteredRecords.filter(r => r.date === dateStr);
            
            const presentCount = dayRecords.filter(r => r.status === 'present').length;
            const absentCount = dayRecords.filter(r => r.status === 'absent').length;
            const cancelledCount = dayRecords.filter(r => r.status === 'cancelled').length;

            return (
              <motion.button
                whileTap={{ scale: 0.95 }}
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={clsx(
                  "aspect-square relative flex flex-col items-center justify-center rounded-2xl text-xs font-bold transition-all group",
                  isSameMonth(day, currentDate) ? "text-white" : "text-gray-800",
                  isToday(day) ? "bg-blue-600 shadow-lg shadow-blue-600/30 border-blue-500" : "bg-white/5 border border-white/5 hover:bg-white/10",
                )}
              >
                <span className={clsx(isToday(day) ? "text-white" : "group-hover:text-blue-400")}>{format(day, 'd')}</span>
                <div className="flex gap-0.5 mt-1">
                  {presentCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>}
                  {absentCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div>}
                  {cancelledCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]"></div>}
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 w-full bg-[#121212] rounded-t-[3rem] p-8 z-[70] border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] max-h-[80vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" onClick={() => setSelectedDate(null)} />
              
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white">{format(selectedDate, 'EEEE')}</h3>
                  <p className="text-blue-400 font-bold text-sm">{format(selectedDate, 'do MMMM, yyyy')}</p>
                </div>
                <button onClick={() => setSelectedDate(null)} className="p-3 bg-white/5 rounded-2xl text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {filteredRecords.filter(r => r.date === format(selectedDate, 'yyyy-MM-dd')).length === 0 ? (
                  <div className="py-12 text-center bg-white/5 rounded-[2rem] border-2 border-dashed border-white/5">
                    <p className="text-gray-500 font-medium italic">No attendance marked for this date.</p>
                  </div>
                ) : (
                  filteredRecords
                    .filter(r => r.date === format(selectedDate, 'yyyy-MM-dd'))
                    .map(record => {
                      const subject = subjects?.find(s => s.id === record.subjectId);
                      if (!subject) return null;
                      return (
                        <div key={record.id} className="p-5 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className={clsx(
                              "w-12 h-12 rounded-2xl flex items-center justify-center border",
                              record.status === 'present' ? "bg-green-500/10 border-green-500/20 text-green-400" :
                              record.status === 'absent' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                            )}>
                              {record.status === 'present' && <CheckCircle2 size={24} />}
                              {record.status === 'absent' && <XCircle size={24} />}
                              {record.status === 'cancelled' && <Slash size={24} />}
                            </div>
                            <div>
                              <p className="font-black text-white text-base">{subject.name}</p>
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                {record.timetableId ? 'Scheduled Class' : 'Manual Entry'}
                              </p>
                            </div>
                          </div>
                          <div className={clsx(
                            "text-[10px] font-black uppercase px-3 py-1 rounded-full",
                            record.status === 'present' ? "text-green-400" :
                            record.status === 'absent' ? "text-red-400" : "text-yellow-400"
                          )}>
                            {record.status}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4">
                <button 
                  onClick={() => setIsMarkModalOpen(true)}
                  className="col-span-3 py-5 bg-blue-600 rounded-3xl text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                >
                  <Plus size={20} />
                  Add Entry
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setSelectedDate(new Date());
          setIsMarkModalOpen(true);
        }}
        className="fixed bottom-24 right-6 w-16 h-16 bg-blue-600 rounded-2xl shadow-2xl shadow-blue-600/40 flex items-center justify-center text-white z-50 border-t border-white/20 active:bg-blue-500 transition-colors"
      >
        <Plus size={32} strokeWidth={3} />
      </motion.button>

      {/* Quick Mark Modal */}
      {isMarkModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100]">
          <div className="bg-[#1a1a1a] p-8 rounded-t-[3rem] sm:rounded-3xl w-full max-w-md shadow-2xl border-t sm:border border-white/10 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black text-white uppercase tracking-widest">Quick Mark</h2>
              <button onClick={() => setIsMarkModalOpen(false)} className="text-gray-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Select Subject</p>
              <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {subjects?.map(sub => (
                  <div key={sub.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{sub.name}</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { handleQuickMark(sub.id, 'present'); setIsMarkModalOpen(false); }}
                        className="p-2 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500 transition-all hover:text-white"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                      <button 
                        onClick={() => { handleQuickMark(sub.id, 'absent'); setIsMarkModalOpen(false); }}
                        className="p-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500 transition-all hover:text-white"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
