import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Settings as SettingsIcon, Download, Upload, Trash2, Moon, Sun } from 'lucide-react';
import { exportDB, importInto } from 'dexie-export-import';
import toast from 'react-hot-toast';

export default function Settings() {
  const settings = useLiveQuery(() => db.settings.get(1), []);
  const [importing, setImporting] = useState(false);

  const handleCSVExport = async () => {
    try {
      const subjects = await db.subjects.toArray();
      const attendance = await db.attendance_records.toArray();
      
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

  const handleExport = async () => {
    try {
      const blob = await exportDB(db);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AcademicsTracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded!");
    } catch (error) {
      console.error('Export failed:', error);
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
        console.error('Import failed:', error);
        toast.error('Import failed.', { id: loadingToast });
      } finally {
        setImporting(false);
      }
    }
    e.target.value = null; 
  };

  const handleClearData = async () => {
    if (confirm('Are you absolutely sure you want to delete ALL data? This cannot be undone.')) {
      if (confirm('FINAL WARNING: Delete all data?')) {
        await db.delete();
        window.location.reload();
      }
    }
  };

  if (!settings) return <div className="text-gray-400">Loading settings...</div>;

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-20">
      <header className="px-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-blue-200/70 font-medium text-sm mt-0.5">App configuration & Data</p>
      </header>

      {/* Preferences */}
      <section className="mx-2 glass-card p-6 rounded-[2.5rem] space-y-6 border border-white/10">
        <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">Preferences</h2>
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Attendance Threshold</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Target for new subjects</p>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              min="1" max="100"
              className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white w-16 text-center text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              value={settings.defaultThreshold}
              onChange={async (e) => {
                await db.settings.update(1, { defaultThreshold: Number(e.target.value) });
                toast.success("Updated", { id: 'threshold' });
              }}
            />
            <span className="text-gray-500 text-xs font-bold">%</span>
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="mx-2 glass-card p-6 rounded-[2.5rem] space-y-6 border border-white/10">
        <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">Data Management</h2>
        
        <div className="space-y-3">
          <button 
            onClick={handleExport}
            className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-400 border border-blue-500/20"><Download size={20} /></div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">JSON Backup</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Full app data export</p>
              </div>
            </div>
          </button>

          <button 
            onClick={handleCSVExport}
            className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="bg-green-500/10 p-2.5 rounded-xl text-green-400 border border-green-500/20"><Download size={20} /></div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Export CSV</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Spreadsheet compatible</p>
              </div>
            </div>
          </button>

          <label className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5 cursor-pointer active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-500/10 p-2.5 rounded-xl text-yellow-400 border border-yellow-500/20"><Upload size={20} /></div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Restore Backup</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{importing ? 'Importing...' : 'Import from JSON file'}</p>
              </div>
            </div>
            <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={importing} />
          </label>

          <button 
            onClick={handleClearData}
            className="w-full flex items-center justify-between p-4 bg-red-900/10 rounded-2xl hover:bg-red-900/20 transition-all border border-red-500/10 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="bg-red-500/10 p-2.5 rounded-xl text-red-400 border border-red-500/20"><Trash2 size={20} /></div>
              <div className="text-left">
                <p className="text-sm font-bold text-red-400">Wipe Data</p>
                <p className="text-[10px] text-red-500/40 font-bold uppercase tracking-tighter">Permanently delete everything</p>
              </div>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
