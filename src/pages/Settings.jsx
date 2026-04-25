import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { pushToCloud, pullFromCloud } from '../services/syncService';
import { 
  Settings as SettingsIcon, Download, Upload, Trash2, Moon, Sun, 
  User, BookOpen, GraduationCap, Bell, Palette, Database, Shield,
  ChevronRight, Save, LogOut, Calendar as CalendarIcon, Cloud, RefreshCw, CheckCircle2, Mail
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
  const { user, token, logout } = useAuth();
  const liveSettings = useLiveQuery(() => db.settings.get(1), []);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
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

  const handlePush = async () => {
    setSyncing(true);
    const loadingToast = toast.loading('Backing up data...');
    const success = await pushToCloud(token);
    if (success) {
      toast.success('Your data is securely saved to your account', { id: loadingToast });
    } else {
      toast.error('Backup failed. Check connection.', { id: loadingToast });
    }
    setSyncing(false);
  };

  const handlePull = async () => {
    if (confirm('This will overwrite your local data with the cloud backup. Continue?')) {
      setSyncing(true);
      const loadingToast = toast.loading('Restoring data...');
      const success = await pullFromCloud(token);
      if (success) {
        toast.success('Data restored successfully!', { id: loadingToast });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error('Restore failed. Check connection.', { id: loadingToast });
      }
      setSyncing(false);
    }
  };

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
      a.download = `Trackify-backup-${new Date().toISOString().split('T')[0]}.json`;
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
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Settings</h1>
          <p className="text-blue-200/70 font-black text-[10px] uppercase tracking-widest mt-1">App Configuration</p>
        </div>
      </div>

      {/* Profile Section */}
      <Section title="Profile" icon={User} colorClass="text-purple-400">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Full Name</label>
              <input 
                type="text" 
                value={localProfile.name}
                onChange={(e) => handleProfileUpdate('name', e.target.value.toUpperCase())}
                placeholder="E.G., JOHN DOE"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all uppercase"
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

      {/* Account Section */}
      <Section title="Account" icon={User} colorClass="text-blue-400">
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-400">
              <Mail size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{user?.email}</p>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">Your unique identifier</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-red-400 hover:bg-red-400/10 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
          >
            Logout <LogOut size={14} />
          </button>
        </div>
      </Section>

      {/* Cloud Sync Section */}
      <Section title="Cloud Backup" icon={Cloud} colorClass="text-purple-400">
        <div className="space-y-4">
          <div className="p-4 bg-purple-400/5 rounded-2xl border border-purple-400/10 flex items-center gap-4">
            <div className="p-2 bg-purple-400/20 rounded-lg text-purple-400">
              <CheckCircle2 size={20} />
            </div>
            <p className="text-[11px] font-bold text-purple-200 leading-snug">
              Your data is securely saved to your account. Backup often to sync across devices.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handlePush}
              disabled={syncing}
              className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/10 transition-all active:scale-[0.98]"
            >
              <RefreshCw className={clsx("text-purple-400", syncing && "animate-spin")} size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest">Backup Now</span>
            </button>
            <button 
              onClick={handlePull}
              disabled={syncing}
              className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/10 transition-all active:scale-[0.98]"
            >
              <Download className="text-blue-400" size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest">Restore Cloud</span>
            </button>
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
        <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.3em]">Trackify v1.5.0</p>
      </footer>
    </motion.div>
  );
}

