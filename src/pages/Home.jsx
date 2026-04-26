import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format, startOfWeek, addDays, isSameDay, subDays } from 'date-fns';
import { 
  CheckCircle2, XCircle, Slash, Calendar as CalendarIcon, 
  AlertTriangle, ShieldCheck, RotateCcw, ArrowRight, 
  Zap, TrendingUp, Book, Activity, Clock, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CircularProgress from '../components/ui/CircularProgress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Home() {
  const [today] = useState(new Date());
  const dateString = format(today, 'yyyy-MM-dd');
  const dayOfWeek = today.getDay();

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
          if (existingRecord.status === 'present') {
            newAttended--;
            newTotal--;
          } else if (existingRecord.status === 'absent') {
            newTotal--;
          }
          await db.attendance_records.delete(existingRecord.id);
        }

        if (status !== 'reset') {
          if (status === 'present') {
            newAttended++;
            newTotal++;
          } else if (status === 'absent') {
            newTotal++;
          }

          await db.attendance_records.add({
            subjectId,
            timetableId,
            date: dateString,
            status,
            timestamp: new Date().getTime()
          });
        }

        await db.subjects.update(subjectId, {
          attendedClasses: newAttended,
          totalClasses: newTotal
        });
      });
      
      toast.success(status === 'reset' ? 'Attendance reset' : `Marked ${status}`);
    } catch (e) {
      toast.error('Failed to update attendance');
    }
  };

  const calculateBunkAdvice = (sub) => {
    if (sub.totalClasses === 0) return { text: "Start marking classes!", type: 'neutral' };
    const percentage = (sub.attendedClasses / sub.totalClasses) * 100;
    
    if (percentage < sub.threshold) {
      const needed = Math.ceil((sub.threshold * sub.totalClasses - 100 * sub.attendedClasses) / (100 - sub.threshold));
      return { text: `Attend next ${needed} classes`, type: 'danger', value: needed };
    } else {
      const canBunk = Math.floor((100 * sub.attendedClasses - sub.threshold * sub.totalClasses) / sub.threshold);
      return { 
        text: canBunk === 0 ? "On the edge! Don't miss" : `Can bunk ${canBunk} classes`, 
        type: 'safe', 
        value: canBunk 
      };
    }
  };

  // Weekly trend data
  const weeklyData = useMemo(() => {
    if (!allRecords) return [];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const ds = format(date, 'yyyy-MM-dd');
      const records = allRecords.filter(r => r.date === ds);
      const present = records.filter(r => r.status === 'present').length;
      const total = records.filter(r => r.status !== 'cancelled').length;
      days.push({
        name: format(date, 'EEE'),
        percentage: total === 0 ? 0 : (present / total) * 100,
        fullDate: ds
      });
    }
    return days;
  }, [allRecords, today]);

  const stats = useMemo(() => {
    if (!subjects) return { percentage: 0, attended: 0, total: 0, safe: 0, risk: 0 };
    const attended = subjects.reduce((acc, sub) => acc + sub.attendedClasses, 0);
    const total = subjects.reduce((acc, sub) => acc + sub.totalClasses, 0);
    const percentage = total === 0 ? 0 : (attended / total) * 100;
    const safe = subjects.filter(s => s.totalClasses === 0 || ((s.attendedClasses/s.totalClasses)*100) >= s.threshold).length;
    const risk = subjects.length - safe;
    return { percentage, attended, total, safe, risk };
  }, [subjects]);

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 max-w-2xl mx-auto pb-32"
    >
      <motion.header variants={item} className="px-2 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">TRACKIFY</h1>
          <p className="text-gray-500 font-black flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] mt-1">
            <Activity size={12} className="text-blue-500" />
            Live Dashboard
          </p>
        </div>
        <div className="text-right">
          <p className="text-white font-black text-sm">{format(today, 'MMMM do')}</p>
          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">{format(today, 'EEEE')}</p>
        </div>
      </motion.header>

      {/* Main Stat Ring */}
      <motion.section variants={item} className="mx-2 p-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-[3rem] flex items-center justify-between shadow-2xl shadow-blue-900/40 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl -mr-20 -mt-20 group-hover:bg-white/20 transition-all duration-700" />
        <div className="relative z-10">
          <h2 className="text-blue-200/60 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Overall Attendance</h2>
          <div className="flex items-baseline gap-1">
            <span className="text-7xl font-black text-white tracking-tighter">{Math.round(stats.percentage)}<span className="text-2xl text-blue-200">%</span></span>
          </div>
          <div className="flex items-center gap-2 mt-4 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full w-fit">
            <TrendingUp size={12} className="text-green-400" />
            <p className="text-white/80 text-[10px] font-black uppercase tracking-tighter">{stats.attended} / {stats.total} Sessions</p>
          </div>
        </div>
        <div className="relative scale-110">
          <CircularProgress value={stats.percentage} size={120} strokeWidth={12} colorClass="text-white" />
          <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50" size={28} />
        </div>
      </motion.section>

      {/* Analytics Graph */}
      <motion.section variants={item} className="mx-2 p-6 glass-card rounded-[2.5rem] border border-white/5 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Weekly Trend</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Attendance %</span>
          </div>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 800 }}
                dy={10}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-black/80 backdrop-blur-md border border-white/10 p-2 rounded-xl">
                        <p className="text-[10px] font-black text-white">{Math.round(payload[0].value)}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="percentage" radius={[10, 10, 10, 10]} barSize={30}>
                {weeklyData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={isSameDay(new Date(entry.fullDate), today) ? '#3b82f6' : '#1f2937'} 
                    fillOpacity={isSameDay(new Date(entry.fullDate), today) ? 1 : 0.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      {/* Quick Indicators */}
      <motion.div variants={item} className="grid grid-cols-2 gap-4 px-2">
        <div className="glass-card p-6 rounded-[2.5rem] border border-green-500/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl rounded-full" />
          <div className="flex items-center gap-2 text-green-500/50 mb-2">
            <ShieldCheck size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Safe Zone</span>
          </div>
          <span className="text-4xl font-black text-white leading-none">{stats.safe}</span>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mt-2">Target Achieved</p>
        </div>
        <div className="glass-card p-6 rounded-[2.5rem] border border-red-500/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-2xl rounded-full" />
          <div className="flex items-center gap-2 text-red-500/50 mb-2">
            <AlertTriangle size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Low Attnd</span>
          </div>
          <span className="text-4xl font-black text-white leading-none">{stats.risk}</span>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mt-2">Action Required</p>
        </div>
      </motion.div>

      {/* Schedule Feed */}
      <motion.section variants={item} className="px-2 space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-blue-500" />
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Today's Classes</h2>
          </div>
          <div className="bg-white/5 px-3 py-1 rounded-full border border-white/5">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{todayTimetable?.length || 0} Scheduled</span>
          </div>
        </div>

        {!todayTimetable || todayTimetable.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-[2.5rem] border-2 border-dashed border-white/5">
            <div className="bg-white/5 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Zap size={24} className="text-gray-700" />
            </div>
            <p className="text-gray-500 text-sm font-black uppercase tracking-widest">No classes today!</p>
            <p className="text-gray-700 text-[10px] font-bold mt-1 uppercase">Enjoy your free time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayTimetable.map((slot, index) => {
              const sub = subjects?.find(s => s.id === slot.subjectId);
              if (!sub) return null;

              const record = todaysRecords?.find(r => r.timetableId === slot.id);
              const advice = calculateBunkAdvice(sub);

              return (
                <motion.div 
                  layout
                  key={slot.id} 
                  className="glass-card rounded-[3rem] overflow-hidden border border-white/5 group relative"
                >
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex gap-5">
                        <div className={clsx(
                          "w-14 h-14 rounded-[1.5rem] flex items-center justify-center font-black text-xl border-2 transition-all duration-500",
                          record?.status === 'present' ? "bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/20" :
                          record?.status === 'absent' ? "bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/20" : "bg-white/5 border-white/10 text-gray-500"
                        )}>
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white tracking-tighter mb-2">{sub.name}</h3>
                          <div className={clsx(
                            "flex items-center gap-1.5 px-3 py-1 rounded-full w-fit text-[9px] font-black uppercase tracking-widest border",
                            advice.type === 'danger' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                          )}>
                            {advice.type === 'danger' ? <AlertTriangle size={10} /> : <Zap size={10} />}
                            {advice.text}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-white tracking-tighter">
                          {Math.round((sub.attendedClasses / (sub.totalClasses || 1)) * 100)}%
                        </div>
                        <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Status</div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { id: 'present', icon: CheckCircle2, label: 'Present', color: 'bg-green-600', activeText: 'text-green-400' },
                        { id: 'absent', icon: XCircle, label: 'Absent', color: 'bg-red-600', activeText: 'text-red-400' },
                        { id: 'cancelled', icon: Slash, label: 'Off', color: 'bg-gray-600', activeText: 'text-gray-400' },
                        { id: 'reset', icon: RotateCcw, label: 'Reset', color: 'bg-white/10', activeText: 'text-white' }
                      ].map(action => (
                        <motion.button 
                          key={action.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleMarkAttendance(sub.id, slot.id, action.id)}
                          className={clsx(
                            "flex flex-col items-center justify-center py-4 rounded-[2rem] transition-all duration-300 border-2",
                            record?.status === action.id ? `${action.color} border-white/20 shadow-xl text-white` : 
                            (action.id === 'reset' ? "bg-white/5 border-white/5 text-gray-700 hover:text-white" : "bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:border-white/10")
                          )}
                        >
                          <action.icon size={22} strokeWidth={2.5} />
                          <span className="text-[8px] font-black mt-2 uppercase tracking-[0.1em]">{action.label}</span>
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

      {/* Recent History Preview */}
      <motion.section variants={item} className="px-2 space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <History size={14} className="text-purple-500" />
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Recent Activity</h2>
          </div>
        </div>
        <div className="glass-card rounded-[2.5rem] border border-white/5 p-2">
          {allRecords?.slice(0, 5).map((rec, i) => {
             const sub = subjects?.find(s => s.id === rec.subjectId);
             return (
               <div key={rec.id} className={clsx(
                 "flex items-center justify-between p-4 rounded-[2rem] transition-all",
                 i !== 4 && "border-b border-white/5"
               )}>
                 <div className="flex items-center gap-3">
                   <div className={clsx(
                     "w-2 h-2 rounded-full",
                     rec.status === 'present' ? "bg-green-500" : rec.status === 'absent' ? "bg-red-500" : "bg-gray-500"
                   )} />
                   <div>
                     <p className="text-xs font-bold text-white">{sub?.name || 'Subject'}</p>
                     <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{format(new Date(rec.date), 'MMM d, yyyy')}</p>
                   </div>
                 </div>
                 <div className={clsx(
                   "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                   rec.status === 'present' ? "text-green-400 bg-green-400/10" : rec.status === 'absent' ? "text-red-400 bg-red-400/10" : "text-gray-400 bg-gray-400/10"
                 )}>
                   {rec.status}
                 </div>
               </div>
             )
          })}
          {(!allRecords || allRecords.length === 0) && (
            <p className="text-center py-8 text-gray-600 text-[10px] font-black uppercase tracking-widest">No recent activity</p>
          )}
        </div>
      </motion.section>

      {/* Footer Stat */}
      <motion.footer variants={item} className="px-6 py-4 flex justify-center">
        <div className="flex items-center gap-2 bg-white/5 px-5 py-2.5 rounded-full border border-white/5 shadow-inner">
          <Book size={12} className="text-blue-400" />
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
            Tracking {subjects?.length || 0} Active Courses
          </span>
        </div>
      </motion.footer>
    </motion.div>
  );
}
