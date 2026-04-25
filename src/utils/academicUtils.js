// Grade calculation based on provided scale
export const calculateGrade = (totalMarks, scale) => {
  if (totalMarks === undefined || totalMarks === null) return null;
  // Sort scale descending by min value to easily find the grade
  const sortedScale = [...scale].sort((a, b) => b.min - a.min);
  for (const range of sortedScale) {
    if (totalMarks >= range.min && totalMarks <= range.max) {
      return range;
    }
  }
  return scale[scale.length - 1]; // return lowest if not found
};

export const calculateSubjectTotal = (subjectMarks) => {
  // Assuming marks are stored with their maxMarks normalized to 100 or weighted.
  // Standard logic: Total is sum of all components. 
  // For standard 100 mark exam: Internals (e.g. 25) + SemExam (e.g. 75)
  return subjectMarks.reduce((sum, m) => sum + Number(m.obtainedMarks || 0), 0);
};

export const calculateSGPA = (subjects, marksData, scale) => {
  let totalCreditPoints = 0;
  let totalCredits = 0;

  subjects.forEach(sub => {
    const subMarks = marksData.filter(m => m.subjectId === sub.id);
    if (subMarks.length > 0) {
      const totalMarks = calculateSubjectTotal(subMarks);
      const grade = calculateGrade(totalMarks, scale);
      if (grade) {
        totalCreditPoints += grade.point * sub.credits;
        totalCredits += sub.credits;
      }
    }
  });

  if (totalCredits === 0) return 0;
  return (totalCreditPoints / totalCredits).toFixed(2);
};

export const calculateCGPA = (semesters, allSubjects, allMarks, scale) => {
  let totalSGPAs = 0;
  let validSemesters = 0;

  semesters.forEach(sem => {
    const semSubjects = allSubjects.filter(s => s.semesterId === sem.id);
    const sgpa = calculateSGPA(semSubjects, allMarks, scale);
    if (sgpa > 0) {
      totalSGPAs += Number(sgpa);
      validSemesters++;
    }
  });

  if (validSemesters === 0) return 0;
  return (totalSGPAs / validSemesters).toFixed(2);
};
