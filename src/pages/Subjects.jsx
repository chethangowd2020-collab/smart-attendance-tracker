import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import {
  Plus, X, BookOpen, ChevronDown, ChevronUp, Clock,
  CheckCircle2, AlertCircle, Target, Edit2, Zap, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Subjects() {
  const [activeTab, setActiveTab] = useState('subjects');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);
  const [manualAttended, setManualAttended] = useState('');
  const [manualTotal, setManualTotal] = useState('');
  const [formData, setFormData] = useState({
    name: '', credits: 3, threshold: 75, semesterId: '',
    initialTotal: 0, initialAttended: 0
  });

  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const settings = useLiveQuery(() => db.settings.get(1), []);
  const semesters = useLiveQuery(() => db.semesters.toArray(), []);
  const timetable = useLiveQuery(() => db.timetable.toArray(), []);

  const handleOpenModal = () => {
    if (semesters?.length > 0 && !formData.semesterId) {
      setFormData(p => ({ ...p, semesterId: semesters[0].id, threshold: settings?.defaultThreshold || 75 }));
    }
    setIsModalOpen(true);
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!semesters || semesters.length === 0) {
      toast.error('Create a semester in Academics first');
      return;
    }
    const semId = formData.semesterId ? Number(formData.semesterId) : semesters[0].id;
    if (subjects?.find(s => s.name.toLowerCase() === formData.name.toLowerCase() && s.semesterId === semId)) {
      toast.error('Subject already exists in this semester');
      return;
    }
    try {
      await db.subjects.add({
        semesterId: semId,
        name: formData.name.toUpperCase(),
        credits: Number(formData.credits),
        totalClasses: Number(formData.initialTotal) || 0,
        attendedClasses: Number(formData.initialAttended) || 0,
        initialTotalClasses: Number(formData.initialTotal) || 0,
        initialAttendedClasses: Number(formData.initialAttended) || 0,
        threshold: Number(formData.threshold),
        gradingScaleId: 1
      });
      toast.success('Subject added!');
      setFormData({ name: '', credits: 3, threshold: settings?.defaultThreshold || 75, semesterId: semId, initialTotal: 0, initialAttended: 0 });
      setIsModalOpen(false);
    } catch { toast.error('Failed to add subject'); }
  };

  const handleDeleteSubject = async (id) => {
    if (!confirm('Delete subject? All attendance and marks will be permanently lost.')) return;
    try {
      await db.subjects.delete(id);
      await db.attendance_records.where('subjectId').equals(id).delete();
      await db.marks.where('subjectId').equals(id).delete();
      await db.timetable.where('subjectId').equals(id).delete();
      setExpandedSubjectId(null);
      toast.success('Subject deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleManualUpdate = async (sub) => {
    const a = Number(manualAttended);
    const t = Number(manualTotal);
    if (isNaN(a) || isNaN(t) || a < 0 || t < 0 || a > t) {
      toast.error('Invalid values — attended cannot exceed total');
      return;
    }
    await db.subjects.update(sub.id, { attendedClasses: a, totalClasses: t });
    toast.success('Attendance updated');
  };

  const handleAddTimetableEntry = async (dayOfWeek, subjectId) => {
    if (!subjectId) return;
    try {
      await db.timetable.add({ dayOfWeek, subjectId: Number(subjectId) });
      toast.success('Added to schedule');
    } catch { toast.error('Failed'); }
  };

  const handleDeleteTimetableEntry = async (id) => {
    try { await db.timetable.delete(id); }
    catch { toast.error('Failed'); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto px-4 py-6 pb-32 bg-white dark:bg-[#020617] transition-colors">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">Subjects</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-0.5 uppercase tracking-widest">Manage Curriculum</p>
        </div>
        {activeTab === 'subjects' && (
          <motion.button
            whileHover={{ scale: 1.08, rotate: 90 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleOpenModal}
            className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-600/30 text-white"
          >
            <Plus size={28} strokeWidth={2.5} />
          </motion.button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex p-1.5 bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.07] rounded-2xl">
        {[
          { id: 'subjects', label: 'Subjects', icon: BookOpen },
          { id: 'timetable', label: 'Schedule', icon: Calendar },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all',
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20'
                : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'subjects' ? (
          <motion.div key="subjects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {!subjects || subjects.length === 0 ? (
              <div className="text-center py-20 bg-zinc-50 dark:bg-white/[0.02] rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-white/5">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-white/[0.04] rounded-3xl flex items-center justify-center mx-auto mb-5">
                  <BookOpen size={28} className="text-zinc-400" />
                </div>
                <p className="text-zinc-500 font-black uppercase tracking-widest text-sm">No subjects yet</p>
                <button onClick={handleOpenModal} className="mt-5 px-6 py-2.5 bg-emerald-600/10 border border-emerald-600/20 rounded-full text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all">
                  Add First Subject
                </button>
              </div>
            ) : subjects.map((sub, i) => {
              const pct = sub.totalClasses === 0 ? 0 : (sub.attendedClasses / sub.totalClasses) * 100;
              const isSafe = pct >= sub.threshold;
              const isExpanded = expandedSubjectId === sub.id;
              const canBunk = isSafe ? Math.floor((100 * sub.attendedClasses - sub.threshold * sub.totalClasses) / sub.threshold) : 0;
              const needed = !isSafe && sub.totalClasses > 0 ? Math.ceil((sub.threshold * sub.totalClasses - 100 * sub.attendedClasses) / (100 - sub.threshold)) : 0;

              return (
                <motion.div layout key={sub.id} className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.06] rounded-[2rem] overflow-hidden shadow-sm">
                  {/* Card header — clickable */}
                  <div
                    className="p-6 cursor-pointer"
                    onClick={() => {
                      setExpandedSubjectId(isExpanded ? null : sub.id);
                      setManualAttended(String(sub.attendedClasses));
                      setManualTotal(String(sub.totalClasses));
                    }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className={clsx(
                        'w-14 h-14 rounded-2xl flex items-center justify-center font-black text-base border-2 shrink-0 transition-all',
                        isSafe
                          ? 'bg-emerald-600/10 border-emerald-600/30 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-600/10'
                          : 'bg-red-600/10 border-red-600/30 text-red-400 shadow-lg shadow-red-600/10'
                      )}>
                        {Math.round(pct)}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-black text-zinc-900 dark:text-white tracking-tight truncate">{sub.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">{sub.attendedClasses}/{sub.totalClasses} classes</span>
                          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600">•</span>
                          <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">{sub.credits} credits</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={18} className="text-zinc-400 shrink-0" /> : <ChevronDown size={18} className="text-zinc-400 shrink-0" />}
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-zinc-200 dark:bg-white/[0.05] rounded-full overflow-hidden mb-2">
                      <div
                        className={clsx('h-full rounded-full transition-all', isSafe ? 'bg-emerald-500' : 'bg-red-500')}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>

                    {/* Status badge */}
                    <div className={clsx(
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border mt-1',
                      isSafe ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                    )}>
                      {isSafe ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                      {isSafe
                        ? (canBunk === 0 ? "Don't miss next class" : `Can bunk ${canBunk} classes`)
                        : `Attend ${needed} more to reach ${sub.threshold}%`}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-white/[0.05]"
                      >
                        <div className="p-6 space-y-5 bg-white/[0.01]">
                          {/* Stats row */}
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: 'Attended', value: sub.attendedClasses, color: 'text-green-600 dark:text-green-400' },
                              { label: 'Total', value: sub.totalClasses, color: 'dark:text-white text-zinc-900' },
                              { label: 'Credits', value: sub.credits, color: 'text-purple-600 dark:text-purple-400' },
                            ].map(s => (
                              <div key={s.label} className="bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] rounded-2xl p-3 text-center">
                                <p className={clsx('text-xl font-black', s.color)}>{s.value}</p>
                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-0.5">{s.label}</p>
                              </div>
                            ))}
                          </div>

                          <div className="bg-purple-600/[0.06] border border-purple-600/[0.15] rounded-2xl p-4 space-y-3">
                            <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                              <Edit2 size={11} /> Manual Adjustment
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Classes Attended</label>
                                <input
                                  type="number" min="0"
                                  value={manualAttended}
                                  onChange={e => setManualAttended(e.target.value)}
                                  className="w-full bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-zinc-900 dark:text-white text-sm font-bold outline-none focus:border-purple-500/50 transition-all"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Total Classes</label>
                                <input
                                  type="number" min="0"
                                  value={manualTotal}
                                  onChange={e => setManualTotal(e.target.value)}
                                  className="w-full bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-zinc-900 dark:text-white text-sm font-bold outline-none focus:border-purple-500/50 transition-all"
                                />
                              </div>
                            </div>
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleManualUpdate(sub)}
                              className="w-full py-2.5 bg-purple-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-purple-600/20"
                            >
                              Save Adjustment
                            </motion.button>
                          </div>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteSubject(sub.id)}
                            className="w-full py-2.5 border border-red-500/20 text-red-600 dark:text-red-400/70 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all"
                          >
                            Delete Subject
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          /* Timetable Tab */
          <motion.div key="timetable" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {DAYS.map((day, dayIndex) => {
              const daySlots = timetable?.filter(t => t.dayOfWeek === dayIndex) || [];
              return (
                <div key={day} className="bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.06] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">{day}</p>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/[0.04] px-2.5 py-1 rounded-full border border-zinc-200 dark:border-white/[0.06]">
                      {daySlots.length} classes
                    </span>
                  </div>

                  {daySlots.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {daySlots.map(slot => {
                        const sub = subjects?.find(s => s.id === slot.subjectId);
                        return (
                          <div key={slot.id} className="flex items-center justify-between bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] rounded-xl px-4 py-2.5">
                            <span className="text-sm font-bold text-zinc-900 dark:text-white">{sub?.name || 'Unknown'}</span>
                            <button onClick={() => handleDeleteTimetableEntry(slot.id)} className="p-1">
                              <X size={14} className="text-gray-600 hover:text-red-400 transition-colors" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <select
                    onChange={e => { if (e.target.value) { handleAddTimetableEntry(dayIndex, e.target.value); e.target.value = ''; } }}
                    className="w-full bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.07] rounded-xl px-4 py-2.5 text-zinc-500 text-xs font-black uppercase tracking-widest outline-none focus:border-emerald-500/40 cursor-pointer"
                    defaultValue=""
                  >
                    <option value="">+ Add class on {day}</option>
                    {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Subject Modal (bottom sheet) ── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-950 rounded-t-[3rem] border-t border-zinc-200 dark:border-white/[0.08] p-8 pb-12 scrollbar-hide overflow-y-auto max-h-[90vh]"
            >
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-white/10 rounded-full mx-auto mb-8" />
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">New Subject</h2>
                  <p className="text-zinc-500 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Add to Curriculum</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 bg-zinc-100 dark:bg-white/[0.05] rounded-2xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/[0.07]">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddSubject} className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-widest block mb-2">Subject Name</label>
                  <input
                    type="text" required
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Data Structures"
                    className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] rounded-2xl px-5 py-3.5 text-zinc-900 dark:text-white font-bold outline-none focus:border-emerald-500/50 placeholder:text-zinc-400 dark:placeholder:text-zinc-800 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-widest block mb-2">Credits</label>
                    <input type="number" min="1" max="10"
                      value={formData.credits}
                      onChange={e => setFormData(p => ({ ...p, credits: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] rounded-2xl px-5 py-3.5 text-zinc-900 dark:text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-widest block mb-2">Threshold %</label>
                    <input type="number" min="1" max="100"
                      value={formData.threshold}
                      onChange={e => setFormData(p => ({ ...p, threshold: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] rounded-2xl px-5 py-3.5 text-zinc-900 dark:text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                {semesters && semesters.length > 1 && (
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-widest block mb-2">Semester</label>
                    <select
                      value={formData.semesterId}
                      onChange={e => setFormData(p => ({ ...p, semesterId: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] rounded-2xl px-5 py-3.5 text-zinc-900 dark:text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
                    >
                      {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Mid-term starter — prominent section */}
                <div className="bg-orange-500/[0.06] border border-orange-500/20 rounded-2xl p-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                      <Zap size={10} /> Mid-Semester Starter
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-600 mt-1">Already attended some classes? Enter your current counts below so your percentage is accurate from day one.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Classes Attended So Far</label>
                      <input
                        type="number" min="0"
                        value={formData.initialAttended}
                        onChange={e => setFormData(p => ({ ...p, initialAttended: e.target.value }))}
                        placeholder="0"
                        className="w-full bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white font-bold outline-none focus:border-orange-500/40 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Total Classes Held So Far</label>
                      <input
                        type="number" min="0"
                        value={formData.initialTotal}
                        onChange={e => setFormData(p => ({ ...p, initialTotal: e.target.value }))}
                        placeholder="0"
                        className="w-full bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white font-bold outline-none focus:border-orange-500/40 transition-all"
                      />
                    </div>
                  </div>
                  {formData.initialTotal > 0 && (
                    <p className="text-[10px] font-black text-orange-300">
                      Starting at: {Math.round((Number(formData.initialAttended) / Number(formData.initialTotal)) * 100)}%
                    </p>
                  )}
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  className="w-full py-4 bg-emerald-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-2xl shadow-emerald-600/30 mt-2"
                >
                  Add Subject
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
