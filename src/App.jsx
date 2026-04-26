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
      <Toaster position="top-center" toastOptions={{
        style: {
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#fff',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '1.5rem',
          padding: '1rem 1.5rem',
          fontSize: '11px',
          fontWeight: '900',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        },
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
