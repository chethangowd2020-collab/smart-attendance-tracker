import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Home from './pages/Home';
import Subjects from './pages/Subjects';
import CalendarView from './pages/CalendarView';
import Academics from './pages/Academics';
import Settings from './pages/Settings';
import History from './pages/History';

function App() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{
        style: {
          background: '#1f2937',
          color: '#fff',
          border: '1px solid #374151',
        },
      }} />
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="academics" element={<Academics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="history" element={<History />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
