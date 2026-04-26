import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Subjects from './pages/Subjects';
import CalendarView from './pages/CalendarView';
import Settings from './pages/Settings';
import AttendanceHistory from './pages/History';
import Login from './pages/Login';
import Register from './pages/Register';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-white dark:bg-[#020617] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );
  if (!token) return <Navigate to="/login" />;
  return children;
}

function App() {
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <AuthProvider>
      <Toaster position="bottom-center" toastOptions={{
        style: {
          background: '#ffffff',
          color: '#09090b',
          border: '1px solid #e4e4e7',
          borderRadius: '1rem',
          padding: '0.75rem 1.25rem',
          fontSize: '13px',
          fontWeight: '500',
        },
        success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' } },
        error: { iconTheme: { primary: '#f87171', secondary: '#000' } },
      }} />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Home />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="settings" element={<Settings />} />
            <Route path="history" element={<AttendanceHistory />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
