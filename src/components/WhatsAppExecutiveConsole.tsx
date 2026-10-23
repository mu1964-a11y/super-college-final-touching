import React from 'react';
import { ShieldCheck, Users, GraduationCap } from 'lucide-react';

interface WhatsAppExecutiveConsoleProps {
  staffList: any[];
  studentsList: any[];
  globalSettings?: any;
}

export default function WhatsAppExecutiveConsole({
  staffList = [],
  studentsList = [],
  globalSettings,
}: WhatsAppExecutiveConsoleProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Executive WhatsApp Command Console</h3>
            <p className="text-xs text-slate-500">
              {globalSettings?.collegeName || 'Superior College Jahanian'} • Real-Time Dispatch Overview
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-emerald-700" />
          <div>
            <p className="text-xs font-bold text-slate-500">Enrolled Students Reachable</p>
            <p className="text-xl font-black text-slate-900">{studentsList.length}</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
          <Users className="w-8 h-8 text-teal-700" />
          <div>
            <p className="text-xs font-bold text-slate-500">Faculty & Staff Reachable</p>
            <p className="text-xl font-black text-slate-900">{staffList.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
