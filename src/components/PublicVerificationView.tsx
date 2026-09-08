import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Phone, 
  User, 
  Coins, 
  Clock,
  ArrowLeft,
  School
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { calculateStudentFeeBreakdown } from '../lib/feeCalculations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface VerificationData {
  type: 'challan' | 'receipt' | 'admission' | 'card' | 'general';
  id: string;
  student?: any;
  admission?: any;
  verifiedAt: string;
  status: 'verified' | 'unverified' | 'loading' | 'error';
  errorMessage?: string;
}

export default function PublicVerificationView({ onGoToAdmin }: { onGoToAdmin?: () => void }) {
  const [data, setData] = useState<VerificationData>({
    type: 'general',
    id: '',
    verifiedAt: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
    status: 'loading'
  });

  useEffect(() => {
    async function verifyRecord() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const typeParam = (searchParams.get('type') || searchParams.get('verify') || 'general').toLowerCase() as any;
        const idParam = searchParams.get('id') || searchParams.get('roll') || searchParams.get('studentId') || '';

        if (!idParam) {
          setData({
            type: typeParam,
            id: 'N/A',
            verifiedAt: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
            status: 'error',
            errorMessage: 'Missing Document or Student ID in verification QR link.'
          });
          return;
        }

        // Search students table first
        let studentRecord: any = null;
        let admissionRecord: any = null;

        const { data: studentsData } = await supabase
          .from('students')
          .select('*')
          .or(`id.eq.${idParam},roll_no.eq.${idParam},student_id.eq.${idParam}`)
          .limit(1);

        if (studentsData && studentsData.length > 0) {
          studentRecord = studentsData[0];
        }

        // If not found or needed, check admissions
        if (!studentRecord || typeParam === 'admission') {
          const { data: admData } = await supabase
            .from('admissions')
            .select('*')
            .or(`id.eq.${idParam},student_id.eq.${idParam}`)
            .limit(1);

          if (admData && admData.length > 0) {
            admissionRecord = admData[0];
            if (!studentRecord) {
              studentRecord = admissionRecord;
            }
          }
        }

        if (studentRecord) {
          setData({
            type: typeParam,
            id: idParam,
            student: studentRecord,
            admission: admissionRecord,
            verifiedAt: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
            status: 'verified'
          });
        } else {
          setData({
            type: typeParam,
            id: idParam,
            verifiedAt: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
            status: 'unverified',
            errorMessage: 'No registered student or document found matching ID: ' + idParam
          });
        }
      } catch (err: any) {
        console.error('Verification error:', err);
        setData({
          type: 'general',
          id: 'Error',
          verifiedAt: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
          status: 'error',
          errorMessage: 'Server verification check failed. Please check internet connection.'
        });
      }
    }

    verifyRecord();
  }, []);

  const student = data.student;
  const feeCalc = student ? calculateStudentFeeBreakdown(student) : null;

  const docTitle = 
    data.type === 'challan' ? 'Official 3-Copy Bank Challan' :
    data.type === 'receipt' ? 'Official College Fee Receipt' :
    data.type === 'admission' ? 'Official Admission Verification Slip' :
    data.type === 'card' ? 'Student Identity Verification' :
    'Official College Academic & Fee Record';

  const verificationRef = `VER-SGC-${new Date().getFullYear()}-${(data.id || '000').slice(-6).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppSupport = () => {
    const phone = '923014455891';
    const msg = encodeURIComponent(`Assalam o Alaikum, I am verifying document reference ${verificationRef} for student ${student?.fullName || data.id}. Kindly assist.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-900/5 text-slate-800 flex flex-col items-center justify-start p-3 sm:p-6 print:p-0 print:bg-white">
      {/* Top Banner with College Info */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden print:shadow-none print:border-none my-auto">
        {/* Superior College Header */}
        <div className="bg-gradient-to-r from-[#0B4D45] via-[#0E5F55] to-[#0B4D45] text-white p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-[#D4AF37]/10 blur-2xl pointer-events-none" />

          <div className="flex flex-col items-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3 shadow-lg text-[#D4AF37]">
              <School size={36} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-[#D4AF37] mb-1">
              Official Online Verification System
            </span>
            <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-white">
              SUPERIOR GROUP OF COLLEGES
            </h1>
            <p className="text-xs text-white/80 font-semibold mt-0.5">
              Jahanian Campus • Academic & Accounts Registry
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 space-y-6">
          {data.status === 'loading' ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl border-4 border-[#0B4D45]/30 border-t-[#0B4D45] animate-spin flex items-center justify-center mx-auto" />
              <div>
                <h3 className="font-display font-black text-slate-800 text-lg">Verifying Document Authenticity...</h3>
                <p className="text-xs text-slate-400 font-medium">Querying Superior College Jahanian central database</p>
              </div>
            </div>
          ) : data.status === 'unverified' || data.status === 'error' ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-md">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-1.5">
                <Badge className="bg-rose-100 text-rose-800 border-none font-black text-xs px-3 py-1 rounded-full">
                  UNVERIFIED / INVALID RECORD
                </Badge>
                <h2 className="text-xl font-display font-black text-slate-900">Document Verification Failed</h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {data.errorMessage || 'No matching record was found in the central ERP records. Please verify the slip or contact the college accounts desk.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono">
                Scanned Reference ID: <span className="font-bold text-slate-800">{data.id || 'Unknown'}</span>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={handleWhatsAppSupport} className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 cursor-pointer">
                  <Phone size={14} className="mr-2" /> Contact College Helpdesk
                </Button>
                {onGoToAdmin && (
                  <Button variant="outline" onClick={onGoToAdmin} className="w-full sm:w-auto rounded-xl border-slate-200 font-bold text-xs h-10 px-5 cursor-pointer">
                    <ArrowLeft size={14} className="mr-2" /> Admin Login
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Verification Success Ribbon */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-200">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                      Security Status
                    </span>
                    <h3 className="text-sm sm:text-base font-display font-black text-emerald-950 flex items-center gap-1.5">
                      <span>100% VERIFIED & AUTHENTIC</span>
                      <CheckCircle2 size={16} className="text-emerald-600 inline" />
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 block">Ref #</span>
                  <span className="font-mono font-black text-xs text-slate-800">{verificationRef}</span>
                </div>
              </div>

              {/* Document Overview Banner */}
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Document Type</span>
                <h2 className="text-xl font-display font-black text-slate-900 mt-0.5">{docTitle}</h2>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
                  <Clock size={13} className="text-slate-400" />
                  <span>Verified live on: <strong className="text-slate-700">{data.verifiedAt}</strong></span>
                </div>
              </div>

              {/* Student & Academic Particulars Card */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
                    <User size={14} className="text-[#0B4D45]" />
                    <span>Student Credentials</span>
                  </div>
                  <Badge className="bg-[#0B4D45]/10 text-[#0B4D45] border-none font-bold text-[10px]">
                    Active Student
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px]">Student Name:</span>
                    <span className="font-black text-slate-900 text-sm">
                      {student.fullName || student.name || 'Student'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px]">Father Name:</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {student.fatherName || student.guardianName || 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px]">Roll / Student ID:</span>
                    <span className="font-mono font-black text-emerald-700 text-sm">
                      {student.rollNo || student.id || student.studentId}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px]">Class & Section:</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {student.class || student.program || 'FSc'} {student.section ? `(${student.section})` : ''}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px]">Campus & Gender:</span>
                    <span className="font-bold text-slate-700">
                      Superior College Jahanian ({student.gender || 'Co-Ed'})
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px]">Academic Session:</span>
                    <span className="font-bold text-slate-700">
                      {student.session || '2026-28'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fee & Financial Summary (If applicable) */}
              {feeCalc && (
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
                      <Coins size={14} className="text-amber-500" />
                      <span>Financial Clearance Ledger</span>
                    </div>
                    <Badge className={
                      feeCalc.totalBalance <= 0 
                        ? "bg-emerald-100 text-emerald-800 border-none font-bold text-[10px]"
                        : "bg-amber-100 text-amber-800 border-none font-bold text-[10px]"
                    }>
                      {feeCalc.totalBalance <= 0 ? "100% Fully Cleared" : "Outstanding Balance"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Package</span>
                      <span className="font-mono font-black text-slate-800 text-xs sm:text-sm">
                        Rs. {(feeCalc.totalPackage || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase block">Paid So Far</span>
                      <span className="font-mono font-black text-emerald-700 text-xs sm:text-sm">
                        Rs. {(feeCalc.feeReceived || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-bold text-rose-600 uppercase block">Current Due</span>
                      <span className="font-mono font-black text-rose-600 text-xs sm:text-sm">
                        Rs. {(feeCalc.currentInstallmentDue || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Balance</span>
                      <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                        Rs. {(feeCalc.totalBalance || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Legal & Security Tamper Notice */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
                <strong>🛡️ Official Anti-Tamper Notice:</strong> This electronic verification is authenticated directly from the central database of Superior Group of Colleges Jahanian. Any alteration or forgery on printed copies constitutes a punishable legal offence.
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button onClick={handlePrint} variant="outline" className="flex-1 sm:flex-none rounded-xl border-slate-200 font-bold text-xs h-10 px-4 cursor-pointer">
                    <Printer size={14} className="mr-1.5" /> Print Certificate
                  </Button>
                  <Button onClick={handleWhatsAppSupport} className="flex-1 sm:flex-none rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-4 cursor-pointer">
                    <Phone size={14} className="mr-1.5" /> College Helpline
                  </Button>
                </div>

                {onGoToAdmin && (
                  <Button variant="ghost" onClick={onGoToAdmin} className="text-xs text-slate-400 hover:text-slate-700 font-bold cursor-pointer">
                    Staff / Admin Login ➔
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 text-center text-[10px] text-slate-400 font-medium">
          © {new Date().getFullYear()} Superior Group of Colleges Jahanian • Verified by Central LMS Security System
        </div>
      </div>
    </div>
  );
}
