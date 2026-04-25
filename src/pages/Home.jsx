import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format } from 'date-fns';
import { 
  CheckCircle2, XCircle, Slash, Calendar as CalendarIcon, 
  AlertTriangle, ShieldCheck, RotateCcw, ArrowRight, 
  Zap, TrendingUp, Book
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CircularProgress from '../components/ui/CircularProgress';
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
            status
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

  // Quick overview stats
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
      className="space-y-6 max-w-2xl mx-auto pb-32"
    >
      <motion.header variants={item} className="px-2 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Today</h1>
          <p className="text-blue-200/70 font-black flex items-center gap-1.5 text-[10px] uppercase tracking-widest mt-1">
            <CalendarIcon size={12} className="text-blue-400" />
            {format(today, 'EEEE, do MMMM')}
          </p>
        </div>
        <div className="bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
            {todayTimetable?.length || 0} Classes
          </span>
        </div>
      </motion.header>

      {/* Main Stat Ring */}
      <motion.section variants={item} className="mx-2 p-6 glass-card rounded-[2.5rem] flex items-center justify-between border border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-600/20 transition-all duration-700" />
        <div className="relative z-10">
          <h2 className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Overall Attendance</h2>
          <div className="flex items-baseline gap-1">
            <span className="text-6xl font-black text-white">{Math.round(stats.percentage)}<span className="text-2xl text-blue-500">%</span></span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex -space-x-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-4 h-4 rounded-full border border-gray-900 bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp size={8} className="text-blue-400" />
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-tighter">{stats.attended} / {stats.total} total sessions</p>
          </div>
        </div>
        <div className="relative">
          <CircularProgress value={stats.percentage} size={110} strokeWidth={10} colorClass="text-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]" />
          <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400/50" size={24} />
        </div>
      </motion.section>

      {/* Quick Indicators */}
      <motion.div variants={item} className="grid grid-cols-2 gap-4 px-2">
        <div className="glass-card p-5 rounded-[2rem] border border-green-500/10 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-green-500/50 mb-1">
            <ShieldCheck size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Safe Zone</span>
          </div>
          <span className="text-3xl font-black text-white">{stats.safe}</span>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Subjects above target</p>
        </div>
        <div className="glass-card p-5 rounded-[2rem] border border-red-500/10 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-red-500/50 mb-1">
            <AlertTriangle size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">At Risk</span>
          </div>
          <span className="text-3xl font-black text-white">{stats.risk}</span>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Needs attention</p>
        </div>
      </motion.div>

      {/* Schedule Feed */}
      <motion.section variants={item} className="px-2 space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Schedule</h2>
          <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-1 text-blue-400 text-[10px] font-black uppercase tracking-tighter">
            View Timetable <ArrowRight size={10} />
          </motion.div>
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
                  className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5 group relative"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex gap-4">
                        <div className={clsx(
                          "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border",
                          record?.status === 'present' ? "bg-green-500/20 border-green-500/40 text-green-400" :
                          record?.status === 'absent' ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/5 border-white/10 text-gray-500"
                        )}>
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white tracking-tight leading-none mb-1.5">{sub.name}</h3>
                          <div className={clsx(
                            "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest",
                            advice.type === 'danger' ? "text-red-400" : "text-blue-400"
                          )}>
                            {advice.type === 'danger' ? <AlertTriangle size={10} /> : <Zap size={10} />}
                            {advice.text}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[20px] font-black text-white leading-none">
                          {Math.round((sub.attendedClasses / (sub.totalClasses || 1)) * 100)}%
                        </div>
                        <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Current</div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'present', icon: CheckCircle2, label: 'Present', color: 'bg-green-600' },
                        { id: 'absent', icon: XCircle, label: 'Absent', color: 'bg-red-600' },
                        { id: 'cancelled', icon: Slash, label: 'Off', color: 'bg-gray-600' },
                        { id: 'reset', icon: RotateCcw, label: 'Reset', color: 'bg-white/10' }
                      ].map(action => (
                        <motion.button 
                          key={action.id}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleMarkAttendance(sub.id, slot.id, action.id)}
                          className={clsx(
                            "flex flex-col items-center justify-center py-4 rounded-3xl transition-all border",
                            record?.status === action.id ? `${action.color} border-white/20 shadow-xl text-white` : 
                            (action.id === 'reset' ? "bg-white/5 border-white/5 text-gray-600 hover:text-white" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10")
                          )}
                        >
                          <action.icon size={20} />
                          <span className="text-[9px] font-black mt-1.5 uppercase tracking-tighter">{action.label}</span>
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

      {/* Footer Stat */}
      <motion.footer variants={item} className="px-6 py-4 flex justify-center">
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
          <Book size={12} className="text-gray-500" />
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
            {subjects?.length || 0} active subjects tracked
          </span>
        </div>
      </motion.footer>
    </motion.div>
  );
}
