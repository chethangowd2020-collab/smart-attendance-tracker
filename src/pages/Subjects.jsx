import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Trash2, Edit, Calendar, XCircle } from 'lucide-react';
import CircularProgress from '../components/ui/CircularProgress';
import clsx from 'clsx';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Subjects() {
  const [activeTab, setActiveTab] = useState('subjects'); // 'subjects' | 'timetable'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', credits: 3, threshold: 75 });
  
  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const settings = useLiveQuery(() => db.settings.get(1), []);
  const semesters = useLiveQuery(() => db.semesters.toArray(), []);
  const timetable = useLiveQuery(() => db.timetable.toArray(), []);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!semesters || semesters.length === 0) {
      alert("No active semester found. Please create one in Academics first.");
      return;
    }
    
    await db.subjects.add({
      semesterId: semesters[0].id,
      name: formData.name,
      credits: Number(formData.credits),
      totalClasses: 0,
      attendedClasses: 0,
      threshold: Number(formData.threshold),
      gradingScaleId: 1 // Default
    });
    
    setFormData({ name: '', credits: 3, threshold: settings?.defaultThreshold || 75 });
    setIsModalOpen(false);
  };

  const handleDeleteSubject = async (id) => {
    if (confirm("Are you sure you want to delete this subject? All related attendance and marks will be lost.")) {
      await db.subjects.delete(id);
      await db.attendance_records.where('subjectId').equals(id).delete();
      await db.marks.where('subjectId').equals(id).delete();
      await db.timetable.where('subjectId').equals(id).delete();
    }
  };

  const handleAddTimetableEntry = async (dayOfWeek, subjectId) => {
    if (!subjectId) return;
    await db.timetable.add({ dayOfWeek, subjectId: Number(subjectId) });
  };

  const handleDeleteTimetableEntry = async (id) => {
    await db.timetable.delete(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Manage Classes</h1>
        {activeTab === 'subjects' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Subject</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('subjects')}
          className={clsx("flex-1 py-2 text-sm font-medium rounded-md transition-colors", activeTab === 'subjects' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200')}
        >
          Subjects
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={clsx("flex-1 py-2 text-sm font-medium rounded-md transition-colors", activeTab === 'timetable' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200')}
        >
          Timetable
        </button>
      </div>

      {activeTab === 'subjects' && (
        <>
          {!subjects || subjects.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
              <p className="text-gray-400">No subjects added yet.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-blue-500 hover:underline"
              >
                Add your first subject
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map(sub => {
                const percentage = sub.totalClasses === 0 ? 0 : (sub.attendedClasses / sub.totalClasses) * 100;
                const isSafe = percentage >= sub.threshold;
                const colorClass = percentage === 0 && sub.totalClasses === 0 ? 'text-blue-500' : (isSafe ? 'text-green-500' : 'text-red-500');
                
                return (
                  <div key={sub.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{sub.name}</h3>
                        <p className="text-sm text-gray-400">{sub.credits} Credits • Threshold: {sub.threshold}%</p>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <button onClick={() => handleDeleteSubject(sub.id)} className="hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-300">Classes: <span className="text-white font-medium">{sub.attendedClasses}/{sub.totalClasses}</span></p>
                        {sub.totalClasses > 0 && (
                          <p className={clsx("text-xs mt-1 font-medium", isSafe ? "text-green-400" : "text-red-400")}>
                            {isSafe ? 'Safe Zone' : 'Danger Zone'}
                          </p>
                        )}
                      </div>
                      <CircularProgress value={percentage} colorClass={colorClass} size={50} strokeWidth={5} />
                    </div>

                    {/* Smart Prediction System */}
                    {sub.totalClasses > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-700/50 space-y-1">
                        <p className="text-xs text-gray-400">
                          <span className="text-red-400">If miss 2:</span> {(((sub.attendedClasses) / (sub.totalClasses + 2)) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-400">
                          <span className="text-green-400">If attend 3:</span> {(((sub.attendedClasses + 3) / (sub.totalClasses + 3)) * 100).toFixed(1)}%
                        </p>
                        {!isSafe && (
                          <p className="text-xs text-yellow-500 font-medium mt-1">
                            Need {Math.ceil((sub.threshold * sub.totalClasses - 100 * sub.attendedClasses) / (100 - sub.threshold))} classes to reach {sub.threshold}%
                          </p>
                        )}
                        {isSafe && percentage > sub.threshold && (
                          <p className="text-xs text-blue-400 font-medium mt-1">
                            Can bunk {Math.floor((100 * sub.attendedClasses - sub.threshold * sub.totalClasses) / sub.threshold)} classes
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'timetable' && (
        <div className="space-y-6">
          {DAYS.map((day, index) => {
            const dayEntries = timetable?.filter(t => t.dayOfWeek === index) || [];
            return (
              <div key={day} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="bg-gray-700/50 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                  <h3 className="font-semibold text-white">{day}</h3>
                  <select 
                    className="bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5"
                    onChange={(e) => {
                      handleAddTimetableEntry(index, e.target.value);
                      e.target.value = '';
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>+ Add Subject</option>
                    {subjects?.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {dayEntries.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No classes scheduled.</p>
                  ) : (
                    dayEntries.map(entry => {
                      const subject = subjects?.find(s => s.id === entry.subjectId);
                      if (!subject) return null;
                      return (
                        <div key={entry.id} className="flex items-center gap-2 bg-blue-900/30 border border-blue-800/50 text-blue-200 px-3 py-1.5 rounded-lg text-sm">
                          {subject.name}
                          <button onClick={() => handleDeleteTimetableEntry(entry.id)} className="text-blue-400 hover:text-red-400 ml-1">
                            <XCircle size={14} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Add Subject</h2>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Subject Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Mathematics"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Credits</label>
                  <input 
                    type="number" 
                    required min="1" max="10"
                    value={formData.credits}
                    onChange={(e) => setFormData({...formData, credits: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Threshold (%)</label>
                  <input 
                    type="number" 
                    required min="1" max="100"
                    value={formData.threshold}
                    onChange={(e) => setFormData({...formData, threshold: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
