import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format, parseISO } from 'date-fns';
import { Trash2, Calendar as CalendarIcon, Filter, Search, CheckCircle2, XCircle, Slash, History as HistoryIcon, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function History() {
  const [selectedSubjectId, setSelectedSubjectId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const records = useLiveQuery(async () => {
    let query = db.attendance_records;
    if (selectedSubjectId !== 'all') {
      query = query.where('subjectId').equals(Number(selectedSubjectId));
    }
    const results = await query.toArray();
    return results.sort((a, b) => b.date.localeCompare(a.date));
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
      toast.success('Record deleted');
    } catch (e) {
      toast.error('Failed to delete record');
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
      className="space-y-6 max-w-2xl mx-auto pb-32"
    >
      <header className="px-2">
        <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-1">History</h1>
        <p className="text-blue-200/70 font-black text-[10px] uppercase tracking-widest">Attendance Audit Logs</p>
      </header>

      {/* Filters */}
      <div className="space-y-3 px-2">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH LOGS..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner placeholder:text-gray-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative">
            <select 
              className="bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-[10px] font-black uppercase tracking-widest outline-none appearance-none pr-12 shadow-inner"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              <option value="all">All Subjects</option>
              {subjects?.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none" size={14} />
          </div>
        </div>
      </div>

      {/* Records List */}
      <section className="px-2 space-y-4">
        <AnimatePresence mode="popLayout">
          {!filteredRecords || filteredRecords.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24 glass-card rounded-[3rem] border-2 border-dashed border-white/5"
            >
              <div className="bg-white/5 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <HistoryIcon className="text-gray-700" size={32} />
              </div>
              <p className="text-gray-500 font-black uppercase tracking-widest">No logs found</p>
              <p className="text-gray-700 text-[10px] font-bold mt-1 uppercase tracking-widest">Mark classes to see history</p>
            </motion.div>
          ) : (
            filteredRecords.map((record, index) => {
              const subject = subjects?.find(s => s.id === record.subjectId);
              if (!subject) return null;

              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.05, 0.5) }}
                  key={record.id} 
                  className="glass-card rounded-[2.5rem] p-5 flex items-center justify-between group border border-white/5 relative overflow-hidden"
                >
                  <div className="flex items-center gap-5 relative z-10">
                    <div className={clsx(
                      "w-12 h-12 rounded-2xl flex items-center justify-center border",
                      record.status === 'present' ? "bg-green-500/10 border-green-500/20 text-green-400" :
                      record.status === 'absent' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-gray-500/10 border-gray-500/20 text-gray-500"
                    )}>
                      {record.status === 'present' && <CheckCircle2 size={24} />}
                      {record.status === 'absent' && <XCircle size={24} />}
                      {record.status === 'cancelled' && <Slash size={24} />}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2 leading-none mb-1.5">
                        {subject.name}
                        {record.timetableId && <div className="p-1 bg-blue-500/20 rounded border border-blue-500/30"><Clock size={8} className="text-blue-400" /></div>}
                      </h3>
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <CalendarIcon size={10} className="text-gray-700" />
                        {format(parseISO(record.date), 'MMM do, yyyy')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 relative z-10">
                    <span className={clsx(
                      "text-[9px] font-black uppercase px-3 py-1 rounded-xl border tracking-widest",
                      record.status === 'present' ? "bg-green-600/20 border-green-500/40 text-green-400" :
                      record.status === 'absent' ? "bg-red-600/20 border-red-500/40 text-red-400" : "bg-gray-600/20 border-gray-500/40 text-gray-500"
                    )}>
                      {record.status}
                    </span>
                    <motion.button 
                      whileTap={{ scale: 0.8 }}
                      onClick={() => handleDeleteRecord(record)}
                      className="p-3 text-gray-700 hover:text-red-400 transition-colors bg-white/5 rounded-2xl border border-white/5 group-hover:opacity-100 opacity-0 sm:opacity-0"
                    >
                      <Trash2 size={16} />
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
