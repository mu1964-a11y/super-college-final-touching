import React, { useState } from 'react';
import { CheckCircle2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface BatchMarksEntryProps {
  students: any[];
  academicRecords: any[];
  onSaveBatchMarks: (records: any[]) => void;
  predefinedSections?: string[];
  settings?: any;
}

export default function BatchMarksEntry({
  students = [],
  onSaveBatchMarks,
  predefinedSections = [],
}: BatchMarksEntryProps) {
  const [subject, setSubject] = useState('Physics');
  const [testType, setTestType] = useState('Monthly Test');
  const [totalMarks, setTotalMarks] = useState('100');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [marksMap, setMarksMap] = useState<Record<string, string>>({});

  const filtered = students.filter(
    (s) => sectionFilter === 'all' || (s.section || '').toLowerCase() === sectionFilter.toLowerCase()
  );

  const handleSave = () => {
    const entries = Object.entries(marksMap)
      .filter(([, val]) => val !== '' && !isNaN(Number(val)))
      .map(([studentId, val]) => ({
        id: `exam-${Date.now()}-${studentId}`,
        studentId,
        subject,
        testType,
        obtainedMarks: Number(val),
        totalMarks: Number(totalMarks || 100),
        date: new Date().toISOString().split('T')[0],
      }));

    if (entries.length === 0) {
      toast.error('Please enter marks for at least one student');
      return;
    }
    onSaveBatchMarks(entries);
    toast.success(`Saved marks for ${entries.length} students!`);
    setMarksMap({});
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-emerald-700" />
          <h3 className="text-base font-black text-slate-900">Batch Award List / Marks Entry</h3>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 size={14} />
          <span>Save Batch Marks</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject Name"
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold"
        />
        <input
          type="text"
          value={testType}
          onChange={(e) => setTestType(e.target.value)}
          placeholder="Exam / Test Type"
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold"
        />
        <input
          type="number"
          value={totalMarks}
          onChange={(e) => setTotalMarks(e.target.value)}
          placeholder="Total Marks"
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold"
        />
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold"
        >
          <option value="all">All Sections</option>
          {predefinedSections.map((sec) => (
            <option key={sec} value={sec}>
              {sec}
            </option>
          ))}
        </select>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-2xl">
        {filtered.slice(0, 100).map((s) => (
          <div key={s.id} className="p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-slate-900">{s.fullName}</p>
              <p className="text-[11px] text-slate-500">
                Roll: {s.collegeNo || s.studentId || 'N/A'} • {s.section || 'Sec A'}
              </p>
            </div>
            <input
              type="number"
              value={marksMap[s.id] || ''}
              onChange={(e) => setMarksMap((prev) => ({ ...prev, [s.id]: e.target.value }))}
              placeholder={`/ ${totalMarks}`}
              className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-right"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
