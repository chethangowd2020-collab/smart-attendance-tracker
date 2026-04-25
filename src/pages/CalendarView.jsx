import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, XCircle, Slash, Filter } from 'lucide-react';
import clsx from 'clsx';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterSubjectId, setFilterSubjectId] = useState('all');

  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const allRecords = useLiveQuery(() => db.attendance_records.toArray(), []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPadding = Array.from({ length: getDay(monthStart) }).map((_, i) => i);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  const filteredRecords = allRecords?.filter(r => filterSubjectId === 'all' || r.subjectId === Number(filterSubjectId)) || [];
  const selectedRecords = allRecords?.filter(r => r.date === selectedDateString) || [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      <header className="px-2 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Calendar</h1>
          <p className="text-blue-200/70 font-medium text-sm mt-0.5">Attendance visualization</p>
        </div>
        <div className="relative">
          <select 
            className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none appearance-none pr-8"
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
          >
            <option value="all">All Subjects</option>
            {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Filter className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={12} />
        </div>
      </header>

      {/* Calendar Grid */}
      <div className="mx-2 glass-card p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <button onClick={handlePrevMonth} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-300 transition-all active:scale-90">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-black text-white uppercase tracking-widest">{format(currentDate, 'MMMM yyyy')}</h2>
          <button onClick={handleNextMonth} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-300 transition-all active:scale-90">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center mb-4">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
            <div key={day} className="text-[10px] font-black text-gray-500 py-1 uppercase tracking-tighter">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {startPadding.map(i => <div key={`empty-${i}`} className="aspect-square"></div>)}
          
          {daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayRecords = filteredRecords.filter(r => r.date === dateStr);
            
            const hasPresent = dayRecords.some(r => r.status === 'present');
            const hasAbsent = dayRecords.some(r => r.status === 'absent');
            const hasCancelled = dayRecords.some(r => r.status === 'cancelled');

            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={clsx(
                  "aspect-square relative flex flex-col items-center justify-center rounded-2xl text-xs font-bold transition-all active:scale-90",
                  isSameMonth(day, currentDate) ? "text-white" : "text-gray-700",
                  isToday(day) && "bg-blue-600/20 text-blue-400 border border-blue-500/50",
                  selectedDateString === dateStr && !isToday(day) && "bg-white/10 border border-white/20",
                  selectedDateString !== dateStr && !isToday(day) && "hover:bg-white/5"
                )}
              >
                <span>{format(day, 'd')}</span>
                <div className="flex gap-0.5 mt-1">
                  {hasPresent && <div className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>}
                  {hasAbsent && <div className="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div>}
                  {hasCancelled && <div className="w-1 h-1 rounded-full bg-gray-500"></div>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-8 pt-6 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Present</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Absent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Off</span>
          </div>
        </div>
      </div>

      {/* Selected Day Logs */}
      <div className="px-2 space-y-4">
        <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] px-2">
          {format(selectedDate, 'do MMMM')}
        </h3>
        
        {selectedRecords.length === 0 ? (
          <div className="py-8 glass-card rounded-3xl text-center">
            <p className="text-gray-500 text-xs font-medium italic">No attendance marked for this day.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedRecords.map(record => {
              const subject = subjects?.find(s => s.id === record.subjectId);
              if (!subject) return null;

              return (
                <div key={record.id} className="glass-card p-4 rounded-3xl flex items-center justify-between border border-white/5">
                  <span className="text-sm font-bold text-white">{subject.name}</span>
                  <div className={clsx(
                    "flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl",
                    record.status === 'present' ? "text-green-400 bg-green-400/10 border border-green-500/20" :
                    record.status === 'absent' ? "text-red-400 bg-red-400/10 border border-red-500/20" : "text-gray-400 bg-gray-400/10 border border-white/10"
                  )}>
                    {record.status === 'present' && <CheckCircle2 size={12} />}
                    {record.status === 'absent' && <XCircle size={12} />}
                    {record.status === 'cancelled' && <Slash size={12} />}
                    <span>{record.status === 'cancelled' ? 'Off' : record.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
