import React, { useState, useEffect } from 'react';
import { X, User, CreditCard, Calendar, Award, MessageSquare, Phone } from 'lucide-react';

interface StudentDossier360Props {
  student: any;
  isOpen: boolean;
  onClose: () => void;
  data: any;
  initialTab?: 'profile' | 'fee' | 'attendance' | 'exams';
  onOpenWhatsApp?: (phone: string) => void;
}

export default function StudentDossier360({
  student,
  isOpen,
  onClose,
  data,
  initialTab = 'profile',
  onOpenWhatsApp,
}: StudentDossier360Props) {
  const [activeTab, setActiveTab] = useState<'profile' | 'fee' | 'attendance' | 'exams'>(initialTab);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  if (!isOpen || !student) return null;

  const totalPkg = Number(student.totalPackage || student.total_package || 0);
  const feePaid = Number(student.feeReceived || student.fee_received || 0);
  const balance = Math.max(0, totalPkg - feePaid);
  const exams = (data?.academicRecords || []).filter((r: any) => r.studentId === student.id);
  const attendance = (data?.studentAttendance || []).filter((a: any) => a.studentId === student.id);
  const phone = student.fatherContact || student.contact || student.whatsappNumber || '';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {student.photo ? (
              <img src={student.photo} alt={student.fullName} className="w-14 h-14 rounded-2xl object-cover border border-white/20" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center font-black text-xl">
                {(student.fullName || 'S').charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-lg font-black">{student.fullName}</h2>
              <p className="text-xs text-emerald-200">
                Roll No: {student.collegeNo || student.studentId || 'N/A'} • {student.group || student.course || 'Program'} ({student.session || '2026-28'})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 pt-3">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'fee', label: 'Fee Ledger', icon: CreditCard },
            { id: 'attendance', label: 'Attendance', icon: Calendar },
            { id: 'exams', label: 'Exams', icon: Award },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-white text-emerald-800 border-t border-x border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 font-bold block">Father Name</span>
                <span className="font-black text-slate-800 text-sm">{student.fatherName || 'N/A'}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 font-bold block">Contact / Guardian Phone</span>
                <span className="font-black text-slate-800 text-sm">{phone || 'N/A'}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 font-bold block">Section / Campus</span>
                <span className="font-black text-slate-800 text-sm">{student.section || 'A'} • {student.gender || 'Campus'}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 font-bold block">CNIC / B-Form</span>
                <span className="font-black text-slate-800 text-sm">{student.bayFormNo || 'N/A'}</span>
              </div>
            </div>
          )}

          {activeTab === 'fee' && (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500">Total Package</p>
                <p className="text-lg font-black text-slate-900">Rs. {totalPkg.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <p className="text-[11px] font-bold text-emerald-700">Total Received</p>
                <p className="text-lg font-black text-emerald-800">Rs. {feePaid.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                <p className="text-[11px] font-bold text-rose-700">Balance Due</p>
                <p className="text-lg font-black text-rose-800">Rs. {balance.toLocaleString()}</p>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="text-xs text-slate-600">
              <p className="font-bold mb-2">Total Recorded Days: {attendance.length}</p>
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="text-xs text-slate-600">
              <p className="font-bold mb-2">Total Exam Entries: {exams.length}</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {phone && onOpenWhatsApp ? (
            <button
              onClick={() => onOpenWhatsApp(phone)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare size={14} />
              <span>Message on WhatsApp</span>
            </button>
          ) : <div />}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
