import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, ChevronDown, ChevronUp, Save, GraduationCap } from 'lucide-react';
import { calculateSGPA, calculateCGPA, calculateSubjectTotal, calculateGrade } from '../utils/academicUtils';

export default function Academics() {
  const [activeSemesterId, setActiveSemesterId] = useState(null);
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [semesterForm, setSemesterForm] = useState({ name: '', targetSgpa: 8.5 });

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
    await db.semesters.add({
      name: semesterForm.name,
      startDate: new Date().toISOString(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString(),
      targetSgpa: Number(semesterForm.targetSgpa)
    });
    setSemesterForm({ name: '', targetSgpa: 8.5 });
    setIsModalOpen(false);
  };

  const handleMarkChange = async (subjectId, type, obtainedMarks) => {
    // Check if mark entry exists
    const existingMark = allMarks?.find(m => m.subjectId === subjectId && m.type === type);
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
  };

  const toggleSubject = (id) => {
    setExpandedSubjectId(expandedSubjectId === id ? null : id);
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
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-sm text-white rounded-lg transition-colors flex items-center gap-1"
        >
          <Plus size={16} /> Semester
        </button>
      </header>

      {/* GPA Dashboard */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 text-center shadow-lg">
          <p className="text-gray-400 text-sm mb-1">Current CGPA</p>
          <p className="text-4xl font-bold text-blue-500">{cgpa}</p>
        </div>
        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 text-center shadow-lg">
          <p className="text-gray-400 text-sm mb-1">Semester SGPA</p>
          <p className="text-4xl font-bold text-green-500">{sgpa}</p>
          {activeSemester?.targetSgpa && (
            <p className="text-xs text-gray-500 mt-1">Target: {activeSemester.targetSgpa}</p>
          )}
        </div>
      </div>

      {/* Semester Selector */}
      {semesters?.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {semesters.map(sem => (
            <button
              key={sem.id}
              onClick={() => setActiveSemesterId(sem.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeSemesterId === sem.id ? 'bg-gray-100 text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {sem.name}
            </button>
          ))}
        </div>
      )}

      {/* Subjects & Marks */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Subject Marks</h2>
        {activeSubjects.length === 0 ? (
          <p className="text-gray-500 italic text-sm">No subjects found for this semester. Add them in the Subjects tab.</p>
        ) : (
          activeSubjects.map(sub => {
            const subMarks = allMarks?.filter(m => m.subjectId === sub.id) || [];
            const total = calculateSubjectTotal(subMarks);
            const grade = settings ? calculateGrade(total, settings.gradingScale) : null;
            const internal = subMarks.find(m => m.type === 'internal')?.obtainedMarks || '';
            const assignment = subMarks.find(m => m.type === 'assignment')?.obtainedMarks || '';
            const semExam = subMarks.find(m => m.type === 'semExam')?.obtainedMarks || '';

            const isExpanded = expandedSubjectId === sub.id;

            return (
              <div key={sub.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleSubject(sub.id)}
                >
                  <div>
                    <h3 className="font-medium text-white">{sub.name}</h3>
                    <p className="text-xs text-gray-400">{sub.credits} Credits</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{total} <span className="text-gray-500 font-normal">/100</span></p>
                      <p className={`text-xs font-bold ${grade?.point === 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {grade ? `Grade ${grade.grade}` : 'N/A'}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 bg-gray-900 border-t border-gray-700">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Internals</label>
                        <input 
                          type="number" 
                          min="0" max="100"
                          value={internal}
                          onChange={(e) => handleMarkChange(sub.id, 'internal', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          placeholder="e.g. 25"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Assignments</label>
                        <input 
                          type="number" 
                          min="0" max="100"
                          value={assignment}
                          onChange={(e) => handleMarkChange(sub.id, 'assignment', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          placeholder="e.g. 10"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Sem Exam</label>
                        <input 
                          type="number" 
                          min="0" max="100"
                          value={semExam}
                          onChange={(e) => handleMarkChange(sub.id, 'semExam', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
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

      {/* Add Semester Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl">
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
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
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
