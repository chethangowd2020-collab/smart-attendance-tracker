import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Settings as SettingsIcon, Download, Upload, Trash2, Moon, Sun } from 'lucide-react';
import { exportDB, importInto } from 'dexie-export-import';

export default function Settings() {
  const settings = useLiveQuery(() => db.settings.get(1), []);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    try {
      const blob = await exportDB(db);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart-attendance-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Check console for details.');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (confirm('Importing will overwrite your current data. Are you sure?')) {
      setImporting(true);
      try {
        await db.delete(); // clear current db
        await db.open(); // reopen
        await importInto(db, file, { overwriteValues: true });
        alert('Data imported successfully! Reloading...');
        window.location.reload();
      } catch (error) {
        console.error('Import failed:', error);
        alert('Import failed. Check console for details.');
      } finally {
        setImporting(false);
      }
    }
    e.target.value = null; // reset input
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
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="text-blue-500" />
          Settings
        </h1>
      </header>

      {/* Preferences */}
      <section className="bg-gray-800 p-5 rounded-2xl border border-gray-700 space-y-6">
        <h2 className="text-lg font-semibold text-white">Preferences</h2>
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-white">Default Attendance Threshold</h3>
            <p className="text-sm text-gray-400">Target percentage for new subjects</p>
          </div>
          <input 
            type="number" 
            min="1" max="100"
            className="bg-gray-900 border border-gray-600 rounded-lg p-2 text-white w-20 text-center"
            value={settings.defaultThreshold}
            onChange={async (e) => await db.settings.update(1, { defaultThreshold: Number(e.target.value) })}
          />
        </div>
      </section>

      {/* Data Management */}
      <section className="bg-gray-800 p-5 rounded-2xl border border-gray-700 space-y-6">
        <h2 className="text-lg font-semibold text-white">Data Management</h2>
        
        <div className="space-y-4">
          <button 
            onClick={handleExport}
            className="w-full flex items-center justify-between p-4 bg-gray-900 border border-gray-700 rounded-xl hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><Download size={20} /></div>
              <div className="text-left">
                <p className="font-medium text-white">Backup Data</p>
                <p className="text-xs text-gray-400">Export all your data as a JSON file</p>
              </div>
            </div>
          </button>

          <label className="w-full flex items-center justify-between p-4 bg-gray-900 border border-gray-700 rounded-xl hover:bg-gray-700 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/20 p-2 rounded-lg text-green-400"><Upload size={20} /></div>
              <div className="text-left">
                <p className="font-medium text-white">Restore Data</p>
                <p className="text-xs text-gray-400">{importing ? 'Importing...' : 'Import data from a backup JSON file'}</p>
              </div>
            </div>
            <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={importing} />
          </label>

          <button 
            onClick={handleClearData}
            className="w-full flex items-center justify-between p-4 bg-red-900/20 border border-red-900/50 rounded-xl hover:bg-red-900/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-red-500/20 p-2 rounded-lg text-red-400"><Trash2 size={20} /></div>
              <div className="text-left">
                <p className="font-medium text-red-400">Clear All Data</p>
                <p className="text-xs text-red-400/70">Permanently delete all subjects and marks</p>
              </div>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
