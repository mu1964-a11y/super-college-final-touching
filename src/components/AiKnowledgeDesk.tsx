import React from 'react';
import { BookOpen, ShieldCheck } from 'lucide-react';

export default function AiKnowledgeDesk() {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
          <BookOpen size={20} />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900">Campus Knowledge & Prospectus Base</h3>
          <p className="text-xs text-slate-500">
            Session 2026-28 prospectus rules, fee policies, and automated response templates.
          </p>
        </div>
      </div>
      <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900 font-semibold">
        <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
        <span>Synchronized with Superior College Jahanian Session 2026-28 Master Data.</span>
      </div>
    </div>
  );
}
