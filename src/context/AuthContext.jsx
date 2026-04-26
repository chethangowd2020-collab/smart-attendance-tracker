import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { db } from '../db/db';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const API_URL = `http://${window.location.hostname}:5000/api`;

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
      
      // Initialize local settings with profile info
      await db.settings.put({
        id: 1,
        profile: {
          name: profileData.name || '',
          usn: profileData.usn || '',
          course: '',
          semester: ''
        },
        notifications: { lowAttendanceAlert: true, dailyReminder: true },
        defaultThreshold: 75
      });
      
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
