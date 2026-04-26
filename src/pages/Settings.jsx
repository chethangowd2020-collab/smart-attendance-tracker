import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { pushToCloud, pullFromCloud } from '../services/syncService';
import { 
  Settings as SettingsIcon, Download, Upload, Trash2, Moon, Sun, 
  User, BookOpen, GraduationCap, Bell, Palette, Database, Shield,
  ChevronRight, Save, LogOut, Calendar as CalendarIcon, Cloud, RefreshCw, CheckCircle2, Mail, Edit2,
  Lock, Zap, Info, ArrowRight, Sparkles
} from 'lucide-react';
import { exportDB, importInto } from 'dexie-export-import';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const Section = ({ title, icon: Icon, children, colorClass = "text-blue-500" }) => (
  <section className="mx-3 glass-card p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-8 relative overflow-hidden group">
    <div className={clsx("absolute -top-16 -right-16 w-32 h-32 blur-3xl opacity-5 group-hover:opacity-10 transition-all duration-1000 bg-current", colorClass)} />
    <div className="flex items-center gap-4 relative z-10">
      <div className={clsx("p-3 rounded-2xl bg-white/5 border border-white/5", colorClass)}>
        <Icon size={20} />
      </div>
      <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">{title}</h2>
    </div>
    <div className="space-y-6 relative z-10">
      {children}
    </div>
  </section>
);

const Toggle = ({ enabled, onChange }) => (
  <button 
    onClick={() => onChange(!enabled)}
    className={clsx(
      "w-14 h-7 rounded-full p-1 transition-all duration-500 relative border",
      enabled ? "bg-blue-600 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]" : "bg-white/5 border-white/10"
    )}
  >
    <motion.div 
      initial={false}
      animate={{ x: enabled ? 28 : 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="w-5 h-5 bg-white rounded-full shadow-xl flex items-center justify-center"
    >
      {enabled && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
    </motion.div>
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
  
  useEffect(() => {
    if (settings.profile) {
      setLocalProfile(settings.profile);
    }
  }, [settings.profile]);

  const handlePush = async () => {
    setSyncing(true);
    const loadingToast = toast.loading('Synchronizing Vault...');
    const success = await pushToCloud(token);
    if (success) {
      toast.success('Cloud synchronization complete', { id: loadingToast, icon: '🛰️' });
    } else {
      toast.error('Sync failed. Check connection.', { id: loadingToast });
    }
    setSyncing(false);
  };

  const handlePull = async () => {
    if (confirm('This will overwrite your local vault with the cloud backup. Proceed with restoration?')) {
      setSyncing(true);
      const loadingToast = toast.loading('Restoring encrypted data...');
      const success = await pullFromCloud(token);
      if (success) {
        toast.success('Local data restored successfully', { id: loadingToast, icon: '🔋' });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error('Restoration failed.', { id: loadingToast });
      }
      setSyncing(false);
    }
  };

  const updateSettings = async (updates) => {
    try {
      await db.settings.update(1, updates);
    } catch (e) {
      toast.error("Failed to persist change");
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
      link.setAttribute("download", `Trackify_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      toast.success("CSV Ledger Exported");
    } catch (e) {
      toast.error("CSV generation failed");
    }
  };

  const handleJSONExport = async () => {
    try {
      const blob = await exportDB(db);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Trackify_Vault_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("JSON Vault Exported");
    } catch (e) {
      toast.error('Vault export failed');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (confirm('Importing will permanently overwrite your current vault. Proceed?')) {
      setImporting(true);
      const loadingToast = toast.loading('Injecting vault data...');
      try {
        await db.delete(); 
        await db.open(); 
        await importInto(db, file, { overwriteValues: true });
        toast.success('Vault injection successful', { id: loadingToast });
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        toast.error('Injection failed.', { id: loadingToast });
      } finally {
        setImporting(false);
      }
    }
  };

  const handleClearData = async () => {
    if (confirm('Are you absolutely sure you want to purge ALL local data? This action is irreversible.')) {
      await db.delete();
      window.location.reload();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-2xl mx-auto pb-32"
    >
      <header className="px-3">
        <h1 className="text-4xl font-black text-white tracking-tighter">SETTINGS</h1>
        <p className="text-gray-500 font-black text-[10px] uppercase tracking-[0.3em] mt-1">System Control</p>
      </header>

      {/* Profile Dashboard */}
      <section className="mx-3 glass-card p-10 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />
        <div className="relative z-10">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-[2.5rem] flex items-center justify-center text-white text-3xl font-black mx-auto mb-6 shadow-2xl shadow-blue-600/30 border-2 border-white/10">
            {localProfile.name ? localProfile.name[0] : user?.email[0].toUpperCase()}
          </div>
          <h2 className="text-2xl font-black text-white tracking-tighter mb-1 uppercase">
            {localProfile.name || 'Anonymous User'}
          </h2>
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-8">
             <Mail size={12} />
             <p className="text-[10px] font-black uppercase tracking-widest">{user?.email}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/5 p-4 rounded-[1.5rem] border border-white/5">
                <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">PROGRAM</p>
                <p className="text-xs font-black text-white uppercase">{localProfile.course || 'NOT SET'}</p>
             </div>
             <div className="bg-white/5 p-4 rounded-[1.5rem] border border-white/5">
                <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">SEMESTER</p>
                <p className="text-xs font-black text-white uppercase">{localProfile.semester || 'NOT SET'}</p>
             </div>
          </div>
        </div>
      </section>

      {/* Identity Section */}
      <Section title="Identity" icon={User} colorClass="text-purple-400">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-800 uppercase tracking-widest ml-1">Legal Designation</label>
            <div className="relative">
              <input 
                type="text" 
                value={localProfile.name}
                onChange={(e) => handleProfileUpdate('name', e.target.value.toUpperCase())}
                placeholder="ENTER FULL NAME"
                className="w-full bg-black/20 border border-white/10 rounded-[1.5rem] p-5 text-white font-black outline-none focus:ring-4 focus:ring-purple-600/20 transition-all uppercase placeholder:text-gray-900 shadow-inner"
              />
              <Edit2 size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-800" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-800 uppercase tracking-widest ml-1">Curriculum</label>
              <input 
                type="text" 
                value={localProfile.course}
                onChange={(e) => handleProfileUpdate('course', e.target.value.toUpperCase())}
                placeholder="E.G. CSE"
                className="w-full bg-black/20 border border-white/10 rounded-[1.5rem] p-5 text-white font-black outline-none focus:ring-4 focus:ring-purple-600/20 transition-all uppercase placeholder:text-gray-900 shadow-inner"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-800 uppercase tracking-widest ml-1">Level</label>
              <input 
                type="text" 
                value={localProfile.semester}
                onChange={(e) => handleProfileUpdate('semester', e.target.value.toUpperCase())}
                placeholder="E.G. 4TH"
                className="w-full bg-black/20 border border-white/10 rounded-[1.5rem] p-5 text-white font-black outline-none focus:ring-4 focus:ring-purple-600/20 transition-all uppercase placeholder:text-gray-900 shadow-inner"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Synchronization */}
      <Section title="Connectivity" icon={Cloud} colorClass="text-blue-500">
        <div className="space-y-6">
          <div className="p-6 bg-blue-600/5 rounded-[2rem] border border-blue-600/10 flex items-center gap-5">
            <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400">
              <Sparkles size={24} />
            </div>
            <p className="text-[11px] font-black text-blue-200 leading-snug uppercase tracking-tight">
              Continuous cloud synchronization ensures your vault remains persistent across all authenticated platforms.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <motion.button 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePush}
              disabled={syncing}
              className="p-6 bg-white/5 border border-white/5 rounded-[2rem] flex flex-col items-center gap-3 hover:bg-white/10 transition-all shadow-inner group"
            >
              <RefreshCw className={clsx("text-blue-500 group-hover:rotate-180 transition-transform duration-700", syncing && "animate-spin")} size={28} />
              <span className="text-[9px] font-black uppercase tracking-widest">Push Vault</span>
            </motion.button>
            <motion.button 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePull}
              disabled={syncing}
              className="p-6 bg-white/5 border border-white/5 rounded-[2rem] flex flex-col items-center gap-3 hover:bg-white/10 transition-all shadow-inner group"
            >
              <Download className="text-purple-500 group-hover:translate-y-1 transition-transform" size={28} />
              <span className="text-[9px] font-black uppercase tracking-widest">Pull Vault</span>
            </motion.button>
          </div>
        </div>
      </Section>

      {/* System Preferences */}
      <Section title="Protocols" icon={Bell} colorClass="text-yellow-500">
        <div className="space-y-4">
          {[
            { 
              label: 'Performance Alerts', 
              desc: 'Warning when attendance dips below threshold', 
              icon: Shield, 
              color: 'text-yellow-500', 
              val: notifications.lowAttendanceAlert, 
              key: 'lowAttendanceAlert' 
            },
            { 
              label: 'Persistence Reminder', 
              desc: 'Daily nudge to synchronize active records', 
              icon: Zap, 
              color: 'text-blue-500', 
              val: notifications.dailyReminder, 
              key: 'dailyReminder' 
            }
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-6 bg-white/5 rounded-[2rem] border border-white/5 transition-all hover:bg-white/[0.08]">
              <div className="flex items-center gap-4">
                <div className={clsx("p-3 rounded-2xl bg-white/5 border border-white/5", item.color)}><item.icon size={20} /></div>
                <div>
                  <p className="text-sm font-black text-white uppercase tracking-tight">{item.label}</p>
                  <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1">{item.desc}</p>
                </div>
              </div>
              <Toggle 
                enabled={item.val} 
                onChange={(val) => updateSettings({ notifications: { ...notifications, [item.key]: val } })} 
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Vault Management */}
      <Section title="Vault Control" icon={Database} colorClass="text-red-500">
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-4">
            <motion.button 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleJSONExport}
              className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-[2.5rem] border border-white/5 hover:bg-blue-600/10 hover:border-blue-600/20 transition-all shadow-inner"
            >
              <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-500"><Download size={24} /></div>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Export JSON</span>
            </motion.button>
            <motion.button 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCSVExport}
              className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-[2.5rem] border border-white/5 hover:bg-green-600/10 hover:border-green-600/20 transition-all shadow-inner"
            >
              <div className="p-3 bg-green-600/10 rounded-2xl text-green-500"><Database size={24} /></div>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Export CSV</span>
            </motion.button>
          </div>

          <label className="flex items-center justify-between p-6 bg-white/5 rounded-[2.5rem] border border-white/5 hover:bg-white/10 active:scale-98 transition-all cursor-pointer shadow-inner group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-500 group-hover:rotate-12 transition-transform"><Upload size={20} /></div>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Import External Vault</span>
            </div>
            <ArrowRight size={18} className="text-gray-800" />
            <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={importing} />
          </label>

          <motion.button 
            whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClearData}
            className="flex items-center justify-between p-6 bg-red-600/5 rounded-[2.5rem] border border-red-600/10 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-600/10 rounded-2xl text-red-500 group-hover:scale-110 transition-transform"><Trash2 size={20} /></div>
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Purge Local Instance</span>
            </div>
            <Lock size={18} className="text-red-900/40" />
          </motion.button>
        </div>
      </Section>

      <section className="px-3">
         <motion.button 
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(239, 68, 68, 1)' }}
          whileTap={{ scale: 0.98 }}
          onClick={logout}
          className="w-full py-6 bg-red-600/10 border border-red-600/20 rounded-[2.5rem] flex items-center justify-center gap-3 text-red-500 font-black uppercase tracking-[0.3em] transition-all hover:text-white shadow-2xl"
         >
           <LogOut size={20} />
           Terminate Session
         </motion.button>
      </section>

      {/* Footer Info */}
      <footer className="px-6 text-center py-8">
        <p className="text-[10px] font-black text-gray-800 uppercase tracking-[0.4em] mb-2">Trackify v1.8.0</p>
        <p className="text-[8px] font-black text-gray-900 uppercase tracking-[0.2em]">Designed by Antigravity OS</p>
      </footer>
    </motion.div>
  );
}

