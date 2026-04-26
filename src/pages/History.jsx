import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format, parseISO } from 'date-fns';
import { 
  Trash2, Calendar as CalendarIcon, Filter, Search, 
  CheckCircle2, XCircle, Slash, History as HistoryIcon, 
  Clock, Database, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function AttendanceHistory() {
  const [selectedSubjectId, setSelectedSubjectId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const records = useLiveQuery(async () => {
    let query = db.attendance_records;
    if (selectedSubjectId !== 'all') {
      query = query.where('subjectId').equals(Number(selectedSubjectId));
    }
    const results = await query.toArray();
    return results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [selectedSubjectId]);

  const handleDeleteRecord = async (record) => {
    if (!confirm('Delete this record? This will update your attendance percentage.')) return;

    try {
      await db.transaction('rw', db.subjects, db.attendance_records, async () => {
        const subject = await db.subjects.get(record.subjectId);
        if (!subject) return;

        let newAttended = subject.attendedClasses;
        let newTotal = subject.totalClasses;

        if (record.status === 'present') {
          newAttended--;
          newTotal--;
        } else if (record.status === 'absent') {
          newTotal--;
        }

        await db.subjects.update(record.subjectId, {
          attendedClasses: newAttended,
          totalClasses: newTotal
        });

        await db.attendance_records.delete(record.id);
      });
      toast.success('Record purged', { icon: '🗑️' });
    } catch (e) {
      toast.error('Purge failed');
    }
  };

  const filteredRecords = records?.filter(r => {
    const subject = subjects?.find(s => s.id === r.subjectId);
    if (!subject) return false;
    return subject.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-2xl mx-auto pb-32"
    >
      <header className="px-3">
        <h1 className="text-4xl font-black text-white tracking-tighter mb-1">HISTORY</h1>
        <p className="text-gray-500 font-black text-[10px] uppercase tracking-[0.3em]">Attendance Audit Logs</p>
      </header>

      {/* Filters */}
      <div className="space-y-4 px-3">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
            <input 
              type="text" 
              placeholder="SEARCH AUDIT LOGS..."
              className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-5 pl-14 pr-6 text-white text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-600/20 transition-all shadow-inner placeholder:text-gray-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative">
            <select 
              className="w-full sm:w-auto bg-white/5 border border-white/10 rounded-[2rem] py-5 px-8 text-white text-[10px] font-black uppercase tracking-widest outline-none appearance-none pr-14 shadow-inner focus:ring-4 focus:ring-blue-600/20 transition-all"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              <option value="all">ALL ENTITIES</option>
              {subjects?.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Filter className="absolute right-6 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* Records List */}
      <section className="px-3 space-y-5">
        <AnimatePresence mode="popLayout">
          {!filteredRecords || filteredRecords.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-28 glass-card rounded-[4rem] border-2 border-dashed border-white/5"
            >
              <div className="bg-white/5 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Database className="text-gray-800" size={40} />
              </div>
              <p className="text-gray-600 font-black uppercase tracking-[0.2em] text-sm">Vault records missing</p>
              <p className="text-gray-800 text-[10px] font-bold mt-2 uppercase tracking-[0.3em]">Initialize tracking to populate logs</p>
            </motion.div>
          ) : (
            filteredRecords.map((record, index) => {
              const subject = subjects?.find(s => s.id === record.subjectId);
              if (!subject) return null;

              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  key={record.id} 
                  className="glass-card rounded-[3rem] p-7 flex items-center justify-between group border border-white/5 relative overflow-hidden active:scale-[0.99] transition-all shadow-xl"
                >
                  <div className="flex items-center gap-6 relative z-10">
                    <div className={clsx(
                      "w-14 h-14 rounded-[1.25rem] flex items-center justify-center border-2 transition-all duration-500 shadow-lg",
                      record.status === 'present' ? "bg-blue-600/10 border-blue-600/30 text-blue-400 shadow-blue-600/5" :
                      record.status === 'absent' ? "bg-red-600/10 border-red-600/30 text-red-400 shadow-red-600/5" : "bg-gray-600/10 border-gray-600/30 text-gray-500"
                    )}>
                      {record.status === 'present' && <CheckCircle2 size={28} />}
                      {record.status === 'absent' && <XCircle size={28} />}
                      {record.status === 'cancelled' && <Slash size={28} />}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-3 tracking-tighter leading-tight mb-2 uppercase">
                        {subject.name}
                        {record.timetableId && (
                          <div className="p-1.5 bg-blue-600/10 rounded-lg border border-blue-500/20">
                            <Clock size={10} className="text-blue-400" />
                          </div>
                        )}
                      </h3>
                      <div className="flex items-center gap-3">
                        <CalendarIcon size={12} className="text-gray-700" />
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                          {format(parseISO(record.date), 'MMM do, yyyy')}
                        </p>
                        <ArrowRight size={10} className="text-gray-800" />
                        <span className="text-[9px] font-black text-gray-800 uppercase tracking-widest">Logged</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 relative z-10">
                    <span className={clsx(
                      "text-[9px] font-black uppercase px-4 py-1.5 rounded-full border tracking-widest",
                      record.status === 'present' ? "bg-blue-600/10 border-blue-600/20 text-blue-400" :
                      record.status === 'absent' ? "bg-red-600/10 border-red-600/20 text-red-400" : "bg-gray-600/10 border-gray-600/20 text-gray-500"
                    )}>
                      {record.status}
                    </span>
                    <motion.button 
                      whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteRecord(record)}
                      className="p-3.5 text-gray-800 hover:text-red-500 transition-all bg-white/5 rounded-2xl border border-white/5 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </section>
    </motion.div>
  );
}
