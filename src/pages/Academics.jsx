import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, ChevronDown, ChevronUp, Save, GraduationCap, Download } from 'lucide-react';
import { calculateSGPA, calculateCGPA, calculateSubjectTotal, calculateGrade } from '../utils/academicUtils';
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
  
  const sgpa = activeSemester && allSubjects && allMarks && settings ? calculateSGPA(activeSubjects, allMarks, settings.gradingScale) : 0;
  const cgpa = semesters && allSubjects && allMarks && settings ? calculateCGPA(semesters, allSubjects, allMarks, settings.gradingScale) : 0;

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

  const handleMarkChange = async (subjectId, type, obtainedMarks) => {
    // Check if mark entry exists
    const existingMark = allMarks?.find(m => m.subjectId === subjectId && m.type === type);
    try {
      if (existingMark) {
        await db.marks.update(existingMark.id, { obtainedMarks: Number(obtainedMarks) });
      } else {
        await db.marks.add({
          subjectId,
          type,
          maxMarks: type === 'semExam' ? 100 : (type === 'internal' ? 30 : 20), // Generic max marks
          obtainedMarks: Number(obtainedMarks)
        });
      }
      toast.success("Marks saved", { id: `mark-${subjectId}-${type}` }); // Use ID to prevent toast spam
    } catch (e) {
      toast.error("Failed to save marks");
    }
  };

  const toggleSubject = (id) => {
    setExpandedSubjectId(expandedSubjectId === id ? null : id);
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    toast.loading("Generating PDF...", { id: "pdf-export" });
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#111827', // Match html background
        logging: false,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Academics_Report_${activeSemester?.name || 'All'}.pdf`);
      toast.success("PDF Downloaded!", { id: "pdf-export" });
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF", { id: "pdf-export" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="text-blue-500" />
            Academics
          </h1>
          <p className="text-gray-400 text-sm mt-1">Track your SGPA and CGPA</p>
        </div>
        <div className="flex gap-2">
          {semesters?.length > 0 && (
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <Download size={16} /> <span className="hidden sm:inline">Export</span>
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 text-sm text-white rounded-lg transition-colors flex items-center gap-1 font-medium"
          >
            <Plus size={16} /> Semester
          </button>
        </div>
      </header>

      {/* Semester Selector */}
      {semesters?.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {semesters.map(sem => (
            <button
              key={sem.id}
              onClick={() => setActiveSemesterId(sem.id)}
              className={clsx(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shadow-sm",
                activeSemesterId === sem.id ? "bg-white text-gray-900 shadow-white/20" : "glass hover:bg-white/10 text-gray-300"
              )}
            >
              {sem.name}
            </button>
          ))}
        </div>
      )}

      {/* Printable Report Section */}
      <div ref={reportRef} className="space-y-6 p-2 rounded-2xl">
        {/* GPA Dashboard */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-5 rounded-2xl text-center">
            <p className="text-gray-300 text-sm mb-1 font-medium">Current CGPA</p>
            <p className="text-4xl font-bold text-blue-400 drop-shadow-md">{cgpa}</p>
          </div>
          <div className="glass-card p-5 rounded-2xl text-center">
            <p className="text-gray-300 text-sm mb-1 font-medium">Semester SGPA</p>
            <p className="text-4xl font-bold text-green-400 drop-shadow-md">{sgpa}</p>
            {activeSemester?.targetSgpa && (
              <p className="text-xs text-gray-400 mt-1">Target: <span className="font-medium text-white">{activeSemester.targetSgpa}</span></p>
            )}
          </div>
        </div>

        {/* Subjects & Marks */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Subject Marks</h2>
          {activeSubjects.length === 0 ? (
            <p className="text-gray-400 italic text-sm glass-card p-4 rounded-xl text-center">No subjects found for this semester. Add them in the Manage Classes tab.</p>
          ) : (
            activeSubjects.map(sub => {
              const subMarks = allMarks?.filter(m => m.subjectId === sub.id) || [];
              const total = calculateSubjectTotal(subMarks);
              const grade = settings ? calculateGrade(total, settings.gradingScale) : null;
              const internal = subMarks.find(m => m.type === 'internal')?.obtainedMarks || '';
              const assignment = subMarks.find(m => m.type === 'assignment')?.obtainedMarks || '';
              const semExam = subMarks.find(m => m.type === 'semExam')?.obtainedMarks || '';

              const isExpanded = expandedSubjectId === sub.id || isExporting; // Auto-expand when exporting

              return (
                <div key={sub.id} className="glass-card rounded-xl overflow-hidden transition-all">
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => toggleSubject(sub.id)}
                  >
                    <div>
                      <h3 className="font-semibold text-white">{sub.name}</h3>
                      <p className="text-xs text-gray-400">{sub.credits} Credits</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{total} <span className="text-gray-500 font-normal">/100</span></p>
                        <p className={`text-xs font-bold ${grade?.point === 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {grade ? `Grade ${grade.grade}` : 'N/A'}
                        </p>
                      </div>
                      {!isExporting && (isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />)}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 bg-black/20 border-t border-white/5">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1 font-medium">Internals</label>
                          <input 
                            type="number" 
                            min="0" max="100"
                            value={internal}
                            onChange={(e) => handleMarkChange(sub.id, 'internal', e.target.value)}
                            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            placeholder="e.g. 25"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1 font-medium">Assignments</label>
                          <input 
                            type="number" 
                            min="0" max="100"
                            value={assignment}
                            onChange={(e) => handleMarkChange(sub.id, 'assignment', e.target.value)}
                            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            placeholder="e.g. 10"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1 font-medium">Sem Exam</label>
                          <input 
                            type="number" 
                            min="0" max="100"
                            value={semExam}
                            onChange={(e) => handleMarkChange(sub.id, 'semExam', e.target.value)}
                            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            placeholder="e.g. 65"
                          />
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
                        <p>Changes are saved automatically.</p>
                        <Save size={14} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Semester Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 rounded-2xl w-full max-w-md shadow-2xl border border-white/10">
            <h2 className="text-xl font-bold text-white mb-4">Add Semester</h2>
            <form onSubmit={handleAddSemester} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Semester Name</label>
                <input 
                  type="text" 
                  required
                  value={semesterForm.name}
                  onChange={(e) => setSemesterForm({...semesterForm, name: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Semester 2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Target SGPA</label>
                <input 
                  type="number" 
                  required min="1" max="10" step="0.1"
                  value={semesterForm.targetSgpa}
                  onChange={(e) => setSemesterForm({...semesterForm, targetSgpa: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
