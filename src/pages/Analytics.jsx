import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { calculateSGPA } from '../utils/academicUtils';

export default function Analytics() {
  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const semesters = useLiveQuery(() => db.semesters.toArray(), []);
  const marks = useLiveQuery(() => db.marks.toArray(), []);
  const settings = useLiveQuery(() => db.settings.get(1), []);

  if (!subjects || !semesters || !marks || !settings) {
    return <div className="text-gray-400">Loading analytics...</div>;
  }

  // Prepare data for Subject Attendance Comparison
  const attendanceData = subjects.map(sub => ({
    name: sub.name.substring(0, 8) + (sub.name.length > 8 ? '...' : ''),
    fullName: sub.name,
    percentage: sub.totalClasses > 0 ? Number(((sub.attendedClasses / sub.totalClasses) * 100).toFixed(1)) : 0,
    threshold: sub.threshold
  }));

  // Prepare data for SGPA Trend
  const sgpaTrendData = semesters.map(sem => {
    const semSubjects = subjects.filter(s => s.semesterId === sem.id);
    const sgpa = calculateSGPA(semSubjects, marks, settings.gradingScale);
    return {
      name: sem.name,
      sgpa: Number(sgpa)
    };
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="text-blue-500" />
          Analytics
        </h1>
        <p className="text-gray-400 text-sm mt-1">Insights into your performance</p>
      </header>

      {/* Attendance Comparison Chart */}
      <section className="glass-card p-5 rounded-2xl">
        <h2 className="text-lg font-semibold text-white mb-4">Subject Attendance</h2>
        {attendanceData.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No subjects added yet.</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: '#374151', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  formatter={(value) => [`${value}%`, 'Attendance']}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                />
                <ReferenceLine y={settings.defaultThreshold} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Min', fill: '#ef4444', fontSize: 10 }} />
                <Bar dataKey="percentage" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* SGPA Trend Chart */}
      <section className="glass-card p-5 rounded-2xl">
        <h2 className="text-lg font-semibold text-white mb-4">SGPA Progression</h2>
        {sgpaTrendData.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No semester data available.</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sgpaTrendData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={[0, 10]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                />
                <Line type="monotone" dataKey="sgpa" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#1f2937' }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
