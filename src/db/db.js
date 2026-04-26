import Dexie from 'dexie';

export const db = new Dexie('SmartAttendanceTracker');

db.version(2).stores({
  semesters: '++id, name, startDate, endDate, targetSgpa',
  subjects: '++id, semesterId, name, credits, totalClasses, attendedClasses, threshold, gradingScaleId, initialTotalClasses, initialAttendedClasses',
  attendance_records: '++id, subjectId, date, status, timetableId', // status: 'present' | 'absent' | 'cancelled'
  timetable: '++id, dayOfWeek, subjectId', // dayOfWeek: 0-6 (0 is Sunday)
  marks: '++id, subjectId, type, maxMarks, obtainedMarks', // type: 'internal' | 'assignment' | 'semExam'
  settings: '++id' // singleton
}).upgrade(tx => {
  // Migration logic if needed
});

export const initSettings = async () => {
  const existingSettings = await db.settings.get(1);
  const defaultGradingScale = [
    { min: 90, max: 100, point: 10, grade: 'O' },
    { min: 80, max: 89, point: 9, grade: 'A+' },
    { min: 70, max: 79, point: 8, grade: 'A' },
    { min: 60, max: 69, point: 7, grade: 'B+' },
    { min: 55, max: 59, point: 6, grade: 'B' },
    { min: 50, max: 54, point: 5, grade: 'C' },
    { min: 45, max: 49, point: 4, grade: 'P' },
    { min: 0, max: 44, point: 0, grade: 'F' }
  ];

  if (!existingSettings) {
    await db.settings.add({
      id: 1,
      theme: 'dark',
      defaultThreshold: 75,
      profile: { name: '', course: '', semester: '' },
      notifications: { lowAttendanceAlert: true, dailyReminder: true },
      gradingScale: defaultGradingScale
    });
  } else if (!existingSettings.gradingScale || existingSettings.gradingScale.length === 0) {
    await db.settings.update(1, { gradingScale: defaultGradingScale });
  }

};

db.on('ready', () => {
  return initSettings();
});
