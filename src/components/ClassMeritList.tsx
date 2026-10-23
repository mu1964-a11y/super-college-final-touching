import React, { useMemo } from 'react';
import { Award } from 'lucide-react';

interface ClassMeritListProps {
  students: any[];
  academicRecords: any[];
  predefinedSections?: string[];
  settings?: any;
}

export default function ClassMeritList({
  students = [],
  academicRecords = [],
}: ClassMeritListProps) {
  const ranked = useMemo(() => {
    return students
      .map((s) => {
        const recs = academicRecords.filter((r) => r.studentId === s.id);
        const obtained = recs.reduce((acc, r) => acc + Number(r.obtainedMarks || 0), 0);
        const total = recs.reduce((acc, r) => acc + Number(r.totalMarks || 0), 0);
        const pct = total > 0 ? (obtained / total) * 100 : 0;
        return { student: s, obtained, total, pct };
      })
      .filter((x) => x.total > 0)
      .sort((a, b) => b.pct - a.pct);
  }, [students, academicRecords]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center gap-2.5">
        <Award className="w-5 h-5 text-amber-600" />
        <h3 className="text-base font-black text-slate-900">Class Merit & Position Holders</h3>
      </div>

      {ranked.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">
          No exam marks recorded yet to compute class merit standings.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {ranked.slice(0, 30).map((item, idx) => (
            <div key={item.student.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-black text-xs flex items-center justify-center">
                  #{idx + 1}
                </span>
                <div>
                  <p className="text-xs font-black text-slate-900">{item.student.fullName}</p>
                  <p className="text-[11px] text-slate-500">
                    Roll: {item.student.collegeNo || item.student.studentId || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono font-black text-emerald-700">{item.pct.toFixed(1)}%</p>
                <p className="text-[10px] text-slate-400">
                  {item.obtained} / {item.total}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
