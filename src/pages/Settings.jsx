import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { 
  Settings as SettingsIcon, Download, Upload, Trash2, Moon, Sun, 
  User, BookOpen, GraduationCap, Bell, Palette, Database, Shield,
  ChevronRight, Save, LogOut, Calendar as CalendarIcon
} from 'lucide-react';
import { exportDB, importInto } from 'dexie-export-import';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const Section = ({ title, icon: Icon, children, colorClass = "text-blue-400" }) => (
  <section className="mx-2 glass-card p-6 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6 relative overflow-hidden group">
    <div className={clsx("absolute -top-12 -right-12 w-24 h-24 blur-3xl opacity-10 group-hover:opacity-20 transition-all duration-700 bg-current", colorClass)} />
    <div className="flex items-center gap-3 relative z-10">
      <div className={clsx("p-2 rounded-xl bg-white/5 border border-white/10", colorClass)}>
        <Icon size={18} />
      </div>
      <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">{title}</h2>
    </div>
    <div className="space-y-4 relative z-10">
      {children}
    </div>
  </section>
);

const Toggle = ({ enabled, onChange }) => (
  <button 
    onClick={() => onChange(!enabled)}
    className={clsx(
      "w-12 h-6 rounded-full p-1 transition-all duration-300 relative border",
      enabled ? "bg-blue-600 border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]" : "bg-white/5 border-white/10"
    )}
  >
    <motion.div 
      animate={{ x: enabled ? 24 : 0 }}
      className="w-4 h-4 bg-white rounded-full shadow-lg"
    />
  </button>
);

export default function Settings() {
  const liveSettings = useLiveQuery(() => db.settings.get(1), []);
  const [importing, setImporting] = useState(false);
  const [localProfile, setLocalProfile] = useState({ name: '', course: '', semester: '' });

  const settings = liveSettings || {};
  const notifications = settings.notifications || { lowAttendanceAlert: true, dailyReminder: true };
  const profile = settings.profile || { name: '', course: '', semester: '' };
  const defaultThreshold = settings.defaultThreshold ?? 75;

  useEffect(() => {
    if (settings.profile) {
      setLocalProfile(settings.profile);
    }
  }, [settings.profile]);

  const updateSettings = async (updates) => {
    try {
      await db.settings.update(1, updates);
    } catch (e) {
      console.error("Update failed:", e);
      toast.error("Failed to save setting");
    }
  };

  const handleProfileUpdate = async (field, value) => {
    const newProfile = { ...localProfile, [field]: value };
    setLocalProfile(newProfile);
    // Use functional update to ensure we don't lose other fields
    await updateSettings({ profile: newProfile });
  };

  const handleCSVExport = async () => {
    try {
      const subjects = await db.subjects.toArray();
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Subject,Credits,Attended,Total,Percentage,Threshold\n";
      subjects.forEach(s => {
        const percentage = s.totalClasses ? (s.attendedClasses / s.totalClasses * 100).toFixed(2) : 0;
        csvContent += `${s.name},${s.credits},${s.attendedClasses},${s.totalClasses},${percentage}%,${s.threshold}%\n`;
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "attendance_report.csv");
      document.body.appendChild(link);
      link.click();
      toast.success("CSV exported!");
    } catch (e) {
      toast.error("CSV export failed");
    }
  };

  const handleJSONExport = async () => {
    try {
      const blob = await exportDB(db);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AcademicsTracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded!");
    } catch (e) {
      toast.error('Export failed');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (confirm('Importing will overwrite your current data. Are you sure?')) {
      setImporting(true);
      const loadingToast = toast.loading('Importing data...');
      try {
        await db.delete(); 
        await db.open(); 
        await importInto(db, file, { overwriteValues: true });
        toast.success('Data imported successfully!', { id: loadingToast });
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        toast.error('Import failed.', { id: loadingToast });
      } finally {
        setImporting(false);
      }
    }
  };

  const handleClearData = async () => {
    if (confirm('Are you absolutely sure you want to delete ALL data? This cannot be undone.')) {
      await db.delete();
      window.location.reload();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl mx-auto pb-32"
    >
      <header className="px-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-blue-200/70 font-medium text-sm mt-0.5">Your Academic Dashboard</p>
      </header>

      {/* Profile Section */}
      <Section title="Profile" icon={User} colorClass="text-purple-400">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Full Name</label>
              <input 
                type="text" 
                value={localProfile.name}
                onChange={(e) => handleProfileUpdate('name', e.target.value)}
                placeholder="e.g., John Doe"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Course / Branch</label>
                <input 
                  type="text" 
                  value={localProfile.course}
                  onChange={(e) => handleProfileUpdate('course', e.target.value)}
                  placeholder="e.g., CSE"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Semester</label>
                <input 
                  type="text" 
                  value={localProfile.semester}
                  onChange={(e) => handleProfileUpdate('semester', e.target.value)}
                  placeholder="e.g., 4th"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Attendance Settings */}
      <Section title="Attendance Settings" icon={BookOpen} colorClass="text-blue-400">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Minimum Threshold</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Target attendance for all subjects</p>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="number" 
                min="1" max="100"
                value={defaultThreshold}
                onChange={(e) => updateSettings({ defaultThreshold: Number(e.target.value) })}
                className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white w-16 text-center text-sm font-black focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-gray-500 text-xs font-black">%</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <input 
              type="range" min="1" max="100" 
              value={defaultThreshold}
              onChange={(e) => updateSettings({ defaultThreshold: Number(e.target.value) })}
              className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[8px] font-black text-gray-600 uppercase tracking-widest px-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={Bell} colorClass="text-yellow-400">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-400/10 rounded-lg text-yellow-400"><Shield size={16} /></div>
              <div>
                <p className="text-sm font-bold text-white">Low Attendance Alerts</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter italic">Warning when below threshold</p>
              </div>
            </div>
            <Toggle 
              enabled={notifications.lowAttendanceAlert} 
              onChange={(val) => updateSettings({ notifications: { ...notifications, lowAttendanceAlert: val } })} 
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-400/10 rounded-lg text-blue-400"><CalendarIcon size={16} /></div>
              <div>
                <p className="text-sm font-bold text-white">Daily Mark Reminder</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter italic">Ping to mark attendance daily</p>
              </div>
            </div>
            <Toggle 
              enabled={notifications.dailyReminder} 
              onChange={(val) => updateSettings({ notifications: { ...notifications, dailyReminder: val } })} 
            />
          </div>
        </div>
      </Section>

      {/* Data Management */}
      <Section title="Data Management" icon={Database} colorClass="text-red-400">
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleJSONExport}
              className="flex items-center gap-3 p-4 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 active:scale-95 transition-all text-left"
            >
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400"><Download size={18} /></div>
              <span className="text-xs font-black text-white uppercase tracking-tighter">Export JSON</span>
            </button>
            <button 
              onClick={handleCSVExport}
              className="flex items-center gap-3 p-4 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 active:scale-95 transition-all text-left"
            >
              <div className="p-2 bg-green-500/10 rounded-xl text-green-400"><Database size={18} /></div>
              <span className="text-xs font-black text-white uppercase tracking-tighter">Export CSV</span>
            </button>
          </div>

          <label className="flex items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 active:scale-95 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-400"><Upload size={18} /></div>
              <span className="text-xs font-black text-white uppercase tracking-tighter">Restore Backup</span>
            </div>
            <ChevronRight size={16} className="text-gray-600" />
            <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={importing} />
          </label>

          <button 
            onClick={handleClearData}
            className="flex items-center justify-between p-4 bg-red-500/5 rounded-3xl border border-red-500/10 hover:bg-red-500/10 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-xl text-red-500"><Trash2 size={18} /></div>
              <span className="text-xs font-black text-red-400 uppercase tracking-tighter">Wipe All Data</span>
            </div>
            <Shield size={16} className="text-red-900/50" />
          </button>
        </div>
      </Section>

      {/* Footer Info */}
      <footer className="px-6 text-center py-4">
        <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.3em]">Smart Attendance Tracker v1.5.0</p>
      </footer>
    </motion.div>
  );
}

