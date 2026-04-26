import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { 
  Plus, ChevronDown, ChevronUp, Save, GraduationCap, 
  Download, TrendingUp, Award, Target, XCircle, Trash2,
  PieChart, BarChart3, Star
} from 'lucide-react';
import { calculateSGPA, calculateCGPA, calculateSubjectTotal, calculateGrade } from '../utils/academicUtils';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import clsx from 'clsx';

export default function Academics() {
  const [activeSemesterId, setActiveSemesterId] = useState(null);
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [semesterForm, setSemesterForm] = useState({ name: '', targetSgpa: 8.5 });
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef(null);

  const settings = useLiveQuery(() => db.settings.get(1), []);
  const semesters = useLiveQuery(() => db.semesters.toArray(), []);
  const allSubjects = useLiveQuery(() => db.subjects.toArray(), []);
  const allMarks = useLiveQuery(() => db.marks.toArray(), []);

  // Initialize active semester
  if (semesters?.length > 0 && activeSemesterId === null) {
    setActiveSemesterId(semesters[0].id);
  }

  const activeSemester = semesters?.find(s => s.id === activeSemesterId);
  const activeSubjects = allSubjects?.filter(s => s.semesterId === activeSemesterId) || [];
  
  const gradingScale = settings?.gradingScale || [];
  const sgpa = activeSemester && allSubjects && allMarks && settings ? calculateSGPA(activeSubjects, allMarks, gradingScale) : 0;
  const cgpa = semesters && allSubjects && allMarks && settings ? calculateCGPA(semesters, allSubjects, allMarks, gradingScale) : 0;

  const handleAddSemester = async (e) => {
    e.preventDefault();
    try {
      await db.semesters.add({
        name: semesterForm.name.toUpperCase(),
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString(),
        targetSgpa: Number(semesterForm.targetSgpa)
      });
      toast.success("Semester added successfully!");
      setSemesterForm({ name: '', targetSgpa: 8.5 });
      setIsModalOpen(false);
    } catch (e) {
      toast.error("Failed to add semester");
    }
  };

  const handleDeleteSemester = async (id) => {
    if (confirm('Delete this semester? All associated subjects, marks, and attendance records will be permanently lost.')) {
      try {
        await db.transaction('rw', [db.semesters, db.subjects, db.attendance_records, db.marks, db.timetable], async () => {
          const subjectsToDelete = await db.subjects.where('semesterId').equals(id).toArray();
          const subjectIds = subjectsToDelete.map(s => s.id);
          
          await db.attendance_records.where('subjectId').anyOf(subjectIds).delete();
          await db.marks.where('subjectId').anyOf(subjectIds).delete();
          await db.timetable.where('subjectId').anyOf(subjectIds).delete();
          await db.subjects.where('semesterId').equals(id).delete();
          await db.semesters.delete(id);
        });
        
        if (activeSemesterId === id) {
          setActiveSemesterId(null);
        }
        toast.success('Semester deleted');
      } catch (e) {
        toast.error('Failed to delete semester');
      }
    }
  };

  const handleMarkChange = async (subjectId, type, obtainedMarks) => {
    const existingMark = allMarks?.find(m => m.subjectId === subjectId && m.type === type);
    try {
      if (existingMark) {
        await db.marks.update(existingMark.id, { obtainedMarks: Number(obtainedMarks) });
      } else {
        await db.marks.add({
          subjectId,
          type,
          maxMarks: type === 'semExam' ? 100 : (type === 'internal' ? 30 : 20),
          obtainedMarks: Number(obtainedMarks)
        });
      }
      toast.success("Marks synchronized", { id: `mark-${subjectId}-${type}`, icon: '⚡' });
    } catch (e) {
      toast.error("Sync failed");
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const loadingToast = toast.loading("Generating Academic Transcript...");
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#0a0a0a',
        logging: false,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Trackify_Transcript_${activeSemester?.name || 'Overview'}.pdf`);
      toast.success("Transcript Saved", { id: loadingToast });
    } catch (error) {
      toast.error("Generation failed", { id: loadingToast });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-2xl mx-auto pb-32"
    >
      <header className="flex items-center justify-between px-3">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-1">PERFORMANCE</h1>
          <p className="text-gray-500 font-black text-[10px] uppercase tracking-[0.3em]">Academic Analytics</p>
        </div>
        <div className="flex gap-3">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportPDF}
            disabled={isExporting || !semesters?.length}
            className="w-14 h-14 glass-card rounded-[1.5rem] flex items-center justify-center text-blue-400 border border-white/5 active:bg-blue-600 active:text-white transition-all disabled:opacity-20"
          >
            <Download size={22} />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05, rotate: 90 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsModalOpen(true)}
            className="w-14 h-14 bg-blue-600 shadow-2xl shadow-blue-600/30 text-white rounded-[1.5rem] flex items-center justify-center transition-all"
          >
            <Plus size={32} strokeWidth={3} />
          </motion.button>
        </div>
      </header>

      {/* Semester Selector */}
      <div className="px-3">
        <AnimatePresence>
          {semesters?.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar"
            >
              {semesters.map(sem => (
                <div key={sem.id} className="relative flex-shrink-0">
                  <button
                    onClick={() => setActiveSemesterId(sem.id)}
                    className={clsx(
                      "px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-500 border relative overflow-hidden",
                      activeSemesterId === sem.id 
                        ? "bg-white text-black border-white shadow-2xl shadow-white/10" 
                        : "bg-white/5 text-gray-600 border-white/5 hover:bg-white/10"
                    )}
                  >
                    {sem.name}
                    {activeSemesterId === sem.id && (
                      <motion.div layoutId="sem-pill" className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    )}
                  </button>
                  {activeSemesterId === sem.id && (
                    <motion.button 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={(e) => { e.stopPropagation(); handleDeleteSemester(sem.id); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                    >
                      <Trash2 size={10} />
                    </motion.button>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div ref={reportRef} className="space-y-8 px-3">
        {/* GPA Dashboard */}
        <div className="grid grid-cols-2 gap-6">
          <motion.div 
            whileHover={{ y: -8 }}
            className="glass-card p-8 rounded-[3rem] border border-white/5 relative overflow-hidden group shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-600/20 transition-all duration-700" />
            <div className="relative z-10 flex flex-col items-center">
              <Star className="text-blue-500/30 mb-4" size={24} />
              <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Aggregate CGPA</p>
              <p className="text-5xl font-black text-white tracking-tighter">{cgpa}</p>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -8 }}
            className="glass-card p-8 rounded-[3rem] border border-white/5 relative overflow-hidden group shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-600/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-green-600/20 transition-all duration-700" />
            <div className="relative z-10 flex flex-col items-center">
              <TrendingUp className="text-green-500/30 mb-4" size={24} />
              <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Semester SGPA</p>
              <p className="text-5xl font-black text-white tracking-tighter">{sgpa}</p>
              {activeSemester?.targetSgpa && (
                <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                   <Target size={12} className="text-green-500" />
                   <span className="text-[10px] font-black text-green-500 uppercase">{activeSemester.targetSgpa} GOAL</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Subjects & Marks */}
        <div className="space-y-5">
          <div className="flex items-center justify-between px-3">
            <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] flex items-center gap-2">
              <BarChart3 size={14} /> Course Progression
            </h2>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{activeSubjects.length} Registered</span>
          </div>

          <AnimatePresence mode="popLayout">
            {activeSubjects.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24 glass-card rounded-[4rem] border-2 border-dashed border-white/5"
              >
                <div className="bg-white/5 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                  <GraduationCap size={40} className="text-gray-800" />
                </div>
                <p className="text-gray-600 text-sm font-black uppercase tracking-[0.2em]">Academic Vault Empty</p>
                <p className="text-gray-800 text-[10px] font-bold mt-2 uppercase">Define courses in curriculum first</p>
              </motion.div>
            ) : (
              activeSubjects.map((sub, index) => {
                const subMarks = allMarks?.filter(m => m.subjectId === sub.id) || [];
                const total = calculateSubjectTotal(subMarks);
                const grade = settings ? calculateGrade(total, settings.gradingScale) : null;
                const isExpanded = expandedSubjectId === sub.id || isExporting;

                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={sub.id} 
                    className="glass-card rounded-[3rem] overflow-hidden border border-white/5 group relative"
                  >
                    <div 
                      className="p-8 flex items-center justify-between cursor-pointer group-hover:bg-white/[0.02] transition-all"
                      onClick={() => setExpandedSubjectId(isExpanded ? null : sub.id)}
                    >
                      <div className="flex items-center gap-6">
                        <div className={clsx(
                          "w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-xl border-2 shrink-0 transition-all duration-500",
                          total >= 40 
                            ? "bg-blue-600/10 border-blue-600/30 text-blue-400 shadow-xl shadow-blue-600/10" 
                            : "bg-red-600/10 border-red-600/30 text-red-400 shadow-xl shadow-red-600/10"
                        )}>
                          {grade?.grade || 'F'}
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white tracking-tighter mb-2">{sub.name}</h3>
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                              {sub.credits} Units
                            </span>
                            <span className="w-1 h-1 bg-gray-800 rounded-full" />
                            <span className={clsx(
                              "text-[9px] font-black uppercase tracking-widest",
                              total >= 40 ? "text-blue-500" : "text-red-500"
                            )}>
                              {total >= 40 ? 'Passing' : 'Critical'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-3xl font-black text-white leading-none mb-1">{total}</p>
                          <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Aggregate / 100</p>
                        </div>
                        {!isExporting && (
                          <motion.div 
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            className="p-3 bg-white/5 rounded-2xl text-gray-700 border border-white/5"
                          >
                            <ChevronDown size={20} />
                          </motion.div>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-8 pb-8 pt-2 border-t border-white/5 bg-white/[0.01] space-y-6"
                        >
                          <div className="grid grid-cols-3 gap-4">
                            {[
                              { label: 'Internals', type: 'internal', max: 30 },
                              { label: 'Assignment', type: 'assignment', max: 20 },
                              { label: 'End Exam', type: 'semExam', max: 50 }
                            ].map(markType => (
                              <div key={markType.type} className="space-y-2">
                                <label className="block text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">{markType.label}</label>
                                <div className="relative">
                                  <input 
                                    type="number" 
                                    value={subMarks.find(m => m.type === markType.type)?.obtainedMarks || ''}
                                    onChange={(e) => handleMarkChange(sub.id, markType.type, e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-lg text-white font-black focus:ring-4 focus:ring-blue-600/20 outline-none text-center shadow-inner transition-all"
                                    placeholder="0"
                                  />
                                  <span className="absolute top-1/2 right-4 -translate-y-1/2 text-[8px] font-black text-gray-800 uppercase">/{markType.max}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-black text-gray-700 uppercase tracking-widest px-1">
                            <div className="flex items-center gap-2 text-blue-500/50">
                              <Save size={12} /> Live Synchronization
                            </div>
                            <div className="flex items-center gap-2">
                              <Star size={12} className="text-yellow-500/50" />
                              <span>Computed Grade: <span className="text-white ml-1">{grade?.grade || 'N/A'}</span></span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Add Semester Modal */}
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
              className="bg-[#0a0a0a] p-12 rounded-t-[4rem] sm:rounded-[4rem] w-full max-w-lg shadow-2xl border-t border-white/10 relative z-10"
            >
              <div className="w-16 h-2 bg-white/10 rounded-full mx-auto mb-10 sm:hidden" onClick={() => setIsModalOpen(false)} />
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">New Term</h2>
                  <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-1">Start a fresh academic session</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-3xl">
                  <XCircle size={32} />
                </button>
              </div>
              <form onSubmit={handleAddSemester} className="space-y-8">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Academic Identifier</label>
                  <input 
                    type="text" 
                    required
                    value={semesterForm.name}
                    onChange={(e) => setSemesterForm({...semesterForm, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-6 text-white focus:ring-4 focus:ring-blue-600/20 outline-none font-black text-xl placeholder:text-gray-900 shadow-inner uppercase tracking-tighter"
                    placeholder="e.g. SEMESTER 4"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Target SGPA Index</label>
                  <input 
                    type="number" 
                    required min="1" max="10" step="0.1"
                    value={semesterForm.targetSgpa}
                    onChange={(e) => setSemesterForm({...semesterForm, targetSgpa: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-6 text-white focus:ring-4 focus:ring-blue-600/20 outline-none font-black text-4xl text-center shadow-inner tracking-tighter"
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-6 bg-blue-600 text-white rounded-[2.5rem] transition-all font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-600/40 active:scale-[0.98] mt-4 text-lg hover:bg-blue-500"
                >
                  Establish Term
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
