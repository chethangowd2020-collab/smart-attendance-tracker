import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { db } from '../db/db';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      toast.success('Logged in successfully!');
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  const register = async (email, password, profileData) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, profile: profileData })
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Update local settings with profile info without wiping out defaults
      const existingSettings = await db.settings.get(1);
      const settingsData = {
        profile: {
          name: profileData.name || '',
          usn: profileData.usn || '',
          course: '',
          semester: ''
        },
        notifications: { lowAttendanceAlert: true, dailyReminder: true },
        defaultThreshold: 75
      };

      if (existingSettings) {
        await db.settings.update(1, settingsData);
      } else {
        await db.settings.add({ id: 1, ...settingsData, gradingScale: [
          { min: 90, max: 100, point: 10, grade: 'O' },
          { min: 80, max: 89, point: 9, grade: 'A+' },
          { min: 70, max: 79, point: 8, grade: 'A' },
          { min: 60, max: 69, point: 7, grade: 'B+' },
          { min: 55, max: 59, point: 6, grade: 'B' },
          { min: 50, max: 54, point: 5, grade: 'C' },
          { min: 45, max: 49, point: 4, grade: 'P' },
          { min: 0, max: 44, point: 0, grade: 'F' }
        ]});
      }
      
      toast.success('Account created!');
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  const logout = async () => {
    if (confirm('Logging out will clear your local data for security. Ensure your data is synced! Continue?')) {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Clear local database
      try {
        await Promise.all([
          db.semesters.clear(),
          db.subjects.clear(),
          db.attendance_records.clear(),
          db.marks.clear(),
          db.timetable.clear()
        ]);
        toast.success('Logged out and local data cleared.');
      } catch (e) {
        toast.error('Logout completed with errors.');
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
