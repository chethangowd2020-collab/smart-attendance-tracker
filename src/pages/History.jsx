import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format } from 'date-fns';
import {
  Trash2, Search, CheckCircle2, XCircle, Slash, History as HistoryIcon,
  Filter, X, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function AttendanceHistory() {
  const [selectedSubjectId, setSelectedSubjectId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const subjects = useLiveQuery(() => db.subjects.toArray(), []);

  const records = useLiveQuery(async () => {
    let query = db.attendance_records.orderBy('date').reverse();
    if (selectedSubjectId !== 'all') {
      query = db.attendance_records.where('subjectId').equals(Number(selectedSubjectId));
    }
    const results = await query.toArray();
    return results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [selectedSubjectId]);

  const filteredRecords = records?.filter(r => {
    if (!searchQuery) return true;
    const sub = subjects?.find(s => s.id === r.subjectId);
    return sub?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.date?.includes(searchQuery) ||
      r.status?.includes(searchQuery.toLowerCase());
  });

  const handleDelete = async (record) => {
    try {
      const sub = await db.subjects.get(record.subjectId);
      if (sub) {
        let na = sub.attendedClasses;
        let nt = sub.totalClasses;
        if (record.status === 'present') { na--; nt--; }
        else if (record.status === 'absent') { nt--; }
        await db.subjects.update(record.subjectId, {
          attendedClasses: Math.max(0, na),
          totalClasses: Math.max(0, nt)
        });
      }
      await db.attendance_records.delete(record.id);
      toast.success('Record deleted');
    } catch { toast.error('Delete failed'); }
  };

  const statusConfig = {
    present: { icon: CheckCircle2, textColor: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 border-green-500/20', dot: 'bg-green-500' },
    absent: { icon: XCircle, textColor: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/20', dot: 'bg-red-500' },
    cancelled: { icon: Slash, textColor: 'text-gray-500', bg: 'bg-white/[0.04] border-white/[0.07]', dot: 'bg-gray-600' },
  };

  // Group by date
  const groupedByDate = {};
  filteredRecords?.forEach(r => {
    const d = r.date || 'Unknown';
    if (!groupedByDate[d]) groupedByDate[d] = [];
    groupedByDate[d].push(r);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto px-4 py-6 pb-32 bg-white dark:bg-[#020617] transition-colors">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">History</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-0.5 flex items-center gap-1.5 uppercase tracking-widest">
            <Database size={11} className="text-purple-500" /> {filteredRecords?.length || 0} Records
          </p>
        </div>
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all',
            showFilter
              ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20'
              : 'bg-zinc-100 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10'
          )}
        >
          <Filter size={13} />
          Filter
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by subject, date or status..."
          className="w-full bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.07] rounded-2xl pl-11 pr-10 py-3.5 text-zinc-900 dark:text-white text-sm font-bold outline-none focus:border-emerald-500/40 placeholder:text-zinc-400 dark:placeholder:text-zinc-800 transition-all"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
            <X size={14} className="text-gray-600 hover:text-white" />
          </button>
        )}
      </div>

      {/* Subject filter pills */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="overflow-x-auto scrollbar-hide pb-1">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSubjectId('all')}
                  className={clsx(
                    'shrink-0 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border',
                    selectedSubjectId === 'all'
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                      : 'bg-zinc-100 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  )}
                >
                  All
                </button>
                {subjects?.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSubjectId(String(s.id))}
                    className={clsx(
                      'shrink-0 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border whitespace-nowrap',
                      selectedSubjectId === String(s.id)
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                        : 'bg-zinc-100 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    )}
                  >
                    {s.name.length > 14 ? s.name.slice(0, 14) + '…' : s.name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Records */}
      {!filteredRecords || filteredRecords.length === 0 ? (
        <div className="text-center py-24 bg-white/[0.02] rounded-[2.5rem] border-2 border-dashed border-white/[0.06]">
          <div className="w-16 h-16 bg-white/[0.04] rounded-3xl flex items-center justify-center mx-auto mb-5">
            <HistoryIcon size={28} className="text-gray-700" />
          </div>
          <p className="text-gray-500 font-black uppercase tracking-widest text-sm">No records found</p>
          <p className="text-gray-700 text-xs font-bold mt-2 uppercase tracking-wide">Mark attendance on the Home page</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, dateRecords]) => (
            <div key={date} className="space-y-3">
              {/* Date header */}
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500/60 shrink-0" />
                <p className="text-[11px] font-black text-zinc-500 dark:text-zinc-600 uppercase tracking-[0.2em]">
                  {date === 'Unknown' ? 'Unknown Date' : format(new Date(date), 'EEEE, MMMM d, yyyy')}
                </p>
                <div className="flex-1 h-px bg-zinc-100 dark:bg-white/[0.05]" />
              </div>

              {/* Records */}
              <div className="space-y-2">
                {dateRecords.map(record => {
                  const sub = subjects?.find(s => s.id === record.subjectId);
                  const cfg = statusConfig[record.status] || statusConfig.cancelled;
                  const Icon = cfg.icon;

                  return (
                    <AnimatePresence key={record.id}>
                      <motion.div
                        layout
                        exit={{ opacity: 0, x: -40, height: 0 }}
                        className={clsx(
                          'flex items-center gap-4 p-4 rounded-2xl border transition-all group',
                          cfg.bg
                        )}
                      >
                        <div className={clsx('w-2.5 h-2.5 rounded-full shrink-0', cfg.dot)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{sub?.name || 'Unknown Subject'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Icon size={11} className={cfg.textColor} />
                            <span className={clsx('text-[10px] font-black uppercase tracking-widest', cfg.textColor)}>{record.status}</span>
                          </div>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => handleDelete(record)}
                          className="p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 size={14} className="text-gray-600 hover:text-red-400 transition-colors" />
                        </motion.button>
                      </motion.div>
                    </AnimatePresence>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
