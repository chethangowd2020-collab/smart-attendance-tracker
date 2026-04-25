import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format, startOfDay } from 'date-fns';
import { CheckCircle2, XCircle, Slash, Calendar as CalendarIcon, AlertTriangle, ShieldCheck, RotateCcw, ArrowRight } from 'lucide-react';
import CircularProgress from '../components/ui/CircularProgress';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function Home() {
  const [today] = useState(new Date());
  const dateString = format(today, 'yyyy-MM-dd');
  const dayOfWeek = today.getDay();

  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const todayTimetable = useLiveQuery(() => db.timetable.where('dayOfWeek').equals(dayOfWeek).toArray(), [dayOfWeek]);
  const todaysRecords = useLiveQuery(() => db.attendance_records.where('date').equals(dateString).toArray(), [dateString]);

  const handleMarkAttendance = async (subjectId, timetableId, status) => {
    // Find record by timetableId to ensure specific slot tracking
    const existingRecord = todaysRecords?.find(r => r.timetableId === timetableId);
    
    try {
      await db.transaction('rw', db.attendance_records, db.subjects, async () => {
        const subject = await db.subjects.get(subjectId);
        if (!subject) return;

        let newAttended = subject.attendedClasses;
        let newTotal = subject.totalClasses;

        // Revert previous record if exists
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
          // Apply new status
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
      
      if (status === 'reset') {
        toast.success('Attendance reset');
      } else {
        toast.success(`Marked ${status}`, { 
          icon: status === 'present' ? '✅' : status === 'absent' ? '❌' : '➖' 
        });
      }
    } catch (e) {
      toast.error('Failed to update attendance');
    }
  };

  const calculateBunkAdvice = (sub) => {
    if (sub.totalClasses === 0) return "Start marking classes!";
    const percentage = (sub.attendedClasses / sub.totalClasses) * 100;
    
    if (percentage < sub.threshold) {
      const needed = Math.ceil((sub.threshold * sub.totalClasses - 100 * sub.attendedClasses) / (100 - sub.threshold));
      return `Attend next ${needed} classes to be safe.`;
    } else {
      const canBunk = Math.floor((100 * sub.attendedClasses - sub.threshold * sub.totalClasses) / sub.threshold);
      if (canBunk === 0) return "On the edge! Don't miss the next class.";
      return `You can bunk ${canBunk} more ${canBunk === 1 ? 'class' : 'classes'}.`;
    }
  };

  // Quick overview stats
  const totalAttended = subjects?.reduce((acc, sub) => acc + sub.attendedClasses, 0) || 0;
  const totalClasses = subjects?.reduce((acc, sub) => acc + sub.totalClasses, 0) || 0;
  const overallPercentage = totalClasses === 0 ? 0 : (totalAttended / totalClasses) * 100;

  const safeSubjectsCount = subjects?.filter(s => s.totalClasses === 0 || ((s.attendedClasses/s.totalClasses)*100) >= s.threshold).length || 0;
  const riskSubjectsCount = (subjects?.length || 0) - safeSubjectsCount;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      <header className="px-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">Today</h1>
        <p className="text-blue-200/70 font-medium flex items-center gap-1.5 text-sm mt-0.5">
          <CalendarIcon size={14} className="text-blue-400" />
          {format(today, 'EEEE, do MMMM')}
        </p>
      </header>

      {/* Main Stat Ring */}
      <section className="mx-2 p-6 glass-card rounded-[2.5rem] flex items-center justify-between border border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-600/20 transition-all duration-500"></div>
        <div className="relative z-10">
          <h2 className="text-blue-200/70 text-xs font-bold uppercase tracking-widest mb-1">Overall Attendance</h2>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-black text-white">{Math.round(overallPercentage)}<span className="text-2xl text-blue-400">%</span></span>
          </div>
          <p className="text-gray-400 text-xs font-medium mt-1">{totalAttended} / {totalClasses} classes attended</p>
        </div>
        <div className="relative">
          <CircularProgress value={overallPercentage} size={90} strokeWidth={8} colorClass="text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
        </div>
      </section>

      {/* Quick Indicators */}
      <div className="grid grid-cols-2 gap-4 px-2">
        <div className="glass-card p-4 rounded-3xl flex flex-col items-center justify-center text-center gap-1 border border-green-500/10">
          <span className="text-2xl font-black text-green-400">{safeSubjectsCount}</span>
          <span className="text-[10px] font-bold text-green-500/70 uppercase tracking-tighter">Safe Subjects</span>
        </div>
        <div className="glass-card p-4 rounded-3xl flex flex-col items-center justify-center text-center gap-1 border border-red-500/10">
          <span className="text-2xl font-black text-red-400">{riskSubjectsCount}</span>
          <span className="text-[10px] font-bold text-red-500/70 uppercase tracking-tighter">At-Risk</span>
        </div>
      </div>

      {/* Today's Feed */}
      <section className="px-2 space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em]">Schedule</h2>
          <span className="text-[10px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 uppercase">
            {todayTimetable?.length || 0} Classes
          </span>
        </div>

        {!todayTimetable || todayTimetable.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-[2rem] border-dashed border-white/10">
            <p className="text-gray-500 text-sm font-medium italic">No classes scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayTimetable.map((slot, index) => {
              const sub = subjects?.find(s => s.id === slot.subjectId);
              if (!sub) return null;

              const record = todaysRecords?.find(r => r.timetableId === slot.id);
              const percentage = sub.totalClasses ? ((sub.attendedClasses/sub.totalClasses)*100) : 0;
              const isRisk = percentage < sub.threshold && sub.totalClasses > 0;
              const advice = calculateBunkAdvice(sub);

              return (
                <div key={slot.id} className="glass-card rounded-[2rem] overflow-hidden transition-all duration-300">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white tracking-tight">{sub.name}</h3>
                          <span className="text-[10px] font-black bg-white/5 text-gray-500 px-1.5 py-0.5 rounded-md border border-white/5 uppercase">Slot {index + 1}</span>
                        </div>
                        <p className={clsx(
                          "text-xs font-bold mt-0.5",
                          isRisk ? "text-red-400" : "text-blue-400"
                        )}>
                          {advice}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-gray-500 uppercase tracking-tighter">Attended</div>
                        <div className="text-sm font-bold text-white">{sub.attendedClasses}/{sub.totalClasses}</div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      <button 
                        onClick={() => handleMarkAttendance(sub.id, slot.id, 'present')}
                        className={clsx(
                          "flex flex-col items-center justify-center py-3 rounded-2xl transition-all active:scale-95 border",
                          record?.status === 'present' ? "bg-green-500 border-green-400 shadow-lg shadow-green-500/20 text-white" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                        )}
                      >
                        <CheckCircle2 size={20} />
                        <span className="text-[10px] font-black mt-1 uppercase tracking-tighter">Present</span>
                      </button>
                      <button 
                        onClick={() => handleMarkAttendance(sub.id, slot.id, 'absent')}
                        className={clsx(
                          "flex flex-col items-center justify-center py-3 rounded-2xl transition-all active:scale-95 border",
                          record?.status === 'absent' ? "bg-red-500 border-red-400 shadow-lg shadow-red-500/20 text-white" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                        )}
                      >
                        <XCircle size={20} />
                        <span className="text-[10px] font-black mt-1 uppercase tracking-tighter">Absent</span>
                      </button>
                      <button 
                        onClick={() => handleMarkAttendance(sub.id, slot.id, 'cancelled')}
                        className={clsx(
                          "flex flex-col items-center justify-center py-3 rounded-2xl transition-all active:scale-95 border",
                          record?.status === 'cancelled' ? "bg-gray-600 border-gray-500 shadow-lg shadow-gray-500/20 text-white" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                        )}
                      >
                        <Slash size={20} />
                        <span className="text-[10px] font-black mt-1 uppercase tracking-tighter">Off</span>
                      </button>
                      <button 
                        onClick={() => handleMarkAttendance(sub.id, slot.id, 'reset')}
                        className="flex flex-col items-center justify-center py-3 rounded-2xl transition-all active:scale-95 border bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:text-white"
                      >
                        <RotateCcw size={20} />
                        <span className="text-[10px] font-black mt-1 uppercase tracking-tighter">Reset</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
