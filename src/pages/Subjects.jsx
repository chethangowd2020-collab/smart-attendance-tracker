import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Trash2, Edit, Calendar, XCircle, MoreVertical, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Subjects() {
  const [activeTab, setActiveTab] = useState('subjects'); // 'subjects' | 'timetable'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', credits: 3, threshold: 75, semesterId: '',
    initialTotal: 0, initialAttended: 0 
  });
  
  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const settings = useLiveQuery(() => db.settings.get(1), []);
  const semesters = useLiveQuery(() => db.semesters.toArray(), []);
  const timetable = useLiveQuery(() => db.timetable.toArray(), []);

  const handleOpenModal = () => {
    if (semesters && semesters.length > 0 && !formData.semesterId) {
      setFormData(prev => ({ ...prev, semesterId: semesters[0].id }));
    }
    setIsModalOpen(true);
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!semesters || semesters.length === 0) {
      toast.error("No active semester found. Please create one in Academics first.");
      return;
    }

    const selectedSemesterId = formData.semesterId ? Number(formData.semesterId) : semesters[0].id;
    const exists = subjects.find(s => s.name.toLowerCase() === formData.name.toLowerCase() && s.semesterId === selectedSemesterId);
    
    if (exists) {
      toast.error("Subject already exists in this semester!");
      return;
    }
    
    try {
      await db.subjects.add({
        semesterId: selectedSemesterId,
        name: formData.name,
        credits: Number(formData.credits),
        totalClasses: Number(formData.initialTotal) || 0,
        attendedClasses: Number(formData.initialAttended) || 0,
        initialTotalClasses: Number(formData.initialTotal) || 0,
        initialAttendedClasses: Number(formData.initialAttended) || 0,
        threshold: Number(formData.threshold),
        gradingScaleId: 1
      });
      
      toast.success("Subject added!");
      setFormData({ 
        name: '', credits: 3, threshold: settings?.defaultThreshold || 75, semesterId: selectedSemesterId,
        initialTotal: 0, initialAttended: 0
      });
      setIsModalOpen(false);
    } catch (e) {
      toast.error("Failed to add subject");
    }
  };

  const handleDeleteSubject = async (id) => {
    if (confirm("Delete subject? Attendance and marks will be lost.")) {
      try {
        await db.subjects.delete(id);
        await db.attendance_records.where('subjectId').equals(id).delete();
        await db.marks.where('subjectId').equals(id).delete();
        await db.timetable.where('subjectId').equals(id).delete();
        toast.success("Subject deleted");
      } catch (e) {
        toast.error("Failed to delete");
      }
    }
  };

  const handleAddTimetableEntry = async (dayOfWeek, subjectId) => {
    if (!subjectId) return;
    try {
      await db.timetable.add({ dayOfWeek, subjectId: Number(subjectId) });
      toast.success("Added to schedule");
    } catch(e) {
      toast.error("Failed to update");
    }
  };

  const handleDeleteTimetableEntry = async (id) => {
    try {
      await db.timetable.delete(id);
      toast.success("Removed");
    } catch(e) {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* App-like Header */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Manage</h1>
          <p className="text-sm text-blue-200/70">Subjects & Weekly Schedule</p>
        </div>
        {activeTab === 'subjects' && (
          <button 
            onClick={handleOpenModal}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 text-white rounded-full transition-all active:scale-95"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      {/* Segmented Control Tabs */}
      <div className="flex p-1.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 mx-2">
        <button
          onClick={() => setActiveTab('subjects')}
          className={clsx(
            "flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200",
            activeTab === 'subjects' ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-gray-400 hover:text-gray-200"
          )}
        >
          Subjects
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={clsx(
            "flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200",
            activeTab === 'timetable' ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-gray-400 hover:text-gray-200"
          )}
        >
          Timetable
        </button>
      </div>

      {/* Content Areas */}
      <div className="px-2">
        {activeTab === 'subjects' ? (
          <div className="space-y-4">
            {!subjects || subjects.length === 0 ? (
              <div className="text-center py-16 glass-card rounded-3xl border-dashed border-white/20">
                <div className="bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="text-blue-400" size={32} />
                </div>
                <p className="text-gray-300 font-medium">No subjects yet</p>
                <button onClick={handleOpenModal} className="mt-4 text-blue-400 text-sm font-bold hover:text-blue-300">
                  + ADD FIRST SUBJECT
                </button>
              </div>
            ) : (
              subjects.map(sub => {
                const percentage = sub.totalClasses === 0 ? 0 : (sub.attendedClasses / sub.totalClasses) * 100;
                const isSafe = percentage >= sub.threshold;
                const isExpanded = expandedSubjectId === sub.id;

                return (
                  <div key={sub.id} className="glass-card rounded-2xl overflow-hidden transition-all duration-300">
                    <div className="p-4 flex items-center gap-4">
                      {/* Attendance Indicator Circle (Mini) */}
                      <div className={clsx(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm",
                        isSafe ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                      )}>
                        {Math.round(percentage)}%
                      </div>

                      <div className="flex-1 min-w-0" onClick={() => setExpandedSubjectId(isExpanded ? null : sub.id)}>
                        <h3 className="text-base font-bold text-white truncate">{sub.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400 font-medium">{sub.attendedClasses}/{sub.totalClasses} classes</span>
                          <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                          <span className="text-xs text-gray-400 font-medium">{sub.credits} credits</span>
                        </div>
                        {/* Linear Progress Bar */}
                        <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                          <div 
                            className={clsx("h-full transition-all duration-500", isSafe ? "bg-green-500" : "bg-red-500")}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                      </div>

                      <button onClick={() => handleDeleteSubject(sub.id)} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Expandable Details (Smart Prediction) */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-white/2 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Safety Status</p>
                            <div className="flex items-center gap-2">
                              {isSafe ? <CheckCircle2 className="text-green-400" size={14} /> : <AlertCircle className="text-red-400" size={14} />}
                              <span className={clsx("text-sm font-bold", isSafe ? "text-green-400" : "text-red-400")}>
                                {isSafe ? "Safe Zone" : "Danger Zone"}
                              </span>
                            </div>
                          </div>
                          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Threshold</p>
                            <span className="text-sm font-bold text-white">{sub.threshold}%</span>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Attendance Scenarios</p>
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-gray-400">If you miss next 2 classes:</span>
                            <span className="text-red-400">{(((sub.attendedClasses) / (sub.totalClasses + 2)) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-gray-400">If you attend next 3 classes:</span>
                            <span className="text-green-400">{(((sub.attendedClasses + 3) / (sub.totalClasses + 3)) * 100).toFixed(1)}%</span>
                          </div>
                        </div>

                        {!isSafe && (
                          <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                            <p className="text-xs text-red-300 font-medium">
                              Need to attend <span className="font-bold text-white">{Math.ceil((sub.threshold * sub.totalClasses - 100 * sub.attendedClasses) / (100 - sub.threshold))}</span> more classes to reach target.
                            </p>
                          </div>
                        )}
                        {isSafe && percentage > sub.threshold && (
                          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <p className="text-xs text-blue-300 font-medium">
                              You can safely bunk <span className="font-bold text-white">{Math.floor((100 * sub.attendedClasses - sub.threshold * sub.totalClasses) / sub.threshold)}</span> classes.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {DAYS.map((day, index) => {
              // Convert JS index (0=Sun) to our index (0=Mon)
              // Wait, the original code used 0=Sun. Let's fix that to match DAYS array.
              // Original code: dayOfWeek is today.getDay() (0-6, Sun-Sat).
              // My DAYS array: Mon-Sun.
              // So: Mon=0, Tue=1... Sun=6.
              // Mapping: (index + 1) % 7 will match the standard getDay() 0=Sun, 1=Mon.
              const dbDayIndex = (index + 1) % 7;
              const dayEntries = timetable?.filter(t => t.dayOfWeek === dbDayIndex) || [];
              
              return (
                <div key={day} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">{day}</h3>
                    <div className="relative">
                      <select 
                        className="opacity-0 absolute inset-0 cursor-pointer w-8 h-8"
                        onChange={(e) => {
                          handleAddTimetableEntry(dbDayIndex, e.target.value);
                          e.target.value = '';
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>+</option>
                        {subjects?.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 text-blue-400 pointer-events-none">
                        <Plus size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {dayEntries.length === 0 ? (
                      <div className="py-4 border-2 border-dashed border-white/5 rounded-2xl text-center">
                        <p className="text-xs text-gray-600 font-medium">Holiday / No classes</p>
                      </div>
                    ) : (
                      dayEntries.map(entry => {
                        const subject = subjects?.find(s => s.id === entry.subjectId);
                        if (!subject) return null;
                        return (
                          <div key={entry.id} className="flex items-center justify-between p-3.5 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/5 group active:bg-white/10 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-1.5 h-8 bg-blue-600 rounded-full" />
                              <span className="font-bold text-white text-sm">{subject.name}</span>
                            </div>
                            <button onClick={() => handleDeleteTimetableEntry(entry.id)} className="p-1.5 text-gray-600 hover:text-red-400">
                              <XCircle size={16} />
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
      </div>

      {/* Add Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-[#1a1a1a] p-6 rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-md shadow-2xl border-t sm:border border-white/10 animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 sm:hidden" onClick={() => setIsModalOpen(false)} />
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">New Subject</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubject} className="space-y-4">
              {semesters && semesters.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Semester</label>
                  <select 
                    required
                    value={formData.semesterId}
                    onChange={(e) => setFormData({...formData, semesterId: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-bold"
                  >
                    {semesters.map(sem => (
                      <option key={sem.id} value={sem.id}>{sem.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Subject Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  placeholder="e.g. Computer Science"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Credits</label>
                  <input 
                    type="number" 
                    required min="0" max="10"
                    value={formData.credits}
                    onChange={(e) => setFormData({...formData, credits: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Threshold (%)</label>
                  <input 
                    type="number" 
                    required min="1" max="100"
                    value={formData.threshold}
                    onChange={(e) => setFormData({...formData, threshold: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center"
                  />
                </div>
              </div>

              <div className="bg-blue-500/5 p-4 rounded-3xl border border-blue-500/10 space-y-4">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Mid-term Entry (Optional)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-1.5 ml-1">Attended Classes</label>
                    <input 
                      type="number" min="0"
                      value={formData.initialAttended}
                      onChange={e => setFormData({ ...formData, initialAttended: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm font-bold outline-none text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-1.5 ml-1">Total Classes</label>
                    <input 
                      type="number" min="0"
                      value={formData.initialTotal}
                      onChange={e => setFormData({ ...formData, initialTotal: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm font-bold outline-none text-center"
                    />
                  </div>
                </div>
                <p className="text-[9px] text-gray-600 font-medium px-1">Use this if you are starting to track after the semester has already begun.</p>
              </div>

              <button 
                type="submit" 
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] transition-all font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-[0.98] mt-2"
              >
                CREATE SUBJECT
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
