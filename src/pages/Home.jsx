import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format, subDays } from 'date-fns';
import {
  CheckCircle2, XCircle, Slash, AlertTriangle, ShieldCheck,
  RotateCcw, Zap, TrendingUp, Activity, Clock, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CircularProgress from '../components/ui/CircularProgress';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function Home() {
  const [today] = useState(new Date());
  const dateString = format(today, 'yyyy-MM-dd');
  const dayOfWeek = today.getDay();
  const { user } = useAuth();

  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const todayTimetable = useLiveQuery(() => db.timetable.where('dayOfWeek').equals(dayOfWeek).toArray(), [dayOfWeek]);
  const todaysRecords = useLiveQuery(() => db.attendance_records.where('date').equals(dateString).toArray(), [dateString]);
  const allRecords = useLiveQuery(() => db.attendance_records.orderBy('date').reverse().limit(60).toArray(), []);

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
          await db.attendance_records.add({ subjectId, timetableId, date: dateString, status, timestamp: Date.now() });
        }
        await db.subjects.update(subjectId, { attendedClasses: Math.max(0, newAttended), totalClasses: Math.max(0, newTotal) });
      });
      toast.success(status === 'reset' ? 'Reset' : `Marked ${status}`, { duration: 1400 });
    } catch { toast.error('Failed to update'); }
  };

  const calculateBunkAdvice = (sub) => {
    if (sub.totalClasses === 0) return { text: 'Start marking classes!', type: 'neutral' };
    const pct = (sub.attendedClasses / sub.totalClasses) * 100;
    if (pct < sub.threshold) {
      const needed = Math.ceil((sub.threshold * sub.totalClasses - 100 * sub.attendedClasses) / (100 - sub.threshold));
      return { text: `Attend next ${needed} classes`, type: 'danger' };
    }
    const canBunk = Math.floor((100 * sub.attendedClasses - sub.threshold * sub.totalClasses) / sub.threshold);
    return { text: canBunk === 0 ? "On the edge! Don't miss" : `Can bunk ${canBunk} classes`, type: 'safe' };
  };

  // Weekly trend
  const weeklyData = useMemo(() => {
    if (!allRecords) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i);
      const ds = format(date, 'yyyy-MM-dd');
      const recs = allRecords.filter(r => r.date === ds);
      const present = recs.filter(r => r.status === 'present').length;
      const total = recs.filter(r => r.status !== 'cancelled').length;
      return { name: format(date, 'EEE'), pct: total === 0 ? 0 : Math.round((present / total) * 100), ds };
    });
  }, [allRecords, today]);

  const stats = useMemo(() => {
    if (!subjects) return { percentage: 0, attended: 0, total: 0, safe: 0, risk: 0 };
    const attended = subjects.reduce((a, s) => a + s.attendedClasses, 0);
    const total = subjects.reduce((a, s) => a + s.totalClasses, 0);
    const percentage = total === 0 ? 0 : (attended / total) * 100;
    const safe = subjects.filter(s => s.totalClasses === 0 || (s.attendedClasses / s.totalClasses) * 100 >= s.threshold).length;
    return { percentage, attended, total, safe, risk: subjects.length - safe };
  }, [subjects]);

  // Streak counter
  const streak = useMemo(() => {
    if (!allRecords) return 0;
    const presentDates = new Set(allRecords.filter(r => r.status === 'present').map(r => r.date));
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const startOffset = presentDates.has(todayStr) ? 0 : 1;
    let count = 0;
    for (let i = startOffset; i < 365; i++) {
      const ds = format(subDays(new Date(), i), 'yyyy-MM-dd');
      if (presentDates.has(ds)) { count++; }
      else if (count > 0 || i > startOffset) break;
    }
    return count;
  }, [allRecords]);

  const todayStr = format(today, 'MMMM do');
  const dayStr = format(today, 'EEEE');

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-2xl mx-auto px-4 py-6 pb-32 font-sans bg-white dark:bg-[#020617] transition-colors">

      {/* ── Header ────────────────────────────────────────────────── */}
      <motion.div variants={item} className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">Dashboard</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-0.5 flex items-center gap-1.5">
            <Activity size={11} className="text-emerald-500" /> Live Overview
          </p>
        </div>
        <div className="text-right">
          <p className="text-zinc-900 dark:text-zinc-100 font-bold text-sm">{todayStr}</p>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">{dayStr}</p>
        </div>
      </motion.div>

      {/* ── Overall Stat Hero ─────────────────────────────────────── */}
      <motion.section
        variants={item}
        className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-purple-800 rounded-[2.5rem] p-7 flex items-center justify-between shadow-2xl shadow-emerald-900/20 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 blur-3xl -mr-16 -mt-16 rounded-full" />
        <div className="relative z-10">
          <p className="text-emerald-100/70 text-[10px] font-bold uppercase tracking-[0.25em] mb-2">Overall Attendance</p>
          <div className="flex items-baseline gap-1">
            <span className="text-6xl font-black text-white tracking-tighter">{Math.round(stats.percentage)}</span>
            <span className="text-xl text-emerald-100">%</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <TrendingUp size={11} className="text-green-300" />
              <span className="text-white/80 text-[10px] font-bold uppercase tracking-tight">{stats.attended}/{stats.total} Classes</span>
            </div>
            {streak > 0 && (
              <div className="bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <span className="text-[10px] font-black text-orange-300">🔥 {streak} day streak</span>
              </div>
            )}
          </div>
          <div className="flex gap-4 mt-3">
            <div className="text-center">
              <p className="text-white font-black text-lg leading-none">{stats.safe}</p>
              <p className="text-emerald-100/60 text-[9px] font-bold uppercase tracking-wider mt-0.5">Safe</p>
            </div>
            {stats.risk > 0 && (
              <div className="text-center">
                <p className="text-red-300 font-black text-lg leading-none">{stats.risk}</p>
                <p className="text-emerald-100/60 text-[9px] font-bold uppercase tracking-wider mt-0.5">At Risk</p>
              </div>
            )}
          </div>
        </div>
        <div className="relative scale-110 shrink-0">
          <CircularProgress value={stats.percentage} size={110} strokeWidth={11} colorClass="text-emerald-400" />
          <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/30" size={26} />
        </div>
      </motion.section>

      {/* ── Weekly Bar Chart ──────────────────────────────────────── */}
      <motion.section variants={item} className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.06] rounded-[2rem] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">7-Day Trend</p>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Attendance %</span>
          </div>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} barSize={28}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#a1a1aa' : '#4b5563', fontSize: 10, fontWeight: 700 }} dy={8} />
              <Tooltip
                cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                content={({ active, payload }) => active && payload?.length ? (
                  <div className="bg-black/80 border border-white/10 px-3 py-1.5 rounded-xl">
                    <p className="text-[11px] font-black text-white">{Math.round(payload[0].value)}%</p>
                  </div>
                ) : null}
              />
              <Bar dataKey="pct" radius={[8, 8, 8, 8]}>
                {weeklyData.map((entry, i) => (
                  <Cell key={i} fill={entry.ds === dateString ? '#10b981' : '#3f3f46'} fillOpacity={entry.ds === dateString ? 1 : 0.4} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      {/* ── Today's Classes ───────────────────────────────────────── */}
      <motion.section variants={item} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-emerald-500" />
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">Today's Classes</p>
          </div>
          <div className="bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.06]">
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{todayTimetable?.length || 0} Scheduled</span>
          </div>
        </div>

        {!todayTimetable || todayTimetable.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] rounded-[2rem] border-2 border-dashed border-white/[0.06]">
            <div className="w-14 h-14 bg-white/[0.04] rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Zap size={22} className="text-gray-700" />
            </div>
            <p className="text-gray-500 text-sm font-black uppercase tracking-wider">No classes today!</p>
            <p className="text-gray-700 text-xs font-bold mt-1 uppercase">Enjoy your free day</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayTimetable.map((slot, index) => {
              const sub = subjects?.find(s => s.id === slot.subjectId);
              if (!sub) return null;
              const record = todaysRecords?.find(r => r.timetableId === slot.id);
              const advice = calculateBunkAdvice(sub);
              const pct = sub.totalClasses === 0 ? 0 : Math.round((sub.attendedClasses / sub.totalClasses) * 100);

              return (
                <motion.div layout key={slot.id} className="bg-white/[0.03] border border-white/[0.06] rounded-[2rem] overflow-hidden">
                  <div className="p-6">
                    {/* Subject header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-4">
                        <div className={clsx(
                          'w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base border-2 transition-all',
                          record?.status === 'present' ? 'bg-green-500/20 border-green-500/40 text-green-400 shadow-lg shadow-green-500/10' :
                          record?.status === 'absent' ? 'bg-red-500/20 border-red-500/40 text-red-400 shadow-lg shadow-red-500/10' :
                          'bg-white/[0.05] border-white/10 text-gray-500'
                        )}>
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white tracking-tight">{sub.name}</h3>
                          <div className={clsx(
                            'flex items-center gap-1 text-[10px] font-bold mt-0.5',
                            advice.type === 'danger' ? 'text-red-400' : 'text-emerald-400'
                          )}>
                            {advice.type === 'danger' ? <AlertTriangle size={9} /> : <Zap size={9} />}
                            {advice.text}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-black text-lg tracking-tight">{pct}%</p>
                        <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">{sub.attendedClasses}/{sub.totalClasses}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1 bg-white/[0.05] rounded-full mb-5 overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full transition-all', pct >= sub.threshold ? 'bg-emerald-500' : 'bg-red-500')}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'present', icon: CheckCircle2, label: 'Present', active: 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-500/20' },
                        { id: 'absent', icon: XCircle, label: 'Absent', active: 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/20' },
                        { id: 'cancelled', icon: Slash, label: 'Off', active: 'bg-gray-600 border-gray-500 text-white' },
                        { id: 'reset', icon: RotateCcw, label: 'Reset', active: 'bg-white/10 border-white/20 text-white' },
                      ].map(action => (
                        <motion.button
                          key={action.id}
                          whileTap={{ scale: 0.93 }}
                          onClick={() => handleMarkAttendance(sub.id, slot.id, action.id)}
                          className={clsx(
                            'flex flex-col items-center py-3 rounded-2xl border-2 text-xs font-black uppercase tracking-tight transition-all gap-1',
                            record?.status === action.id
                              ? action.active
                              : 'bg-white/[0.03] border-white/[0.07] text-gray-600 hover:text-gray-300 hover:bg-white/[0.06]'
                          )}
                        >
                          <action.icon size={18} strokeWidth={2.5} />
                          <span className="text-[8px]">{action.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* ── Recent Activity ───────────────────────────────────────── */}
      {allRecords && allRecords.length > 0 && (
        <motion.section variants={item} className="space-y-3">
          <div className="flex items-center gap-2">
            <History size={14} className="text-purple-500" />
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">Recent Activity</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-[2rem] divide-y divide-white/[0.04]">
            {allRecords.slice(0, 5).map(rec => {
              const sub = subjects?.find(s => s.id === rec.subjectId);
              return (
                <div key={rec.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={clsx('w-2 h-2 rounded-full shrink-0',
                      rec.status === 'present' ? 'bg-green-500' : rec.status === 'absent' ? 'bg-red-500' : 'bg-gray-600'
                    )} />
                    <div>
                      <p className="text-sm font-bold text-white">{sub?.name || 'Unknown'}</p>
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{format(new Date(rec.date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <span className={clsx('text-[10px] font-black uppercase px-2.5 py-1 rounded-full',
                    rec.status === 'present' ? 'text-green-400 bg-green-500/10' :
                    rec.status === 'absent' ? 'text-red-400 bg-red-500/10' : 'text-gray-500 bg-gray-500/10'
                  )}>
                    {rec.status}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}
