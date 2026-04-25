import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle, XCircle, Slash } from 'lucide-react';
import clsx from 'clsx';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const records = useLiveQuery(() => db.attendance_records.toArray(), []);
  const subjects = useLiveQuery(() => db.subjects.toArray(), []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding for start of month
  const startPadding = Array.from({ length: monthStart.getDay() }).map((_, i) => i);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  const selectedRecords = records?.filter(r => r.date === selectedDateString) || [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CalendarIcon className="text-blue-500" />
          Calendar
        </h1>
        <p className="text-gray-400 text-sm mt-1">View and edit past attendance</p>
      </header>

      {/* Calendar Grid */}
      <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold text-white">{format(currentDate, 'MMMM yyyy')}</h2>
          <button onClick={handleNextMonth} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-xs font-medium text-gray-400 py-2">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {startPadding.map(i => <div key={`empty-${i}`} className="h-10"></div>)}
          
          {daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayRecords = records?.filter(r => r.date === dateStr) || [];
            
            // Determine dot colors based on records
            const hasPresent = dayRecords.some(r => r.status === 'present');
            const hasAbsent = dayRecords.some(r => r.status === 'absent');
            const hasCancelled = dayRecords.some(r => r.status === 'cancelled');

            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={clsx(
                  "h-12 relative flex flex-col items-center justify-center rounded-lg text-sm transition-colors",
                  isSameMonth(day, currentDate) ? "text-white" : "text-gray-600",
                  isToday(day) && "bg-blue-900/50 text-blue-400 font-bold border border-blue-500/50",
                  selectedDateString === dateStr && !isToday(day) && "bg-gray-700 border border-gray-500",
                  selectedDateString !== dateStr && !isToday(day) && "hover:bg-gray-700/50"
                )}
              >
                <span>{format(day, 'd')}</span>
                <div className="flex gap-0.5 mt-1">
                  {hasPresent && <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                  {hasAbsent && <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>}
                  {hasCancelled && !hasPresent && !hasAbsent && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Details */}
      <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
        <h3 className="font-semibold text-white mb-4">Records for {format(selectedDate, 'MMMM do, yyyy')}</h3>
        
        {selectedRecords.length === 0 ? (
          <p className="text-gray-500 italic text-sm">No attendance marked on this date.</p>
        ) : (
          <div className="space-y-3">
            {selectedRecords.map(record => {
              const subject = subjects?.find(s => s.id === record.subjectId);
              if (!subject) return null;

              return (
                <div key={record.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-700">
                  <span className="font-medium text-white">{subject.name}</span>
                  <div className={clsx(
                    "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-md",
                    record.status === 'present' ? "text-green-400 bg-green-400/10" :
                    record.status === 'absent' ? "text-red-400 bg-red-400/10" : "text-yellow-400 bg-yellow-400/10"
                  )}>
                    {record.status === 'present' && <CheckCircle size={14} />}
                    {record.status === 'absent' && <XCircle size={14} />}
                    {record.status === 'cancelled' && <Slash size={14} />}
                    <span className="capitalize">{record.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-4 text-center">Note: Past attendance can be overwritten from the Home tab if today's date is selected.</p>
      </div>
    </div>
  );
}
