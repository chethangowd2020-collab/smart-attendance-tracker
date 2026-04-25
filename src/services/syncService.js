import { db } from '../db/db';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:5000/api';

export const pushToCloud = async (token) => {
  if (!token) return;

  try {
    // Get all data from Dexie
    const data = {
      semesters: await db.semesters.toArray(),
      subjects: await db.subjects.toArray(),
      attendance_records: await db.attendance_records.toArray(),
      marks: await db.marks.toArray(),
      timetable: await db.timetable.toArray(),
      settings: await db.settings.toArray(),
    };

    const res = await fetch(`${API_URL}/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ data })
    });

    const result = await res.json();
    if (result.error) throw new Error(result.error);
    
    return true;
  } catch (err) {
    console.error('Sync push failed:', err);
    return false;
  }
};

export const pullFromCloud = async (token) => {
  if (!token) return;

  try {
    const res = await fetch(`${API_URL}/sync/pull`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { data } = await res.json();
    
    if (!data) return false;

    // Use transaction to update Dexie
    await db.transaction('rw', [
      db.semesters, db.subjects, db.attendance_records, db.marks, db.timetable, db.settings
    ], async () => {
      // Clear existing local data
      await Promise.all([
        db.semesters.clear(),
        db.subjects.clear(),
        db.attendance_records.clear(),
        db.marks.clear(),
        db.timetable.clear(),
        db.settings.clear()
      ]);

      // Bulk add new data
      if (data.semesters) await db.semesters.bulkAdd(data.semesters);
      if (data.subjects) await db.subjects.bulkAdd(data.subjects);
      if (data.attendance_records) await db.attendance_records.bulkAdd(data.attendance_records);
      if (data.marks) await db.marks.bulkAdd(data.marks);
      if (data.timetable) await db.timetable.bulkAdd(data.timetable);
      if (data.settings) await db.settings.bulkAdd(data.settings);
    });

    return true;
  } catch (err) {
    console.error('Sync pull failed:', err);
    return false;
  }
};
