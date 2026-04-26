import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format, isSameDay, subDays } from 'date-fns';
import {
  CheckCircle2, XCircle, Slash, AlertTriangle, ShieldCheck,
  RotateCcw, Zap, TrendingUp, Activity, Clock, MoreHorizontal,
  Heart, MessageCircle, Send, Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CircularProgress from '../components/ui/CircularProgress';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [today] = useState(new Date());
  const dateString = format(today, 'yyyy-MM-dd');
  const dayOfWeek = today.getDay();
  const { user } = useAuth();

  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const todayTimetable = useLiveQuery(() => db.timetable.where('dayOfWeek').equals(dayOfWeek).toArray(), [dayOfWeek]);
  const todaysRecords = useLiveQuery(() => db.attendance_records.where('date').equals(dateString).toArray(), [dateString]);
  const allRecords = useLiveQuery(() => db.attendance_records.orderBy('date').reverse().limit(50).toArray(), []);

  const handleMarkAttendance = async (subjectId, timetableId, status) => {
    const existingRecord = todaysRecords?.find(r => r.timetableId === timetableId);
    try {
      await db.transaction('rw', db.attendance_records, db.subjects, async () => {
        const subject = await db.subjects.get(subjectId);
        if (!subject) return;
        let newAttended = subject.attendedClasses;
        let newTotal = subject.totalClasses;
        if (existingRecord) {
          if (existingRecord.status === 'present') { newAttended--; newTotal--; }
          else if (existingRecord.status === 'absent') { newTotal--; }
          await db.attendance_records.delete(existingRecord.id);
        }
        if (status !== 'reset') {
          if (status === 'present') { newAttended++; newTotal++; }
          else if (status === 'absent') { newTotal++; }
          await db.attendance_records.add({ subjectId, timetableId, date: dateString, status, timestamp: new Date().getTime() });
        }
        await db.subjects.update(subjectId, { attendedClasses: newAttended, totalClasses: newTotal });
      });
      toast.success(status === 'reset' ? 'Reset' : `Marked ${status}`, { duration: 1500 });
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const calculateBunkAdvice = (sub) => {
    if (sub.totalClasses === 0) return { text: 'Start tracking', type: 'neutral' };
    const pct = (sub.attendedClasses / sub.totalClasses) * 100;
    if (pct < sub.threshold) {
      const needed = Math.ceil((sub.threshold * sub.totalClasses - 100 * sub.attendedClasses) / (100 - sub.threshold));
      return { text: `Attend ${needed} more`, type: 'danger' };
    }
    const canBunk = Math.floor((100 * sub.attendedClasses - sub.threshold * sub.totalClasses) / sub.threshold);
    return { text: canBunk === 0 ? "Don't miss next" : `Safe to skip ${canBunk}`, type: 'safe' };
  };

  const stats = useMemo(() => {
    if (!subjects) return { percentage: 0, attended: 0, total: 0, safe: 0, risk: 0 };
    const attended = subjects.reduce((a, s) => a + s.attendedClasses, 0);
    const total = subjects.reduce((a, s) => a + s.totalClasses, 0);
    const percentage = total === 0 ? 0 : (attended / total) * 100;
    const safe = subjects.filter(s => s.totalClasses === 0 || (s.attendedClasses / s.totalClasses) * 100 >= s.threshold).length;
    return { percentage, attended, total, safe, risk: subjects.length - safe };
  }, [subjects]);

  // Subject colors for story rings (Instagram gradient style)
  const gradients = [
    'from-[#f09433] via-[#e6683c] to-[#bc1888]',
    'from-[#405de6] via-[#5851db] to-[#833ab4]',
    'from-[#fcb045] via-[#fd1d1d] to-[#833ab4]',
    'from-[#12c2e9] via-[#c471ed] to-[#f64f59]',
    'from-[#43e97b] to-[#38f9d7]',
    'from-[#f093fb] to-[#f5576c]',
  ];

  return (
    <div className="max-w-[470px] mx-auto">

      {/* ── Stories Row (Subject Quick View) ── */}
      {subjects && subjects.length > 0 && (
        <div className="px-4 py-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-4">
            {/* Your Stats "story" */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="relative">
                <div className={clsx(
                  'w-16 h-16 rounded-full p-[2px]',
                  stats.percentage >= 75
                    ? 'bg-gradient-to-tr from-[#43e97b] to-[#38f9d7]'
                    : 'bg-gradient-to-tr from-[#fd1d1d] to-[#fcb045]'
                )}>
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{Math.round(stats.percentage)}%</span>
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-[#e0e0e0] truncate max-w-[64px] text-center">Overall</span>
            </div>

            {subjects.slice(0, 8).map((sub, i) => {
              const pct = sub.totalClasses === 0 ? 0 : (sub.attendedClasses / sub.totalClasses) * 100;
              const isSafe = pct >= sub.threshold;
              return (
                <div key={sub.id} className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className={clsx(
                    'w-16 h-16 rounded-full p-[2px]',
                    isSafe ? `bg-gradient-to-tr ${gradients[i % gradients.length]}` : 'bg-[#333]'
                  )}>
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                      <span className="text-white font-bold text-[11px] text-center px-1 leading-tight">{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#e0e0e0] truncate max-w-[64px] text-center">{sub.name.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-[#262626]" />

      {/* ── Overall Stats Post ── */}
      <div className="border-b border-[#262626]">
        {/* Post Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center text-white text-sm font-bold">
              {user?.email?.[0]?.toUpperCase() || 'T'}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">trackify</p>
              <p className="text-xs text-[#737373]">{format(today, 'EEEE, MMMM d')}</p>
            </div>
          </div>
          <MoreHorizontal size={20} className="text-white" />
        </div>

        {/* Stats Card - Post "Image" */}
        <div className="bg-[#111] px-6 py-8 flex items-center justify-between">
          <div>
            <p className="text-[#737373] text-xs mb-1">Overall Attendance</p>
            <div className="flex items-baseline gap-1">
              <span className="text-6xl font-black text-white">{Math.round(stats.percentage)}</span>
              <span className="text-2xl text-[#737373]">%</span>
            </div>
            <div className="flex gap-4 mt-4">
              <div>
                <p className="text-white font-semibold text-sm">{stats.attended}</p>
                <p className="text-[#737373] text-xs">Attended</p>
              </div>
              <div className="w-px bg-[#262626]" />
              <div>
                <p className="text-white font-semibold text-sm">{stats.total}</p>
                <p className="text-[#737373] text-xs">Total</p>
              </div>
              <div className="w-px bg-[#262626]" />
              <div>
                <p className="text-green-400 font-semibold text-sm">{stats.safe}</p>
                <p className="text-[#737373] text-xs">Safe</p>
              </div>
              {stats.risk > 0 && (
                <>
                  <div className="w-px bg-[#262626]" />
                  <div>
                    <p className="text-red-400 font-semibold text-sm">{stats.risk}</p>
                    <p className="text-[#737373] text-xs">At Risk</p>
                  </div>
                </>
              )}
            </div>
          </div>
          <CircularProgress value={stats.percentage} size={90} strokeWidth={8} colorClass={stats.percentage >= 75 ? 'text-green-400' : 'text-red-400'} />
        </div>

        {/* Post Actions */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-4 mb-3">
            <Activity size={24} className="text-white" />
            <TrendingUp size={24} className="text-white" />
            <ShieldCheck size={24} className="text-white" />
            <Bookmark size={24} className="text-white ml-auto" />
          </div>
          <p className="text-[#737373] text-xs">{format(today, 'MMMM d, yyyy').toUpperCase()}</p>
        </div>
      </div>

      {/* ── Today's Classes Feed ── */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={14} className="text-[#737373]" />
          <span className="text-sm font-semibold text-white">Today's Classes</span>
          <span className="text-xs text-[#737373] ml-auto">{todayTimetable?.length || 0} scheduled</span>
        </div>
      </div>

      {!todayTimetable || todayTimetable.length === 0 ? (
        <div className="mx-4 mb-4 border border-[#262626] rounded-2xl p-10 text-center">
          <p className="text-white font-semibold mb-1">No classes today 🎉</p>
          <p className="text-[#737373] text-sm">Enjoy your free day</p>
        </div>
      ) : (
        <div>
          {todayTimetable.map((slot, index) => {
            const sub = subjects?.find(s => s.id === slot.subjectId);
            if (!sub) return null;
            const record = todaysRecords?.find(r => r.timetableId === slot.id);
            const advice = calculateBunkAdvice(sub);
            const pct = sub.totalClasses === 0 ? 0 : Math.round((sub.attendedClasses / sub.totalClasses) * 100);
            const gradient = gradients[index % gradients.length];

            return (
              <motion.div
                layout
                key={slot.id}
                className="border-b border-[#262626]"
              >
                {/* Post Header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'w-9 h-9 rounded-full p-[2px] bg-gradient-to-tr',
                      record ? (record.status === 'present' ? 'from-green-400 to-emerald-600' : record.status === 'absent' ? 'from-red-400 to-red-600' : 'from-[#555] to-[#333]') : gradient
                    )}>
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{index + 1}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{sub.name}</p>
                      <p className={clsx('text-xs', advice.type === 'danger' ? 'text-red-400' : 'text-[#737373]')}>
                        {advice.text}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-sm">{pct}%</p>
                    <p className="text-[#737373] text-xs">{sub.attendedClasses}/{sub.totalClasses}</p>
                  </div>
                </div>

                {/* Attendance Actions - Instagram action bar style */}
                <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={() => handleMarkAttendance(sub.id, slot.id, 'present')}
                    className={clsx(
                      'flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                      record?.status === 'present'
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-[#363636] text-[#737373] hover:border-[#555] hover:text-white'
                    )}
                  >
                    <CheckCircle2 size={16} strokeWidth={record?.status === 'present' ? 2.5 : 1.8} />
                    Present
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={() => handleMarkAttendance(sub.id, slot.id, 'absent')}
                    className={clsx(
                      'flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                      record?.status === 'absent'
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'border-[#363636] text-[#737373] hover:border-[#555] hover:text-white'
                    )}
                  >
                    <XCircle size={16} strokeWidth={record?.status === 'absent' ? 2.5 : 1.8} />
                    Absent
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={() => handleMarkAttendance(sub.id, slot.id, record ? 'reset' : 'cancelled')}
                    className={clsx(
                      'flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                      record?.status === 'cancelled'
                        ? 'bg-[#555] border-[#555] text-white'
                        : 'border-[#363636] text-[#737373] hover:border-[#555] hover:text-white'
                    )}
                  >
                    {record ? <RotateCcw size={16} /> : <Slash size={16} />}
                    {record ? 'Reset' : 'Off'}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Recent Activity ── */}
      {allRecords && allRecords.length > 0 && (
        <div className="border-b border-[#262626]">
          <div className="px-4 py-4">
            <p className="text-sm font-semibold text-white mb-3">Recent Activity</p>
            <div className="space-y-3">
              {allRecords.slice(0, 5).map((rec) => {
                const sub = subjects?.find(s => s.id === rec.subjectId);
                return (
                  <div key={rec.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        'w-2.5 h-2.5 rounded-full',
                        rec.status === 'present' ? 'bg-green-400' : rec.status === 'absent' ? 'bg-red-400' : 'bg-[#555]'
                      )} />
                      <div>
                        <p className="text-sm text-white font-medium">{sub?.name || 'Subject'}</p>
                        <p className="text-xs text-[#737373]">{format(new Date(rec.date), 'MMM d')}</p>
                      </div>
                    </div>
                    <span className={clsx(
                      'text-xs px-2.5 py-1 rounded-full font-medium',
                      rec.status === 'present' ? 'bg-green-500/10 text-green-400' : rec.status === 'absent' ? 'bg-red-500/10 text-red-400' : 'bg-[#262626] text-[#737373]'
                    )}>
                      {rec.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom padding */}
      <div className="h-6" />
    </div>
  );
}
