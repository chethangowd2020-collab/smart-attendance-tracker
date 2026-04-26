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
    <div className="max-w-[470px] mx-auto">

      {/* ── Month Stats Bar ──────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-[#262626]">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft size={22} className="text-white" />
          </button>
          <div className="text-center">
            <p className="text-white font-bold text-base">{format(currentDate, 'MMMM yyyy')}</p>
          </div>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight size={22} className="text-white" />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Present', value: monthStats.present, color: 'text-green-400' },
            { label: 'Absent', value: monthStats.absent, color: 'text-red-400' },
            { label: 'Holiday', value: monthStats.cancelled, color: 'text-[#737373]' },
            { label: 'Rate', value: `${monthStats.pct}%`, color: monthStats.pct >= 75 ? 'text-green-400' : 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#1a1a1a] rounded-xl p-2 text-center">
              <p className={clsx('font-bold text-sm', s.color)}>{s.value}</p>
              <p className="text-[10px] text-[#555]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${monthStats.pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={clsx('h-full rounded-full', monthStats.pct >= 75 ? 'bg-green-400' : 'bg-red-400')}
          />
        </div>
      </div>

      {/* ── Calendar Grid ─────────────────────────────────────────── */}
      <div className="px-4 py-4">
        {/* Week headers */}
        <div className="grid grid-cols-7 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[11px] font-semibold text-[#555] py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {/* Padding cells */}
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square" />
          ))}

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
                whileTap={{ scale: 0.88 }}
                onClick={() => setSelectedDate(day)}
                className={clsx(
                  'aspect-square flex flex-col items-center justify-center rounded-full relative transition-all',
                  isT && !isSelected && 'ring-2 ring-white',
                  isSelected ? 'bg-white' : 'hover:bg-[#1a1a1a]'
                )}
              >
                <span className={clsx(
                  'text-[13px] font-semibold leading-none',
                  isSelected ? 'text-black' : isT ? 'text-white font-bold' : 'text-white'
                )}>
                  {format(day, 'd')}
                </span>

                {/* Status dot */}
                <div className="flex gap-0.5 mt-0.5 h-1.5">
                  {hasPresent && <div className="w-1 h-1 rounded-full bg-green-400" />}
                  {hasAbsent && <div className="w-1 h-1 rounded-full bg-red-400" />}
                  {hasCancelled && <div className="w-1 h-1 rounded-full bg-[#555]" />}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4 flex gap-4">
        {[
          { color: 'bg-green-400', label: 'Present' },
          { color: 'bg-red-400', label: 'Absent' },
          { color: 'bg-[#555]', label: 'Holiday' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={clsx('w-2 h-2 rounded-full', l.color)} />
            <span className="text-[11px] text-[#737373]">{l.label}</span>
          </div>
        ))}
      </div>

      {/* ── Day Detail Bottom Sheet ───────────────────────────────── */}
      <AnimatePresence>
        {selectedDate && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
              className="fixed inset-0 bg-black/60 z-40"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#111] rounded-t-3xl border-t border-[#262626] max-h-[85vh] overflow-y-auto scrollbar-hide"
            >
              {/* Handle */}
              <div className="pt-3 pb-1 flex justify-center">
                <div className="w-10 h-1 bg-[#363636] rounded-full" />
              </div>

              {/* Sheet Header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-white font-bold text-base">{format(selectedDate, 'EEEE')}</p>
                  <p className="text-[#737373] text-sm">{format(selectedDate, 'MMMM d, yyyy')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Mark Holiday button */}
                  {scheduledSlots.length > 0 && (
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={() => handleMarkHoliday(selectedDate)}
                      className={clsx(
                        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
                        isHoliday
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'bg-[#1a1a1a] text-[#737373] border border-[#363636] hover:text-orange-400'
                      )}
                    >
                      🏖️ {isHoliday ? 'Holiday' : 'Holiday'}
                    </motion.button>
                  )}
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="p-2 rounded-full hover:bg-[#1a1a1a] transition-colors"
                  >
                    <X size={20} className="text-[#737373]" />
                  </button>
                </div>
              </div>

              <div className="px-4 pb-8">
                {scheduledSlots.length === 0 ? (
                  /* No timetable for this day */
                  <div className="py-10 text-center">
                    <p className="text-white font-semibold mb-1">No classes scheduled</p>
                    <p className="text-[#737373] text-sm">Set up your timetable in the Subjects tab</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scheduledSlots.map((slot, idx) => {
                      const sub = subjects?.find(s => s.id === slot.subjectId);
                      if (!sub) return null;
                      const record = selectedDayRecords.find(r => r.timetableId === slot.id);
                      const pct = sub.totalClasses === 0 ? 0 : Math.round((sub.attendedClasses / sub.totalClasses) * 100);

                      return (
                        <div key={slot.id} className="bg-[#1a1a1a] rounded-2xl p-4">
                          {/* Subject info */}
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-white font-semibold text-sm">{sub.name}</p>
                              <p className="text-[#737373] text-xs">{pct}% overall • {sub.attendedClasses}/{sub.totalClasses}</p>
                            </div>
                            {record && (
                              <span className={clsx(
                                'text-xs px-2.5 py-1 rounded-full font-medium capitalize',
                                record.status === 'present' ? 'bg-green-500/10 text-green-400' :
                                record.status === 'absent' ? 'bg-red-500/10 text-red-400' :
                                'bg-[#262626] text-[#737373]'
                              )}>
                                {record.status}
                              </span>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { status: 'present', icon: CheckCircle2, label: 'P', activeClass: 'bg-green-500 text-white border-green-500' },
                              { status: 'absent', icon: XCircle, label: 'A', activeClass: 'bg-red-500 text-white border-red-500' },
                              { status: 'cancelled', icon: Slash, label: 'Off', activeClass: 'bg-[#555] text-white border-[#555]' },
                              { status: 'reset', icon: RotateCcw, label: 'Undo', activeClass: 'bg-[#363636] text-white border-[#363636]' },
                            ].map(action => {
                              const isActive = record?.status === action.status;
                              const Icon = action.icon;
                              return (
                                <motion.button
                                  key={action.status}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleMarkForDate(sub.id, slot.id, selectedDateStr, action.status)}
                                  className={clsx(
                                    'flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-semibold transition-all',
                                    isActive
                                      ? action.activeClass
                                      : 'border-[#363636] text-[#737373] hover:border-[#555] hover:text-white'
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

                    {/* Summary for this date */}
                    {selectedDayRecords.length > 0 && (
                      <div className="mt-2 flex items-center gap-3 px-2">
                        <div className="flex gap-2">
                          {[
                            { key: 'present', color: 'text-green-400', label: 'present' },
                            { key: 'absent', color: 'text-red-400', label: 'absent' },
                            { key: 'cancelled', color: 'text-[#737373]', label: 'holiday' },
                          ].map(s => {
                            const cnt = selectedDayRecords.filter(r => r.status === s.key).length;
                            if (!cnt) return null;
                            return (
                              <span key={s.key} className={clsx('text-xs font-medium', s.color)}>
                                {cnt} {s.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
