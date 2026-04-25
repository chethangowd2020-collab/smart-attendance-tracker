import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Slash, Calendar as CalendarIcon } from 'lucide-react';
import CircularProgress from '../components/ui/CircularProgress';

export default function Home() {
  const [today, setToday] = useState(new Date());
  
  // Format current date
  const dateString = format(today, 'yyyy-MM-dd');
  const dayOfWeek = today.getDay(); // 0-6

  // Fetch all subjects and timetable for today
  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const todayTimetable = useLiveQuery(() => db.timetable.where('dayOfWeek').equals(dayOfWeek).toArray(), [dayOfWeek]);
  const todaysRecords = useLiveQuery(() => db.attendance_records.where('date').equals(dateString).toArray(), [dateString]);

  // Aggregate today's subjects
  const todaysSubjects = subjects && todayTimetable ? todayTimetable.map(t => {
    return subjects.find(s => s.id === t.subjectId);
  }).filter(Boolean) : [];

  const handleMarkAttendance = async (subjectId, status) => {
    // status: 'present', 'absent', 'cancelled'
    const existingRecord = todaysRecords?.find(r => r.subjectId === subjectId);
    
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

      // Apply new status
      if (status === 'present') {
        newAttended++;
        newTotal++;
      } else if (status === 'absent') {
        newTotal++;
      }

      await db.subjects.update(subjectId, {
        attendedClasses: newAttended,
        totalClasses: newTotal
      });

      await db.attendance_records.add({
        subjectId,
        date: dateString,
        status
      });
    });
  };

  // Quick overview stats
  const totalAttended = subjects?.reduce((acc, sub) => acc + sub.attendedClasses, 0) || 0;
  const totalClasses = subjects?.reduce((acc, sub) => acc + sub.totalClasses, 0) || 0;
  const overallPercentage = totalClasses === 0 ? 0 : (totalAttended / totalClasses) * 100;

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1 flex items-center gap-2">
            <CalendarIcon size={16} />
            {format(today, 'EEEE, MMMM do, yyyy')}
          </p>
        </div>
      </header>

      {/* Overall Summary Card */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-lg shadow-blue-900/20 flex items-center justify-between">
        <div>
          <h2 className="text-blue-100 font-medium mb-1">Overall Attendance</h2>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-white">{overallPercentage.toFixed(1)}%</span>
            <span className="text-blue-200 mb-1">({totalAttended}/{totalClasses})</span>
          </div>
        </div>
        <div className="bg-white/10 rounded-full p-2">
          <CircularProgress value={overallPercentage} size={70} strokeWidth={6} colorClass="text-white" />
        </div>
      </section>

      {/* Today's Subjects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Today's Classes</h2>
          <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">{todaysSubjects.length} Classes</span>
        </div>

        {todaysSubjects.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
            <p className="text-gray-400 mb-4">No classes scheduled for today.</p>
            <p className="text-sm text-gray-500">Go to Settings or Timetable to add classes to your schedule.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todaysSubjects.map(sub => {
              const record = todaysRecords?.find(r => r.subjectId === sub.id);
              return (
                <div key={sub.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{sub.name}</h3>
                    <p className="text-sm text-gray-400">Total: {sub.attendedClasses}/{sub.totalClasses} ({sub.totalClasses ? ((sub.attendedClasses/sub.totalClasses)*100).toFixed(0) : 0}%)</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleMarkAttendance(sub.id, 'present')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors ${record?.status === 'present' ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                    >
                      <CheckCircle size={18} />
                      <span className="sm:hidden lg:inline">Present</span>
                    </button>
                    <button 
                      onClick={() => handleMarkAttendance(sub.id, 'absent')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors ${record?.status === 'absent' ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                    >
                      <XCircle size={18} />
                      <span className="sm:hidden lg:inline">Absent</span>
                    </button>
                    <button 
                      onClick={() => handleMarkAttendance(sub.id, 'cancelled')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors ${record?.status === 'cancelled' ? 'bg-yellow-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                    >
                      <Slash size={18} />
                      <span className="sm:hidden lg:inline">Cancel</span>
                    </button>
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
