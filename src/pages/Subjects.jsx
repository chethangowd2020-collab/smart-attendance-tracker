import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import {
  Plus, Trash2, X, BookOpen, ChevronDown, ChevronUp,
  Target, Edit2, Clock, CheckCircle2, AlertCircle, Grid, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const gradients = [
  'from-[#f09433] via-[#e6683c] to-[#bc1888]',
  'from-[#405de6] via-[#5851db] to-[#833ab4]',
  'from-[#fcb045] via-[#fd1d1d] to-[#833ab4]',
  'from-[#12c2e9] via-[#c471ed] to-[#f64f59]',
  'from-[#43e97b] to-[#38f9d7]',
  'from-[#f093fb] to-[#f5576c]',
  'from-[#4facfe] to-[#00f2fe]',
  'from-[#fa709a] to-[#fee140]',
];

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
      setFormData(p => ({ ...p, semesterId: semesters[0].id }));
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
      toast.error('Subject already exists');
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
      toast.success('Subject added');
      setFormData({ name: '', credits: 3, threshold: settings?.defaultThreshold || 75, semesterId: semId, initialTotal: 0, initialAttended: 0 });
      setIsModalOpen(false);
    } catch { toast.error('Failed to add subject'); }
  };

  const handleDeleteSubject = async (id) => {
    if (!confirm('Delete subject? All attendance and marks will be lost.')) return;
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
      toast.error('Invalid values');
      return;
    }
    await db.subjects.update(sub.id, { attendedClasses: a, totalClasses: t });
    toast.success('Updated');
  };

  const handleAddTimetableEntry = async (dayOfWeek, subjectId) => {
    if (!subjectId) return;
    try {
      await db.timetable.add({ dayOfWeek, subjectId: Number(subjectId) });
      toast.success('Added to schedule');
    } catch { toast.error('Failed'); }
  };

  const handleDeleteTimetableEntry = async (id) => {
    try {
      await db.timetable.delete(id);
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="max-w-[470px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#262626]">
        <div>
          <h1 className="text-xl font-bold text-white">Subjects</h1>
          <p className="text-xs text-[#737373]">{subjects?.length || 0} courses</p>
        </div>
        {activeTab === 'subjects' && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleOpenModal}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center"
          >
            <Plus size={20} strokeWidth={2.5} className="text-black" />
          </motion.button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#262626]">
        {[
          { id: 'subjects', label: 'Subjects', icon: BookOpen },
          { id: 'timetable', label: 'Schedule', icon: Clock },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-all',
              activeTab === tab.id
                ? 'border-white text-white'
                : 'border-transparent text-[#737373] hover:text-white'
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'subjects' ? (
          <motion.div
            key="subjects"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {!subjects || subjects.length === 0 ? (
              <div className="py-20 text-center px-8">
                <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen size={28} className="text-[#555]" />
                </div>
                <p className="text-white font-semibold mb-1">No subjects yet</p>
                <p className="text-[#737373] text-sm mb-5">Add your first subject to start tracking</p>
                <button
                  onClick={handleOpenModal}
                  className="px-6 py-2 bg-white text-black rounded-lg text-sm font-semibold"
                >
                  Add Subject
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#262626]">
                {subjects.map((sub, i) => {
                  const pct = sub.totalClasses === 0 ? 0 : (sub.attendedClasses / sub.totalClasses) * 100;
                  const isSafe = pct >= sub.threshold;
                  const isExpanded = expandedSubjectId === sub.id;
                  const canBunk = isSafe
                    ? Math.floor((100 * sub.attendedClasses - sub.threshold * sub.totalClasses) / sub.threshold)
                    : 0;
                  const needed = !isSafe && sub.totalClasses > 0
                    ? Math.ceil((sub.threshold * sub.totalClasses - 100 * sub.attendedClasses) / (100 - sub.threshold))
                    : 0;

                  return (
                    <motion.div layout key={sub.id}>
                      {/* Subject Row (Instagram post header style) */}
                      <div
                        className="flex items-center px-4 py-4 gap-3 cursor-pointer active:bg-[#111] transition-colors"
                        onClick={() => {
                          setExpandedSubjectId(isExpanded ? null : sub.id);
                          setManualAttended(String(sub.attendedClasses));
                          setManualTotal(String(sub.totalClasses));
                        }}
                      >
                        {/* Avatar ring with gradient */}
                        <div className={clsx(
                          'w-14 h-14 rounded-full p-[2.5px] shrink-0 bg-gradient-to-tr',
                          isSafe ? gradients[i % gradients.length] : 'bg-[#333]'
                        )}>
                          <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                            <span className={clsx('text-sm font-bold', isSafe ? 'text-white' : 'text-red-400')}>
                              {Math.round(pct)}%
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{sub.name}</p>
                          <p className="text-xs text-[#737373]">
                            {sub.attendedClasses}/{sub.totalClasses} classes •{' '}
                            <span className={isSafe ? 'text-green-400' : 'text-red-400'}>
                              {isSafe
                                ? canBunk === 0 ? "Don't miss next" : `Can skip ${canBunk}`
                                : `Attend ${needed} more`}
                            </span>
                          </p>
                        </div>

                        {/* Progress bar */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[#737373] text-xs">{sub.credits}cr</span>
                          {isExpanded ? <ChevronUp size={16} className="text-[#737373]" /> : <ChevronDown size={16} className="text-[#737373]" />}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="px-4 pb-3">
                        <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className={clsx('h-full rounded-full transition-all', isSafe ? 'bg-green-400' : 'bg-red-400')}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-[#555]">0%</span>
                          <span className="text-[10px] text-[#555]">Target: {sub.threshold}%</span>
                          <span className="text-[10px] text-[#555]">100%</span>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-[#262626]"
                          >
                            <div className="px-4 py-4 space-y-4 bg-[#0a0a0a]">
                              {/* Stats row */}
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { label: 'Attended', value: sub.attendedClasses, color: 'text-green-400' },
                                  { label: 'Total', value: sub.totalClasses, color: 'text-white' },
                                  { label: 'Credits', value: sub.credits, color: 'text-blue-400' },
                                ].map(s => (
                                  <div key={s.label} className="bg-[#1a1a1a] rounded-xl p-3 text-center">
                                    <p className={clsx('text-lg font-bold', s.color)}>{s.value}</p>
                                    <p className="text-[10px] text-[#555] mt-0.5">{s.label}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Manual update */}
                              <div>
                                <p className="text-xs text-[#737373] font-semibold mb-2">Manual Adjustment</p>
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    value={manualAttended}
                                    onChange={e => setManualAttended(e.target.value)}
                                    placeholder="Attended"
                                    className="flex-1 bg-[#1a1a1a] border border-[#363636] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#555]"
                                  />
                                  <input
                                    type="number"
                                    value={manualTotal}
                                    onChange={e => setManualTotal(e.target.value)}
                                    placeholder="Total"
                                    className="flex-1 bg-[#1a1a1a] border border-[#363636] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#555]"
                                  />
                                  <button
                                    onClick={() => handleManualUpdate(sub)}
                                    className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteSubject(sub.id)}
                                className="w-full py-2.5 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/10 transition-colors"
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
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="timetable"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="divide-y divide-[#262626]"
          >
            {DAYS.map((day, dayIndex) => {
              const daySlots = timetable?.filter(t => t.dayOfWeek === dayIndex) || [];
              return (
                <div key={day} className="px-4 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white font-semibold text-sm">{day}</p>
                    <span className="text-xs text-[#737373]">{daySlots.length} classes</span>
                  </div>

                  {daySlots.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {daySlots.map(slot => {
                        const sub = subjects?.find(s => s.id === slot.subjectId);
                        return (
                          <div key={slot.id} className="flex items-center justify-between bg-[#1a1a1a] rounded-xl px-3 py-2.5">
                            <span className="text-sm text-white">{sub?.name || 'Unknown'}</span>
                            <button onClick={() => handleDeleteTimetableEntry(slot.id)}>
                              <X size={16} className="text-[#737373] hover:text-red-400 transition-colors" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <select
                    onChange={e => { if (e.target.value) { handleAddTimetableEntry(dayIndex, e.target.value); e.target.value = ''; } }}
                    className="w-full bg-[#1a1a1a] border border-[#363636] rounded-xl px-3 py-2 text-[#737373] text-sm outline-none focus:border-[#555]"
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

      <div className="h-6" />

      {/* ── Add Subject Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-[470px] bg-[#111] rounded-t-3xl border-t border-[#262626] p-6 pb-10"
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-[#363636] rounded-full mx-auto mb-6" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">New Subject</h2>
                <button onClick={() => setIsModalOpen(false)}>
                  <X size={22} className="text-[#737373]" />
                </button>
              </div>

              <form onSubmit={handleAddSubject} className="space-y-4">
                <div>
                  <label className="text-xs text-[#737373] mb-1 block">Subject name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Data Structures"
                    className="w-full bg-[#1a1a1a] border border-[#363636] rounded-xl px-4 py-3 text-white outline-none focus:border-[#555]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#737373] mb-1 block">Credits</label>
                    <input
                      type="number" min="1" max="10"
                      value={formData.credits}
                      onChange={e => setFormData(p => ({ ...p, credits: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#363636] rounded-xl px-4 py-3 text-white outline-none focus:border-[#555]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#737373] mb-1 block">Threshold %</label>
                    <input
                      type="number" min="1" max="100"
                      value={formData.threshold}
                      onChange={e => setFormData(p => ({ ...p, threshold: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#363636] rounded-xl px-4 py-3 text-white outline-none focus:border-[#555]"
                    />
                  </div>
                </div>

                {semesters && semesters.length > 1 && (
                  <div>
                    <label className="text-xs text-[#737373] mb-1 block">Semester</label>
                    <select
                      value={formData.semesterId}
                      onChange={e => setFormData(p => ({ ...p, semesterId: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#363636] rounded-xl px-4 py-3 text-white outline-none focus:border-[#555]"
                    >
                      {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#737373] mb-1 block">Initial classes attended</label>
                    <input
                      type="number" min="0"
                      value={formData.initialAttended}
                      onChange={e => setFormData(p => ({ ...p, initialAttended: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#363636] rounded-xl px-4 py-3 text-white outline-none focus:border-[#555]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#737373] mb-1 block">Initial total classes</label>
                    <input
                      type="number" min="0"
                      value={formData.initialTotal}
                      onChange={e => setFormData(p => ({ ...p, initialTotal: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#363636] rounded-xl px-4 py-3 text-white outline-none focus:border-[#555]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-white text-black font-bold rounded-xl text-sm mt-2"
                >
                  Add Subject
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
