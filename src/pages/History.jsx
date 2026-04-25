import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { format, parseISO } from 'date-fns';
import { Trash2, Calendar as CalendarIcon, Filter, Search, CheckCircle2, XCircle, Slash, History as HistoryIcon } from 'lucide-react';
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
    // Sort by date descending
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
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      <header className="px-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">History</h1>
        <p className="text-blue-200/70 font-medium text-sm mt-0.5">Logs of all marked classes</p>
      </header>

      {/* Filters */}
      <div className="space-y-3 px-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Search subjects..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative">
            <select 
              className="bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white text-sm outline-none appearance-none pr-10"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              <option value="all">All Subjects</option>
              {subjects?.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* Records List */}
      <section className="px-2 space-y-4">
        {!filteredRecords || filteredRecords.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-[2.5rem] border-dashed border-white/10">
            <div className="bg-gray-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <HistoryIcon className="text-gray-500" size={32} />
            </div>
            <p className="text-gray-400 font-medium">No history found</p>
          </div>
        ) : (
          filteredRecords.map(record => {
            const subject = subjects?.find(s => s.id === record.subjectId);
            if (!subject) return null;

            return (
              <div key={record.id} className="glass-card rounded-3xl p-4 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    record.status === 'present' ? "bg-green-500/10 text-green-400" :
                    record.status === 'absent' ? "bg-red-500/10 text-red-400" : "bg-gray-500/10 text-gray-400"
                  )}>
                    {record.status === 'present' && <CheckCircle2 size={20} />}
                    {record.status === 'absent' && <XCircle size={20} />}
                    {record.status === 'cancelled' && <Slash size={20} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      {subject.name}
                      {record.timetableId && <span className="text-[8px] bg-white/5 text-gray-400 px-1 rounded border border-white/5 uppercase tracking-tighter">Scheduled</span>}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                      <CalendarIcon size={10} />
                      {format(parseISO(record.date), 'MMM do, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={clsx(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
                    record.status === 'present' ? "bg-green-500/10 border-green-500/20 text-green-400" :
                    record.status === 'absent' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-gray-500/10 border-gray-500/20 text-gray-400"
                  )}>
                    {record.status === 'present' ? 'Present' : record.status === 'absent' ? 'Absent' : 'Off'}
                  </span>
                  <button 
                    onClick={() => handleDeleteRecord(record)}
                    className="p-2 text-gray-600 hover:text-red-400 transition-colors sm:opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
