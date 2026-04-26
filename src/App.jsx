import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

const Home = lazy(() => import('./pages/Home'));
const Subjects = lazy(() => import('./pages/Subjects'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
const Settings = lazy(() => import('./pages/Settings'));
const AttendanceHistory = lazy(() => import('./pages/History'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

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

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
  </div>
);

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
            <Route index element={<Suspense fallback={<PageLoader />}><Home /></Suspense>} />
            <Route path="subjects" element={<Suspense fallback={<PageLoader />}><Subjects /></Suspense>} />
            <Route path="calendar" element={<Suspense fallback={<PageLoader />}><CalendarView /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
            <Route path="history" element={<Suspense fallback={<PageLoader />}><AttendanceHistory /></Suspense>} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
