import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { 
  Plus, Trash2, Calendar, XCircle, MoreVertical, 
  Info, CheckCircle2, AlertCircle, Clock, BookOpen,
  ChevronDown, ChevronUp, Target, Edit2
} from 'lucide-react';
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
        name: formData.name.toUpperCase(),
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
      className="space-y-8 max-w-2xl mx-auto pb-32"
    >
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">CURRICULUM</h1>
          <p className="text-gray-500 font-black text-[10px] uppercase tracking-[0.3em] mt-1">Manage Coursework</p>
        </div>
        {activeTab === 'subjects' && (
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleOpenModal}
            className="w-14 h-14 bg-blue-600 shadow-2xl shadow-blue-600/30 text-white rounded-[1.5rem] flex items-center justify-center transition-all"
          >
            <Plus size={32} strokeWidth={3} />
          </motion.button>
        )}
      </div>

      <div className="flex p-2 bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 mx-2 shadow-inner">
        <button
          onClick={() => setActiveTab('subjects')}
          className={clsx(
            "flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all duration-500 relative z-10",
            activeTab === 'subjects' ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" : "text-gray-600 hover:text-gray-200"
          )}
        >
          Active Subjects
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={clsx(
            "flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all duration-500 relative z-10",
            activeTab === 'timetable' ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" : "text-gray-600 hover:text-gray-200"
          )}
        >
          Daily Schedule
        </button>
      </div>

      <div className="px-2">
        <AnimatePresence mode="wait">
          {activeTab === 'subjects' ? (
            <motion.div 
              key="subjects"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {!subjects || subjects.length === 0 ? (
                <div className="text-center py-24 glass-card rounded-[3.5rem] border-2 border-dashed border-white/5">
                  <div className="bg-white/5 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <BookOpen className="text-gray-800" size={40} />
                  </div>
                  <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-sm">No subjects listed</p>
                  <button onClick={handleOpenModal} className="mt-6 px-6 py-3 bg-white/5 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                    Initialize your curriculum
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
                      className="glass-card rounded-[3rem] overflow-hidden border border-white/5 group relative"
                    >
                      <div className="p-8 cursor-pointer" onClick={() => setExpandedSubjectId(isExpanded ? null : sub.id)}>
                        <div className="flex items-center gap-6 mb-6">
                          <div className={clsx(
                            "w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-lg border-2 shrink-0 transition-all duration-500",
                            isSafe ? "bg-blue-600/10 border-blue-600/30 text-blue-400 shadow-lg shadow-blue-600/10" : "bg-red-600/10 border-red-600/30 text-red-400 shadow-lg shadow-red-600/10"
                          )}>
                            {Math.round(percentage)}%
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-black text-white truncate tracking-tighter mb-2">{sub.name}</h3>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                                <Clock size={10} className="text-gray-500" />
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{sub.attendedClasses}/{sub.totalClasses}</span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                                <Target size={10} className="text-gray-500" />
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{sub.credits} Units</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <motion.button 
                              whileTap={{ scale: 0.8 }}
                              onClick={(e) => { e.stopPropagation(); handleDeleteSubject(sub.id); }} 
                              className="p-3 text-gray-700 hover:text-red-400 transition-colors bg-white/5 rounded-2xl border border-white/5"
                            >
                              <Trash2 size={18} />
                            </motion.button>
                            {isExpanded ? <ChevronUp className="text-gray-700" /> : <ChevronDown className="text-gray-700" />}
                          </div>
                        </div>

                        {/* Progress Bar UI */}
                        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className={clsx(
                              "h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                              isSafe ? "bg-gradient-to-r from-blue-600 to-blue-400" : "bg-gradient-to-r from-red-600 to-red-400"
                            )}
                          />
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-8 pb-8 pt-2 border-t border-white/5 space-y-6"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-5 bg-white/5 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                                <div className={clsx(
                                  "absolute top-0 right-0 w-16 h-16 blur-2xl -mr-8 -mt-8",
                                  isSafe ? "bg-blue-600/20" : "bg-red-600/20"
                                )} />
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 relative z-10">Compliance</p>
                                <div className="flex items-center gap-2 relative z-10">
                                  {isSafe ? <CheckCircle2 className="text-blue-400" size={18} /> : <AlertCircle className="text-red-400" size={18} />}
                                  <span className={clsx("text-sm font-black uppercase tracking-tight", isSafe ? "text-blue-400" : "text-red-400")}>
                                    {isSafe ? "Target Hit" : "Below Goal"}
                                  </span>
                                </div>
                              </div>
                              <div className="p-5 bg-white/5 rounded-[2rem] border border-white/5 relative overflow-hidden">
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Threshold</p>
                                <div className="flex items-center gap-2">
                                  <Target className="text-gray-400" size={18} />
                                  <span className="text-sm font-black text-white uppercase tracking-tight">{sub.threshold}% Set</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/5 space-y-4">
                              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Attendance Strategy</p>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-xs font-bold text-gray-400">If you miss next 2 classes:</span>
                                  <span className="text-red-400 font-black text-sm tracking-tighter">{(((sub.attendedClasses) / (sub.totalClasses + 2)) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-[1px] w-full bg-white/5" />
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-xs font-bold text-gray-400">If you attend next 3 classes:</span>
                                  <span className="text-blue-400 font-black text-sm tracking-tighter">{(((sub.attendedClasses + 3) / (sub.totalClasses + 3)) * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-blue-600/10 p-6 rounded-[2.5rem] border border-blue-500/20 space-y-5">
                              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Edit2 className="w-3 h-3" /> Manual Adjustment
                              </p>
                              <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                  <label className="block text-[9px] font-black text-blue-300/50 uppercase tracking-widest ml-1">Attended</label>
                                  <input 
                                    type="number" min="0"
                                    value={sub.initialAttendedClasses || 0}
                                    onChange={async (e) => {
                                      const newVal = Number(e.target.value) || 0;
                                      const currentMarkedAttended = sub.attendedClasses - (sub.initialAttendedClasses || 0);
                                      const currentMarkedTotal = sub.totalClasses - (sub.initialTotalClasses || 0);
                                      
                                      await db.subjects.update(sub.id, {
                                        initialAttendedClasses: newVal,
                                        attendedClasses: newVal + currentMarkedAttended
                                      });
                                    }}
                                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-white text-lg font-black outline-none text-center focus:border-blue-500 transition-colors"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[9px] font-black text-blue-300/50 uppercase tracking-widest ml-1">Total</label>
                                  <input 
                                    type="number" min="0"
                                    value={sub.initialTotalClasses || 0}
                                    onChange={async (e) => {
                                      const newVal = Number(e.target.value) || 0;
                                      const currentMarkedTotal = sub.totalClasses - (sub.initialTotalClasses || 0);
                                      
                                      await db.subjects.update(sub.id, {
                                        initialTotalClasses: newVal,
                                        totalClasses: newVal + currentMarkedTotal
                                      });
                                    }}
                                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-white text-lg font-black outline-none text-center focus:border-blue-500 transition-colors"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className={clsx(
                              "p-6 rounded-[2rem] border flex items-center gap-5 transition-all",
                              isSafe ? "bg-blue-600/10 border-blue-600/20 text-blue-400" : "bg-red-600/10 border-red-600/20 text-red-400"
                            )}>
                              <Info size={24} className="shrink-0" />
                              <p className="text-xs font-bold leading-relaxed">
                                {isSafe ? (
                                  <>You have a buffer of <span className="font-black text-white px-2 py-1 bg-white/10 rounded-lg mx-1">{Math.floor((100 * sub.attendedClasses - sub.threshold * sub.totalClasses) / sub.threshold)}</span> classes before you drop below your target.</>
                                ) : (
                                  <>You need to attend <span className="font-black text-white px-2 py-1 bg-white/10 rounded-lg mx-1">{Math.ceil((sub.threshold * sub.totalClasses - 100 * sub.attendedClasses) / (100 - sub.threshold))}</span> more classes to get back into the safe zone.</>
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              {DAYS.map((day, index) => {
                const dbDayIndex = (index + 1) % 7;
                const dayEntries = timetable?.filter(t => t.dayOfWeek === dbDayIndex) || [];
                
                return (
                  <div key={day} className="space-y-5">
                    <div className="flex items-center justify-between px-3">
                      <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-blue-500" />
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">{day}</h3>
                      </div>
                      <div className="relative">
                        <select 
                          className="opacity-0 absolute inset-0 cursor-pointer w-10 h-10 z-10"
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
                        <motion.div whileTap={{ scale: 0.9 }} className="w-10 h-10 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-blue-400 transition-colors hover:bg-white/10">
                          <Plus size={24} />
                        </motion.div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {dayEntries.length === 0 ? (
                        <div className="py-10 border-2 border-dashed border-white/5 rounded-[3rem] text-center bg-white/[0.02]">
                          <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.3em] italic">No lectures planned</p>
                        </div>
                      ) : (
                        dayEntries.map((entry, idx) => {
                          const subject = subjects?.find(s => s.id === entry.subjectId);
                          if (!subject) return null;
                          return (
                            <motion.div 
                              layout
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              key={entry.id} 
                              className="flex items-center justify-between p-6 bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/5 group active:bg-white/10 transition-all shadow-xl"
                            >
                              <div className="flex items-center gap-5">
                                <div className="w-12 h-12 bg-blue-600 text-white rounded-[1.25rem] flex items-center justify-center font-black text-sm shadow-lg shadow-blue-600/20">
                                  {idx + 1}
                                </div>
                                <div>
                                  <span className="font-black text-white text-lg tracking-tight block leading-tight">{subject.name}</span>
                                  <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1 block">Scheduled Session</span>
                                </div>
                              </div>
                              <motion.button 
                                whileTap={{ scale: 0.8 }}
                                onClick={() => handleDeleteTimetableEntry(entry.id)} 
                                className="p-3 text-gray-700 hover:text-red-400 bg-white/5 rounded-2xl border border-white/5 transition-all"
                              >
                                <Trash2 size={20} />
                              </motion.button>
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
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-[#0a0a0a] p-10 rounded-t-[4rem] sm:rounded-[4rem] w-full max-w-lg shadow-2xl border-t border-white/10 relative z-10 overflow-y-auto max-h-[90vh] hide-scrollbar"
            >
              <div className="w-16 h-2 bg-white/10 rounded-full mx-auto mb-10 sm:hidden" onClick={() => setIsModalOpen(false)} />
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">New Subject</h2>
                  <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-1">Add to your curriculum</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-3xl">
                  <XCircle size={32} />
                </button>
              </div>
              
              <form onSubmit={handleAddSubject} className="space-y-8">
                {semesters && semesters.length > 0 && (
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Academic Term</label>
                    <select 
                      required
                      value={formData.semesterId}
                      onChange={(e) => setFormData({...formData, semesterId: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-5 text-white focus:ring-4 focus:ring-blue-500/20 outline-none appearance-none font-bold text-lg shadow-inner"
                    >
                      {semesters.map(sem => (
                        <option key={sem.id} value={sem.id}>{sem.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Subject Nomenclature</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-5 text-white focus:ring-4 focus:ring-blue-500/20 outline-none font-black text-xl placeholder:text-gray-900 shadow-inner uppercase tracking-tighter"
                    placeholder="e.g. THERMODYNAMICS"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Credit Weight</label>
                    <input 
                      type="number" 
                      required min="0" max="10"
                      value={formData.credits}
                      onChange={(e) => setFormData({...formData, credits: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-5 text-white focus:ring-4 focus:ring-blue-500/20 outline-none font-black text-2xl text-center shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Target %</label>
                    <input 
                      type="number" 
                      required min="1" max="100"
                      value={formData.threshold}
                      onChange={(e) => setFormData({...formData, threshold: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-5 text-white focus:ring-4 focus:ring-blue-500/20 outline-none font-black text-2xl text-center shadow-inner"
                    />
                  </div>
                </div>

                <div className="bg-blue-600/5 p-8 rounded-[3rem] border border-blue-500/10 space-y-6 shadow-inner">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-3">
                    <Clock size={14} /> Resume Trackify (Initial)
                  </p>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[9px] font-black text-blue-300/40 uppercase tracking-widest ml-1 text-center">Attended</label>
                      <input 
                        type="number" min="0"
                        value={formData.initialAttended}
                        onChange={e => setFormData({ ...formData, initialAttended: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-white text-xl font-black outline-none text-center focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[9px] font-black text-blue-300/40 uppercase tracking-widest ml-1 text-center">Total</label>
                      <input 
                        type="number" min="0"
                        value={formData.initialTotal}
                        onChange={e => setFormData({ ...formData, initialTotal: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-white text-xl font-black outline-none text-center focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-6 bg-blue-600 text-white rounded-[2.5rem] transition-all font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-600/40 active:scale-[0.98] mt-4 text-lg hover:bg-blue-500"
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
