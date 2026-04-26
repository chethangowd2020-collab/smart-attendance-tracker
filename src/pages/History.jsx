import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format } from 'date-fns';
import {
  Trash2, Search, CheckCircle2, XCircle, Slash, History as HistoryIcon,
  Filter, X
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
        let newAttended = sub.attendedClasses;
        let newTotal = sub.totalClasses;
        if (record.status === 'present') { newAttended--; newTotal--; }
        else if (record.status === 'absent') { newTotal--; }
        await db.subjects.update(record.subjectId, { attendedClasses: newAttended, totalClasses: newTotal });
      }
      await db.attendance_records.delete(record.id);
      toast.success('Record deleted');
    } catch { toast.error('Delete failed'); }
  };

  const statusConfig = {
    present: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', dot: 'bg-green-400', label: 'Present' },
    absent: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400', label: 'Absent' },
    cancelled: { icon: Slash, color: 'text-[#737373]', bg: 'bg-[#1a1a1a]', dot: 'bg-[#555]', label: 'Cancelled' },
  };

  // Group records by date
  const groupedByDate = {};
  filteredRecords?.forEach(r => {
    const d = r.date || 'Unknown';
    if (!groupedByDate[d]) groupedByDate[d] = [];
    groupedByDate[d].push(r);
  });

  return (
    <div className="max-w-[470px] mx-auto">

      {/* Header */}
      <div className="px-4 py-4 border-b border-[#262626]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">History</h1>
            <p className="text-xs text-[#737373]">{filteredRecords?.length || 0} records</p>
          </div>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              showFilter ? 'bg-white text-black' : 'bg-[#1a1a1a] text-[#737373] hover:text-white'
            )}
          >
            <Filter size={14} />
            Filter
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search records..."
            className="w-full bg-[#1a1a1a] rounded-xl pl-9 pr-4 py-2.5 text-white text-sm outline-none placeholder:text-[#555] border border-[#262626] focus:border-[#363636]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-[#737373]" />
            </button>
          )}
        </div>

        {/* Filter subjects */}
        <AnimatePresence>
          {showFilter && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3"
            >
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-2 pb-1">
                  <button
                    onClick={() => setSelectedSubjectId('all')}
                    className={clsx(
                      'shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors',
                      selectedSubjectId === 'all' ? 'bg-white text-black' : 'bg-[#1a1a1a] text-[#737373] hover:text-white'
                    )}
                  >
                    All
                  </button>
                  {subjects?.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSubjectId(String(s.id))}
                      className={clsx(
                        'shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap',
                        selectedSubjectId === String(s.id) ? 'bg-white text-black' : 'bg-[#1a1a1a] text-[#737373] hover:text-white'
                      )}
                    >
                      {s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Records */}
      {!filteredRecords || filteredRecords.length === 0 ? (
        <div className="py-20 text-center px-8">
          <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
            <HistoryIcon size={28} className="text-[#555]" />
          </div>
          <p className="text-white font-semibold mb-1">No records yet</p>
          <p className="text-[#737373] text-sm">Mark attendance on the Home page to see history here</p>
        </div>
      ) : (
        <div>
          {Object.entries(groupedByDate).map(([date, dateRecords]) => (
            <div key={date} className="border-b border-[#262626]">
              {/* Date header */}
              <div className="px-4 pt-4 pb-2">
                <p className="text-[#737373] text-xs font-semibold">
                  {date === 'Unknown' ? 'Unknown Date' : format(new Date(date), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>

              {/* Records for this date */}
              <div className="divide-y divide-[#111]">
                {dateRecords.map(record => {
                  const sub = subjects?.find(s => s.id === record.subjectId);
                  const cfg = statusConfig[record.status] || statusConfig.cancelled;
                  const Icon = cfg.icon;

                  return (
                    <AnimatePresence key={record.id}>
                      <motion.div
                        layout
                        exit={{ opacity: 0, x: -40, height: 0 }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[#0a0a0a] transition-colors"
                      >
                        {/* Status dot */}
                        <div className={clsx('w-2.5 h-2.5 rounded-full shrink-0', cfg.dot)} />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{sub?.name || 'Unknown Subject'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Icon size={12} className={cfg.color} />
                            <span className={clsx('text-xs font-medium capitalize', cfg.color)}>{record.status}</span>
                          </div>
                        </div>

                        {/* Delete */}
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => handleDelete(record)}
                          className="p-2 rounded-full hover:bg-[#1a1a1a] transition-colors"
                        >
                          <Trash2 size={15} className="text-[#555] hover:text-red-400 transition-colors" />
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

      <div className="h-6" />
    </div>
  );
}
