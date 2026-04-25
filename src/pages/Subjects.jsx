import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Trash2, Edit, Calendar, XCircle, MoreVertical, Info, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl mx-auto pb-32"
    >
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Manage</h1>
          <p className="text-blue-200/70 font-black text-[10px] uppercase tracking-widest mt-1">Subjects & Schedule</p>
        </div>
        {activeTab === 'subjects' && (
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleOpenModal}
            className="w-12 h-12 bg-blue-600 shadow-xl shadow-blue-600/20 text-white rounded-2xl flex items-center justify-center transition-all"
          >
            <Plus size={28} strokeWidth={3} />
          </motion.button>
        )}
      </div>

      <div className="flex p-1.5 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 mx-2 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5 blur-xl pointer-events-none" />
        <button
          onClick={() => setActiveTab('subjects')}
          className={clsx(
            "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-[1.5rem] transition-all duration-300 relative z-10",
            activeTab === 'subjects' ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" : "text-gray-500 hover:text-gray-200"
          )}
        >
          Subjects
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={clsx(
            "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-[1.5rem] transition-all duration-300 relative z-10",
            activeTab === 'timetable' ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" : "text-gray-500 hover:text-gray-200"
          )}
        >
          Timetable
        </button>
      </div>

      <div className="px-2">
        <AnimatePresence mode="wait">
          {activeTab === 'subjects' ? (
            <motion.div 
              key="subjects"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {!subjects || subjects.length === 0 ? (
                <div className="text-center py-20 glass-card rounded-[3rem] border-2 border-dashed border-white/5">
                  <div className="bg-white/5 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Calendar className="text-gray-700" size={32} />
                  </div>
                  <p className="text-gray-500 font-black uppercase tracking-widest">No subjects yet</p>
                  <button onClick={handleOpenModal} className="mt-4 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:text-blue-300">
                    + Add First Subject
                  </button>
                </div>
              ) : (
                subjects.map(sub => {
                  const percentage = sub.totalClasses === 0 ? 0 : (sub.attendedClasses / sub.totalClasses) * 100;
                  const isSafe = percentage >= sub.threshold;
                  const isExpanded = expandedSubjectId === sub.id;

                  return (
                    <motion.div 
                      layout
                      key={sub.id} 
                      className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5"
                    >
                      <div className="p-6 flex items-center gap-5 cursor-pointer" onClick={() => setExpandedSubjectId(isExpanded ? null : sub.id)}>
                        <div className={clsx(
                          "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xs border shrink-0",
                          isSafe ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                        )}>
                          {Math.round(percentage)}%
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-black text-white truncate leading-none mb-2">{sub.name}</h3>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{sub.attendedClasses}/{sub.totalClasses} Classes</span>
                            <span className="w-1 h-1 rounded-full bg-gray-800"></span>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{sub.credits} Credits</span>
                          </div>
                        </div>

                        <motion.button 
                          whileTap={{ scale: 0.8 }}
                          onClick={(e) => { e.stopPropagation(); handleDeleteSubject(sub.id); }} 
                          className="p-3 text-gray-700 hover:text-red-400 transition-colors bg-white/5 rounded-2xl border border-white/5"
                        >
                          <Trash2 size={18} />
                        </motion.button>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-6 pb-6 pt-2 border-t border-white/5 space-y-4"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-white/5 rounded-3xl border border-white/5">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Status</p>
                                <div className="flex items-center gap-2">
                                  {isSafe ? <CheckCircle2 className="text-green-400" size={16} /> : <AlertCircle className="text-red-400" size={16} />}
                                  <span className={clsx("text-xs font-black uppercase", isSafe ? "text-green-400" : "text-red-400")}>
                                    {isSafe ? "Safe Zone" : "Danger"}
                                  </span>
                                </div>
                              </div>
                              <div className="p-4 bg-white/5 rounded-3xl border border-white/5">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Target</p>
                                <span className="text-xs font-black text-white uppercase">{sub.threshold}% Goal</span>
                              </div>
                            </div>
                            
                            <div className="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-3">
                              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Smart Predictions</p>
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-bold text-gray-400">If you miss next 2:</span>
                                <span className="text-red-400 font-black text-xs">{(((sub.attendedClasses) / (sub.totalClasses + 2)) * 100).toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-bold text-gray-400">If you attend next 3:</span>
                                <span className="text-green-400 font-black text-xs">{(((sub.attendedClasses + 3) / (sub.totalClasses + 3)) * 100).toFixed(1)}%</span>
                              </div>
                            </div>

                            <div className={clsx(
                              "p-4 rounded-3xl border flex items-center gap-4",
                              isSafe ? "bg-blue-600/10 border-blue-600/20 text-blue-400" : "bg-red-600/10 border-red-600/20 text-red-400"
                            )}>
                              <Info size={20} />
                              <p className="text-[11px] font-bold leading-snug">
                                {isSafe ? (
                                  <>You can safely bunk <span className="font-black text-white px-1.5 py-0.5 bg-white/10 rounded-lg">{Math.floor((100 * sub.attendedClasses - sub.threshold * sub.totalClasses) / sub.threshold)}</span> classes.</>
                                ) : (
                                  <>Attend <span className="font-black text-white px-1.5 py-0.5 bg-white/10 rounded-lg">{Math.ceil((sub.threshold * sub.totalClasses - 100 * sub.attendedClasses) / (100 - sub.threshold))}</span> more to reach target.</>
                                )}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="timetable"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {DAYS.map((day, index) => {
                const dbDayIndex = (index + 1) % 7;
                const dayEntries = timetable?.filter(t => t.dayOfWeek === dbDayIndex) || [];
                
                return (
                  <div key={day} className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-blue-400" />
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{day}</h3>
                      </div>
                      <div className="relative">
                        <select 
                          className="opacity-0 absolute inset-0 cursor-pointer w-10 h-10"
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
                        <motion.div whileTap={{ scale: 0.9 }} className="w-10 h-10 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-blue-400 pointer-events-none">
                          <Plus size={20} />
                        </motion.div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {dayEntries.length === 0 ? (
                        <div className="py-6 border-2 border-dashed border-white/5 rounded-[2rem] text-center bg-white/2">
                          <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest italic">Holiday / Free Day</p>
                        </div>
                      ) : (
                        dayEntries.map((entry, idx) => {
                          const subject = subjects?.find(s => s.id === entry.subjectId);
                          if (!subject) return null;
                          return (
                            <motion.div 
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              key={entry.id} 
                              className="flex items-center justify-between p-5 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/5 group active:bg-white/10 transition-all shadow-lg"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-600/10 border border-blue-600/20 rounded-xl flex items-center justify-center text-blue-400 font-black text-xs">
                                  {idx + 1}
                                </div>
                                <span className="font-black text-white text-sm tracking-tight">{subject.name}</span>
                              </div>
                              <button onClick={() => handleDeleteTimetableEntry(entry.id)} className="p-2.5 text-gray-700 hover:text-red-400 bg-white/5 rounded-xl border border-white/5 transition-colors">
                                <XCircle size={18} />
                              </button>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Subject Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[#121212] p-8 rounded-t-[3rem] sm:rounded-[3rem] w-full max-w-md shadow-2xl border-t border-white/10 relative z-10 overflow-y-auto max-h-[90vh]"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8 sm:hidden" onClick={() => setIsModalOpen(false)} />
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">New Subject</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                  <XCircle size={28} />
                </button>
              </div>
              
              <form onSubmit={handleAddSubject} className="space-y-6">
                {semesters && semesters.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Select Semester</label>
                    <select 
                      required
                      value={formData.semesterId}
                      onChange={(e) => setFormData({...formData, semesterId: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-bold shadow-inner"
                    >
                      {semesters.map(sem => (
                        <option key={sem.id} value={sem.id}>{sem.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Subject Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none font-black placeholder:text-gray-800 shadow-inner"
                    placeholder="e.g. DATA STRUCTURES"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Credits</label>
                    <input 
                      type="number" 
                      required min="0" max="10"
                      value={formData.credits}
                      onChange={(e) => setFormData({...formData, credits: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none font-black text-center shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Goal (%)</label>
                    <input 
                      type="number" 
                      required min="1" max="100"
                      value={formData.threshold}
                      onChange={(e) => setFormData({...formData, threshold: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none font-black text-center shadow-inner"
                    />
                  </div>
                </div>

                <div className="bg-blue-500/5 p-6 rounded-[2rem] border border-blue-500/10 space-y-4">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={12} /> Mid-term Start?
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-gray-600 uppercase tracking-tighter mb-1.5 ml-1">Attended</label>
                      <input 
                        type="number" min="0"
                        value={formData.initialAttended}
                        onChange={e => setFormData({ ...formData, initialAttended: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm font-black outline-none text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-600 uppercase tracking-tighter mb-1.5 ml-1">Total</label>
                      <input 
                        type="number" min="0"
                        value={formData.initialTotal}
                        onChange={e => setFormData({ ...formData, initialTotal: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm font-black outline-none text-center"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-5 bg-blue-600 text-white rounded-[2rem] transition-all font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/40 active:scale-[0.98] mt-4"
                >
                  Create Subject
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
