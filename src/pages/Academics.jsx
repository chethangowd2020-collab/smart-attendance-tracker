import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, ChevronDown, ChevronUp, Save, GraduationCap, Download, TrendingUp, Award, Target, XCircle, Trash2 } from 'lucide-react';
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
        name: semesterForm.name,
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
      toast.success("Marks saved", { id: `mark-${subjectId}-${type}` });
    } catch (e) {
      toast.error("Failed to save marks");
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const loadingToast = toast.loading("Generating Report...");
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
      pdf.save(`Academic_Report_${activeSemester?.name || 'Overview'}.pdf`);
      toast.success("Downloaded PDF", { id: loadingToast });
    } catch (error) {
      toast.error("Export failed", { id: loadingToast });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl mx-auto pb-32"
    >
      <header className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-1">Academics</h1>
          <p className="text-blue-200/70 font-black text-[10px] uppercase tracking-widest">Marks & Performance</p>
        </div>
        <div className="flex gap-2">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={handleExportPDF}
            disabled={isExporting || !semesters?.length}
            className="w-12 h-12 glass-card rounded-2xl flex items-center justify-center text-blue-400 border border-white/5 active:bg-white/10 disabled:opacity-30"
          >
            <Download size={20} />
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsModalOpen(true)}
            className="w-12 h-12 bg-blue-600 shadow-xl shadow-blue-600/20 text-white rounded-2xl flex items-center justify-center transition-all"
          >
            <Plus size={24} strokeWidth={3} />
          </motion.button>
        </div>
      </header>

      {/* Semester Selector */}
      <AnimatePresence>
        {semesters?.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-3 overflow-x-auto px-2 pb-2 hide-scrollbar"
          >
            {semesters.map(sem => (
              <div key={sem.id} className="relative group flex-shrink-0">
                <button
                  onClick={() => setActiveSemesterId(sem.id)}
                  className={clsx(
                    "px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border pr-10",
                    activeSemesterId === sem.id ? "bg-white text-black border-white shadow-xl shadow-white/10" : "bg-white/5 text-gray-500 border-white/5 hover:bg-white/10"
                  )}
                >
                  {sem.name}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteSemester(sem.id); }}
                  className={clsx(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all",
                    activeSemesterId === sem.id ? "text-red-500 hover:bg-red-50" : "opacity-0 pointer-events-none"
                  )}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={reportRef} className="space-y-6 px-2">
        {/* GPA Dashboard */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-blue-600/20 transition-all duration-700" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <Award className="text-blue-500/50 mb-2" size={20} />
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Overall CGPA</p>
              <p className="text-4xl font-black text-white">{cgpa}</p>
            </div>
          </motion.div>
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-600/10 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-green-600/20 transition-all duration-700" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <TrendingUp className="text-green-500/50 mb-2" size={20} />
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Sem SGPA</p>
              <p className="text-4xl font-black text-white">{sgpa}</p>
              {activeSemester?.targetSgpa && (
                <div className="mt-2 flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">
                   <Target size={10} className="text-green-500" />
                   <span className="text-[9px] font-black text-green-500 uppercase">{activeSemester.targetSgpa} Goal</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Subjects & Marks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Subject Performance</h2>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{activeSubjects.length} Courses</span>
          </div>

          <AnimatePresence mode="popLayout">
            {activeSubjects.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 glass-card rounded-[2.5rem] border-2 border-dashed border-white/5"
              >
                <div className="bg-white/5 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <GraduationCap size={24} className="text-gray-700" />
                </div>
                <p className="text-gray-500 text-sm font-black uppercase tracking-widest">No subjects found</p>
                <p className="text-gray-700 text-[10px] font-bold mt-1 uppercase">Add subjects in 'Manage' tab</p>
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={sub.id} 
                    className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5 group"
                  >
                    <div 
                      className="p-6 flex items-center justify-between cursor-pointer active:bg-white/5 transition-colors"
                      onClick={() => setExpandedSubjectId(isExpanded ? null : sub.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={clsx(
                          "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs border shrink-0",
                          total >= 40 ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                        )}>
                          {grade?.grade || 'F'}
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white leading-none mb-1.5">{sub.name}</h3>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{sub.credits} Credits</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-black text-white leading-none mb-1">{total}</p>
                          <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Total / 100</p>
                        </div>
                        {!isExporting && (
                          <motion.div 
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            className="p-2 bg-white/5 rounded-xl text-gray-600"
                          >
                            <ChevronDown size={16} />
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
                          className="px-6 pb-6 pt-2 border-t border-white/5 bg-white/[0.02] space-y-5"
                        >
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: 'Internals', type: 'internal', max: 30 },
                              { label: 'Assign', type: 'assignment', max: 20 },
                              { label: 'Sem Exam', type: 'semExam', max: 50 }
                            ].map(markType => (
                              <div key={markType.type}>
                                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">{markType.label}</label>
                                <input 
                                  type="number" 
                                  value={subMarks.find(m => m.type === markType.type)?.obtainedMarks || ''}
                                  onChange={(e) => handleMarkChange(sub.id, markType.type, e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white font-black focus:ring-1 focus:ring-blue-500 outline-none text-center shadow-inner"
                                  placeholder="0"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[9px] font-black text-gray-600 uppercase tracking-widest px-1">
                            <div className="flex items-center gap-1.5">
                              <Save size={10} /> Auto-saving enabled
                            </div>
                            <span>Grade: {grade?.grade || 'None'}</span>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 rounded-[3rem] w-full max-w-md shadow-2xl border border-white/10 relative z-10"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">New Semester</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                  <XCircle size={28} />
                </button>
              </div>
              <form onSubmit={handleAddSemester} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Semester Name</label>
                  <input 
                    type="text" 
                    required
                    value={semesterForm.name}
                    onChange={(e) => setSemesterForm({...semesterForm, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none font-black placeholder:text-gray-800"
                    placeholder="e.g. SEMESTER 4"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Target SGPA</label>
                  <input 
                    type="number" 
                    required min="1" max="10" step="0.1"
                    value={semesterForm.targetSgpa}
                    onChange={(e) => setSemesterForm({...semesterForm, targetSgpa: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none font-black text-center"
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <button 
                    type="submit" 
                    className="flex-1 py-5 bg-blue-600 text-white rounded-3xl transition-all font-black uppercase tracking-widest shadow-2xl shadow-blue-600/40 active:scale-95"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
