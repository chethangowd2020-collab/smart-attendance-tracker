import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { pushToCloud, pullFromCloud } from '../services/syncService';
import {
  Settings as SettingsIcon, Download, Upload, Trash2, User, BookOpen, GraduationCap, Bell,
  Database, ChevronRight, LogOut, Cloud, RefreshCw, CheckCircle2, Edit2,
  Lock, Zap, ArrowRight, Shield, Grid, Link2, FileText
} from 'lucide-react';
import { exportDB, importInto } from 'dexie-export-import';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { generateAttendancePDF } from '../utils/pdfExport';

const Toggle = ({ enabled, onChange }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={clsx(
      'w-12 h-6 rounded-full relative transition-colors duration-200',
      enabled ? 'bg-white' : 'bg-[#363636]'
    )}
  >
    <motion.div
      animate={{ x: enabled ? 24 : 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={clsx(
        'absolute top-1 w-4 h-4 rounded-full',
        enabled ? 'bg-black' : 'bg-[#666]'
      )}
    />
  </button>
);

export default function Settings() {
  const { user, token, logout } = useAuth();
  const liveSettings = useLiveQuery(() => db.settings.get(1), []);
  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const allRecords = useLiveQuery(() => db.attendance_records.toArray(), []);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [localProfile, setLocalProfile] = useState({ name: '', course: '', semester: '' });
  const [editingProfile, setEditingProfile] = useState(false);

  const settings = liveSettings || {};
  const notifications = settings.notifications || { lowAttendanceAlert: true, dailyReminder: true };

  useEffect(() => {
    if (settings.profile) setLocalProfile(settings.profile);
  }, [settings.profile]);

  const handlePush = async () => {
    setSyncing(true);
    const t = toast.loading('Syncing...');
    const ok = await pushToCloud(token);
    ok ? toast.success('Synced to cloud', { id: t }) : toast.error('Sync failed', { id: t });
    setSyncing(false);
  };

  const handlePull = async () => {
    if (!confirm('Overwrite local data with cloud backup?')) return;
    setSyncing(true);
    const t = toast.loading('Restoring...');
    const ok = await pullFromCloud(token);
    if (ok) { toast.success('Restored', { id: t }); setTimeout(() => window.location.reload(), 1000); }
    else toast.error('Restore failed', { id: t });
    setSyncing(false);
  };

  const updateSettings = async (updates) => {
    try { await db.settings.update(1, updates); }
    catch { toast.error('Failed to save'); }
  };

  const handleProfileUpdate = async () => {
    await updateSettings({ profile: localProfile });
    setEditingProfile(false);
    toast.success('Profile updated');
  };

  const handlePDFExport = () => {
    if (!subjects || subjects.length === 0) {
      toast.error('No subjects to export');
      return;
    }
    try {
      generateAttendancePDF(subjects, localProfile.name || '', user?.email || '');
      toast.success('PDF exported successfully');
    } catch {
      toast.error('PDF export failed');
    }
  };

  const handleJSONExport = async () => {
    try {
      const blob = await exportDB(db);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Trackify_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported');
    } catch { toast.error('Export failed'); }
  };

  const handleCSVExport = async () => {
    try {
      const subs = await db.subjects.toArray();
      let csv = 'data:text/csv;charset=utf-8,Subject,Credits,Attended,Total,Percentage\n';
      subs.forEach(s => {
        const pct = s.totalClasses ? (s.attendedClasses / s.totalClasses * 100).toFixed(1) : 0;
        csv += `${s.name},${s.credits},${s.attendedClasses},${s.totalClasses},${pct}%\n`;
      });
      const link = document.createElement('a');
      link.href = encodeURI(csv);
      link.download = `Trackify_Report_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('CSV exported');
    } catch { toast.error('Export failed'); }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Importing will overwrite your current data. Continue?')) return;
    setImporting(true);
    const t = toast.loading('Importing...');
    try {
      await db.delete(); await db.open();
      await importInto(db, file, { overwriteValues: true });
      toast.success('Imported', { id: t });
      setTimeout(() => window.location.reload(), 1500);
    } catch { toast.error('Import failed', { id: t }); }
    finally { setImporting(false); }
  };

  const handleClearData = async () => {
    if (confirm('Delete ALL local data permanently?')) {
      await db.delete(); window.location.reload();
    }
  };

  // Stats for profile grid
  const totalClasses = subjects?.reduce((a, s) => a + s.totalClasses, 0) || 0;
  const attended = subjects?.reduce((a, s) => a + s.attendedClasses, 0) || 0;
  const overallPct = totalClasses === 0 ? 0 : Math.round((attended / totalClasses) * 100);

  const avatar = localProfile.name ? localProfile.name[0].toUpperCase() : user?.email?.[0]?.toUpperCase() || 'U';
  const displayName = localProfile.name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="max-w-[470px] mx-auto">

      {/* ── Instagram Profile Header ── */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-6 mb-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] p-[2px]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white text-3xl font-bold">
                {avatar}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="flex-1 grid grid-cols-3 text-center">
            <div>
              <p className="text-white font-bold text-lg">{subjects?.length || 0}</p>
              <p className="text-[#737373] text-xs">Subjects</p>
            </div>
            <div>
              <p className="text-white font-bold text-lg">{totalClasses}</p>
              <p className="text-[#737373] text-xs">Classes</p>
            </div>
            <div>
              <p className={clsx('font-bold text-lg', overallPct >= 75 ? 'text-green-400' : 'text-red-400')}>{overallPct}%</p>
              <p className="text-[#737373] text-xs">Attendance</p>
            </div>
          </div>
        </div>

        {/* Name & bio */}
        <div className="mb-4">
          <p className="text-white font-semibold text-[15px]">{displayName}</p>
          {localProfile.course && <p className="text-[#737373] text-sm">{localProfile.course} • {localProfile.semester || 'Semester N/A'}</p>}
          <p className="text-[#737373] text-sm">{user?.email}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setEditingProfile(!editingProfile)}
            className="flex-1 py-1.5 bg-[#363636] rounded-lg text-white text-sm font-semibold hover:bg-[#444] transition-colors"
          >
            {editingProfile ? 'Cancel' : 'Edit profile'}
          </button>
          <button
            onClick={handlePush}
            disabled={syncing}
            className="flex-1 py-1.5 bg-[#363636] rounded-lg text-white text-sm font-semibold hover:bg-[#444] transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync
          </button>
          <button
            onClick={handlePull}
            disabled={syncing}
            className="py-1.5 px-3 bg-[#363636] rounded-lg text-white text-sm font-semibold hover:bg-[#444] transition-colors"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* ── Edit Profile Form ── */}
      {editingProfile && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-[#262626] px-4 py-4 space-y-3"
        >
          <p className="text-white font-semibold text-sm">Edit Profile</p>
          {[
            { key: 'name', label: 'Full Name', placeholder: 'Your name' },
            { key: 'course', label: 'Course', placeholder: 'e.g. B.Tech CSE' },
            { key: 'semester', label: 'Semester', placeholder: 'e.g. 4th Semester' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-[#737373] mb-1 block">{f.label}</label>
              <input
                type="text"
                value={localProfile[f.key] || ''}
                onChange={e => setLocalProfile(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-[#1a1a1a] border border-[#363636] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#555] transition-colors"
              />
            </div>
          ))}
          <button
            onClick={handleProfileUpdate}
            className="w-full py-2.5 bg-violet-500 rounded-lg text-white font-semibold text-sm"
          >
            Save Changes
          </button>
        </motion.div>
      )}

      {/* Divider */}
      <div className="border-t border-[#262626]" />

      {/* ── Settings Menu List ── */}
      <div className="divide-y divide-[#262626]">

        {/* Notifications Section */}
        <div className="px-4 py-4">
          <p className="text-[#737373] text-xs font-semibold uppercase tracking-wider mb-3">Notifications</p>
          <div className="space-y-4">
            {[
              { label: 'Low attendance alerts', key: 'lowAttendanceAlert', val: notifications.lowAttendanceAlert },
              { label: 'Daily reminder', key: 'dailyReminder', val: notifications.dailyReminder },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-white text-sm">{item.label}</span>
                <Toggle
                  enabled={item.val}
                  onChange={v => updateSettings({ notifications: { ...notifications, [item.key]: v } })}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Data Management */}
        <div className="px-4 py-4">
          <p className="text-[#737373] text-xs font-semibold uppercase tracking-wider mb-3">Data</p>
          <div className="space-y-1">
            {[
              { icon: FileText, label: 'Export Attendance PDF', action: handlePDFExport },
              { icon: Download, label: 'Export as JSON', action: handleJSONExport },
              { icon: Database, label: 'Export as CSV', action: handleCSVExport },
            ].map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                onClick={action}
                className="w-full flex items-center justify-between py-2.5 text-white hover:bg-[#1a1a1a] rounded-lg px-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className="text-[#737373]" />
                  <span className="text-sm">{label}</span>
                </div>
                <ChevronRight size={16} className="text-[#737373]" />
              </button>
            ))}

            <label className="w-full flex items-center justify-between py-2.5 text-white hover:bg-[#1a1a1a] rounded-lg px-2 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Upload size={20} className="text-[#737373]" />
                <span className="text-sm">Import backup</span>
              </div>
              <ChevronRight size={16} className="text-[#737373]" />
              <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="px-4 py-4">
          <button
            onClick={handleClearData}
            className="w-full flex items-center justify-between py-2.5 text-red-400 hover:bg-[#1a1a1a] rounded-lg px-2 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trash2 size={20} className="text-red-400" />
              <span className="text-sm">Clear all local data</span>
            </div>
            <Lock size={16} className="text-red-900" />
          </button>
        </div>

        {/* App Info */}
        <div className="px-4 py-4">
          <p className="text-[#737373] text-xs font-semibold uppercase tracking-wider mb-3">About</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#737373]">Version</span>
            <span className="text-sm text-white">1.8.0</span>
          </div>
        </div>

        {/* Logout */}
        <div className="px-4 py-4">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3 border border-[#363636] rounded-xl text-red-400 font-semibold text-sm hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>

      </div>

      <div className="h-8" />
    </div>
  );
}
