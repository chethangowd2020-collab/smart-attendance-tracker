import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, addMonths, subMonths, getDay, isSameDay
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, X, CheckCircle2, XCircle, Slash,
  Palmtree, RotateCcw, Calendar as CalendarIcon, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const allRecords = useLiveQuery(() => db.attendance_records.toArray(), []);
  const timetable = useLiveQuery(() => db.timetable.toArray(), []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Sunday = 0 in getDay(), but we want Monday first — adjust padding
  const startPad = getDay(monthStart); // 0=Sun ... 6=Sat

  // ── Monthly stats ──────────────────────────────────────────────
  const monthStats = useMemo(() => {
    if (!allRecords) return { present: 0, absent: 0, cancelled: 0, pct: 0 };
    const recs = allRecords.filter(r => isSameMonth(new Date(r.date), currentDate));
    const present = recs.filter(r => r.status === 'present').length;
    const absent = recs.filter(r => r.status === 'absent').length;
    const cancelled = recs.filter(r => r.status === 'cancelled').length;
    const pct = present + absent === 0 ? 0 : Math.round((present / (present + absent)) * 100);
    return { present, absent, cancelled, pct };
  }, [allRecords, currentDate]);

  // ── Per-day records map ────────────────────────────────────────
  const dayRecordsMap = useMemo(() => {
    const map = {};
    allRecords?.forEach(r => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    return map;
  }, [allRecords]);

  // ── Mark attendance for a specific date (used in day sheet) ───
  const handleMarkForDate = async (subjectId, timetableId, dateStr, status) => {
    const existing = allRecords?.find(r =>
      r.date === dateStr &&
      (timetableId ? r.timetableId === timetableId : r.subjectId === subjectId && !r.timetableId)
    );

    try {
      await db.transaction('rw', db.attendance_records, db.subjects, async () => {
        const subject = await db.subjects.get(subjectId);
        if (!subject) return;

        let newAttended = subject.attendedClasses;
        let newTotal = subject.totalClasses;

        // Reverse old effect
        if (existing) {
          if (existing.status === 'present') { newAttended--; newTotal--; }
          else if (existing.status === 'absent') { newTotal--; }
          await db.attendance_records.delete(existing.id);
        }

        // Apply new status
        if (status !== 'reset') {
          if (status === 'present') { newAttended++; newTotal++; }
          else if (status === 'absent') { newTotal++; }
          // 'cancelled' doesn't affect counts
          await db.attendance_records.add({
            subjectId,
            timetableId: timetableId || null,
            date: dateStr,
            status,
            timestamp: Date.now()
          });
        }

        await db.subjects.update(subjectId, {
          attendedClasses: Math.max(0, newAttended),
          totalClasses: Math.max(0, newTotal)
        });
      });
      toast.success(status === 'reset' ? 'Reset' : `Marked ${status}`, { duration: 1200 });
    } catch {
      toast.error('Failed to update');
    }
  };

  // ── Mark full day as holiday ───────────────────────────────────
  const handleMarkHoliday = async (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dow = getDay(date);
    const daySlots = timetable?.filter(t => t.dayOfWeek === dow) || [];

    if (daySlots.length === 0) {
      toast.error('No classes scheduled on this day');
      return;
    }

    try {
      for (const slot of daySlots) {
        const existing = allRecords?.find(
          r => r.timetableId === slot.id && r.date === dateStr
        );

        if (existing) {
          if (existing.status === 'cancelled') continue; // already holiday

          // Reverse present/absent effect
          const subject = await db.subjects.get(slot.subjectId);
          if (subject) {
            let na = subject.attendedClasses;
            let nt = subject.totalClasses;
            if (existing.status === 'present') { na--; nt--; }
            else if (existing.status === 'absent') { nt--; }
            await db.subjects.update(slot.subjectId, {
              attendedClasses: Math.max(0, na),
              totalClasses: Math.max(0, nt)
            });
          }
          await db.attendance_records.update(existing.id, { status: 'cancelled' });
        } else {
          // Add cancelled record
          await db.attendance_records.add({
            subjectId: slot.subjectId,
            timetableId: slot.id,
            date: dateStr,
            status: 'cancelled',
            timestamp: Date.now()
          });
        }
      }
      toast.success(`${format(date, 'MMM d')} marked as holiday 🏖️`);
      setSelectedDate(null);
    } catch {
      toast.error('Failed to mark holiday');
    }
  };

  // ── Day sheet data ─────────────────────────────────────────────
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedDow = selectedDate ? getDay(selectedDate) : null;
  const scheduledSlots = timetable?.filter(t => t.dayOfWeek === selectedDow) || [];
  const selectedDayRecords = selectedDateStr ? (dayRecordsMap[selectedDateStr] || []) : [];

  const isHoliday = scheduledSlots.length > 0 &&
    scheduledSlots.every(slot =>
      selectedDayRecords.some(r => r.timetableId === slot.id && r.status === 'cancelled')
    );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto px-4 py-6 pb-32 bg-white dark:bg-[#020617] transition-colors">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">Calendar</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-0.5 uppercase tracking-widest">Attendance Log</p>
        </div>
      </div>

      {/* ── Month Navigator + Stats ──── */}
      <section className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.06] rounded-[2.5rem] p-6 space-y-5">
        <div className="flex items-center justify-between">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-3 bg-white dark:bg-white/[0.05] hover:bg-emerald-600 hover:text-white rounded-2xl text-emerald-600 dark:text-emerald-400 transition-all border border-zinc-200 dark:border-white/[0.06] shadow-sm">
            <ChevronLeft size={20} />
          </motion.button>
          <div className="text-center">
            <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">{format(currentDate, 'MMMM')}</h2>
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.4em] mt-1">{format(currentDate, 'yyyy')}</p>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-3 bg-white dark:bg-white/[0.05] hover:bg-emerald-600 hover:text-white rounded-2xl text-emerald-600 dark:text-emerald-400 transition-all border border-zinc-200 dark:border-white/[0.06] shadow-sm">
            <ChevronRight size={20} />
          </motion.button>
        </div>

        {/* Month stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Present', value: monthStats.present, color: 'text-green-400' },
            { label: 'Absent', value: monthStats.absent, color: 'text-red-400' },
            { label: 'Holiday', value: monthStats.cancelled, color: 'text-gray-500' },
            { label: 'Rate', value: `${monthStats.pct}%`, color: monthStats.pct >= 75 ? 'text-emerald-500' : 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-zinc-100 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.05] rounded-2xl p-3 text-center">
              <p className={clsx('font-black text-base', s.color)}>{s.value}</p>
              <p className="text-[9px] font-black text-zinc-500 dark:text-gray-700 uppercase tracking-widest mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-zinc-200 dark:bg-white/[0.05] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${monthStats.pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={clsx('h-full rounded-full shadow-[0_0_12px_rgba(16,185,129,0.2)]', monthStats.pct >= 75 ? 'bg-gradient-to-r from-emerald-500 to-purple-600' : 'bg-gradient-to-r from-red-600 to-red-400')}
          />
        </div>
      </section>

      {/* ── Calendar Grid ─── */}
      <section className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.06] rounded-[2.5rem] p-6 shadow-sm">
        {/* Week headers */}
        <div className="grid grid-cols-7 mb-3">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-black text-zinc-400 dark:text-gray-700 uppercase tracking-widest py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} className="aspect-square" />)}

          {daysInMonth.map(day => {
            const ds = format(day, 'yyyy-MM-dd');
            const recs = dayRecordsMap[ds] || [];
            const hasPresent = recs.some(r => r.status === 'present');
            const hasAbsent = recs.some(r => r.status === 'absent');
            const hasCancelled = recs.some(r => r.status === 'cancelled') && !hasPresent && !hasAbsent;
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isT = isToday(day);

            return (
              <motion.button
                key={ds}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => setSelectedDate(day)}
                className={clsx(
                  'aspect-square flex flex-col items-center justify-center rounded-2xl text-sm font-black transition-all relative',
                  isT && !isSelected ? 'bg-emerald-600 shadow-2xl shadow-emerald-600/30 text-white scale-105 z-10' :
                  isSelected ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-xl' :
                  'bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.05] text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.07]'
                )}
              >
                <span className="text-xs font-black">{format(day, 'd')}</span>
                <div className="flex gap-0.5 mt-0.5">
                  {hasPresent && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
                  {hasAbsent && <div className="w-1 h-1 rounded-full bg-red-500" />}
                  {hasCancelled && <div className="w-1 h-1 rounded-full bg-gray-500" />}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-5 px-1">
          {[
            { dot: 'bg-emerald-400', label: 'Present' },
            { dot: 'bg-red-500', label: 'Absent' },
            { dot: 'bg-gray-500', label: 'Holiday' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={clsx('w-2 h-2 rounded-full', l.dot)} />
              <span className="text-[10px] font-bold text-zinc-500 dark:text-gray-600">{l.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Day Detail Bottom Sheet ── */}
      <AnimatePresence>
        {selectedDate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl z-40" />

            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a] rounded-t-[3rem] border-t border-white/[0.08] max-h-[85vh] overflow-y-auto scrollbar-hide"
            >
              <div className="pt-4 pb-1 flex justify-center">
                <div className="w-12 h-1.5 bg-white/10 rounded-full" />
              </div>

              <div className="flex items-center justify-between px-8 py-4">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tighter uppercase">{format(selectedDate, 'EEEE')}</h3>
                  <p className="text-violet-400/70 text-[10px] font-black uppercase tracking-widest mt-1">{format(selectedDate, 'do MMMM, yyyy')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {scheduledSlots.length > 0 && (
                    <motion.button whileTap={{ scale: 0.93 }}
                      onClick={() => handleMarkHoliday(selectedDate)}
                      className={clsx(
                        'flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all',
                        isHoliday
                          ? 'bg-orange-500/20 border-orange-500/30 text-orange-400'
                          : 'bg-white/[0.04] border-white/[0.08] text-gray-500 hover:text-orange-400'
                      )}
                    >
                      🏖️ Holiday
                    </motion.button>
                  )}
                  <button onClick={() => setSelectedDate(null)}
                    className="p-2.5 bg-white/[0.05] rounded-2xl border border-white/[0.07] text-gray-500 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="px-6 pb-12">
                {scheduledSlots.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-gray-500 font-black uppercase tracking-widest text-sm">No classes scheduled</p>
                    <p className="text-gray-700 text-xs font-bold mt-2">Set up your timetable in the Subjects tab</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scheduledSlots.map((slot) => {
                      const sub = subjects?.find(s => s.id === slot.subjectId);
                      if (!sub) return null;
                      const record = selectedDayRecords.find(r => r.timetableId === slot.id);
                      const pct = sub.totalClasses === 0 ? 0 : Math.round((sub.attendedClasses / sub.totalClasses) * 100);

                      return (
                        <div key={slot.id} className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-white font-black text-base tracking-tight">{sub.name}</p>
                              <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mt-0.5">{pct}% overall • {sub.attendedClasses}/{sub.totalClasses}</p>
                            </div>
                            {record && (
                              <span className={clsx(
                                'text-[10px] font-black uppercase px-3 py-1 rounded-full border',
                                record.status === 'present' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                                record.status === 'absent' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                                'text-gray-500 bg-white/[0.04] border-white/[0.07]'
                              )}>
                                {record.status}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { status: 'present', icon: CheckCircle2, label: 'P', activeClass: 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-500/20' },
                              { status: 'absent', icon: XCircle, label: 'A', activeClass: 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/20' },
                              { status: 'cancelled', icon: Slash, label: 'Off', activeClass: 'bg-gray-600 border-gray-500 text-white' },
                              { status: 'reset', icon: RotateCcw, label: 'Undo', activeClass: 'bg-white/10 border-white/20 text-white' },
                            ].map(action => {
                              const isActive = record?.status === action.status;
                              const Icon = action.icon;
                              return (
                                <motion.button key={action.status} whileTap={{ scale: 0.9 }}
                                  onClick={() => handleMarkForDate(sub.id, slot.id, selectedDateStr, action.status)}
                                  className={clsx(
                                    'flex flex-col items-center gap-1 py-3 rounded-2xl border-2 text-xs font-black uppercase tracking-tight transition-all',
                                    isActive
                                      ? action.activeClass
                                      : 'bg-white/[0.03] border-white/[0.07] text-gray-600 hover:text-gray-300 hover:bg-white/[0.06]'
                                  )}
                                >
                                  <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
                                  {action.label}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
