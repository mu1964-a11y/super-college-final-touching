
import React from 'react';
import { CheckCircle2, Clock, CalendarDays, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AttendanceView({ data }: { data: any }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-display font-black text-superior-teal tracking-tight flex items-center gap-3">
            <CheckCircle2 size={32} className="text-superior-gold" />
            Attendance Module
          </h2>
          <p className="text-slate-500 mt-1 font-medium italic">Track student daily presence and academic consistency</p>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-slate-100 shadow-sm p-12 text-center">
        <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center animate-pulse">
            <CalendarDays size={40} className="text-slate-300" />
          </div>
          <h3 className="text-2xl font-serif font-black text-slate-800">Attendance System Under Construction</h3>
          <p className="text-slate-500 font-medium">
            We are working on a more robust attendance tracking system that links with biometric and mobile-app data. Stay tuned!
          </p>
        </div>
      </Card>
    </div>
  );
}
