import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Subjects from './pages/Subjects';
import CalendarView from './pages/CalendarView';
import Academics from './pages/Academics';
import Settings from './pages/Settings';
import AttendanceHistory from './pages/History';
import Login from './pages/Login';
import Register from './pages/Register';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return null;
  if (!token) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Toaster position="bottom-center" toastOptions={{
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid #262626',
          borderRadius: '1rem',
          padding: '0.75rem 1.25rem',
          fontSize: '13px',
          fontWeight: '500',
        },
        success: { iconTheme: { primary: '#4ade80', secondary: '#000' } },
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
            <Route path="academics" element={<Academics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="history" element={<AttendanceHistory />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
